import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
}

export interface CompleteChatInput {
  system: string;
  user: string;
  temperature?: number;
}

export interface CompleteChatResult {
  text: string;
  latencyMs: number;
}

@Injectable()
export class LlmService {
  constructor(private readonly config: ConfigService) {}

  async completeChat(input: CompleteChatInput): Promise<CompleteChatResult> {
    const apiKey = this.requiredEnv('AI_API_KEY');
    const model = this.requiredEnv('AI_MODEL');
    const baseUrl = this.requiredEnv('AI_BASE_URL').replace(/\/+$/, '');
    // AI_BASE_URL should point at the OpenAI-compatible API root, for example
    // https://api.openai.com/v1. Provider-specific prefixes belong in the env value.
    const url = `${baseUrl}/chat/completions`;
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: input.system },
            { role: 'user', content: input.user },
          ],
          temperature: input.temperature ?? 0.4,
        }),
      });
    } catch {
      throw new BadGatewayException({
        code: 'LLM_UPSTREAM_UNAVAILABLE',
        message: 'LLM upstream request failed',
      });
    }

    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      throw new BadGatewayException({
        code: 'LLM_UPSTREAM_ERROR',
        message: `LLM upstream returned ${response.status}`,
      });
    }

    const json = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
    const text = json?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      throw new BadGatewayException({
        code: 'LLM_OUTPUT_INVALID',
        message: 'LLM response did not include assistant content',
      });
    }

    return { text: text.trim(), latencyMs };
  }

  private requiredEnv(name: 'AI_BASE_URL' | 'AI_API_KEY' | 'AI_MODEL'): string {
    const value = this.config.get<string>(name)?.trim();
    if (!value) {
      throw new InternalServerErrorException({
        code: 'LLM_CONFIG_MISSING',
        message: `${name} is required`,
      });
    }

    return value;
  }
}
