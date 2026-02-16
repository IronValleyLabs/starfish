import path from 'path';
import { EventBus, MetricsCollector } from '@jellyfish/shared';
import { BashExecutor } from './bash-executor';
import { WebSearcher } from './web-searcher';
import { DraftExecutor } from './draft-executor';
import { ImageExecutor } from './image-executor';
import { BrowserRunner } from './browser-runner';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

interface IntentPayload {
  intent?: string;
  params?: {
    command?: string;
    query?: string;
    text?: string;
    prompt?: string;
    size?: string;
    caption?: string;
    imagePathOrUrl?: string;
    content?: string;
    scheduledDate?: string;
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
  private metrics: MetricsCollector;

  constructor() {
    console.log('[ActionAgent] Starting...');
    this.eventBus = new EventBus('action-agent-1');
    this.bashExecutor = new BashExecutor();
    this.webSearcher = new WebSearcher();
    this.draftExecutor = new DraftExecutor();
    this.imageExecutor = new ImageExecutor();
    this.browserRunner = new BrowserRunner();
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
          case 'websearch':
            result = { output: await this.webSearcher.search(payload.params?.query || '') };
            break;
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
