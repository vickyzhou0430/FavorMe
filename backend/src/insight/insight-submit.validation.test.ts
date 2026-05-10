import { HttpException } from '@nestjs/common';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitInsightDto } from './dto/submit-insight.dto';
import { InsightService } from './insight.service';
import { QUESTION_DIMENSIONS } from './prompts/questions.prompt';

type Question = SubmitInsightDto['questions'][number];
type Answer = SubmitInsightDto['answers'][number];

interface Counters {
  llmCalls: number;
  userUpserts: number;
  insightCreates: number;
}

const VALID_RAW_QUESTION = '我要不要换工作？';
const INVALID_CODE = 'INVALID_INSIGHT_ANSWER';

function createService() {
  const counters: Counters = {
    llmCalls: 0,
    userUpserts: 0,
    insightCreates: 0,
  };

  const llm = {
    async completeChat() {
      counters.llmCalls += 1;
      return { text: '你更倾向于尝试变化，但需要先确认风险边界。' };
    },
  } as unknown as LlmService;

  const prisma = {
    user: {
      async upsert() {
        counters.userUpserts += 1;
        return { id: 'user-1' };
      },
    },
    insightRound: {
      async create() {
        counters.insightCreates += 1;
        return { id: 'round-1' };
      },
    },
  } as unknown as PrismaService;

  return {
    counters,
    service: new InsightService(llm, prisma),
  };
}

function validQuestions(): Question[] {
  return QUESTION_DIMENSIONS.map((dimension, index) => ({
    id: `q${index + 1}`,
    dimension,
    title: `第 ${index + 1} 题`,
    options: [
      { id: 'A', label: '选项 A' },
      { id: 'B', label: '选项 B' },
    ],
  }));
}

function validAnswers(): Answer[] {
  return [
    { questionId: 'q1', optionId: 'A' },
    { questionId: 'q2', optionId: 'B' },
    { questionId: 'q3', optionId: 'A' },
  ];
}

function submitDto(
  overrides: Partial<Pick<SubmitInsightDto, 'questions' | 'answers'>> = {},
): SubmitInsightDto {
  return {
    rawQuestion: VALID_RAW_QUESTION,
    questions: validQuestions(),
    answers: validAnswers(),
    ...overrides,
  };
}

async function assertInvalidSubmit(dto: SubmitInsightDto) {
  const { service, counters } = createService();

  await assert.rejects(
    () =>
      service.submitInsight(dto, {
        requestId: 'req-test',
        deviceId: 'device-test',
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpException);
      assert.equal(error.getStatus(), 422);
      assert.equal(
        (error.getResponse() as { code?: string }).code,
        INVALID_CODE,
      );
      return true;
    },
  );

  assert.equal(counters.llmCalls, 0);
  assert.equal(counters.userUpserts, 0);
  assert.equal(counters.insightCreates, 0);
}

describe('InsightService submit validation', () => {
  test('complete three-question payload resolves and persists once', async () => {
    const { service, counters } = createService();

    const result = await service.submitInsight(submitDto(), {
      requestId: 'req-test',
      deviceId: 'device-test',
    });

    assert.equal(result.conclusion, '你更倾向于尝试变化，但需要先确认风险边界。');
    assert.equal(counters.llmCalls, 1);
    assert.equal(counters.userUpserts, 1);
    assert.equal(counters.insightCreates, 1);
  });

  test('fewer than three questions rejects before LLM or persistence', async () => {
    await assertInvalidSubmit(
      submitDto({
        questions: validQuestions().slice(0, 2),
      }),
    );
  });

  test('fewer than three answers rejects before LLM or persistence', async () => {
    await assertInvalidSubmit(
      submitDto({
        answers: validAnswers().slice(0, 2),
      }),
    );
  });

  test('duplicate question IDs reject before LLM or persistence', async () => {
    const questions = validQuestions();
    questions[1] = { ...questions[1], id: 'q1' };

    await assertInvalidSubmit(submitDto({ questions }));
  });

  test('duplicate answer questionId values reject before LLM or persistence', async () => {
    const answers = validAnswers();
    answers[1] = { ...answers[1], questionId: 'q1' };

    await assertInvalidSubmit(submitDto({ answers }));
  });

  test('tampered snapshots reject before LLM or persistence', async () => {
    const outOfOrderQuestions = validQuestions();
    [outOfOrderQuestions[0], outOfOrderQuestions[1]] = [
      outOfOrderQuestions[1],
      outOfOrderQuestions[0],
    ];

    await assertInvalidSubmit(submitDto({ questions: outOfOrderQuestions }));

    await assertInvalidSubmit(
      submitDto({
        answers: [
          { questionId: 'missing-question', optionId: 'A' },
          ...validAnswers().slice(1),
        ],
      }),
    );

    await assertInvalidSubmit(
      submitDto({
        answers: [
          { questionId: 'q1', optionId: 'missing-option' },
          ...validAnswers().slice(1),
        ],
      }),
    );

    const tooFewOptions = validQuestions();
    tooFewOptions[0] = {
      ...tooFewOptions[0],
      options: [{ id: 'A', label: '选项 A' }],
    };

    await assertInvalidSubmit(submitDto({ questions: tooFewOptions }));
  });
});
