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
  String? lastRequestedKey;

  /// 每个 key 一份默认 + effective，方便测试下拉切换时拿到不同文案。
  final Map<String, String> _defaults = {
    InsightV2PromptKey.system: '默认提示词',
    InsightV2PromptKey.profileAugmentation: '默认 augmentation 文本',
  };
  final Map<String, String> _effective = {
    InsightV2PromptKey.system: '默认提示词',
    InsightV2PromptKey.profileAugmentation: '默认 augmentation 文本',
  };

  InsightV2PromptInfo _info(String key) {
    return InsightV2PromptInfo(
      key: key,
      enabled: enabled,
      hasOverride: uploaded != null,
      defaultPrompt: _defaults[key] ?? '',
      effectivePrompt: _effective[key] ?? '',
      updatedBy: uploaded != null ? 'dev-1' : null,
    );
  }

  String _resolveKey(String? key) => key ?? InsightV2PromptKey.system;

  @override
  Future<InsightV2PromptInfo> getPrompt({String? key}) async {
    lastRequestedKey = _resolveKey(key);
    return _info(lastRequestedKey!);
  }

  @override
  Future<InsightV2PromptInfo> updatePrompt(String content, {String? key}) async {
    final resolved = _resolveKey(key);
    lastRequestedKey = resolved;
    uploaded = content;
    _effective[resolved] = content;
    return _info(resolved);
  }

  @override
  Future<InsightV2PromptInfo> resetPrompt({String? key}) async {
    final resolved = _resolveKey(key);
    lastRequestedKey = resolved;
    resetCount++;
    uploaded = null;
    _effective[resolved] = _defaults[resolved] ?? '';
    return _info(resolved);
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

  testWidgets('switching key dropdown reloads the augmentation prompt', (tester) async {
    final client = FakePromptClient(enabled: true);
    await tester.pumpWidget(MaterialApp(home: PromptDebugScreen(client: client)));
    await tester.pumpAndSettle();

    // 默认拉的是 system key。
    expect(client.lastRequestedKey, InsightV2PromptKey.system);
    expect(find.widgetWithText(TextField, '默认提示词'), findsOneWidget);

    // 切到 augmentation：dropdown 在 Selector 卡片里。
    await tester.tap(find.text('基底 system prompt'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('个性化增强 (profile augmentation)').last);
    await tester.pumpAndSettle();

    expect(client.lastRequestedKey, InsightV2PromptKey.profileAugmentation);
    expect(find.widgetWithText(TextField, '默认 augmentation 文本'), findsOneWidget);

    // 在新 key 上上传，验证 key 透传。
    await tester.enterText(find.byType(TextField), '新的 augmentation');
    await tester.tap(find.text('上传'));
    await tester.pumpAndSettle();
    expect(client.uploaded, '新的 augmentation');
    expect(client.lastRequestedKey, InsightV2PromptKey.profileAugmentation);
  });
}
