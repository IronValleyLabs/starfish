/**
 * Shared Redis connection config from env.
 * Use REDIS_URL for full control, or REDIS_HOST + REDIS_PORT + REDIS_PASSWORD.
 */
export interface RedisOptions {
  host: string;
  port: number;
  password?: string;
}

export function getRedisOptions(): RedisOptions | string {
  const url = process.env.REDIS_URL;
  if (url && url.trim()) return url.trim();

  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD?.trim();
  return { host, port, password: password || undefined };
}
