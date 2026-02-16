import { NextRequest } from 'next/server'
import Redis from 'ioredis'
import { getRedisOptions } from '@jellyfish/shared'

function createRedis(): Redis {
  const opts = getRedisOptions()
  return typeof opts === 'string' ? new Redis(opts) : new Redis(opts)
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const subscriber = createRedis()

      const channels = [
        'message.received',
        'context.loaded',
        'intent.detected',
        'action.completed',
        'action.failed',
        'conversation.unassigned',
      ]

      await subscriber.subscribe(...channels)

      subscriber.on('message', (channel, message) => {
        try {
          const event = JSON.parse(message)
          const data = {
            id: event.id,
            timestamp: event.timestamp,
            agent: event.agentId ?? 'unknown',
            eventName: channel,
            payload: event.payload,
            correlationId: event.correlationId,
          }
          const sseMessage = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(sseMessage))
        } catch (error) {
          console.error('Error parsing event:', error)
        }
      })

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'))
      }, 30000)

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        subscriber.disconnect()
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
