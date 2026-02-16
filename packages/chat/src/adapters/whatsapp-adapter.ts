import type { Application } from 'express';
import type { ChatAdapter, IncomingMessage } from './base-adapter';

const PREFIX = 'whatsapp_';
const WEBHOOK_PATH = '/webhook/whatsapp';

/**
 * Creates WhatsApp adapter when Twilio env vars are set.
 * Configure your Twilio WhatsApp sandbox/webhook URL to: http(s)://your-host:PORT/webhook/whatsapp
 */
export function createWhatsAppAdapter(app: Application): ChatAdapter | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM?.trim(); // e.g. whatsapp:+14155238886
  if (!accountSid || !authToken) return null;

  let messageHandler: ((message: IncomingMessage) => void) | null = null;
  let twilioClient: import('twilio').Twilio | null = null;
  try {
    twilioClient = require('twilio')(accountSid, authToken);
  } catch {
    return null;
  }

  app.post(WEBHOOK_PATH, (req, res) => {
    const body = (req.body?.Body ?? '').trim();
    const from = (req.body?.From ?? '').trim();
    if (!from) {
      res.status(400).end();
      return;
    }
    const normalizedFrom = from.replace(/^whatsapp:/i, '').trim() || from;
    const conversationId = PREFIX + normalizedFrom;
    if (messageHandler) {
      messageHandler({
        conversationId,
        userId: from,
        text: body,
        platform: 'whatsapp',
      });
    }
    res.status(200).end();
  });

  return {
    platform: 'whatsapp',
    conversationIdPrefix: PREFIX,
    async start() {
      console.log(`[WhatsAppAdapter] Webhook at ${WEBHOOK_PATH}. Set TWILIO_WHATSAPP_FROM to send replies.`);
    },
    async sendMessage(conversationId: string, text: string) {
      if (!conversationId.startsWith(PREFIX) || !twilioClient || !fromNumber) return;
      const toNum = conversationId.slice(PREFIX.length);
      const to = toNum.startsWith('+') ? `whatsapp:${toNum}` : `whatsapp:+${toNum}`;
      try {
        await twilioClient.messages.create({
          from: fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`,
          to,
          body: text,
        });
      } catch (err) {
        console.error('[WhatsAppAdapter] Send error:', err);
      }
    },
    onMessage(handler) {
      messageHandler = handler;
    },
  };
}
