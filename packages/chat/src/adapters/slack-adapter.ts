import type { ChatAdapter, IncomingMessage } from './base-adapter';

const PREFIX = 'slack_';

/**
 * Creates Slack adapter when SLACK_BOT_TOKEN and SLACK_APP_TOKEN are set (Socket Mode).
 * No webhook URL needed; works behind firewalls.
 */
export function createSlackAdapter(): ChatAdapter | null {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  const appToken = process.env.SLACK_APP_TOKEN?.trim();
  if (!token || !appToken) return null;

  let messageHandler: ((message: IncomingMessage) => void) | null = null;
  let slackApp: import('@slack/bolt').App | null = null;

  try {
    const { App } = require('@slack/bolt');
    const app = new App({
      token,
      socketMode: true,
      appToken,
    });
    slackApp = app;

    app.message(async ({ message }: { message: { subtype?: string; text?: string; channel?: string; user?: string } }) => {
      if (message.subtype === 'bot_message' || message.subtype === 'message_changed') return;
      const text = typeof message.text === 'string' ? message.text : '';
      const channel = typeof message.channel === 'string' ? message.channel : '';
      const userId = typeof message.user === 'string' ? message.user : '';
      const conversationId = PREFIX + channel;
      if (messageHandler) {
        messageHandler({
          conversationId,
          userId,
          text,
          platform: 'slack',
        });
      }
    });
  } catch (err) {
    console.error('[SlackAdapter] Init failed:', err);
    return null;
  }

  return {
    platform: 'slack',
    conversationIdPrefix: PREFIX,
    async start() {
      if (!slackApp) return;
      await slackApp.start();
      console.log('[SlackAdapter] Started (Socket Mode)');
    },
    async stop() {
      if (slackApp) await slackApp.stop();
    },
    async sendMessage(conversationId: string, text: string) {
      if (!conversationId.startsWith(PREFIX) || !slackApp) return;
      const channel = conversationId.slice(PREFIX.length);
      try {
        await slackApp.client.chat.postMessage({ channel, text });
      } catch (err) {
        console.error('[SlackAdapter] Send error:', err);
      }
    },
    onMessage(handler) {
      messageHandler = handler;
    },
  };
}
