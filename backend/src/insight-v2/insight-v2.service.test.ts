import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { ChatMessage, LlmService } from '../llm/llm.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { PromptService } from '../prompt/prompt.service';
import { InsightV2Service } from './insight-v2.service';
import {
  buildAnswerUserMessage,
  type InsightV2StrategyKey,
} from './prompts/insight-v2.prompt';

const ctx = { requestId: 'r1', deviceId: 'dev1' };

function questioning(strategy: InsightV2StrategyKey): string {
  return JSON.stringify({
    status: 'questioning',
    question: {
      question: '如果其中一个选项突然消失了，你的第一反应是？',
      option_a: '松了口气',
      option_b: '有点失落',
      strategy,
      reasoning: '内部推理',
    },
  });
}

function finished(): string {
  return JSON.stringify({
    status: 'finished',
    report: {
      awakening_quote: '你早就决定了，只是在等一个允许。',
      analysis: '从你的选择看，你倾向于……',
      tendency: '倾向离开',
      action_advice: '今天先做一件小事去验证。',
    },
  });
}

function needInfo(): string {
  return JSON.stringify({ status: 'need_info', clarify_question: '你是在走和留之间纠结吗？' });
}

interface StoredSession {
  id: string;
  createdAt: Date;
  status: string;
  dilemma: string;
  transcriptJson: unknown;
  answersJson: unknown;
  strategiesJson: unknown;
  clarifyCount: number;
  awakeningQuote?: string | null;
  tendency?: string | null;
  analysis?: string | null;
  actionAdvice?: string | null;
  requestId: string;
}

function createHarness(
  llmResponses: string[],
  initialSession?: Partial<StoredSession>,
  promptOverride?: string,
) {
  const calls: ChatMessage[][] = [];
  const systems: string[] = [];
  let idx = 0;
  const llm = {
    async completeChat(input: { messages?: ChatMessage[]; system?: string }) {
      calls.push(input.messages ?? []);
      systems.push(input.system ?? '');
      const text = llmResponses[Math.min(idx, llmResponses.length - 1)];
      idx += 1;
      return { text, latencyMs: 1 };
    },
  } as unknown as LlmService;

  const prompts = {
    isOverrideEnabled: () => promptOverride != null,
    async getEffectivePrompt(_key: string, fallback: string) {
      return promptOverride ?? fallback;
    },
  } as unknown as PromptService;

  let stored: StoredSession | null = initialSession
    ? {
        id: 'sess-1',
        createdAt: new Date(),
        status: 'questioning',
        dilemma: 'placeholder',
        transcriptJson: [],
        answersJson: [],
        strategiesJson: [],
        clarifyCount: 0,
        requestId: 'r1',
        ...initialSession,
      }
    : null;

  const prisma = {
    user: { async upsert() { return { id: 'user-1' }; } },
    insightV2Session: {
      async create({ data }: { data: Record<string, unknown> }) {
        stored = { id: 'sess-1', createdAt: new Date(), ...(data as object) } as StoredSession;
        return { id: stored.id };
      },
      async findFirst() {
        return stored;
      },
      async update({ data }: { data: Record<string, unknown> }) {
        stored = { ...(stored as StoredSession), ...(data as object) };
        return stored;
      },
      async findMany() {
        return [];
      },
    },
  } as unknown as PrismaService;

  const service = new InsightV2Service(llm, prisma, prompts);
  return { service, calls, systems, getStored: () => stored };
}

const DILEMMA = '我到底要不要从现在的公司离职去创业，很纠结，走还是留';

describe('InsightV2Service.startSession', () => {
  test('returns questioning on first turn', async () => {
    const { service } = createHarness([questioning('loss_aversion')]);
    const turn = await service.startSession({ dilemma: DILEMMA }, ctx);
    assert.equal(turn.status, 'questioning');
    assert.equal(turn.askedCount, 1);
    assert.equal((turn.content as { questionId: string }).questionId, 'q1');
    assert.equal((turn.content as { optionA: string }).optionA, '松了口气');
  });

  test('returns need_info when model asks to clarify', async () => {
    const { service } = createHarness([needInfo()]);
    const turn = await service.startSession({ dilemma: '我好纠结啊' }, ctx);
    assert.equal(turn.status, 'need_info');
    assert.equal((turn.content as { clarifyQuestion: string }).clarifyQuestion, '你是在走和留之间纠结吗？');
  });

  test('guard: model finishes too early -> server forces a question', async () => {
    const { service, calls } = createHarness([finished(), questioning('loss_aversion')]);
    const turn = await service.startSession({ dilemma: DILEMMA }, ctx);
    assert.equal(turn.status, 'questioning');
    assert.equal(calls.length, 2);
    const lastMsg = calls[1][calls[1].length - 1];
    assert.equal(lastMsg.role, 'user');
    assert.match(lastMsg.content, /必须继续出题/);
  });

  test('robust parse: extracts JSON wrapped in markdown fences', async () => {
    const wrapped = '```json\n' + questioning('loss_aversion') + '\n```';
    const { service } = createHarness([wrapped]);
    const turn = await service.startSession({ dilemma: DILEMMA }, ctx);
    assert.equal(turn.status, 'questioning');
  });

  test('robust parse: strips control characters', async () => {
    const dirty = questioning('loss_aversion').replace('{', '{\u0000');
    const { service } = createHarness([dirty]);
    const turn = await service.startSession({ dilemma: DILEMMA }, ctx);
    assert.equal(turn.status, 'questioning');
  });

  test('uses the runtime prompt override when provided', async () => {
    const override = '我是被覆盖的调试提示词。';
    const { service, systems } = createHarness(
      [questioning('loss_aversion')],
      undefined,
      override,
    );
    await service.startSession({ dilemma: DILEMMA }, ctx);
    assert.equal(systems[0], override);
  });
});

describe('InsightV2Service.submitTurn — dynamic collection guards', () => {
  function sessionWith(strategies: InsightV2StrategyKey[]): Partial<StoredSession> {
    const last = strategies[strategies.length - 1];
    const transcript: ChatMessage[] = [
      { role: 'user', content: '初始描述' },
      { role: 'assistant', content: questioning(last) },
    ];
    const answers = strategies.slice(0, -1).map((s, i) => ({
      questionId: `q${i + 1}`,
      strategy: s,
      questionText: 'q',
      optionA: 'A',
      optionB: 'B',
      level: 'a',
    }));
    return {
      status: 'questioning',
      transcriptJson: transcript,
      strategiesJson: strategies,
      answersJson: answers,
    };
  }

  test('accepts finish once >=2 questions and a deep strategy used', async () => {
    const { service } = createHarness([finished()], sessionWith([
      'behavioral_verification',
      'identity_based',
    ]));
    const turn = await service.submitTurn('sess-1', { action: 'answer', level: 'b' }, ctx);
    assert.equal(turn.status, 'finished');
    assert.equal((turn.content as { awakeningQuote: string }).awakeningQuote, '你早就决定了，只是在等一个允许。');
    assert.equal((turn.content as { trajectory: unknown[] }).trajectory.length, 2);
  });

  test('forces questioning when finishing without a deep strategy', async () => {
    const { service, calls } = createHarness([finished(), questioning('regret_minimization')], sessionWith([
      'loss_aversion',
      'extreme_scenario',
    ]));
    const turn = await service.submitTurn('sess-1', { action: 'answer', level: 'a' }, ctx);
    assert.equal(turn.status, 'questioning');
    assert.equal(calls.length, 2);
  });

  test('forces finish at the max-question cap', async () => {
    const { service, calls } = createHarness([questioning('self_determination'), finished()], sessionWith([
      'loss_aversion',
      'behavioral_verification',
      'extreme_scenario',
      'identity_based',
      'regret_minimization',
    ]));
    const turn = await service.submitTurn('sess-1', { action: 'answer', level: 'a' }, ctx);
    assert.equal(turn.status, 'finished');
    assert.equal(calls.length, 2);
    const lastMsg = calls[1][calls[1].length - 1];
    assert.match(lastMsg.content, /必须收题/);
  });

  test('rejects consecutive identical strategy', async () => {
    const { service, calls } = createHarness([questioning('loss_aversion'), questioning('extreme_scenario')], sessionWith([
      'loss_aversion',
    ]));
    const turn = await service.submitTurn('sess-1', { action: 'answer', level: 'a' }, ctx);
    assert.equal(turn.status, 'questioning');
    assert.equal((turn.content as { strategy: string }).strategy, 'extreme_scenario');
    assert.equal(calls.length, 2);
    assert.match(calls[1][calls[1].length - 1].content, /禁止使用同一策略/);
  });

  test('forces questioning after clarify cap is hit', async () => {
    const { service, calls } = createHarness([needInfo(), questioning('loss_aversion')], {
      status: 'need_info',
      strategiesJson: [],
      answersJson: [],
      clarifyCount: 1,
      transcriptJson: [
        { role: 'user', content: '初始描述' },
        { role: 'assistant', content: needInfo() },
      ],
    });
    const turn = await service.submitTurn('sess-1', { action: 'reply', replyText: '补充信息' }, ctx);
    assert.equal(turn.status, 'questioning');
    assert.equal(calls.length, 2);
  });
});

describe('five-level passback', () => {
  test('encodes degree and option text', () => {
    assert.match(buildAnswerUserMessage('a', '优A', '劣B'), /完全认同/);
    assert.match(buildAnswerUserMessage('lean_a', '优A', '劣B'), /偏A/);
    const middle = buildAnswerUserMessage('middle', '优A', '劣B');
    assert.ok(middle.includes('优A') && middle.includes('劣B'));
    assert.match(buildAnswerUserMessage('lean_b', '优A', '劣B'), /偏B/);
    assert.match(buildAnswerUserMessage('b', '优A', '劣B'), /完全认同/);
  });
});
