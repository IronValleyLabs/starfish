export type EventName = 'message.received' | 'context.loaded' | 'intent.detected' | 'action.completed' | 'action.failed';
export interface EventPayload {
    [key: string]: unknown;
}
export interface Event {
    id: string;
    name: EventName;
    payload: EventPayload;
    timestamp: number;
    correlationId: string;
}
export interface MessageReceivedPayload extends EventPayload {
    platform: 'telegram' | 'whatsapp';
    userId: string;
    conversationId: string;
    text: string;
}
export interface ActionCompletedPayload extends EventPayload {
    conversationId: string;
    result: {
        output: string;
        files?: string[];
    };
}
export interface ContextLoadedPayload extends EventPayload {
    conversationId: string;
    history: Array<{
        role: string;
        content: string;
    }>;
    currentMessage: string;
}
export { EventBus } from './event-bus';
