import 'dart:io';

import 'package:favorme_flutter/src/app/favorme_app.dart';
import 'package:favorme_flutter/src/features/insight/device_id_store.dart';
import 'package:favorme_flutter/src/features/insight/insight_api_client.dart';
import 'package:favorme_flutter/src/features/insight/insight_models.dart';
import 'package:favorme_flutter/src/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeInsightClient implements InsightQuestionsClient {
  Map<String, Object?>? capturedSubmitPayload;
  int submitCount = 0;

  @override
  Future<InsightQuestionsResponse> generateQuestions({
    required String rawQuestion,
  }) async {
    return const InsightQuestionsResponse(
      questions: [
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
      ],
    );
  }

  @override
  Future<InsightSubmitResponse> submitInsight({
    required String rawQuestion,
    required List<InsightQuestion> questions,
    required List<InsightAnswer> answers,
  }) async {
    submitCount += 1;
    capturedSubmitPayload = {
      'rawQuestion': rawQuestion,
      'questions': questions.map((question) => question.toJson()).toList(),
      'answers': answers.map((answer) => answer.toJson()).toList(),
    };
    return const InsightSubmitResponse(
      conclusion: '你当下更偏向尝试变化，但可以用一个小步骤降低风险。',
    );
  }
}

void main() {
  testWidgets('answers three questions and submits a stateless payload',
      (tester) async {
    final fakeClient = FakeInsightClient();

    await tester.pumpWidget(
      FavorMeApp(
        questionsClient: fakeClient,
        deviceIdStore: InMemoryDeviceIdStore(seed: 'test-device-001'),
      ),
    );

    await tester.enterText(find.byType(TextField), '我要不要换工作？');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.send_rounded));
    await tester.pump();
    await tester.pump(AppMotion.cardEntranceDuration);
    await tester.pumpAndSettle();

    expect(find.text('第 1 / 3 问'), findsOneWidget);
    await tester.tap(find.text('保持现状'));
    await tester.pump(AppMotion.selectionDuration);
    await tester.pumpAndSettle();

    expect(find.text('第 2 / 3 问'), findsOneWidget);
    expect(find.text('上一题'), findsOneWidget);

    await tester.tap(find.text('上一题'));
    await tester.pumpAndSettle();
    expect(find.text('第 1 / 3 问'), findsOneWidget);
    await tester.tap(find.text('尝试变化'));
    await tester.pump(AppMotion.selectionDuration);
    await tester.pumpAndSettle();

    await tester.tap(find.text('继续错过成长机会'));
    await tester.pump(AppMotion.selectionDuration);
    await tester.pumpAndSettle();

    expect(find.text('第 3 / 3 问'), findsOneWidget);
    await tester.tap(find.text('靠近更想要的状态'));
    await tester.pump(AppMotion.selectionDuration);
    await tester.pumpAndSettle();

    expect(find.textContaining('提交'), findsNothing);
    expect(fakeClient.submitCount, 1);
    expect(fakeClient.capturedSubmitPayload, isNotNull);

    final payload = fakeClient.capturedSubmitPayload!;
    expect(payload['rawQuestion'], '我要不要换工作？');
    expect(payload['questions'], isA<List<Object?>>());
    expect(payload['answers'], isA<List<Object?>>());
    expect(payload.containsKey('sessionId'), isFalse);
    expect((payload['questions']! as List<Object?>), hasLength(3));
    expect((payload['answers']! as List<Object?>), [
      {'questionId': 'q1', 'optionId': 'change'},
      {'questionId': 'q2', 'optionId': 'growth'},
      {'questionId': 'q3', 'optionId': 'toward'},
    ]);

    expect(find.textContaining('更偏向尝试变化'), findsOneWidget);
    expect(find.text('再问一次'), findsOneWidget);
    expect(find.text('回到首页'), findsOneWidget);
  });

  testWidgets('keeps UI-SPEC and D-13 answer/result source gates',
      (tester) async {
    final questionCardSource = File(
      'lib/src/features/insight/widgets/question_card.dart',
    ).readAsStringSync();
    final resultCardSource = File(
      'lib/src/features/insight/widgets/result_card.dart',
    ).readAsStringSync();

    expect(AppTypography.caption.fontSize, 12);
    expect(AppTypography.body.fontSize, 14);
    expect(AppTypography.action.fontSize, 16);
    expect(AppTypography.heading.fontSize, 22);
    expect(AppRadii.card, 24);
    expect(AppRadii.optionPill, 999);
    expect(AppSizes.minTouchTarget, greaterThanOrEqualTo(44));
    expect(AppMotion.pressScale, 0.98);
    expect(AppMotion.selectionDuration.inMilliseconds, inInclusiveRange(120, 180));
    expect(AppMotion.cardEntranceDuration.inMilliseconds, inInclusiveRange(220, 320));
    expect(AppMotion.cardEntranceOffset.dy, -8);

    expect(questionCardSource, contains('语义已选中'));
    expect(questionCardSource, contains('Semantics'));
    expect(questionCardSource, contains('minHeight: AppSizes.minTouchTarget'));
    expect(questionCardSource, contains('AppRadii.optionPill'));
    expect(questionCardSource, contains('AppMotion.pressScale'));
    expect(questionCardSource, contains('AppMotion.cardEntranceDuration'));
    expect(resultCardSource, contains('Shadow soft'));
    expect(resultCardSource, contains('AppTypography.heading'));
    expect(resultCardSource, contains('AppTypography.body'));
    expect(resultCardSource, contains('AppTypography.action'));
    expect(resultCardSource, contains('minHeight: AppSizes.minTouchTarget'));
  });
}
