import path from 'path';
import crypto from 'crypto';
import { EventBus, MetricsCollector } from '@jellyfish/shared';
import { BashExecutor } from './bash-executor';
import { WebSearcher, looksLikeUrl } from './web-searcher';
import { DraftExecutor } from './draft-executor';
import { ImageExecutor } from './image-executor';
import { BrowserRunner } from './browser-runner';
import { CreateSkillExecutor } from './create-skill-executor';
import { WriteFileExecutor } from './write-file-executor';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const VISION_URL = (process.env.VISION_CHAT_URL ?? 'http://localhost:3000').replace(/\/$/, '');

interface IntentPayload {
  intent?: string;
  params?: {
    command?: string;
    query?: string;
    url?: string;
    filePath?: string;
    key?: string;
    value?: string;
    text?: string;
    prompt?: string;
    size?: string;
    caption?: string;
    imagePathOrUrl?: string;
    content?: string;
    scheduledDate?: string;
    name?: string;
    description?: string;
    instructions?: string;
    toAgentId?: string;
    steps?: string[];
  };
  conversationId?: string;
  agentId?: string;
}

class ActionAgent {
  private eventBus: EventBus;
  private bashExecutor: BashExecutor;
  private webSearcher: WebSearcher;
  private draftExecutor: DraftExecutor;
  private imageExecutor: ImageExecutor;
  private browserRunner: BrowserRunner;
  private createSkillExecutor: CreateSkillExecutor;
  private writeFileExecutor: WriteFileExecutor;
  private metrics: MetricsCollector;

  constructor() {
    console.log('[ActionAgent] Starting...');
    this.eventBus = new EventBus('action-agent-1');
    this.bashExecutor = new BashExecutor();
    this.webSearcher = new WebSearcher();
    this.draftExecutor = new DraftExecutor();
    this.imageExecutor = new ImageExecutor();
    this.browserRunner = new BrowserRunner();
    this.createSkillExecutor = new CreateSkillExecutor();
    this.writeFileExecutor = new WriteFileExecutor();
    this.metrics = new MetricsCollector();
    if (this.draftExecutor.isEnabled()) console.log('[ActionAgent] Draft LLM enabled');
    if (this.imageExecutor.isEnabled()) console.log('[ActionAgent] Image generation (Nano Banana Pro) enabled');
    if (this.browserRunner.isAvailable()) console.log('[ActionAgent] Browser (Puppeteer) available');
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    this.eventBus.subscribe('intent.detected', async (event) => {
      const payload = event.payload as IntentPayload;
      const agentId = payload.agentId ?? 'core-agent-1';
      let result: { output: string; error?: string } = { output: '' };
      try {
        switch (payload.intent) {
          case 'bash':
            result = await this.bashExecutor.execute(
              payload.params?.command || ''
            );
            break;
          case 'websearch': {
            const query = payload.params?.query || '';
            const output = looksLikeUrl(query)
              ? await this.webSearcher.fetchUrl(query)
              : await this.webSearcher.search(query);
            result = { output };
            break;
          }
          case 'draft':
            result = await this.draftExecutor.execute(
              payload.params?.prompt || ''
            );
            break;
          case 'generate_image':
            result = await this.imageExecutor.execute(
              payload.params?.prompt || '',
              payload.params?.size
            );
            break;
          case 'instagram_post':
            result = await this.browserRunner.run('instagram_post', {
              caption: payload.params?.caption || '',
              imagePathOrUrl: payload.params?.imagePathOrUrl || payload.params?.prompt || '',
            });
            break;
          case 'metricool_schedule':
            result = await this.browserRunner.run('metricool_schedule', {
              content: payload.params?.content || payload.params?.prompt || '',
              scheduledDate: payload.params?.scheduledDate,
            });
            break;
          case 'create_skill':
            result = await this.createSkillExecutor.execute(
              payload.agentId ?? 'core-agent-1',
              payload.params?.name ?? '',
              payload.params?.description ?? '',
              payload.params?.instructions ?? ''
            );
            break;
          case 'browser_visit': {
            const url = payload.params?.url?.trim();
            if (!url) {
              result = { output: '', error: 'browser_visit requires a URL in params.url' };
            } else if (!this.browserRunner.isAvailable()) {
              result = { output: '', error: 'Puppeteer not installed. Run: pnpm add puppeteer (in packages/action or root).' };
            } else {
              let credentials: { loginUrl: string; user: string; password: string } | undefined;
              try {
                const credRes = await fetch(`${VISION_URL}/api/agent-browser-credentials?agentId=${encodeURIComponent(payload.agentId ?? '')}`);
                if (credRes.ok) {
                  const cred = (await credRes.json()) as { loginUrl?: string; user?: string; password?: string };
                  if (cred.loginUrl && cred.user && cred.password) {
                    credentials = { loginUrl: cred.loginUrl, user: cred.user, password: cred.password };
                  }
                }
              } catch {
                // use env fallback in visitUrlWithBrowser
              }
              result = await this.browserRunner.run('browser_visit', { url, credentials });
            }
            break;
          }
          case 'store_credential': {
            const key = payload.params?.key?.trim();
            const value = payload.params?.value ?? '';
            if (!key) {
              result = { output: '', error: 'store_credential requires params.key (e.g. BROWSER_VISIT_PASSWORD).' };
            } else {
              try {
                const res = await fetch(`${VISION_URL}/api/settings/env`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ key, value: String(value) }),
                });
                const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
                if (res.ok && data.ok) {
                  result = { output: data.message ?? `Saved ${key}. Restart agents to apply.` };
                } else {
                  result = { output: '', error: data.error ?? `Failed to save (${res.status})` };
                }
              } catch (err) {
                result = { output: '', error: err instanceof Error ? err.message : 'Failed to call Vision API.' };
              }
            }
            break;
          }
          case 'write_file': {
            const filePath = payload.params?.filePath?.trim();
            const content = payload.params?.content ?? '';
            if (!filePath) {
              result = { output: '', error: 'write_file requires params.filePath (e.g. docs/vision.md or data/agent-knowledge.md).' };
            } else {
              result = await this.writeFileExecutor.execute(filePath, content);
            }
            break;
          }
          case 'sessions_list': {
            try {
              const res = await fetch(`${VISION_URL}/api/sessions`);
              const sessions = (await res.json().catch(() => [])) as Array<{ conversationId: string; agentId: string }>;
              result = { output: JSON.stringify(sessions, null, 2) };
            } catch (e) {
              result = { output: '', error: e instanceof Error ? e.message : 'Failed to fetch sessions' };
            }
            break;
          }
          case 'sessions_send': {
            const toAgentId = payload.params?.toAgentId?.trim();
            const text = payload.params?.text?.trim();
            if (!toAgentId || !text) {
              result = { output: '', error: 'sessions_send requires params.toAgentId and params.text' };
            } else {
              const requestId = crypto.randomUUID();
              const convId = `internal:session:${requestId}`;
              const targetId = toAgentId.startsWith('mini-jelly-') ? toAgentId : `mini-jelly-${toAgentId}`;
              await this.eventBus.publish('message.received', {
                platform: 'internal',
                userId: agentId,
                conversationId: convId,
                text,
                targetAgentId: targetId,
              });
              const deadline = Date.now() + 90000;
              const pollMs = 2000;
              let output: string | null = null;
              while (Date.now() < deadline) {
                await new Promise((r) => setTimeout(r, pollMs));
                try {
                  const rres = await fetch(`${VISION_URL}/api/sessions/response?requestId=${encodeURIComponent(requestId)}`);
                  const data = (await rres.json()) as { output?: string | null };
                  if (data.output != null) {
                    output = data.output;
                    break;
                  }
                } catch {
                  // continue polling
                }
              }
              result = { output: output ?? 'No response from agent (timeout).' };
            }
            break;
          }
          case 'execute_plan': {
            const steps = payload.params?.steps;
            if (!Array.isArray(steps) || steps.length === 0) {
              result = { output: '', error: 'execute_plan requires params.steps (array of step descriptions)' };
            } else {
              const outputs: string[] = [];
              for (let i = 0; i < steps.length; i++) {
                const step = String(steps[i]).trim();
                if (!step) continue;
                const requestId = crypto.randomUUID();
                const convId = `internal:session:${requestId}`;
                await this.eventBus.publish('message.received', {
                  platform: 'internal',
                  userId: agentId,
                  conversationId: convId,
                  text: step,
                  targetAgentId: agentId,
                });
                const deadline = Date.now() + 90000;
                const pollMs = 2000;
                let stepOutput: string | null = null;
                while (Date.now() < deadline) {
                  await new Promise((r) => setTimeout(r, pollMs));
                  try {
                    const rres = await fetch(`${VISION_URL}/api/sessions/response?requestId=${encodeURIComponent(requestId)}`);
                    const data = (await rres.json()) as { output?: string | null };
                    if (data.output != null) {
                      stepOutput = data.output;
                      break;
                    }
                  } catch {
                    // continue
                  }
                }
                outputs.push(`Step ${i + 1}: ${stepOutput ?? 'timeout'}`);
              }
              result = { output: outputs.join('\n\n') };
            }
            break;
          }
          case 'response':
            result = { output: payload.params?.text || 'No response' };
            break;
          default:
            result = { output: 'Intent not recognized' };
        }
        if (result.error) {
          await this.eventBus.publish(
            'action.failed',
            {
              conversationId: payload.conversationId,
              error: result.error,
            },
            event.correlationId
          );
        } else {
          await this.metrics.incrementActions(agentId);
          await this.metrics.incrementNanoCount(agentId);
          await this.metrics.recordAction(agentId, `action_${payload.intent ?? 'unknown'}`);
          await this.eventBus.publish(
            'action.completed',
            {
              conversationId: payload.conversationId,
              result: { output: result.output },
              agentId,
            },
            event.correlationId
          );
        }
      } catch (error: unknown) {
        console.error('[ActionAgent] Error running action:', error);
        await this.eventBus.publish(
          'action.failed',
          {
            conversationId: payload.conversationId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          event.correlationId
        );
      }
    });
  }
}
new ActionAgent();
