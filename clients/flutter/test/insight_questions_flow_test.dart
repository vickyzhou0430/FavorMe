import 'package:favorme_flutter/src/app/favorme_app.dart';
import 'package:favorme_flutter/src/features/insight/device_id_store.dart';
import 'package:favorme_flutter/src/features/insight/insight_api_client.dart';
import 'package:favorme_flutter/src/features/insight/insight_models.dart';
import 'package:favorme_flutter/src/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeQuestionsClient implements InsightQuestionsClient {
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
    return const InsightSubmitResponse(conclusion: '测试结论');
  }
}

void main() {
  testWidgets('submits a question and shows the first guided card',
      (tester) async {
    await tester.pumpWidget(
      FavorMeApp(
        questionsClient: FakeQuestionsClient(),
        deviceIdStore: InMemoryDeviceIdStore(seed: 'test-device-001'),
      ),
    );

    expect(find.text('你今天想问什么？'), findsOneWidget);
    expect(find.text('发送问题'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '我要不要换工作？');
    await tester.tap(find.text('发送问题'));
    await tester.pump();

    expect(find.text('正在整理你的三问…'), findsOneWidget);

    await tester.pump(AppMotion.cardEntranceDuration);
    await tester.pumpAndSettle();

    expect(find.text('第 1 / 3 问'), findsOneWidget);
    expect(find.text('尝试变化'), findsOneWidget);

    // UI-SPEC source gates for this first slice:
    // typography roles 12/14/16/22, Shadow soft, 24px card radius,
    // 999px option pill radius, 44px minimum touch target, and D-13
    // card entrance/loading motion hooks must remain explicit constants.
    expect(AppTypography.caption.fontSize, 12);
    expect(AppTypography.body.fontSize, 14);
    expect(AppTypography.action.fontSize, 16);
    expect(AppTypography.heading.fontSize, 22);
    expect(AppRadii.card, 24);
    expect(AppRadii.optionPill, 999);
    expect(AppSizes.minTouchTarget, greaterThanOrEqualTo(44));
    expect(AppMotion.pressScale, 0.98);
    expect(AppMotion.cardEntranceOffset.dy, -8);
    expect(AppMotion.loadingBreathDuration.inMilliseconds, inInclusiveRange(220, 320));
  });
}
