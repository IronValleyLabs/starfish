import { Telegraf } from 'telegraf';
import type { ChatAdapter, IncomingMessage } from './base-adapter';

const PREFIX = 'telegram_';

/** Returns Telegram adapter if TELEGRAM_BOT_TOKEN is set, otherwise null. */
export function createTelegramAdapter(): ChatAdapter | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return null;
  const bot = new Telegraf(token);
  let messageHandler: ((message: IncomingMessage) => void) | null = null;

  return {
    platform: 'telegram',
    conversationIdPrefix: PREFIX,
    async start() {
      bot.on('text', (ctx) => {
        const userId = ctx.from!.id.toString();
        const conversationId = PREFIX + userId;
        const text = ctx.message.text ?? '';
        const userName = [ctx.from!.first_name, ctx.from!.last_name].filter(Boolean).join(' ') || undefined;
        if (messageHandler) {
          messageHandler({
            conversationId,
            userId,
            userName,
            text,
            platform: 'telegram',
          });
        }
      });
      await bot.launch();
      console.log('[TelegramAdapter] Started');
    },
    async stop() {
      bot.stop('SIGTERM');
    },
    async sendMessage(conversationId: string, text: string) {
      if (!conversationId.startsWith(PREFIX)) return;
      const userId = conversationId.slice(PREFIX.length);
      await bot.telegram.sendMessage(userId, text);
    },
    onMessage(handler) {
      messageHandler = handler;
    },
  };
}

export function isTelegramConversation(conversationId: string): boolean {
  return conversationId.startsWith(PREFIX);
}
