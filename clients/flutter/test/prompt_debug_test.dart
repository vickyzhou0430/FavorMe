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

  testWidgets(
    'augmentation upload with missing placeholders -> confirm cancel aborts',
    (tester) async {
      final client = FakePromptClient(enabled: true);
      await tester.pumpWidget(MaterialApp(home: PromptDebugScreen(client: client)));
      await tester.pumpAndSettle();

      // 切到 augmentation key
      await tester.tap(find.text('基底 system prompt'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('个性化增强 (profile augmentation)').last);
      await tester.pumpAndSettle();

      // 输入完全不含占位符的内容
      await tester.enterText(find.byType(TextField), '完全没有占位符的版本');
      await tester.tap(find.text('上传'));
      await tester.pumpAndSettle();

      // 弹出确认对话框
      expect(find.text('未检测到占位符'), findsOneWidget);

      // 点取消 -> 不应上传
      await tester.tap(find.text('取消'));
      await tester.pumpAndSettle();
      expect(client.uploaded, isNull);
    },
  );

  testWidgets(
    'augmentation upload with missing placeholders -> confirm proceed uploads',
    (tester) async {
      final client = FakePromptClient(enabled: true);
      await tester.pumpWidget(MaterialApp(home: PromptDebugScreen(client: client)));
      await tester.pumpAndSettle();

      await tester.tap(find.text('基底 system prompt'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('个性化增强 (profile augmentation)').last);
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), '完全没有占位符的版本');
      await tester.tap(find.text('上传'));
      await tester.pumpAndSettle();

      expect(find.text('未检测到占位符'), findsOneWidget);

      await tester.tap(find.text('仍然上传'));
      await tester.pumpAndSettle();
      expect(client.uploaded, '完全没有占位符的版本');
    },
  );

  testWidgets(
    'augmentation upload with at least one placeholder -> no confirm needed',
    (tester) async {
      final client = FakePromptClient(enabled: true);
      await tester.pumpWidget(MaterialApp(home: PromptDebugScreen(client: client)));
      await tester.pumpAndSettle();

      await tester.tap(find.text('基底 system prompt'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('个性化增强 (profile augmentation)').last);
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), '只用 {{mbti}} 的精简版');
      await tester.tap(find.text('上传'));
      await tester.pumpAndSettle();

      // 不应弹对话框
      expect(find.text('未检测到占位符'), findsNothing);
      expect(client.uploaded, '只用 {{mbti}} 的精简版');
    },
  );

  testWidgets(
    'system key upload skips placeholder check entirely',
    (tester) async {
      final client = FakePromptClient(enabled: true);
      await tester.pumpWidget(MaterialApp(home: PromptDebugScreen(client: client)));
      await tester.pumpAndSettle();

      // 保持 system key 不切；system 文本本来就没有那些占位符
      await tester.enterText(find.byType(TextField), '没有任何占位符的 system 文本');
      await tester.tap(find.text('上传'));
      await tester.pumpAndSettle();

      expect(find.text('未检测到占位符'), findsNothing);
      expect(client.uploaded, '没有任何占位符的 system 文本');
    },
  );

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

    // 在新 key 上上传，验证 key 透传。带占位符避开占位符校验弹窗。
    await tester.enterText(find.byType(TextField), '新的 augmentation {{age}}');
    await tester.tap(find.text('上传'));
    await tester.pumpAndSettle();
    expect(client.uploaded, '新的 augmentation {{age}}');
    expect(client.lastRequestedKey, InsightV2PromptKey.profileAugmentation);
  });
}
