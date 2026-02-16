import Redis from 'ioredis'
import { MetricsCollector, getRedisOptions } from '@jellyfish/shared'

function getRedis(): Redis {
  const opts = getRedisOptions()
  return typeof opts === 'string' ? new Redis(opts) : new Redis(opts)
}

function last7Days(): string[] {
  const out: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const redis = getRedis()
  const collector = new MetricsCollector(redis)
  try {
    const dates = last7Days()
    const actionsByDay: Record<string, Record<string, number>> = {}
    const costByAgent: Record<string, number> = {}
    const allAgentIds = new Set<string>()

    for (const date of dates) {
      const agentIds = await collector.getAgentIdsWithMetrics(date)
      actionsByDay[date] = {}
      for (const agentId of agentIds) {
        allAgentIds.add(agentId)
        const m = await collector.getMetrics(agentId, date)
        actionsByDay[date][agentId] = m.actionsToday
        costByAgent[agentId] = (costByAgent[agentId] ?? 0) + m.costToday
      }
    }

    return Response.json({
      actionsByDay,
      costByAgent: Object.fromEntries(Object.entries(costByAgent)),
      dates,
      agentIds: Array.from(allAgentIds),
    })
  } catch (err) {
    console.error('[GET /api/analytics]', err)
    return Response.json({ error: 'Failed to load analytics' }, { status: 500 })
  } finally {
    redis.disconnect()
  }
}
