import { Event, EventName, EventPayload } from './index';
type EventHandler = (event: Event) => void;
export declare class EventBus {
    private agentId;
    private publisher;
    private subscriber;
    private subscriptions;
    constructor(agentId: string);
    publish(name: EventName, payload: EventPayload, correlationId?: string): Promise<void>;
    subscribe(name: EventName, handler: EventHandler): void;
}
export {};
