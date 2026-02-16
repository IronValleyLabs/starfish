import path from 'path';
import { EventBus, ContextLoadedPayload, MetricsCollector } from '@jellyfish/shared';
import { AIProcessor } from './ai-processor';
import { loadSystemPrompt } from './load-system-prompt';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const miniJellyId = process.env.MINI_JELLY_ID;

const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'anthropic/claude-3.5-sonnet': { input: 0.003 / 1000, output: 0.015 / 1000 },
  'anthropic/claude-3-sonnet': { input: 0.003 / 1000, output: 0.015 / 1000 },
  'openai/gpt-4o': { input: 0.0025 / 1000, output: 0.01 / 1000 },
  'openai/gpt-4o-mini': { input: 0.00015 / 1000, output: 0.0006 / 1000 },
};

function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const price = MODEL_PRICES[model] ?? { input: 0, output: 0 };
  return promptTokens * price.input + completionTokens * price.output;
}

class CoreAgent {
  private eventBus: EventBus;
  private aiProcessor: AIProcessor;
  private metrics: MetricsCollector;
  private agentId: string;
  constructor(agentId: string, systemPrompt: string, metrics: MetricsCollector) {
    this.agentId = agentId;
    this.metrics = metrics;
    this.eventBus = new EventBus(agentId);
    this.aiProcessor = new AIProcessor(systemPrompt);
    this.setupSubscriptions();
  }
  private setupSubscriptions() {
    this.eventBus.subscribe('context.loaded', async (event) => {
      const payload = event.payload as ContextLoadedPayload;
      const target = payload.targetAgentId ?? payload.assignedAgentId ?? null;
      if (target != null && target !== this.agentId) return;
      if (target == null && miniJellyId) return;
      try {
        const { intent, params, usage: intentUsage } = await this.aiProcessor.detectIntent(
          payload.currentMessage,
          payload.history
        );
        if (intentUsage) {
          const intentCost = estimateCost(
            this.aiProcessor.getModel(),
            intentUsage.prompt_tokens,
            intentUsage.completion_tokens
          );
          await this.metrics.addCost(this.agentId, intentCost);
        }
        if (intent === 'response') {
          const { content, usage } = await this.aiProcessor.generateResponse(
            payload.currentMessage,
            payload.history
          );
          await this.metrics.incrementActions(this.agentId);
          await this.metrics.recordAction(this.agentId, 'response_generated');
          if (usage) {
            const cost = estimateCost(
              this.aiProcessor.getModel(),
              usage.prompt_tokens,
              usage.completion_tokens
            );
            await this.metrics.addCost(this.agentId, cost);
          }
          await this.eventBus.publish(
            'action.completed',
            {
              conversationId: payload.conversationId,
              result: { output: content },
              agentId: this.agentId,
            },
            event.correlationId
          );
        } else {
          await this.eventBus.publish(
            'intent.detected',
            {
              conversationId: payload.conversationId,
              intent,
              params,
              agentId: this.agentId,
            },
            event.correlationId
          );
        }
      } catch (error: unknown) {
        console.error('[CoreAgent] Error:', error);
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

async function main() {
  const agentId = miniJellyId ? `mini-jelly-${miniJellyId}` : 'core-agent-1';
  let systemPrompt = (process.env.MINI_JELLY_SYSTEM_PROMPT || '').trim();
  if (!miniJellyId) {
    const loaded = await loadSystemPrompt();
    if (loaded) {
      systemPrompt = loaded;
      console.log('[CoreAgent] Using system prompt from system-prompts.json');
    }
  }
  if (!systemPrompt) {
    systemPrompt = '';
  }
  const metrics = new MetricsCollector();
  new CoreAgent(agentId, systemPrompt, metrics);
}
main().catch((err) => {
  console.error('[CoreAgent] Failed to start:', err);
  process.exit(1);
});
