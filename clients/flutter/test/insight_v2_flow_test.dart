import 'package:favorme_flutter/src/app/favorme_app.dart';
import 'package:favorme_flutter/src/features/insight/device_id_store.dart';
import 'package:favorme_flutter/src/features/insight/insight_api_client.dart'
    show InsightApiException;
import 'package:favorme_flutter/src/features/insight_v2/insight_v2_api_client.dart';
import 'package:favorme_flutter/src/features/insight_v2/insight_v2_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

InsightV2Turn _questioning({int askedCount = 1, String id = 'q1'}) {
  return InsightV2Turn(
    sessionId: 's1',
    status: InsightV2Status.questioning,
    askedCount: askedCount,
    clarifyCount: 0,
    question: InsightV2Question(
      questionId: id,
      strategy: 'loss_aversion',
      strategyLabel: '损失厌恶测试',
      questionText: '如果其中一个选项突然没了，你的第一反应是？',
      optionA: '松了口气',
      optionB: '有点失落',
    ),
  );
}

InsightV2Turn _finished() {
  return const InsightV2Turn(
    sessionId: 's1',
    status: InsightV2Status.finished,
    askedCount: 2,
    clarifyCount: 0,
    report: InsightV2Report(
      awakeningQuote: '你早就决定了，只是在等一个允许。',
      tendency: '倾向离开',
      analysis: '从你的选择看，你更想离开。',
      actionAdvice: '今天先做一件小事去验证。',
      trajectory: [],
    ),
  );
}

InsightV2Turn _needInfo() {
  return const InsightV2Turn(
    sessionId: 's1',
    status: InsightV2Status.needInfo,
    askedCount: 0,
    clarifyCount: 1,
    clarifyQuestion: '你是在走和留之间纠结吗？',
  );
}

class FakeV2Client implements InsightV2Client {
  FakeV2Client(this._script);

  final List<Object> _script;
  int _i = 0;
  int startCount = 0;
  int answerCount = 0;
  int replyCount = 0;
  int regenerateCount = 0;

  Future<InsightV2Turn> _emit() async {
    final value = _script[_i < _script.length ? _i : _script.length - 1];
    _i++;
    if (value is InsightApiException) {
      throw value;
    }
    return value as InsightV2Turn;
  }

  @override
  Future<InsightV2Turn> startSession({required String dilemma}) {
    startCount++;
    return _emit();
  }

  @override
  Future<InsightV2Turn> answer({
    required String sessionId,
    required String questionId,
    required InsightV2Level level,
  }) {
    answerCount++;
    return _emit();
  }

  @override
  Future<InsightV2Turn> reply({
    required String sessionId,
    required String replyText,
  }) {
    replyCount++;
    return _emit();
  }

  @override
  Future<InsightV2Turn> regenerate({required String sessionId}) {
    regenerateCount++;
    return _emit();
  }

  @override
  Future<InsightV2SessionDetail> getSession(String sessionId) async {
    throw UnimplementedError();
  }

  @override
  Future<InsightV2HistoryPage> listSessions({int? limit, String? cursor}) async {
    return const InsightV2HistoryPage(items: []);
  }

  @override
  Future<InsightV2PromptInfo> getPrompt({String? key}) async =>
      throw UnimplementedError();

  @override
  Future<InsightV2PromptInfo> updatePrompt(String content, {String? key}) async =>
      throw UnimplementedError();

  @override
  Future<InsightV2PromptInfo> resetPrompt({String? key}) async =>
      throw UnimplementedError();
}

Future<void> _settle(WidgetTester tester) async {
  await tester.pump(); // flush microtask (loading -> resolved)
  await tester.pump(const Duration(milliseconds: 400)); // entrance + switcher
}

Widget _app(FakeV2Client client) {
  return FavorMeApp(
    insightV2Client: client,
    deviceIdStore: InMemoryDeviceIdStore(seed: 'test-device-001'),
  );
}

void main() {
  testWidgets('start -> question -> pick level -> result', (tester) async {
    final client = FakeV2Client([_questioning(), _finished()]);
    await tester.pumpWidget(_app(client));

    expect(find.text('你在纠结什么？'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '我要不要离职去创业？');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.send_rounded));
    await _settle(tester);

    expect(client.startCount, 1);
    expect(find.textContaining('第 1 问'), findsOneWidget);
    expect(find.text('如果其中一个选项突然没了，你的第一反应是？'), findsOneWidget);
    expect(find.text('松了口气'), findsOneWidget);
    expect(find.text('偏A'), findsOneWidget);

    await tester.tap(find.text('偏A'));
    await _settle(tester);

    expect(client.answerCount, 1);
    expect(find.textContaining('你早就决定了'), findsOneWidget);
    expect(find.text('再问一次'), findsOneWidget);
    expect(find.text('查看历史'), findsOneWidget);
  });

  testWidgets('need_info -> reply -> question', (tester) async {
    final client = FakeV2Client([_needInfo(), _questioning()]);
    await tester.pumpWidget(_app(client));

    await tester.enterText(find.byType(TextField), '我好纠结');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.send_rounded));
    await _settle(tester);

    expect(find.text('你是在走和留之间纠结吗？'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '在走和留之间');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.send_rounded));
    await _settle(tester);

    expect(client.replyCount, 1);
    expect(find.text('如果其中一个选项突然没了，你的第一反应是？'), findsOneWidget);
  });

  testWidgets('start failure shows error and retry recovers', (tester) async {
    final client = FakeV2Client([
      const InsightApiException(code: 'NETWORK_UNREACHABLE', message: '连不上'),
      _questioning(),
    ]);
    await tester.pumpWidget(_app(client));

    await tester.enterText(find.byType(TextField), '我要不要离职？');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.send_rounded));
    await _settle(tester);

    expect(find.text('连不上'), findsOneWidget);
    expect(find.text('重试'), findsOneWidget);

    await tester.tap(find.text('重试'));
    await _settle(tester);

    expect(client.startCount, 2);
    expect(find.text('如果其中一个选项突然没了，你的第一反应是？'), findsOneWidget);
  });

  testWidgets('regenerate requests a new question', (tester) async {
    final client = FakeV2Client([
      _questioning(id: 'q1'),
      _questioning(id: 'q1b'),
    ]);
    await tester.pumpWidget(_app(client));

    await tester.enterText(find.byType(TextField), '我要不要离职？');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.send_rounded));
    await _settle(tester);

    expect(find.text('换一题'), findsOneWidget);
    await tester.tap(find.text('换一题'));
    await _settle(tester);

    expect(client.regenerateCount, 1);
  });
}
