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
const STATUS_REGEX = /^\/status\s*$/i;
const WEBHOOK_PORT = parseInt(process.env.CHAT_WEBHOOK_PORT ?? '3010', 10);
const UNIFIED_CONVERSATION_ID = 'web_dashboard';
const VISION_CHAT_URL = (process.env.VISION_CHAT_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const PAIRING_ENABLED = process.env.TELEGRAM_PAIRING_ENABLED === '1' || process.env.TELEGRAM_PAIRING_ENABLED === 'true';

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
    } else {
      const assigned = await router.getAssignedAgent(conversationId);
      if (assigned) {
        await router.renewConversation(conversationId);
        targetAgentId = `mini-jelly-${assigned}`;
      }
    }

    console.log('[ChatAgent] Publishing message.received for', conversationId);
    await eventBus.publish('message.received', {
      platform,
      userId,
      conversationId,
      text,
      targetAgentId: targetAgentId ?? undefined,
    });
  };
}

function collectAdapters(app: Application, options?: { skipLine?: boolean }): ChatAdapter[] {
  const list: (ChatAdapter | null)[] = [
    createTelegramAdapter(),
    createWhatsAppAdapter(app),
    createSlackAdapter(),
    options?.skipLine ? null : createLineAdapter(app),
    createGoogleChatAdapter(app),
  ];
  return list.filter((a): a is ChatAdapter => a != null);
}

async function main() {
  const app = express();
  // Line webhook needs raw body for X-Line-Signature; register route before express.json()
  const lineRaw = express.raw({ type: 'application/json' });
  const lineAdapter = createLineAdapter(app, lineRaw);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const adapters = [
    ...(lineAdapter ? [lineAdapter] : []),
    ...collectAdapters(app, { skipLine: true }),
  ];
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
      // Unified chat: main Telegram user shares same thread as dashboard (no Redis)
      const mainTelegramId = process.env.TELEGRAM_MAIN_USER_ID?.trim();
      if (adapter.platform === 'telegram' && mainTelegramId && String(msg.userId) === mainTelegramId) {
        console.log('[ChatAgent] Unified chat: sending to Vision for', UNIFIED_CONVERSATION_ID);
        try {
          const res = await fetch(`${VISION_CHAT_URL}/api/chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: msg.text,
              conversationId: UNIFIED_CONVERSATION_ID,
              platform: 'telegram',
              userId: msg.userId,
            }),
          });
          const data = (await res.json().catch(() => ({}))) as { output?: string; error?: string };
          const output = res.ok && typeof data.output === 'string'
            ? data.output
            : (data.error ?? 'Error processing message.');
          if (!res.ok) {
            console.error('[ChatAgent] Unified chat: Vision returned', res.status, data);
          } else {
            console.log('[ChatAgent] Unified chat: Vision OK, replying to Telegram');
          }
          await adapter.sendMessage(msg.conversationId, output);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error('[ChatAgent] Unified chat: fetch failed', message);
          await adapter.sendMessage(msg.conversationId, `Error: ${message}`);
        }
        return;
      }
      if (adapter.platform === 'telegram' && !mainTelegramId) {
        console.log('[ChatAgent] Telegram main user not set (TELEGRAM_MAIN_USER_ID). Message goes to Redis thread', msg.conversationId);
      }
      if (PAIRING_ENABLED && adapter.platform === 'telegram' && String(msg.userId) !== mainTelegramId) {
        try {
          const pairRes = await fetch(`${VISION_CHAT_URL}/api/pairing?platform=telegram&userId=${encodeURIComponent(String(msg.userId))}`);
          const pairData = (await pairRes.json().catch(() => ({}))) as { approved?: boolean; code?: string };
          if (!pairData.approved && pairData.code) {
            await adapter.sendMessage(msg.conversationId, `Pairing required. Your code: ${pairData.code}\nApprove in the dashboard (Settings → Pairing) or set TELEGRAM_MAIN_USER_ID to your user ID to skip.`);
            return;
          }
        } catch {
          // continue if Vision unreachable
        }
      }
      if (STATUS_REGEX.test(msg.text.trim())) {
        try {
          const statusRes = await fetch(`${VISION_CHAT_URL}/api/status`);
          const statusData = (await statusRes.json().catch(() => ({}))) as Record<string, { online?: boolean; pid?: number }>;
          const lines = ['Status:'];
          if (statusData._main && typeof statusData._main === 'object') {
            for (const [name, info] of Object.entries(statusData._main)) {
              lines.push(`  ${name}: ${info.online ? '✓' : '✗'}`);
            }
          }
          await adapter.sendMessage(msg.conversationId, lines.join('\n') || 'Status: OK');
        } catch {
          await adapter.sendMessage(msg.conversationId, 'Status: could not reach dashboard.');
        }
        return;
      }
      await handler(msg);
    });
    await adapter.start();
  }

  app.listen(WEBHOOK_PORT, () => {
    console.log(`[ChatAgent] Webhook server listening on port ${WEBHOOK_PORT}`);
  });

  const schedulerReportCid = process.env.SCHEDULER_REPORT_CONVERSATION_ID?.trim();
  eventBus.subscribe('action.completed', async (event) => {
    const payload = event.payload as { conversationId?: string; result?: { output?: string }; agentId?: string };
    if (!payload.conversationId || !payload.result?.output) return;
    const cid = payload.conversationId;
    if (cid.startsWith('scheduler:') && schedulerReportCid) {
      const adapter = adapters.find((a) => schedulerReportCid.startsWith(a.conversationIdPrefix));
      if (adapter) {
        try {
          console.log('[ChatAgent] Sending scheduler report to', schedulerReportCid);
          await adapter.sendMessage(schedulerReportCid, `📋 Autonomous run (${payload.agentId ?? 'agent'}):\n\n${payload.result.output}`);
        } catch (err) {
          console.error('[ChatAgent] Error sending scheduler report:', err);
        }
      }
      return;
    }
    if (cid.startsWith('internal:session:')) {
      const requestId = cid.replace('internal:session:', '');
      try {
        await fetch(`${VISION_CHAT_URL}/api/sessions/response`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, output: payload.result.output }),
        });
      } catch (err) {
        console.error('[ChatAgent] Failed to store session response', requestId, err);
      }
      return;
    }
    const adapter = adapters.find((a) => cid.startsWith(a.conversationIdPrefix));
    if (adapter) {
      try {
        console.log('[ChatAgent] Sending reply to', cid, '(', adapter.platform, ')');
        await adapter.sendMessage(cid, payload.result.output);
      } catch (err) {
        console.error('[ChatAgent] Error sending message to', cid, err);
      }
    } else if (!cid.startsWith('scheduler:')) {
      console.warn('[ChatAgent] No adapter for conversationId', cid);
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
