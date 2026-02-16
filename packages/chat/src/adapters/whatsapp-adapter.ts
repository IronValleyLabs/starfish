import type { Application } from 'express';
import type { ChatAdapter, IncomingMessage } from './base-adapter';

const PREFIX = 'whatsapp_';
const WEBHOOK_PATH = '/webhook/whatsapp';

/**
 * Creates WhatsApp adapter when Twilio env vars are set.
 * Set CHAT_WEBHOOK_BASE_URL (e.g. https://your-domain.com) so Twilio signature validation can verify requests.
 */
export function createWhatsAppAdapter(app: Application): ChatAdapter | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!accountSid || !authToken) return null;

  let messageHandler: ((message: IncomingMessage) => void) | null = null;
  let twilioClient: import('twilio').Twilio | null = null;
  let twilioValidate: (authToken: string, signature: string, url: string, params: Record<string, string>) => boolean;
  try {
    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
    twilioValidate = twilio.validateRequest;
  } catch {
    return null;
  }

  const baseUrl = (process.env.CHAT_WEBHOOK_BASE_URL ?? '').trim().replace(/\/$/, '');
  const fullWebhookUrl = baseUrl ? `${baseUrl}${WEBHOOK_PATH}` : '';

  app.post(WEBHOOK_PATH, (req, res) => {
    if (fullWebhookUrl) {
      const sig = req.headers['x-twilio-signature'] as string | undefined;
      if (!sig || !twilioValidate(authToken, sig, fullWebhookUrl, req.body ?? {})) {
        res.status(403).end();
        return;
      }
    }
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
      console.log(
        fullWebhookUrl
          ? `[WhatsAppAdapter] Webhook at ${WEBHOOK_PATH} (signature validation enabled).`
          : `[WhatsAppAdapter] Webhook at ${WEBHOOK_PATH}. Set CHAT_WEBHOOK_BASE_URL for signature validation.`
      );
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
