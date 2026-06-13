import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface PromptOverrideRecord {
  key: string;
  content: string;
  updatedAt: Date;
  updatedBy: string | null;
}

/**
 * Prompt 运行时读取与覆盖。
 *
 * 默认提示词内置在代码里（随构建发布）。开启 `INSIGHT_V2_PROMPT_OVERRIDE_ENABLED=true`
 * 后，可由客户端 debug 模式上传覆盖版本，服务端在每次调用 LLM 时**运行时读取**生效，
 * 无需重新部署即可调参。关闭开关或清空覆盖即回退到内置默认。
 */
@Injectable()
export class PromptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** 覆盖功能是否开启（默认关闭，保证生产环境不被随意改写提示词）。 */
  isOverrideEnabled(): boolean {
    const raw = this.config.get<string>('INSIGHT_V2_PROMPT_OVERRIDE_ENABLED');
    return (raw ?? '').trim().toLowerCase() === 'true';
  }

  /** 取生效提示词：开启且有非空覆盖时用覆盖，否则用内置默认。 */
  async getEffectivePrompt(key: string, fallback: string): Promise<string> {
    if (!this.isOverrideEnabled()) {
      return fallback;
    }
    const override = await this.prisma.promptOverride.findUnique({ where: { key } });
    const content = override?.content?.trim();
    return content ? override!.content : fallback;
  }

  async getOverride(key: string): Promise<PromptOverrideRecord | null> {
    return this.prisma.promptOverride.findUnique({ where: { key } });
  }

  async setOverride(
    key: string,
    content: string,
    updatedBy?: string,
  ): Promise<PromptOverrideRecord> {
    return this.prisma.promptOverride.upsert({
      where: { key },
      update: { content, updatedBy: updatedBy ?? null },
      create: { key, content, updatedBy: updatedBy ?? null },
    });
  }

  async clearOverride(key: string): Promise<void> {
    await this.prisma.promptOverride.deleteMany({ where: { key } });
  }
}
