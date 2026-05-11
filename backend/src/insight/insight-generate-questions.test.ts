import { UnprocessableEntityException } from '@nestjs/common';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { InsightService } from './insight.service';

function createService(llmResponse: string) {
  const llm = {
    async completeChat() {
      return { text: llmResponse };
    },
  } as unknown as LlmService;

  const prisma = {
    user: {
      async upsert() {
        return { id: 'user-1' };
      },
    },
  } as unknown as PrismaService;

  return new InsightService(llm, prisma);
}

const validThreeQuestions = {
  questions: [
    {
      id: 'q1',
      dimension: 'inner_preference',
      title: 't1',
      options: [
        { id: 'A', label: 'a' },
        { id: 'B', label: 'b' },
      ],
    },
    {
      id: 'q2',
      dimension: 'fear_boundary',
      title: 't2',
      options: [
        { id: 'A', label: 'a' },
        { id: 'B', label: 'b' },
      ],
    },
    {
      id: 'q3',
      dimension: 'active_vs_avoidance',
      title: 't3',
      options: [
        { id: 'A', label: 'a' },
        { id: 'B', label: 'b' },
      ],
    },
  ],
};

describe('InsightService.generateQuestions', () => {
  test('parses three questions when LLM returns questions JSON', async () => {
    const service = createService(JSON.stringify(validThreeQuestions));
    const result = await service.generateQuestions(
      { rawQuestion: '该结婚的年龄单身没社交应该焦虑吗' } as GenerateQuestionsDto,
      { requestId: 'r1', deviceId: 'dev1' },
    );
    assert.equal(result.questions.length, 3);
  });

  test('422 INVALID_QUESTION_INPUT when LLM returns inScope false', async () => {
    const service = createService(
      JSON.stringify({
        inScope: false,
        message: '这是模型给出的范围外说明。',
      }),
    );
    await assert.rejects(
      () =>
        service.generateQuestions(
          { rawQuestion: '写一段 Python 快排' } as GenerateQuestionsDto,
          { requestId: 'r2', deviceId: 'dev1' },
        ),
      (err: unknown) => {
        assert.ok(err instanceof UnprocessableEntityException);
        const body = err.getResponse() as { code?: string; message?: string };
        assert.equal(body.code, 'INVALID_QUESTION_INPUT');
        assert.equal(body.message, '这是模型给出的范围外说明。');
        return true;
      },
    );
  });
});
