import path from 'path'
import { EventBus } from '@starfish/shared'

// Load root monorepo .env so REDIS_HOST is available
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })
dotenv.config()

export const dynamic = 'force-dynamic'

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const eventBus = new EventBus('vision-agent-1')
      const events = [
        'message.received',
        'context.loaded',
        'intent.detected',
        'action.completed',
        'action.failed',
      ] as const
      events.forEach((eventName) => {
        eventBus.subscribe(eventName, (event) => {
          const data = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(new TextEncoder().encode(data))
        })
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
