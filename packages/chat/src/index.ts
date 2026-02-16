import path from 'path';
import express, { type Application } from 'express';
import { EventBus, detectMention, ConversationRouter } from '@jellyfish/shared';
import { loadTeam } from './load-team';
import { createTelegramAdapter } from './adapters/telegram-adapter';
import { createWhatsAppAdapter } from './adapters/whatsapp-adapter';
import { createSlackAdapter } from './adapters/slack-adapter';
import { createLineAdapter } from './adapters/line-adapter';
import { createGoogleChatAdapter } from './adapters/google-chat-adapter';
import type { ChatAdapter, IncomingMessage } from './adapters/base-adapter';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const RESET_REGEX = /^\/reset\s*$/i;
const WEBHOOK_PORT = parseInt(process.env.CHAT_WEBHOOK_PORT ?? '3010', 10);

function createMessageHandler(
  eventBus: EventBus,
  router: ConversationRouter
): (msg: IncomingMessage) => void {
  return async (msg: IncomingMessage) => {
    const { conversationId, userId, text, platform } = msg;

    if (RESET_REGEX.test(text.trim())) {
      await router.unassignConversation(conversationId);
      return;
    }

    const team = await loadTeam();
    const mentioned = detectMention(text, team);
    let targetAgentId: string | null = null;

    if (mentioned) {
      await router.assignConversation(conversationId, mentioned.id);
      await router.renewConversation(conversationId);
      targetAgentId = `mini-jelly-${mentioned.id}`;
      console.log(`[ChatAgent] Mention: ${mentioned.displayName} -> ${targetAgentId}`);
    } else {
      const assigned = await router.getAssignedAgent(conversationId);
      if (assigned) {
        await router.renewConversation(conversationId);
        targetAgentId = `mini-jelly-${assigned}`;
      }
    }

    console.log(`[ChatAgent] ${platform} ${userId}: "${text.slice(0, 50)}..." target=${targetAgentId ?? 'default'}`);
    await eventBus.publish('message.received', {
      platform,
      userId,
      conversationId,
      text,
      targetAgentId: targetAgentId ?? undefined,
    });
  };
}

function collectAdapters(app: Application): ChatAdapter[] {
  const list: (ChatAdapter | null)[] = [
    createTelegramAdapter(),
    createWhatsAppAdapter(app),
    createSlackAdapter(),
    createLineAdapter(app),
    createGoogleChatAdapter(app),
  ];
  return list.filter((a): a is ChatAdapter => a != null);
}

async function main() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const adapters = collectAdapters(app);
  if (adapters.length === 0) {
    console.warn(
      '[ChatAgent] No chat platform configured. Set one of: TELEGRAM_BOT_TOKEN, TWILIO_ACCOUNT_SID+TWILIO_AUTH_TOKEN, SLACK_BOT_TOKEN+SLACK_APP_TOKEN, LINE_CHANNEL_ACCESS_TOKEN, GOOGLE_CHAT_PROJECT_ID or GOOGLE_CHAT_WEBHOOK_URL.'
    );
    process.exit(1);
  }

  const eventBus = new EventBus('chat-agent-1');
  const router = new ConversationRouter();
  const handler = createMessageHandler(eventBus, router);

  for (const adapter of adapters) {
    adapter.onMessage(async (msg) => {
      if (RESET_REGEX.test(msg.text.trim())) {
        await router.unassignConversation(msg.conversationId);
        await eventBus.publish('conversation.unassigned', { conversationId: msg.conversationId });
        await eventBus.publish('action.completed', {
          conversationId: msg.conversationId,
          result: {
            output: 'Conversation unassigned. Next message will go to the default agent, or mention an agent (e.g. @Name).',
          },
        });
        return;
      }
      await handler(msg);
    });
    await adapter.start();
  }

  app.listen(WEBHOOK_PORT, () => {
    console.log(`[ChatAgent] Webhook server listening on port ${WEBHOOK_PORT}`);
  });

  eventBus.subscribe('action.completed', async (event) => {
    const payload = event.payload as { conversationId?: string; result?: { output?: string } };
    if (!payload.conversationId || !payload.result?.output) return;
    const adapter = adapters.find((a) => payload.conversationId!.startsWith(a.conversationIdPrefix));
    if (adapter) {
      try {
        await adapter.sendMessage(payload.conversationId, payload.result.output);
      } catch (err) {
        console.error('[ChatAgent] Error sending message:', err);
      }
    }
  });

  eventBus.subscribe('action.failed', async (event) => {
    const payload = event.payload as { conversationId?: string; error?: string };
    if (!payload.conversationId || !payload.error) return;
    const adapter = adapters.find((a) => payload.conversationId!.startsWith(a.conversationIdPrefix));
    if (adapter) {
      try {
        await adapter.sendMessage(payload.conversationId, `Error: ${payload.error}`);
      } catch (err) {
        console.error('[ChatAgent] Error sending failure message:', err);
      }
    }
  });

  console.log('[ChatAgent] Running with adapters:', adapters.map((a) => a.platform).join(', '));

  const shutdown = async () => {
    for (const adapter of adapters) {
      if (adapter.stop) await adapter.stop();
    }
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[ChatAgent] Fatal:', err);
  process.exit(1);
});
