import OpenAI from 'openai';

export class AIProcessor {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/Faunny/starfish',
        'X-Title': 'Starfish AI Agent',
      },
    });
    this.model = process.env.AI_MODEL || 'anthropic/claude-3.5-sonnet';
    console.log(`[AIProcessor] Usando modelo: ${this.model}`);
  }

  async generateResponse(
    currentMessage: string,
    history: Array<{ role: string; content: string }>
  ): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: 'Eres un asistente útil y amigable. Responde de forma concisa y clara.',
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
    return completion.choices[0].message.content || 'Lo siento, no pude generar una respuesta.';
  }
}
