import {
  BadRequestException,
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import {
  InsightDimension,
  INSIGHT_DIMENSIONS,
  QuestionSnapshotDto,
} from './dto/question.dto';
import { SubmitInsightDto } from './dto/submit-insight.dto';
import {
  buildConclusionUserPrompt,
  CONCLUSION_SYSTEM_PROMPT,
} from './prompts/conclusion.prompt';
import {
  buildQuestionsUserPrompt,
  QUESTION_DIMENSIONS,
  QUESTIONS_SYSTEM_PROMPT,
} from './prompts/questions.prompt';
import { normalizeAndValidateRawQuestion } from './validators/question-input.validator';

export interface InsightQuestion {
  id: string;
  dimension: InsightDimension;
  title: string;
  options: Array<{ id: string; label: string }>;
}

export interface InsightRequestContext {
  requestId: string;
  deviceId?: string;
}

const questionOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

const insightQuestionSchema = z.object({
  id: z.string().min(1),
  dimension: z.enum(INSIGHT_DIMENSIONS),
  title: z.string().min(1),
  options: z.array(questionOptionSchema).min(2).max(4),
});

const questionsResponseSchema = z.object({
  questions: z
    .array(insightQuestionSchema)
    .length(3)
    .refine(
      (questions) =>
        questions.every(
          (question, index) => question.dimension === QUESTION_DIMENSIONS[index],
        ),
      'questions must use the required dimensions in order',
    ),
});

@Injectable()
export class InsightService {
  private readonly logger = new Logger(InsightService.name);

  constructor(
    private readonly llm: LlmService,
    private readonly prisma: PrismaService,
  ) {}

  async generateQuestions(
    dto: GenerateQuestionsDto,
    context: InsightRequestContext,
  ): Promise<{ questions: InsightQuestion[] }> {
    const startedAt = Date.now();
    let userId = 'unknown';

    try {
      const rawQuestion = normalizeAndValidateRawQuestion(dto, context.requestId);
      userId = await this.ensureUserId(context.deviceId);
      const completion = await this.llm.completeChat({
        system: QUESTIONS_SYSTEM_PROMPT,
        user: buildQuestionsUserPrompt(rawQuestion),
        temperature: 0.3,
      });
      const result = this.parseQuestions(completion.text);

      this.logInsightRequest({
        event: 'insight.questions.success',
        requestId: context.requestId,
        route: 'POST /v1/insight/questions',
        userId,
        durationMs: Date.now() - startedAt,
      });

      return result;
    } catch (error) {
      this.logInsightRequest({
        event: 'insight.questions.error',
        requestId: context.requestId,
        route: 'POST /v1/insight/questions',
        userId,
        durationMs: Date.now() - startedAt,
        errorCode: this.errorCodeFrom(error),
      });
      throw error;
    }
  }

  async submitInsight(
    dto: SubmitInsightDto,
    context: InsightRequestContext,
  ): Promise<{ conclusion: string }> {
    const startedAt = Date.now();
    let userId = 'unknown';

    try {
      const rawQuestion = normalizeAndValidateRawQuestion(dto, context.requestId);
      this.assertAnswerShape(dto.questions, dto.answers);
      userId = await this.ensureUserId(context.deviceId);

      const completion = await this.llm.completeChat({
        system: CONCLUSION_SYSTEM_PROMPT,
        user: buildConclusionUserPrompt({
          rawQuestion,
          questions: dto.questions,
          answers: dto.answers,
        }),
        temperature: 0.5,
      });
      const conclusion = completion.text.trim();
      if (!conclusion) {
        throw new BadGatewayException({
          code: 'LLM_OUTPUT_INVALID',
          message: 'LLM conclusion output was empty',
        });
      }

      await this.prisma.insightRound.create({
        data: {
          userId,
          rawQuestion,
          questionsJson: dto.questions as unknown as Prisma.InputJsonValue,
          answersJson: dto.answers as unknown as Prisma.InputJsonValue,
          conclusion,
          requestId: context.requestId,
        },
      });

      this.logInsightRequest({
        event: 'insight.submit.success',
        requestId: context.requestId,
        route: 'POST /v1/insight/submit',
        userId,
        durationMs: Date.now() - startedAt,
      });

      return { conclusion };
    } catch (error) {
      this.logInsightRequest({
        event: 'insight.submit.error',
        requestId: context.requestId,
        route: 'POST /v1/insight/submit',
        userId,
        durationMs: Date.now() - startedAt,
        errorCode: this.errorCodeFrom(error),
      });
      throw error;
    }
  }

  private parseQuestions(text: string): { questions: InsightQuestion[] } {
    const parsedJson = this.parseJsonObject(text);
    const result = questionsResponseSchema.safeParse(parsedJson);
    if (!result.success) {
      throw new BadGatewayException({
        code: 'LLM_OUTPUT_INVALID',
        message: 'LLM question output did not match the required schema',
      });
    }

    return result.data;
  }

  private parseJsonObject(text: string): unknown {
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      return JSON.parse(cleaned);
    } catch {
      throw new BadGatewayException({
        code: 'LLM_OUTPUT_INVALID',
        message: 'LLM question output was not valid JSON',
      });
    }
  }

  private assertAnswerShape(
    questions: QuestionSnapshotDto[],
    answers: Array<{ questionId: string; optionId: string }>,
  ): void {
    const questionById = new Map(questions.map((question) => [question.id, question]));
    for (const answer of answers) {
      const question = questionById.get(answer.questionId);
      const optionExists = question?.options.some(
        (option) => option.id === answer.optionId,
      );

      if (!question || !optionExists) {
        throw new UnprocessableEntityException({
          code: 'INVALID_INSIGHT_ANSWER',
          message: 'answers must reference provided questions and options',
        });
      }
    }
  }

  private async ensureUserId(deviceId?: string): Promise<string> {
    const normalizedDeviceId = deviceId?.trim();
    if (!normalizedDeviceId) {
      throw new BadRequestException({
        code: 'DEVICE_ID_REQUIRED',
        message: 'X-Device-Id header is required',
      });
    }

    const user = await this.prisma.user.upsert({
      where: { deviceId: normalizedDeviceId },
      update: {},
      create: { deviceId: normalizedDeviceId },
      select: { id: true },
    });

    return user.id;
  }

  private logInsightRequest(fields: {
    event: string;
    requestId: string;
    route: string;
    userId: string;
    durationMs: number;
    errorCode?: string;
  }): void {
    this.logger.log(JSON.stringify(fields));
  }

  private errorCodeFrom(error: unknown): string {
    if (!(error instanceof HttpException)) {
      return 'INTERNAL_SERVER_ERROR';
    }

    const response = error.getResponse();
    if (typeof response === 'string') {
      return response;
    }

    const body = response as { code?: string; error?: string };
    return body.code ?? body.error ?? `HTTP_${error.getStatus()}`;
  }
}
