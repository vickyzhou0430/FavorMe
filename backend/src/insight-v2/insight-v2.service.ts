import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  LlmService,
  type ChatMessage,
} from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { PromptService } from '../prompt/prompt.service';
import { normalizeAndValidateRawQuestion } from '../insight/validators/question-input.validator';
import {
  type ProfileGender,
  type ProfileMbti,
  type ProfileZodiac,
} from '../users/profile.constants';
import { StartSessionDto } from './dto/start-session.dto';
import { SubmitTurnDto } from './dto/submit-turn.dto';
import {
  INSIGHT_V2_DEEP_STRATEGIES,
  INSIGHT_V2_MAX_CLARIFY,
  INSIGHT_V2_MAX_QUESTIONS,
  INSIGHT_V2_MIN_QUESTIONS,
  INSIGHT_V2_STRATEGY_KEYS,
  INSIGHT_V2_STRATEGY_LABELS,
  INSIGHT_V2_SYSTEM_PROMPT,
  buildAnswerUserMessage,
  buildAvoidStrategyHint,
  buildForceFinishHint,
  buildForceQuestioningHint,
  buildInitialUserMessage,
  INSIGHT_V2_SYSTEM_PROMPT_KEY,
  type InsightV2Level,
  type InsightV2StrategyKey,
} from './prompts/insight-v2.prompt';
import {
  INSIGHT_V2_PROFILE_PROMPT_KEY,
  INSIGHT_V2_PROFILE_PROMPT_SEPARATOR,
  INSIGHT_V2_PROFILE_PROMPT_TEMPLATE,
  computeAge,
  hasAnyProfileSignal,
  renderProfileAugmentation,
} from './prompts/insight-v2-profile.prompt';

export interface InsightV2RequestContext {
  requestId: string;
  deviceId?: string;
}

type TurnStatus = 'need_info' | 'questioning' | 'finished';

/** 已作答题目的轨迹项。 */
interface TrajectoryItem {
  questionId: string;
  strategy: InsightV2StrategyKey;
  questionText: string;
  optionA: string;
  optionB: string;
  level: InsightV2Level;
}

/** 客户端面的一轮结果。 */
export interface ClientTurn {
  sessionId: string;
  status: TurnStatus;
  askedCount: number;
  clarifyCount: number;
  content: Record<string, unknown>;
}

const questionSchema = z.object({
  question: z.string().min(1),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  strategy: z.enum(INSIGHT_V2_STRATEGY_KEYS),
  reasoning: z.string().optional(),
});

const reportSchema = z.object({
  awakening_quote: z.string().min(1),
  analysis: z.string().min(1),
  tendency: z.string().min(1),
  action_advice: z.string().min(1),
});

const turnSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('need_info'), clarify_question: z.string().min(1) }),
  z.object({ status: z.literal('questioning'), question: questionSchema }),
  z.object({ status: z.literal('finished'), report: reportSchema }),
]);

type ParsedTurn = z.infer<typeof turnSchema>;

@Injectable()
export class InsightV2Service {
  private readonly logger = new Logger(InsightV2Service.name);

  constructor(
    private readonly llm: LlmService,
    private readonly prisma: PrismaService,
    private readonly prompts: PromptService,
  ) {}

  async startSession(
    dto: StartSessionDto,
    context: InsightV2RequestContext,
  ): Promise<ClientTurn> {
    const dilemma = normalizeAndValidateRawQuestion(
      { rawQuestion: dto.dilemma, raw_question: dto.raw_question },
      context.requestId,
    );
    const userId = await this.ensureUserId(context.deviceId);
    const profileAugmentation = await this.loadProfileAugmentation(userId);

    const transcript: ChatMessage[] = [
      { role: 'user', content: buildInitialUserMessage(dilemma) },
    ];
    const strategies: InsightV2StrategyKey[] = [];

    const parsed = await this.runTurn(
      transcript,
      { strategies, clarifyCount: 0 },
      profileAugmentation,
    );

    const assistantContent = JSON.stringify(parsed);
    transcript.push({ role: 'assistant', content: assistantContent });
    if (parsed.status === 'questioning') {
      strategies.push(parsed.question.strategy);
    }

    const session = await this.prisma.insightV2Session.create({
      data: {
        userId,
        status: parsed.status,
        dilemma,
        transcriptJson: transcript as unknown as Prisma.InputJsonValue,
        answersJson: [] as unknown as Prisma.InputJsonValue,
        strategiesJson: strategies as unknown as Prisma.InputJsonValue,
        clarifyCount: 0,
        requestId: context.requestId,
        ...this.reportColumns(parsed),
      },
      select: { id: true },
    });

    this.log('insightV2.start.success', context.requestId, userId, session.id);
    return this.toClientTurn(session.id, parsed, strategies, [], 0);
  }

  async submitTurn(
    sessionId: string,
    dto: SubmitTurnDto,
    context: InsightV2RequestContext,
  ): Promise<ClientTurn> {
    const userId = await this.ensureUserId(context.deviceId);
    const profileAugmentation = await this.loadProfileAugmentation(userId);
    const session = await this.loadSession(sessionId, userId);

    if (session.status === 'finished') {
      throw new BadRequestException({
        code: 'SESSION_ALREADY_FINISHED',
        message: '该会话已结束，请开启新的会话。',
      });
    }

    const transcript = this.parseTranscript(session.transcriptJson);
    const strategies = this.parseStrategies(session.strategiesJson);
    const answers = this.parseAnswers(session.answersJson);
    let clarifyCount = session.clarifyCount;

    if (dto.action === 'answer') {
      const current = this.currentQuestion(transcript);
      if (!current) {
        throw new BadRequestException({
          code: 'NO_ACTIVE_QUESTION',
          message: '当前没有待作答的题目。',
        });
      }
      if (!dto.level) {
        throw new BadRequestException({
          code: 'LEVEL_REQUIRED',
          message: 'level is required for action=answer',
        });
      }
      const questionId = `q${strategies.length}`;
      if (dto.questionId && dto.questionId !== questionId) {
        throw new BadRequestException({
          code: 'QUESTION_ID_MISMATCH',
          message: '提交的题目与当前题目不一致。',
        });
      }
      transcript.push({
        role: 'user',
        content: buildAnswerUserMessage(dto.level, current.option_a, current.option_b),
      });
      answers.push({
        questionId,
        strategy: current.strategy,
        questionText: current.question,
        optionA: current.option_a,
        optionB: current.option_b,
        level: dto.level,
      });
    } else if (dto.action === 'reply') {
      const replyText = dto.replyText?.trim();
      if (!replyText) {
        throw new BadRequestException({
          code: 'REPLY_REQUIRED',
          message: 'replyText is required for action=reply',
        });
      }
      transcript.push({ role: 'user', content: replyText });
      clarifyCount += 1;
    } else {
      // regenerate：弃用上一道题，换策略重出（不计入已答题数）。
      const popped = this.popLastQuestion(transcript);
      if (!popped) {
        throw new BadRequestException({
          code: 'NO_ACTIVE_QUESTION',
          message: '当前没有可替换的题目。',
        });
      }
      strategies.pop();
      transcript.push({
        role: 'user',
        content: buildAvoidStrategyHint(popped.strategy),
      });
    }

    const parsed = await this.runTurn(
      transcript,
      { strategies, clarifyCount },
      profileAugmentation,
    );
    transcript.push({ role: 'assistant', content: JSON.stringify(parsed) });
    if (parsed.status === 'questioning') {
      strategies.push(parsed.question.strategy);
    }

    await this.prisma.insightV2Session.update({
      where: { id: session.id },
      data: {
        status: parsed.status,
        transcriptJson: transcript as unknown as Prisma.InputJsonValue,
        answersJson: answers as unknown as Prisma.InputJsonValue,
        strategiesJson: strategies as unknown as Prisma.InputJsonValue,
        clarifyCount,
        ...this.reportColumns(parsed),
      },
    });

    this.log('insightV2.turn.success', context.requestId, userId, session.id);
    return this.toClientTurn(session.id, parsed, strategies, answers, clarifyCount);
  }

  async getSession(
    sessionId: string,
    context: InsightV2RequestContext,
  ): Promise<Record<string, unknown>> {
    const userId = await this.ensureUserId(context.deviceId);
    const session = await this.loadSession(sessionId, userId);
    const answers = this.parseAnswers(session.answersJson);
    const strategies = this.parseStrategies(session.strategiesJson);

    return {
      sessionId: session.id,
      status: session.status,
      dilemma: session.dilemma,
      askedCount: strategies.length,
      clarifyCount: session.clarifyCount,
      createdAt: session.createdAt,
      trajectory: answers.map((a) => this.trajectoryView(a)),
      report:
        session.status === 'finished'
          ? {
              awakeningQuote: session.awakeningQuote,
              tendency: session.tendency,
              analysis: session.analysis,
              actionAdvice: session.actionAdvice,
            }
          : null,
    };
  }

  async listSessions(
    context: InsightV2RequestContext,
    options: { limit?: number; cursor?: string },
  ): Promise<{ items: Array<Record<string, unknown>>; nextCursor: string | null }> {
    const userId = await this.ensureUserId(context.deviceId);
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);

    const rows = await this.prisma.insightV2Session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.map((s) => ({
        id: s.id,
        dilemma: s.dilemma,
        awakeningQuote: s.awakeningQuote,
        tendency: s.tendency,
        askedCount: this.parseStrategies(s.strategiesJson).length,
        status: s.status,
        createdAt: s.createdAt,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  /** 读取当前生效提示词与覆盖状态（debug 调参用）。 */
  async getPromptInfo(): Promise<Record<string, unknown>> {
    const enabled = this.prompts.isOverrideEnabled();
    const override = await this.prompts.getOverride(INSIGHT_V2_SYSTEM_PROMPT_KEY);
    const hasOverride = !!override?.content?.trim();
    return {
      key: INSIGHT_V2_SYSTEM_PROMPT_KEY,
      enabled,
      hasOverride,
      defaultPrompt: INSIGHT_V2_SYSTEM_PROMPT,
      effectivePrompt:
        enabled && hasOverride ? override!.content : INSIGHT_V2_SYSTEM_PROMPT,
      override: override
        ? {
            content: override.content,
            updatedAt: override.updatedAt,
            updatedBy: override.updatedBy,
          }
        : null,
    };
  }

  /** 上传覆盖提示词。仅在功能开启时允许。 */
  async setPrompt(content: string, updatedBy?: string): Promise<Record<string, unknown>> {
    this.assertOverrideEnabled();
    await this.prompts.setOverride(INSIGHT_V2_SYSTEM_PROMPT_KEY, content, updatedBy);
    return this.getPromptInfo();
  }

  /** 清除覆盖，回退到内置默认。仅在功能开启时允许。 */
  async resetPrompt(): Promise<Record<string, unknown>> {
    this.assertOverrideEnabled();
    await this.prompts.clearOverride(INSIGHT_V2_SYSTEM_PROMPT_KEY);
    return this.getPromptInfo();
  }

  private assertOverrideEnabled(): void {
    if (!this.prompts.isOverrideEnabled()) {
      throw new ForbiddenException({
        code: 'PROMPT_OVERRIDE_DISABLED',
        message:
          'Prompt 覆盖功能未开启。请在后端设置 INSIGHT_V2_PROMPT_OVERRIDE_ENABLED=true 后重启。',
      });
    }
  }

  /**
   * 调一轮模型 + 服务端收题护栏（最多一次纠正性重调）。
   */
  private async runTurn(
    baseMessages: ChatMessage[],
    state: { strategies: InsightV2StrategyKey[]; clarifyCount: number },
    profileAugmentation: string | null,
  ): Promise<ParsedTurn> {
    const askedCount = state.strategies.length;
    const lastStrategy = state.strategies[state.strategies.length - 1];
    const mustFinish = askedCount >= INSIGHT_V2_MAX_QUESTIONS;
    const canFinish =
      askedCount >= INSIGHT_V2_MIN_QUESTIONS && this.hasDeepStrategy(state.strategies);

    let parsed = await this.callModel(baseMessages, undefined, profileAugmentation);
    const hint = this.correctiveHint(parsed, {
      askedCount,
      mustFinish,
      canFinish,
      lastStrategy,
      clarifyCount: state.clarifyCount,
    });

    if (hint) {
      parsed = await this.callModel(baseMessages, hint, profileAugmentation);
      // 二次仍越界则记录告警，按模型结果放行（避免死循环）。
      const stillWrong = this.correctiveHint(parsed, {
        askedCount,
        mustFinish,
        canFinish,
        lastStrategy,
        clarifyCount: state.clarifyCount,
      });
      if (stillWrong) {
        this.logger.warn(
          JSON.stringify({
            event: 'insightV2.guard.unresolved',
            askedCount,
            status: parsed.status,
          }),
        );
      }
    }

    return parsed;
  }

  private correctiveHint(
    parsed: ParsedTurn,
    ctx: {
      askedCount: number;
      mustFinish: boolean;
      canFinish: boolean;
      lastStrategy?: InsightV2StrategyKey;
      clarifyCount: number;
    },
  ): string | null {
    if (parsed.status === 'finished') {
      if (ctx.mustFinish || ctx.canFinish) {
        return null;
      }
      return buildForceQuestioningHint(ctx.askedCount);
    }

    if (parsed.status === 'questioning') {
      if (ctx.mustFinish) {
        return buildForceFinishHint();
      }
      if (ctx.lastStrategy && parsed.question.strategy === ctx.lastStrategy) {
        return buildAvoidStrategyHint(ctx.lastStrategy);
      }
      return null;
    }

    // need_info：超过追问上限仍要更多信息时，强制出题。
    if (ctx.clarifyCount >= INSIGHT_V2_MAX_CLARIFY) {
      return buildForceQuestioningHint(ctx.askedCount);
    }
    return null;
  }

  private async callModel(
    baseMessages: ChatMessage[],
    hint: string | undefined,
    profileAugmentation: string | null,
  ): Promise<ParsedTurn> {
    const messages = hint
      ? [...baseMessages, { role: 'user' as const, content: hint }]
      : baseMessages;

    const baseSystem = await this.prompts.getEffectivePrompt(
      INSIGHT_V2_SYSTEM_PROMPT_KEY,
      INSIGHT_V2_SYSTEM_PROMPT,
    );
    const system = profileAugmentation
      ? `${baseSystem}${INSIGHT_V2_PROFILE_PROMPT_SEPARATOR}${profileAugmentation}`
      : baseSystem;

    const completion = await this.llm.completeChat({
      system,
      messages,
      responseFormat: 'json_object',
      temperature: 0.6,
    });

    return this.parseModelTurn(completion.text);
  }

  private parseModelTurn(text: string): ParsedTurn {
    const json = this.robustParseJson(text);
    if (!json) {
      throw new BadGatewayException({
        code: 'LLM_OUTPUT_INVALID',
        message: 'LLM output was not valid JSON',
      });
    }
    const result = turnSchema.safeParse(json);
    if (!result.success) {
      throw new BadGatewayException({
        code: 'LLM_OUTPUT_INVALID',
        message: 'LLM output did not match the required schema',
      });
    }
    return result.data;
  }

  /** 四重健壮 JSON 解析（移植自 demo）。 */
  private robustParseJson(text: string): unknown {
    const s = text.trim();
    // 1. 直接解析
    try {
      return JSON.parse(s);
    } catch {
      /* noop */
    }
    // 2. 移除控制字符（清洗 LLM 脏输出，控制字符为有意匹配）
    // eslint-disable-next-line no-control-regex
    const c1 = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    try {
      return JSON.parse(c1);
    } catch {
      /* noop */
    }
    // 3. 转义真实换行 / 制表符
    const c2 = c1
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    try {
      return JSON.parse(c2);
    } catch {
      /* noop */
    }
    // 4. 提取首个 {...} 块
    const match = s.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* noop */
      }
    }
    return null;
  }

  private hasDeepStrategy(strategies: InsightV2StrategyKey[]): boolean {
    return strategies.some((s) => INSIGHT_V2_DEEP_STRATEGIES.has(s));
  }

  private toClientTurn(
    sessionId: string,
    parsed: ParsedTurn,
    strategies: InsightV2StrategyKey[],
    answers: TrajectoryItem[],
    clarifyCount: number,
  ): ClientTurn {
    const askedCount = strategies.length;
    let content: Record<string, unknown>;

    if (parsed.status === 'need_info') {
      content = { clarifyQuestion: parsed.clarify_question };
    } else if (parsed.status === 'questioning') {
      content = {
        questionId: `q${askedCount}`,
        strategy: parsed.question.strategy,
        strategyLabel: INSIGHT_V2_STRATEGY_LABELS[parsed.question.strategy],
        questionText: parsed.question.question,
        optionA: parsed.question.option_a,
        optionB: parsed.question.option_b,
      };
    } else {
      content = {
        awakeningQuote: parsed.report.awakening_quote,
        tendency: parsed.report.tendency,
        analysis: parsed.report.analysis,
        actionAdvice: parsed.report.action_advice,
        trajectory: answers.map((a) => this.trajectoryView(a)),
      };
    }

    return { sessionId, status: parsed.status, askedCount, clarifyCount, content };
  }

  private trajectoryView(a: TrajectoryItem): Record<string, unknown> {
    return {
      questionId: a.questionId,
      strategy: a.strategy,
      strategyLabel: INSIGHT_V2_STRATEGY_LABELS[a.strategy] ?? a.strategy,
      questionText: a.questionText,
      optionA: a.optionA,
      optionB: a.optionB,
      level: a.level,
    };
  }

  private reportColumns(parsed: ParsedTurn): {
    awakeningQuote?: string;
    tendency?: string;
    analysis?: string;
    actionAdvice?: string;
  } {
    if (parsed.status !== 'finished') {
      return {};
    }
    return {
      awakeningQuote: parsed.report.awakening_quote,
      tendency: parsed.report.tendency,
      analysis: parsed.report.analysis,
      actionAdvice: parsed.report.action_advice,
    };
  }

  /** 取 transcript 中最后一条 assistant 的 questioning（当前待答题）。 */
  private currentQuestion(transcript: ChatMessage[]): z.infer<typeof questionSchema> | null {
    for (let i = transcript.length - 1; i >= 0; i--) {
      const msg = transcript[i];
      if (msg.role !== 'assistant') {
        continue;
      }
      const parsed = turnSchema.safeParse(this.robustParseJson(msg.content));
      if (parsed.success && parsed.data.status === 'questioning') {
        return parsed.data.question;
      }
      return null;
    }
    return null;
  }

  /** 弹出最后一条 assistant questioning（用于 regenerate）。 */
  private popLastQuestion(
    transcript: ChatMessage[],
  ): z.infer<typeof questionSchema> | null {
    for (let i = transcript.length - 1; i >= 0; i--) {
      if (transcript[i].role !== 'assistant') {
        continue;
      }
      const parsed = turnSchema.safeParse(this.robustParseJson(transcript[i].content));
      if (parsed.success && parsed.data.status === 'questioning') {
        const question = parsed.data.question;
        transcript.splice(i, 1);
        return question;
      }
      return null;
    }
    return null;
  }

  private async loadSession(sessionId: string, userId: string) {
    const session = await this.prisma.insightV2Session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: '会话不存在或无权访问。',
      });
    }
    return session;
  }

  private parseTranscript(value: unknown): ChatMessage[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof (m as ChatMessage).role === 'string' &&
        typeof (m as ChatMessage).content === 'string',
    );
  }

  private parseStrategies(value: unknown): InsightV2StrategyKey[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((s): s is InsightV2StrategyKey =>
      (INSIGHT_V2_STRATEGY_KEYS as readonly string[]).includes(s as string),
    );
  }

  private parseAnswers(value: unknown): TrajectoryItem[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value as TrajectoryItem[];
  }

  /**
   * 读取用户档案 + 渲染 augmentation。
   * 返回 null 表示不应注入（开关关闭 / 档案全空 / augmentation 模板被覆盖为空）。
   * 见 ADR-006：注入仅影响生成内容，不动状态机。
   */
  private async loadProfileAugmentation(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        useProfileInPrompt: true,
        birthday: true,
        gender: true,
        zodiac: true,
        mbti: true,
      },
    });
    if (!user || !user.useProfileInPrompt) {
      return null;
    }
    const profile = {
      age: computeAge(user.birthday ? user.birthday.toISOString().slice(0, 10) : null),
      gender: user.gender as ProfileGender | null,
      zodiac: user.zodiac as ProfileZodiac | null,
      mbti: user.mbti as ProfileMbti | null,
    };
    if (!hasAnyProfileSignal(profile)) {
      return null;
    }
    const template = await this.prompts.getEffectivePrompt(
      INSIGHT_V2_PROFILE_PROMPT_KEY,
      INSIGHT_V2_PROFILE_PROMPT_TEMPLATE,
    );
    const rendered = renderProfileAugmentation(profile, template);
    this.logger.log(
      JSON.stringify({
        event: 'insightV2.profile.applied',
        userId,
        fields: {
          age: profile.age !== null,
          gender: !!profile.gender,
          zodiac: !!profile.zodiac,
          mbti: !!profile.mbti,
        },
      }),
    );
    return rendered;
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

  private log(event: string, requestId: string, userId: string, sessionId: string): void {
    this.logger.log(JSON.stringify({ event, requestId, userId, sessionId }));
  }
}
