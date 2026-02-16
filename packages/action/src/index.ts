import path from 'path';
import { EventBus } from '@starfish/shared';
import { BashExecutor } from './bash-executor';
import { WebSearcher } from './web-searcher';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

interface IntentPayload {
  intent?: string;
  params?: { command?: string; query?: string; text?: string };
  conversationId?: string;
}

class ActionAgent {
  private eventBus: EventBus;
  private bashExecutor: BashExecutor;
  private webSearcher: WebSearcher;

  constructor() {
    console.log('[ActionAgent] Iniciando...');
    this.eventBus = new EventBus('action-agent-1');
    this.bashExecutor = new BashExecutor();
    this.webSearcher = new WebSearcher();
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    this.eventBus.subscribe('intent.detected', async (event) => {
      const payload = event.payload as IntentPayload;
      console.log(`[ActionAgent] Intención detectada: ${payload.intent}`);
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
          case 'response':
            result = { output: payload.params?.text || 'Sin respuesta' };
            break;
          default:
            result = { output: 'Intención no reconocida' };
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
          await this.eventBus.publish(
            'action.completed',
            {
              conversationId: payload.conversationId,
              result: { output: result.output },
            },
            event.correlationId
          );
        }
      } catch (error: unknown) {
        console.error('[ActionAgent] Error ejecutando acción:', error);
        await this.eventBus.publish(
          'action.failed',
          {
            conversationId: payload.conversationId,
            error: error instanceof Error ? error.message : 'Error desconocido',
          },
          event.correlationId
        );
      }
    });
  }
}
new ActionAgent();
