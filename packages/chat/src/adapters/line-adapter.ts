import type { Application } from 'express';
import type { ChatAdapter, IncomingMessage } from './base-adapter';

const PREFIX = 'line_';

/**
 * Creates Line adapter when LINE_CHANNEL_ACCESS_TOKEN is set.
 * Stub: register webhook route but you must configure Line Console to point to https://your-host:PORT/webhook/line.
 * Implement parse + reply in start() when ready.
 */
export function createLineAdapter(app: Application): ChatAdapter | null {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) return null;

  let messageHandler: ((message: IncomingMessage) => void) | null = null;
  const WEBHOOK_PATH = '/webhook/line';

  app.post(WEBHOOK_PATH, (req, res) => {
    res.status(200).end();
    const events = req.body?.events;
    if (!Array.isArray(events)) return;
    for (const ev of events) {
      if (ev.type === 'message' && ev.message?.type === 'text') {
        const userId = ev.source?.userId ?? ev.source?.groupId ?? '';
        const conversationId = PREFIX + userId;
        if (messageHandler) {
          messageHandler({
            conversationId,
            userId,
            text: ev.message.text ?? '',
            platform: 'line',
          });
        }
      }
    }
  });

  return {
    platform: 'line',
    conversationIdPrefix: PREFIX,
    async start() {
      console.log('[LineAdapter] Webhook at', WEBHOOK_PATH, '- configure Line Console webhook URL to enable receive.');
    },
    async sendMessage(_conversationId: string, _text: string) {
      // TODO: use LINE Messaging API to push message (need channel secret + token)
    },
    onMessage(handler) {
      messageHandler = handler;
    },
  };
}
