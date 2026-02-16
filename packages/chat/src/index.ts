import path from 'path';
import { Telegraf } from 'telegraf';
import { EventBus } from '@jellyfish/shared';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();
class ChatAgent {
  private bot: Telegraf;
  private eventBus: EventBus;
  constructor() {
    console.log('[ChatAgent] Iniciando bot de Telegram...');
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN no está configurado en .env');
    }
    this.bot = new Telegraf(token);
    this.eventBus = new EventBus('chat-agent-1');
    this.setupBot();
    this.setupSubscriptions();
    this.bot.launch();
    console.log('[ChatAgent] Bot de Telegram activo');
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
  private setupBot() {
    this.bot.on('text', async (ctx) => {
      const userId = ctx.from.id.toString();
      const conversationId = `telegram_${userId}`;
      const text = ctx.message.text;
      console.log(`[ChatAgent] Mensaje recibido de ${userId}: "${text}"`);
      await this.eventBus.publish('message.received', {
        platform: 'telegram',
        userId,
        conversationId,
        text,
      });
    });
  }
  private setupSubscriptions() {
    this.eventBus.subscribe('action.completed', async (event) => {
      const payload = event.payload as { conversationId?: string; result?: { output?: string } };
      if (payload.conversationId?.startsWith('telegram_') && payload.result?.output) {
        const userId = payload.conversationId.replace('telegram_', '');
        console.log(`[ChatAgent] Enviando respuesta a ${userId}`);
        try {
          await this.bot.telegram.sendMessage(userId, payload.result.output);
        } catch (error: unknown) {
          console.error('[ChatAgent] Error enviando mensaje:', error);
        }
      }
    });
  }
}
new ChatAgent();
