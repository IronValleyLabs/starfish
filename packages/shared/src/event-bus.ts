import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { Event, EventName, EventPayload } from './index';
import { getRedisOptions } from './redis-config';

type EventHandler = (event: Event) => void;

function createRedis(): Redis {
  const opts = getRedisOptions();
  return typeof opts === 'string' ? new Redis(opts) : new Redis(opts);
}

export class EventBus {
  private publisher: Redis;
  private subscriber: Redis;
  private subscriptions: Map<EventName, EventHandler[]> = new Map();

  constructor(private agentId: string) {
    const redisOpts = getRedisOptions();
    const redisLabel = typeof redisOpts === 'string' ? redisOpts.replace(/:[^:@]+@/, ':***@') : `${redisOpts.host}:${redisOpts.port}`;
    this.publisher = createRedis();
    this.subscriber = createRedis();

    let redisErrorLogged = false;
    const onRedisError = (err: Error): void => {
      if (!redisErrorLogged) {
        redisErrorLogged = true;
        console.error(`[EventBus] Redis error (${redisLabel}):`, err.message);
      }
    };
    this.publisher.on('error', onRedisError);
    this.subscriber.on('error', onRedisError);
    this.publisher.on('connect', () => { redisErrorLogged = false; });

    this.subscriber.on('message', (channel, message) => {
      const event: Event = JSON.parse(message);
      const handlers = this.subscriptions.get(event.name as EventName);
      if (handlers) {
        handlers.forEach(handler => handler(event));
      }
    });
  }

  async publish(name: EventName, payload: EventPayload, correlationId?: string): Promise<void> {
    const event: Event = {
      id: randomUUID(),
      name,
      payload,
      timestamp: Date.now(),
      correlationId: correlationId || randomUUID(),
      agentId: this.agentId,
    };
    await this.publisher.publish(name, JSON.stringify(event));
  }

  subscribe(name: EventName, handler: EventHandler): void {
    if (!this.subscriptions.has(name)) {
      this.subscriptions.set(name, []);
      this.subscriber.subscribe(name, (err) => {
        if (err) console.error(`[EventBus] Subscribe error (${name}):`, err.message);
      });
    }
    this.subscriptions.get(name)!.push(handler);
  }
}
