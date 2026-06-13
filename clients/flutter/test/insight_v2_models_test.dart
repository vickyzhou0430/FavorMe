import 'package:favorme_flutter/src/features/insight_v2/insight_v2_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('InsightV2Turn.fromJson', () {
    test('parses a questioning turn', () {
      final turn = InsightV2Turn.fromJson({
        'sessionId': 's1',
        'status': 'questioning',
        'askedCount': 1,
        'clarifyCount': 0,
        'content': {
          'questionId': 'q1',
          'strategy': 'loss_aversion',
          'strategyLabel': '损失厌恶测试',
          'questionText': '如果其中一个选项突然没了？',
          'optionA': '松了口气',
          'optionB': '有点失落',
        },
      });
      expect(turn.status, InsightV2Status.questioning);
      expect(turn.askedCount, 1);
      expect(turn.question, isNotNull);
      expect(turn.question!.optionB, '有点失落');
      expect(turn.question!.strategyLabel, '损失厌恶测试');
    });

    test('parses a need_info turn', () {
      final turn = InsightV2Turn.fromJson({
        'sessionId': 's1',
        'status': 'need_info',
        'askedCount': 0,
        'clarifyCount': 0,
        'content': {'clarifyQuestion': '你是在走和留之间纠结吗？'},
      });
      expect(turn.status, InsightV2Status.needInfo);
      expect(turn.clarifyQuestion, '你是在走和留之间纠结吗？');
      expect(turn.question, isNull);
    });

    test('parses a finished turn with trajectory', () {
      final turn = InsightV2Turn.fromJson({
        'sessionId': 's1',
        'status': 'finished',
        'askedCount': 3,
        'clarifyCount': 0,
        'content': {
          'awakeningQuote': '你早就决定了，只是在等一个允许。',
          'tendency': '倾向离开',
          'analysis': '从你的选择看……',
          'actionAdvice': '今天先做一件小事。',
          'trajectory': [
            {
              'questionId': 'q1',
              'strategy': 'loss_aversion',
              'strategyLabel': '损失厌恶测试',
              'questionText': 'Q1',
              'optionA': 'A',
              'optionB': 'B',
              'level': 'lean_a',
            },
          ],
        },
      });
      expect(turn.status, InsightV2Status.finished);
      expect(turn.report, isNotNull);
      expect(turn.report!.awakeningQuote, contains('你早就决定了'));
      expect(turn.report!.trajectory, hasLength(1));
      expect(turn.report!.trajectory.first.level, InsightV2Level.leanA);
    });

    test('throws on missing sessionId', () {
      expect(
        () => InsightV2Turn.fromJson({'status': 'questioning'}),
        throwsA(isA<FormatException>()),
      );
    });
  });

  group('history parsing', () {
    test('parses a history page', () {
      final page = InsightV2HistoryPage.fromJson({
        'items': [
          {
            'id': 'sess-1',
            'dilemma': '要不要离职',
            'status': 'finished',
            'askedCount': 3,
            'awakeningQuote': '金句',
            'tendency': '离开',
            'createdAt': '2026-06-13T12:00:00.000Z',
          },
        ],
        'nextCursor': 'sess-1',
      });
      expect(page.items, hasLength(1));
      expect(page.items.first.tendency, '离开');
      expect(page.nextCursor, 'sess-1');
      expect(page.items.first.createdAt, isNotNull);
    });
  });
}
