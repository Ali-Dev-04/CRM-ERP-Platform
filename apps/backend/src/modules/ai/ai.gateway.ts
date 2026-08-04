import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';

export interface AiResult {
  content: string;
  model: string;
  /** True when no provider is configured and a deterministic stub was returned. */
  mocked: boolean;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * OpenAI-compatible chat gateway. When AI_API_KEY / AI_API_BASE_URL / AI_MODEL
 * are not configured, it returns a clearly-labelled mock so the AI endpoints
 * remain exercisable in dev/CI without credentials. Swap in any OpenAI-style
 * endpoint (OpenAI, Azure OpenAI, Ollama, OpenRouter, …) via env.
 */
@Injectable()
export class AiGateway {
  private readonly logger = new Logger(AiGateway.name);

  constructor(private readonly config: ConfigService) {}

  get available(): boolean {
    const v = this.config.value;
    return Boolean(v.AI_API_KEY && v.AI_API_BASE_URL && v.AI_MODEL);
  }

  async chat(system: string, user: string, opts: { temperature?: number } = {}): Promise<AiResult> {
    if (!this.available) {
      return { content: this.mock(system, user), model: 'mock', mocked: true };
    }
    const v = this.config.value;
    const url = `${v.AI_API_BASE_URL}/chat/completions`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${v.AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: v.AI_MODEL,
          temperature: opts.temperature ?? 0.4,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!res.ok) {
        throw new Error(`AI provider returned ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content ?? '';
      return { content, model: v.AI_MODEL!, mocked: false };
    } catch (err) {
      this.logger.warn(`AI call failed, returning mock: ${(err as Error).message}`);
      return { content: this.mock(system, user), model: 'mock', mocked: true };
    }
  }

  private mock(system: string, user: string): string {
    const head = '[MOCK AI — configure AI_API_KEY, AI_API_BASE_URL, AI_MODEL to enable the real model]';
    return `${head}\n\nSystem intent: ${system.slice(0, 160)}\n\nPrompt: ${user.slice(0, 400)}`;
  }
}
