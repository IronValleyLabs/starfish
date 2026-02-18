// Tipos de Eventos Principales
export type EventName =
  | 'message.received'
  | 'context.loaded'
  | 'intent.detected'
  | 'action.completed'
  | 'action.failed'
  | 'conversation.unassigned'
  | 'agent.tick';

export interface EventPayload {
  [key: string]: unknown;
}

export interface Event {
  id: string; // UUID
  name: EventName;
  payload: EventPayload;
  timestamp: number;
  correlationId: string;
  agentId?: string;
}

// Specific payload types
export interface MessageReceivedPayload extends EventPayload {
  platform: 'telegram' | 'whatsapp' | 'line' | 'google-chat' | 'slack' | 'discord' | 'internal';
  userId: string;
  conversationId: string;
  text: string;
  /** When set, only the agent with this id should handle (from mention or existing assignment). */
  targetAgentId?: string | null;
}

export interface ActionCompletedPayload extends EventPayload {
  conversationId: string;
  result: {
    output: string;
    files?: string[];
  };
  /** Mini Jelly (agent) that produced this response. */
  agentId?: string;
}

export interface ContextLoadedPayload extends EventPayload {
  conversationId: string;
  history: Array<{ role: string; content: string }>;
  currentMessage: string;
  /** When set, only the Core agent with this id should handle (from routing/mention). */
  targetAgentId?: string | null;
  /** @deprecated Use targetAgentId. Kept for backward compatibility. */
  assignedAgentId?: string | null;
}

export { EventBus } from './event-bus';
export { getRedisOptions, type RedisOptions } from './redis-config';
export { detectMention, type TeamMemberForRouting } from './mention-detector';
export { ConversationRouter } from './conversation-router';
export { MetricsCollector, type Metrics } from './metrics';
