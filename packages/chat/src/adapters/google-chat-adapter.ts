import type { Application } from 'express';
import type { ChatAdapter, IncomingMessage } from './base-adapter';

const PREFIX = 'google-chat_';

/**
 * Creates Google Chat adapter when GOOGLE_CHAT_PROJECT_ID or GOOGLE_CHAT_WEBHOOK_URL is set.
 * Stub: register webhook route; configure Google Chat app to point to https://your-host:PORT/webhook/google-chat.
 * Implement parse + reply when ready (Card API or simple text).
 */
export function createGoogleChatAdapter(app: Application): ChatAdapter | null {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim();
  const projectId = process.env.GOOGLE_CHAT_PROJECT_ID?.trim();
  if (!webhookUrl && !projectId) return null;

  let messageHandler: ((message: IncomingMessage) => void) | null = null;
  const WEBHOOK_PATH = '/webhook/google-chat';

  app.post(WEBHOOK_PATH, (req, res) => {
    res.status(200).end();
    const body = req.body ?? {};
    const space = body.space?.name ?? '';
    const user = body.user?.displayName ?? body.user?.name ?? '';
    const text = typeof body.message?.argumentText === 'string'
      ? body.message.argumentText
      : (body.message?.text ?? '');
    const conversationId = PREFIX + (space || user || 'default').replace(/\s/g, '_');
    if (messageHandler && (text || body.type === 'ADDED_TO_SPACE')) {
      messageHandler({
        conversationId,
        userId: user,
        text: text || '(joined)',
        platform: 'google-chat',
      });
    }
  });

  return {
    platform: 'google-chat',
    conversationIdPrefix: PREFIX,
    async start() {
      console.log('[GoogleChatAdapter] Webhook at', WEBHOOK_PATH, '- configure Google Chat app to enable.');
    },
    async sendMessage(_conversationId: string, _text: string) {
      // TODO: use Google Chat API or webhook reply
    },
    onMessage(handler) {
      messageHandler = handler;
    },
  };
}
