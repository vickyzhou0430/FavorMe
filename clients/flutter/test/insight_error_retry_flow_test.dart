import 'dart:async';
import 'dart:io';

import 'package:favorme_flutter/src/app/favorme_app.dart';
import 'package:favorme_flutter/src/features/insight/device_id_store.dart';
import 'package:favorme_flutter/src/features/insight/insight_api_client.dart';
import 'package:favorme_flutter/src/features/insight/insight_models.dart';
import 'package:favorme_flutter/src/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _sampleQuestions = [
  InsightQuestion(
    id: 'q1',
    dimension: InsightDimension.innerPreference,
    title: '如果只听真实直觉，你更靠近哪边？',
    options: [
      InsightOption(id: 'stay', label: '保持现状'),
      InsightOption(id: 'change', label: '尝试变化'),
    ],
  ),
  InsightQuestion(
    id: 'q2',
    dimension: InsightDimension.fearBoundary,
    title: '你最不能接受的风险是什么？',
    options: [
      InsightOption(id: 'income', label: '收入短期不稳定'),
      InsightOption(id: 'growth', label: '继续错过成长机会'),
    ],
  ),
  InsightQuestion(
    id: 'q3',
    dimension: InsightDimension.activeVsAvoidance,
    title: '这次选择更像靠近想要，还是逃离压力？',
    options: [
      InsightOption(id: 'toward', label: '靠近更想要的状态'),
      InsightOption(id: 'away', label: '逃离当前压力'),
    ],
  ),
];

class ErrorRetryFakeClient implements InsightQuestionsClient {
  ErrorRetryFakeClient({
    this.failQuestionsOnce = false,
    this.invalidQuestion = false,
    this.failSubmitOnce = false,
    this.holdQuestionRequest = false,
  });

  final bool failQuestionsOnce;
  final bool invalidQuestion;
  final bool failSubmitOnce;
  final bool holdQuestionRequest;

  int questionCalls = 0;
  int submitCalls = 0;
  String? lastRawQuestion;
  List<InsightAnswer> lastAnswers = const [];
  Completer<InsightQuestionsResponse>? pendingQuestions;

  @override
  Future<InsightQuestionsResponse> generateQuestions({
    required String rawQuestion,
  }) {
    questionCalls += 1;
    lastRawQuestion = rawQuestion;

    if (holdQuestionRequest) {
      pendingQuestions ??= Completer<InsightQuestionsResponse>();
      return pendingQuestions!.future;
    }

    if (invalidQuestion) {
      throw const InsightApiException(
        statusCode: 422,
        code: 'INVALID_QUESTION_INPUT',
        message: 'Question is too vague.',
        requestId: 'req-invalid',
      );
    }

    if (failQuestionsOnce && questionCalls == 1) {
      throw const InsightApiException(
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service unavailable.',
        requestId: 'req-questions',
      );
    }

    return Future.value(const InsightQuestionsResponse(
      questions: _sampleQuestions,
    ));
  }

  @override
  Future<InsightSubmitResponse> submitInsight({
    required String rawQuestion,
    required List<InsightQuestion> questions,
    required List<InsightAnswer> answers,
  }) {
    submitCalls += 1;
    lastRawQuestion = rawQuestion;
    lastAnswers = List<InsightAnswer>.from(answers);

    if (failSubmitOnce && submitCalls == 1) {
      throw const InsightApiException(
        statusCode: 504,
        code: 'INSIGHT_SUBMIT_TIMEOUT',
        message: 'Submit timed out.',
        requestId: 'req-submit',
      );
    }

    return Future.value(const InsightSubmitResponse(
      conclusion: '你当下更偏向尝试变化，但可以先用小步骤降低风险。',
    ));
  }
}

void main() {
  testWidgets('generation failure shows card error and retries preserved input',
      (tester) async {
    final fakeClient = ErrorRetryFakeClient(failQuestionsOnce: true);

    await tester.pumpWidget(_testApp(fakeClient));
    await tester.enterText(find.byType(TextField), '我要不要换工作？');
    await tester.tap(find.text('发送问题'));
    await tester.pump();
    await tester.pump(AppMotion.loadingMinimumDuration);
    await tester.pumpAndSettle();

    expect(find.text('刚刚没有连上服务。请检查网络后重试。'), findsOneWidget);
    expect(find.text('重试'), findsOneWidget);
    expect(fakeClient.questionCalls, 1);

    await tester.tap(find.text('重试'));
    await tester.pump();
    await tester.pump(AppMotion.loadingMinimumDuration);
    await tester.pumpAndSettle();

    expect(fakeClient.questionCalls, 2);
    expect(fakeClient.lastRawQuestion, '我要不要换工作？');
    expect(find.text('第 1 / 3 问'), findsOneWidget);
  });

  testWidgets('submit failure keeps answers and retry resubmits conclusion only',
      (tester) async {
    final fakeClient = ErrorRetryFakeClient(failSubmitOnce: true);

    await tester.pumpWidget(_testApp(fakeClient));
    await _generateQuestions(tester);
    await _answerThreeQuestions(tester);

    expect(find.text('刚刚没有连上服务。请检查网络后重试。'), findsOneWidget);
    expect(fakeClient.questionCalls, 1);
    expect(fakeClient.submitCalls, 1);
    expect(fakeClient.lastAnswers.map((answer) => answer.optionId), [
      'change',
      'growth',
      'toward',
    ]);

    await tester.tap(find.text('重试'));
    await tester.pumpAndSettle();

    expect(fakeClient.questionCalls, 1);
    expect(fakeClient.submitCalls, 2);
    expect(find.textContaining('更偏向尝试变化'), findsOneWidget);
  });

  testWidgets('INVALID_QUESTION_INPUT returns to editable preserved input',
      (tester) async {
    final fakeClient = ErrorRetryFakeClient(invalidQuestion: true);

    await tester.pumpWidget(_testApp(fakeClient));
    await tester.enterText(find.byType(TextField), '选择');
    await tester.tap(find.text('发送问题'));
    await tester.pump();
    await tester.pump(AppMotion.loadingMinimumDuration);
    await tester.pumpAndSettle();

    expect(
      find.text('这个问题还不够明确。换个更具体的说法，我再帮你拆成三问。'),
      findsOneWidget,
    );
    expect(find.widgetWithText(TextField, '选择'), findsOneWidget);

    final textField = tester.widget<TextField>(find.byType(TextField));
    expect(textField.enabled, isTrue);
  });

  testWidgets('duplicate send during loading creates one questions call',
      (tester) async {
    final fakeClient = ErrorRetryFakeClient(holdQuestionRequest: true);

    await tester.pumpWidget(_testApp(fakeClient));
    await tester.enterText(find.byType(TextField), '我要不要换工作？');
    await tester.tap(find.text('发送问题'));
    await tester.pump();
    await tester.tap(find.text('发送问题'), warnIfMissed: false);
    await tester.pump();

    expect(fakeClient.questionCalls, 1);

    fakeClient.pendingQuestions!.complete(
      const InsightQuestionsResponse(questions: _sampleQuestions),
    );
    await tester.pumpAndSettle();
    expect(find.text('第 1 / 3 问'), findsOneWidget);
  });

  testWidgets('Android back from question 2 returns with selection preserved',
      (tester) async {
    await tester.pumpWidget(_testApp(ErrorRetryFakeClient()));
    await _generateQuestions(tester);

    await tester.tap(find.text('尝试变化'));
    await tester.pump(AppMotion.selectionDuration);
    await tester.pumpAndSettle();

    expect(find.text('第 2 / 3 问'), findsOneWidget);
    expect(find.text('上一题'), findsOneWidget);

    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();

    expect(find.text('第 1 / 3 问'), findsOneWidget);
    expect(find.text('已选'), findsOneWidget);
    expect(find.text('尝试变化'), findsOneWidget);
  });

  testWidgets('loading, retry, and input widgets keep UI-SPEC source gates',
      (tester) async {
    final loadingErrorSource = File(
      'lib/src/features/insight/widgets/loading_error_card.dart',
    ).readAsStringSync();
    final bottomInputSource = File(
      'lib/src/features/insight/widgets/bottom_question_input.dart',
    ).readAsStringSync();

    expect(loadingErrorSource, contains('正在整理你的三问…'));
    expect(loadingErrorSource, contains('正在生成倾向分析…'));
    expect(loadingErrorSource, contains('重试'));
    expect(loadingErrorSource, contains('Semantics'));
    expect(loadingErrorSource, contains('AppRadii.card'));
    expect(loadingErrorSource, contains('Shadow soft'));
    expect(loadingErrorSource, contains('minHeight: AppSizes.minTouchTarget'));
    expect(loadingErrorSource, contains('loadingBreathDuration'));
    expect(loadingErrorSource, contains('typing'));

    expect(bottomInputSource, contains('输入你纠结的问题…'));
    expect(bottomInputSource, contains('AppSizes.minTouchTarget'));
    expect(bottomInputSource, contains('AppMotion.pressScale'));
    expect(bottomInputSource, contains('Shadow soft'));
    expect(bottomInputSource.contains('mic'), isFalse);
    expect(bottomInputSource.contains('microphone'), isFalse);
  });
}

Widget _testApp(InsightQuestionsClient questionsClient) {
  return FavorMeApp(
    questionsClient: questionsClient,
    deviceIdStore: InMemoryDeviceIdStore(seed: 'test-device-001'),
  );
}

Future<void> _generateQuestions(WidgetTester tester) async {
  await tester.enterText(find.byType(TextField), '我要不要换工作？');
  await tester.tap(find.text('发送问题'));
  await tester.pump();
  await tester.pump(AppMotion.loadingMinimumDuration);
  await tester.pumpAndSettle();
}

Future<void> _answerThreeQuestions(WidgetTester tester) async {
  await tester.tap(find.text('尝试变化'));
  await tester.pump(AppMotion.selectionDuration);
  await tester.pumpAndSettle();
  await tester.tap(find.text('继续错过成长机会'));
  await tester.pump(AppMotion.selectionDuration);
  await tester.pumpAndSettle();
  await tester.tap(find.text('靠近更想要的状态'));
  await tester.pump(AppMotion.selectionDuration);
  await tester.pumpAndSettle();
}
