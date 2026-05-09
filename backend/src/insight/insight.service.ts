import {
  BadGatewayException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { z } from 'zod';
import { LlmService } from '../llm/llm.service';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import {
  InsightDimension,
  INSIGHT_DIMENSIONS,
  QuestionSnapshotDto,
} from './dto/question.dto';
import { SubmitInsightDto } from './dto/submit-insight.dto';
import {
  buildQuestionsUserPrompt,
  QUESTION_DIMENSIONS,
  QUESTIONS_SYSTEM_PROMPT,
} from './prompts/questions.prompt';

export interface InsightQuestion {
  id: string;
  dimension: InsightDimension;
  title: string;
  options: Array<{ id: string; label: string }>;
}

const MAX_RAW_QUESTION_CHARS = 2000;

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
  constructor(private readonly llm: LlmService) {}

  async generateQuestions(
    dto: GenerateQuestionsDto,
  ): Promise<{ questions: InsightQuestion[] }> {
    const rawQuestion = this.normalizeRawQuestion(dto);
    const completion = await this.llm.completeChat({
      system: QUESTIONS_SYSTEM_PROMPT,
      user: buildQuestionsUserPrompt(rawQuestion),
      temperature: 0.3,
    });

    return this.parseQuestions(completion.text);
  }

  submitInsight(dto: SubmitInsightDto): { conclusion: string } {
    this.normalizeRawQuestion(dto);
    this.assertAnswerShape(dto.questions, dto.answers);

    return {
      conclusion:
        '从这次选择看，你可能略微更靠近主动尝试的一侧。这个结论只是帮助你看见当下倾向，不替你做最终决定。',
    };
  }

  private normalizeRawQuestion(dto: {
    rawQuestion?: string;
    raw_question?: string;
  }): string {
    const rawQuestion = (dto.rawQuestion ?? dto.raw_question ?? '')
      .trim()
      .slice(0, MAX_RAW_QUESTION_CHARS);
    if (!rawQuestion) {
      throw new UnprocessableEntityException({
        code: 'INVALID_QUESTION_INPUT',
        message: 'rawQuestion is required',
      });
    }

    return rawQuestion;
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
}
