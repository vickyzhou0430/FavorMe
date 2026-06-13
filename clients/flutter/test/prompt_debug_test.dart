import 'package:favorme_flutter/src/features/insight_v2/debug/prompt_debug_screen.dart';
import 'package:favorme_flutter/src/features/insight_v2/insight_v2_api_client.dart';
import 'package:favorme_flutter/src/features/insight_v2/insight_v2_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class FakePromptClient implements InsightV2Client {
  FakePromptClient({required this.enabled});

  final bool enabled;
  String? uploaded;
  int resetCount = 0;
  String _effective = '默认提示词';

  InsightV2PromptInfo _info() {
    return InsightV2PromptInfo(
      key: 'insight-v2.system',
      enabled: enabled,
      hasOverride: uploaded != null,
      defaultPrompt: '默认提示词',
      effectivePrompt: _effective,
      updatedBy: uploaded != null ? 'dev-1' : null,
    );
  }

  @override
  Future<InsightV2PromptInfo> getPrompt() async => _info();

  @override
  Future<InsightV2PromptInfo> updatePrompt(String content) async {
    uploaded = content;
    _effective = content;
    return _info();
  }

  @override
  Future<InsightV2PromptInfo> resetPrompt() async {
    resetCount++;
    uploaded = null;
    _effective = '默认提示词';
    return _info();
  }

  @override
  Future<InsightV2Turn> startSession({required String dilemma}) async =>
      throw UnimplementedError();

  @override
  Future<InsightV2Turn> answer({
    required String sessionId,
    required String questionId,
    required InsightV2Level level,
  }) async =>
      throw UnimplementedError();

  @override
  Future<InsightV2Turn> reply({
    required String sessionId,
    required String replyText,
  }) async =>
      throw UnimplementedError();

  @override
  Future<InsightV2Turn> regenerate({required String sessionId}) async =>
      throw UnimplementedError();

  @override
  Future<InsightV2SessionDetail> getSession(String sessionId) async =>
      throw UnimplementedError();

  @override
  Future<InsightV2HistoryPage> listSessions({int? limit, String? cursor}) async =>
      const InsightV2HistoryPage(items: []);
}

void main() {
  testWidgets('loads effective prompt and uploads an edit', (tester) async {
    final client = FakePromptClient(enabled: true);
    await tester.pumpWidget(MaterialApp(home: PromptDebugScreen(client: client)));
    await tester.pumpAndSettle();

    expect(find.text('覆盖功能已开启，上传后运行时即时生效。'), findsOneWidget);
    expect(find.widgetWithText(TextField, '默认提示词'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '我的新提示词');
    await tester.tap(find.text('上传'));
    await tester.pumpAndSettle();

    expect(client.uploaded, '我的新提示词');
  });

  testWidgets('shows read-only banner when disabled', (tester) async {
    final client = FakePromptClient(enabled: false);
    await tester.pumpWidget(MaterialApp(home: PromptDebugScreen(client: client)));
    await tester.pumpAndSettle();

    expect(find.text('后端未开启覆盖功能（只读）。'), findsOneWidget);
  });
}
