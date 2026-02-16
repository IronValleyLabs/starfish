import crypto from 'crypto';
import type { Application, RequestHandler } from 'express';
import type { ChatAdapter, IncomingMessage } from './base-adapter';

const PREFIX = 'line_';
const WEBHOOK_PATH = '/webhook/line';

/**
 * Creates Line adapter when LINE_CHANNEL_ACCESS_TOKEN is set.
 * Pass rawBodyMiddleware (e.g. express.raw({ type: 'application/json' })) so the route is registered
 * before express.json() and we can validate X-Line-Signature with the raw body. Set LINE_CHANNEL_SECRET for validation.
 */
export function createLineAdapter(app: Application, rawBodyMiddleware?: RequestHandler): ChatAdapter | null {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) return null;

  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();
  let messageHandler: ((message: IncomingMessage) => void) | null = null;

  const handler: RequestHandler = (req, res) => {
    const rawBody = req.body;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      res.status(400).end();
      return;
    }
    if (channelSecret) {
      const sig = req.headers['x-line-signature'] as string | undefined;
      const expected = crypto.createHmac('sha256', channelSecret).update(rawBody).digest('base64');
      if (!sig || sig !== expected) {
        res.status(403).end();
        return;
      }
    }
    res.status(200).end();

    let body: { events?: unknown[] };
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return;
    }
    const events = body?.events;
    if (!Array.isArray(events)) return;
    for (const ev of events) {
      const e = ev as { type?: string; message?: { type?: string; text?: string }; source?: { userId?: string; groupId?: string } };
      if (e.type === 'message' && e.message?.type === 'text') {
        const userId = e.source?.userId ?? e.source?.groupId ?? '';
        const conversationId = PREFIX + userId;
        if (messageHandler) {
          messageHandler({
            conversationId,
            userId,
            text: e.message.text ?? '',
            platform: 'line',
          });
        }
      }
    }
  };

  if (rawBodyMiddleware) {
    app.post(WEBHOOK_PATH, rawBodyMiddleware, handler);
  } else {
    app.post(WEBHOOK_PATH, handler);
  }

  return {
    platform: 'line',
    conversationIdPrefix: PREFIX,
    async start() {
      console.log(
        channelSecret
          ? `[LineAdapter] Webhook at ${WEBHOOK_PATH} (signature validation enabled).`
          : `[LineAdapter] Webhook at ${WEBHOOK_PATH}. Set LINE_CHANNEL_SECRET for signature validation.`
      );
    },
    async sendMessage(_conversationId: string, _text: string) {
      // TODO: use LINE Messaging API to push message (need channel secret + token)
    },
    onMessage(handler) {
      messageHandler = handler;
    },
  };
}
