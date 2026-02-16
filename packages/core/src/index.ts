import path from 'path';
import { EventBus, ContextLoadedPayload } from '@starfish/shared';
import { AIProcessor } from './ai-processor';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();
class CoreAgent {
  private eventBus: EventBus;
  private aiProcessor: AIProcessor;
  constructor() {
    console.log('[CoreAgent] Iniciando con OpenRouter...');
    this.eventBus = new EventBus('core-agent-1');
    this.aiProcessor = new AIProcessor();
    this.setupSubscriptions();
  }
  private setupSubscriptions() {
    this.eventBus.subscribe('context.loaded', async (event) => {
      const payload = event.payload as ContextLoadedPayload;
      console.log(
        `[CoreAgent] Contexto cargado para ${payload.conversationId} con ${payload.history.length} mensajes`
      );
      try {
        const response = await this.aiProcessor.generateResponse(
          payload.currentMessage,
          payload.history
        );
        console.log(`[CoreAgent] Respuesta generada: "${response}"`);
        await this.eventBus.publish(
          'action.completed',
          {
            conversationId: payload.conversationId,
            result: { output: response },
          },
          event.correlationId
        );
      } catch (error: unknown) {
        console.error('[CoreAgent] Error generando respuesta:', error);
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
new CoreAgent();
