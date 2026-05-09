import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import {
  InsightDimension,
  QuestionSnapshotDto,
} from './dto/question.dto';
import { SubmitInsightDto } from './dto/submit-insight.dto';

export interface InsightQuestion {
  id: string;
  dimension: InsightDimension;
  title: string;
  options: Array<{ id: string; label: string }>;
}

@Injectable()
export class InsightService {
  generateQuestions(dto: GenerateQuestionsDto): { questions: InsightQuestion[] } {
    this.normalizeRawQuestion(dto);

    return {
      questions: [
        {
          id: 'q1',
          dimension: 'inner_preference',
          title: '如果暂时不考虑别人期待，你更希望事情走向哪一边？',
          options: [
            { id: 'stay_close', label: '保持现在的节奏' },
            { id: 'move_forward', label: '尝试往前推进' },
          ],
        },
        {
          id: 'q2',
          dimension: 'fear_boundary',
          title: '想到最坏情况时，哪一种更让你难以接受？',
          options: [
            { id: 'regret_inaction', label: '因为没试而后悔' },
            { id: 'regret_cost', label: '投入后发现不值得' },
          ],
        },
        {
          id: 'q3',
          dimension: 'active_vs_avoidance',
          title: '你现在更像是在靠近想要的，还是远离不舒服的？',
          options: [
            { id: 'active_choice', label: '靠近真正想要的体验' },
            { id: 'avoidance_choice', label: '想尽快摆脱当前压力' },
          ],
        },
      ],
    };
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
    const rawQuestion = (dto.rawQuestion ?? dto.raw_question ?? '').trim();
    if (!rawQuestion) {
      throw new UnprocessableEntityException({
        code: 'INVALID_QUESTION_INPUT',
        message: 'rawQuestion is required',
      });
    }

    return rawQuestion;
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
