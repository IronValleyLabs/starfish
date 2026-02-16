import Redis from 'ioredis';
import { getRedisOptions } from './redis-config';

const KEY_PREFIX = 'metrics:';
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function createRedis(): Redis {
  const opts = getRedisOptions();
  return typeof opts === 'string' ? new Redis(opts) : new Redis(opts);
}

function todayKey(agentId: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return KEY_PREFIX + agentId + ':' + date;
}

export interface Metrics {
  actionsToday: number;
  costToday: number;
  lastAction: string;
  lastActionTime: number;
  nanoCount: number;
}

export class MetricsCollector {
  private client: Redis;

  constructor(redis?: Redis) {
    this.client = redis ?? createRedis();
  }

  private key(agentId: string, date?: string): string {
    const d = date ?? new Date().toISOString().slice(0, 10);
    return KEY_PREFIX + agentId + ':' + d;
  }

  async incrementActions(agentId: string): Promise<void> {
    const k = this.key(agentId);
    await this.client.hincrby(k, 'actions', 1);
    await this.client.expire(k, TTL_SECONDS);
  }

  async addCost(agentId: string, cost: number): Promise<void> {
    if (cost <= 0) return;
    const k = this.key(agentId);
    await this.client.hincrbyfloat(k, 'cost', cost);
    await this.client.expire(k, TTL_SECONDS);
  }

  async recordAction(agentId: string, action: string): Promise<void> {
    const k = this.key(agentId);
    const now = Date.now();
    await this.client.hset(k, 'lastAction', action, 'lastActionTime', String(now));
    await this.client.expire(k, TTL_SECONDS);
  }

  async incrementNanoCount(agentId: string): Promise<void> {
    const k = this.key(agentId);
    await this.client.hincrby(k, 'nanos', 1);
    await this.client.expire(k, TTL_SECONDS);
  }

  async getMetrics(agentId: string, date?: string): Promise<Metrics> {
    const k = this.key(agentId, date);
    const data = await this.client.hgetall(k);
    return {
      actionsToday: Math.max(0, parseInt(data?.actions ?? '0', 10)),
      costToday: Math.max(0, parseFloat(data?.cost ?? '0')),
      lastAction: data?.lastAction ?? 'Never',
      lastActionTime: parseInt(data?.lastActionTime ?? '0', 10),
      nanoCount: Math.max(0, parseInt(data?.nanos ?? '0', 10)),
    };
  }

  /** Get all agent keys for a given date. Returns agentId list from keys. */
  async getAgentIdsWithMetrics(date?: string): Promise<string[]> {
    const d = date ?? new Date().toISOString().slice(0, 10);
    const pattern = KEY_PREFIX + '*:' + d;
    const keys = await this.client.keys(pattern);
    return keys.map((k) => k.slice(KEY_PREFIX.length, -d.length - 1));
  }

  /** Get metrics for all agents that have data today. */
  async getAllMetrics(): Promise<Record<string, Metrics>> {
    const agentIds = await this.getAgentIdsWithMetrics();
    const out: Record<string, Metrics> = {};
    for (const id of agentIds) {
      out[id] = await this.getMetrics(id);
    }
    return out;
  }

  disconnect(): void {
    this.client.disconnect();
  }
}
