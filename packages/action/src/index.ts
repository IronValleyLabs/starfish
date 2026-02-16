import path from 'path';
import { EventBus, MetricsCollector } from '@jellyfish/shared';
import { BashExecutor } from './bash-executor';
import { WebSearcher } from './web-searcher';
import { DraftExecutor } from './draft-executor';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

interface IntentPayload {
  intent?: string;
  params?: { command?: string; query?: string; text?: string; prompt?: string };
  conversationId?: string;
  agentId?: string;
}

class ActionAgent {
  private eventBus: EventBus;
  private bashExecutor: BashExecutor;
  private webSearcher: WebSearcher;
  private draftExecutor: DraftExecutor;
  private metrics: MetricsCollector;

  constructor() {
    console.log('[ActionAgent] Starting...');
    this.eventBus = new EventBus('action-agent-1');
    this.bashExecutor = new BashExecutor();
    this.webSearcher = new WebSearcher();
    this.draftExecutor = new DraftExecutor();
    this.metrics = new MetricsCollector();
    if (this.draftExecutor.isEnabled()) {
      console.log('[ActionAgent] Draft LLM enabled (for copies/writing)');
    }
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
            const searchResult = await this.webSearcher.search(
              payload.params?.query || ''
            );
            result = { output: searchResult };
            break;
          case 'draft':
            result = await this.draftExecutor.execute(
              payload.params?.prompt || ''
            );
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
