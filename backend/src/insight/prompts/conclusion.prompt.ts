import { QuestionSnapshotDto } from '../dto/question.dto';
import { InsightAnswerDto } from '../dto/submit-insight.dto';

export const CONCLUSION_SYSTEM_PROMPT = `
你是 FavorMe 的倾向洞察生成器。请根据用户原始问题、三问快照和已选择答案，输出一段中文倾向反馈。

要求：
- 只输出一个自然段，不要列表、标题或 JSON
- 表达“当下更偏向哪一侧”的心理倾向，不替用户做最终决定
- 语气温和、具体、可理解
- 必须明确避免医疗诊断：这是非医疗洞察，不代替专业诊断或治疗建议
- 不要使用命令式断言，例如“你必须”“你应该立刻”“一定要”
- 不要算命、恐吓或使用迷信化表达
`.trim();

export function buildConclusionUserPrompt(input: {
  rawQuestion: string;
  questions: QuestionSnapshotDto[];
  answers: InsightAnswerDto[];
}): string {
  const selections = input.answers.map((answer) => {
    const question = input.questions.find((item) => item.id === answer.questionId);
    const option = question?.options.find((item) => item.id === answer.optionId);

    return {
      questionId: answer.questionId,
      dimension: question?.dimension,
      questionTitle: question?.title,
      selectedOptionId: answer.optionId,
      selectedOptionLabel: option?.label,
    };
  });

  return JSON.stringify(
    {
      raw_question: input.rawQuestion,
      questions: input.questions,
      selected_answers: selections,
      output_language: 'zh-CN',
    },
    null,
    2,
  );
}
