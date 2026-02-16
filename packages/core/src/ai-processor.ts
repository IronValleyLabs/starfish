import OpenAI from 'openai';
import {
  INTENT_DETECTION_SYSTEM,
  buildIntentDetectionUserMessage,
} from './prompts/intent-detection';
import { getLLMClientConfig } from './llm-provider';

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful, friendly assistant. Reply in a concise and clear way.';

export interface DetectedIntent {
  intent: 'bash' | 'websearch' | 'draft' | 'response';
  params: { command?: string; query?: string; text?: string; prompt?: string };
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export class AIProcessor {
  private client: OpenAI;
  private model: string;
  private systemPrompt: string;

  constructor(systemPrompt?: string) {
    const config = getLLMClientConfig();
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      defaultHeaders: config.defaultHeaders,
    });
    this.model =
      process.env.AI_MODEL ||
      (config.provider === 'openrouter' ? 'anthropic/claude-3.5-sonnet' : 'gpt-4o');
    this.systemPrompt = (systemPrompt && systemPrompt.trim()) || DEFAULT_SYSTEM_PROMPT;
  }

  async detectIntent(
    message: string,
    _history: Array<{ role: string; content: string }>
  ): Promise<DetectedIntent> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: INTENT_DETECTION_SYSTEM },
        { role: 'user', content: buildIntentDetectionUserMessage(message) },
      ],
      temperature: 0.2,
      max_tokens: 200,
    });
    const raw = completion.choices[0].message.content?.trim() ?? '{}';
    const jsonStr = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    const usage = completion.usage
      ? {
          prompt_tokens: completion.usage.prompt_tokens ?? 0,
          completion_tokens: completion.usage.completion_tokens ?? 0,
        }
      : undefined;
    try {
      const parsed = JSON.parse(jsonStr) as {
        intent?: string;
        params?: Record<string, string>;
      };
      const intent =
        parsed.intent === 'bash' || parsed.intent === 'websearch' || parsed.intent === 'draft'
          ? parsed.intent
          : 'response';
      const params = parsed.params ?? {};
      return {
        intent,
        params: {
          command: params.command,
          query: params.query,
          text: params.text,
          prompt: params.prompt,
        },
        usage,
      };
    } catch {
      return { intent: 'response', params: {}, usage };
    }
  }

  async generateResponse(
    currentMessage: string,
    history: Array<{ role: string; content: string }>
  ): Promise<{ content: string; usage?: { prompt_tokens: number; completion_tokens: number } }> {
    const messages = [
      {
        role: 'system' as const,
        content: this.systemPrompt,
      },
      ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: currentMessage },
    ];
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });
    const content = completion.choices[0].message.content || 'Sorry, I could not generate a response.';
    const usage = completion.usage
      ? {
          prompt_tokens: completion.usage.prompt_tokens ?? 0,
          completion_tokens: completion.usage.completion_tokens ?? 0,
        }
      : undefined;
    return { content, usage };
  }

  getModel(): string {
    return this.model;
  }
}
