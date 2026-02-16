import OpenAI from 'openai';

/**
 * Uses a secondary LLM (e.g. ChatGPT / gpt-4o-mini) for long-form writing tasks.
 * Saves tokens on the main model: only the draft model is used for copies, captions, etc.
 * Set DRAFT_OPENAI_API_KEY and DRAFT_AI_MODEL in .env to enable.
 */
export class DraftExecutor {
  private client: OpenAI | null = null;
  private model: string = 'gpt-4o-mini';

  constructor() {
    const apiKey = process.env.DRAFT_OPENAI_API_KEY?.trim();
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.model = process.env.DRAFT_AI_MODEL?.trim() || 'gpt-4o-mini';
    }
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  async execute(prompt: string): Promise<{ output: string; error?: string }> {
    if (!this.client) {
      return {
        output: '',
        error:
          'Draft LLM not configured. Set DRAFT_OPENAI_API_KEY (e.g. your ChatGPT/OpenAI key) and optionally DRAFT_AI_MODEL in .env to use the draft model for copies and writing.',
      };
    }
    const task = (prompt || '').trim();
    if (!task) {
      return { output: '', error: 'No writing task provided.' };
    }
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a concise copywriter. Produce only the requested text, no meta-commentary. Match the language of the user request.',
          },
          { role: 'user', content: task },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });
      const content = completion.choices[0]?.message?.content?.trim() ?? '';
      return { output: content || '(No output from draft model.)' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Draft model request failed';
      console.error('[DraftExecutor]', message);
      return { output: '', error: message };
    }
  }
}
