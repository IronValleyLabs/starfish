'use client'

import { useEffect, useState } from 'react'

interface Event {
  id: string
  name: string
  payload: Record<string, unknown>
  timestamp: number
  correlationId: string
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const eventSource = new EventSource('/api/events')
    eventSource.onopen = () => {
      setConnected(true)
      console.log('[Vision] Conectado al Event Stream')
    }
    eventSource.onmessage = (e) => {
      const event: Event = JSON.parse(e.data)
      setEvents((prev) => [event, ...prev].slice(0, 50))
    }
    eventSource.onerror = () => {
      setConnected(false)
      console.error('[Vision] Error en Event Stream')
    }
    return () => eventSource.close()
  }, [])

  return (
    <div className="container">
      <div className="header">
        <h1>🐙 Starfish Vision</h1>
        <p>Monitoreo en tiempo real de eventos</p>
        <span
          className={`status ${connected ? 'connected' : 'disconnected'}`}
        >
          {connected ? '● Conectado' : '○ Desconectado'}
        </span>
      </div>
      <div className="events">
        {events.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#64748b',
              padding: '3rem',
            }}
          >
            Esperando eventos...
          </div>
        )}
        {events.map((event) => (
          <div key={event.id} className="event">
            <div className="event-header">
              <span className="event-name">{event.name}</span>
              <span className="event-time">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="event-payload">
              {JSON.stringify(event.payload, null, 2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
