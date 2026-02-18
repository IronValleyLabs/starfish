import { NextRequest } from 'next/server'
import Redis from 'ioredis'
import { getRedisOptions } from '@jellyfish/shared'

const SESSION_PREFIX = 'session:response:'
const TTL_SECONDS = 120

function getRedis(): Redis {
  const opts = getRedisOptions()
  return typeof opts === 'string' ? new Redis(opts) : new Redis(opts)
}

/** POST — Store session response (called by Chat when action.completed for internal:session:requestId). */
export async function POST(request: NextRequest) {
  let body: { requestId?: string; output?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { requestId, output } = body
  if (!requestId || typeof output !== 'string') {
    return Response.json({ error: 'requestId and output required' }, { status: 400 })
  }
  const redis = getRedis()
  try {
    await redis.setex(SESSION_PREFIX + requestId, TTL_SECONDS, output)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/sessions/response]', err)
    return Response.json({ error: 'Failed to store response' }, { status: 500 })
  } finally {
    redis.disconnect()
  }
}

/** GET ?requestId= — Poll for session response (used by Action after sessions_send). */
export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get('requestId')?.trim()
  if (!requestId) {
    return Response.json({ error: 'requestId required' }, { status: 400 })
  }
  const redis = getRedis()
  try {
    const output = await redis.get(SESSION_PREFIX + requestId)
    if (output !== null) await redis.del(SESSION_PREFIX + requestId)
    return Response.json({ output: output ?? null })
  } catch (err) {
    console.error('[GET /api/sessions/response]', err)
    return Response.json({ error: 'Failed to read response' }, { status: 500 })
  } finally {
    redis.disconnect()
  }
}
