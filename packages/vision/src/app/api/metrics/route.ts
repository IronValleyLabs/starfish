import { NextRequest } from 'next/server'
import Redis from 'ioredis'
import { MetricsCollector, getRedisOptions } from '@jellyfish/shared'

function getRedis(): Redis {
  const opts = getRedisOptions()
  return typeof opts === 'string' ? new Redis(opts) : new Redis(opts)
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const miniJellyId = searchParams.get('miniJellyId')
  const redis = getRedis()
  const collector = new MetricsCollector(redis)
  try {
    if (miniJellyId && miniJellyId.trim()) {
      const agentId = miniJellyId.startsWith('mini-jelly-') ? miniJellyId : `mini-jelly-${miniJellyId}`
      const metrics = await collector.getMetrics(agentId)
      return Response.json(metrics)
    }
    const all = await collector.getAllMetrics()
    return Response.json(all)
  } catch (err) {
    console.error('[GET /api/metrics]', err)
    return Response.json({ error: 'Failed to read metrics' }, { status: 500 })
  } finally {
    redis.disconnect()
  }
}
