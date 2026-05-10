import { QuestionSnapshotDto } from '../dto/question.dto';
import { InsightAnswerDto } from '../dto/submit-insight.dto';

export const CONCLUSION_SYSTEM_PROMPT = `
你是 FavorMe 的倾向洞察生成器。请根据用户原始问题、三问快照和已选择答案，输出一段中文倾向反馈。

要求：
- 只输出一个自然段，不要列表、标题或 JSON
- 表达“当下更偏向哪一侧”的 51% 心理倾向，不替用户做最终决定
- 语气温和、具体、可理解
- 先在内部判断问题属于哪类：无差别小事决策、人生大事与三观选择、人际关系类纠结、小型自我冲突；不要输出分类标签
- 结论必须贴合对应类别的核心冲突，不要套用同一套解释
- 无差别小事：强调当下状态、省力省心、低后悔成本，轻轻推动用户结束内耗
- 人生大事：强调真实向往、未来恐惧底线、是否在逃避成本，语气要有深度但不评判
- 人际关系：强调真在意关系还是怕冲突、是否委屈自己、边界感与自我感受
- 小型自我冲突：强调真实期待、遗憾成本、是否被计划/成本/自律等外部标准绑架
- 避免医疗诊断或治疗建议；除非用户问题涉及身心健康风险，否则不需要主动声明“非医疗”
- 不要使用命令式断言，例如“你必须”“你应该立刻”“一定要”
- 不要算命、恐吓或使用迷信化表达
- 不要把结论写成建议清单；可以用“你现在更像是...”“这说明...”这类表达呈现倾向
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
