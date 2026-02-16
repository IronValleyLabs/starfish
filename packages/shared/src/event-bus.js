"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
class EventBus {
    agentId;
    publisher;
    subscriber;
    subscriptions = new Map();
    constructor(agentId) {
        this.agentId = agentId;
        const redisHost = process.env.REDIS_HOST || 'localhost';
        this.publisher = new ioredis_1.default({ host: redisHost });
        this.subscriber = new ioredis_1.default({ host: redisHost });
        console.log(`[EventBus] Agente ${agentId} conectado a Redis en ${redisHost}`);
        this.subscriber.on('message', (channel, message) => {
            const event = JSON.parse(message);
            const handlers = this.subscriptions.get(event.name);
            if (handlers) {
                handlers.forEach(handler => handler(event));
            }
        });
    }
    async publish(name, payload, correlationId) {
        const event = {
            id: (0, crypto_1.randomUUID)(),
            name,
            payload,
            timestamp: Date.now(),
            correlationId: correlationId || (0, crypto_1.randomUUID)(),
        };
        console.log(`[EventBus] Publicando evento: ${name}`, { agent: this.agentId, correlationId: event.correlationId });
        await this.publisher.publish(name, JSON.stringify(event));
    }
    subscribe(name, handler) {
        if (!this.subscriptions.has(name)) {
            this.subscriptions.set(name, []);
            this.subscriber.subscribe(name, (err) => {
                if (err)
                    console.error(`Error suscribiéndose a ${name}`, err);
                else
                    console.log(`[EventBus] Agente ${this.agentId} suscrito a: ${name}`);
            });
        }
        this.subscriptions.get(name).push(handler);
    }
}
exports.EventBus = EventBus;
//# sourceMappingURL=event-bus.js.map