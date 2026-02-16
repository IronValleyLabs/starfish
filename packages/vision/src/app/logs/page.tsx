'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Activity, Filter } from 'lucide-react'

interface LogEvent {
  id: string
  timestamp: number
  agent: string
  eventName: string
  payload: unknown
  correlationId: string
}

export default function Logs() {
  const [events, setEvents] = useState<LogEvent[]>([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const eventSource = new EventSource('/api/events')

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setEvents((prev) => [data, ...prev].slice(0, 100))
      } catch (error) {
        console.error('Error parsing SSE event:', error)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [])

  const getEventColor = (eventName: string) => {
    if (eventName.includes('received')) return 'text-blue-400'
    if (eventName.includes('completed')) return 'text-green-400'
    if (eventName.includes('failed')) return 'text-red-400'
    if (eventName.includes('detected')) return 'text-purple-400'
    return 'text-ocean-400'
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-800">
      <header className="border-b border-ocean-700/50 backdrop-blur-sm bg-ocean-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-ocean-700/50 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-ocean-300" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-ocean-300 to-ocean-500 bg-clip-text text-transparent">
                  Live Event Stream
                </h1>
                <p className="text-sm text-ocean-400">
                  Real-time agent activity
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 text-sm focus:outline-none focus:border-ocean-500"
              >
                <option value="all">All Events</option>
                <option value="message">Messages</option>
                <option value="action">Actions</option>
                <option value="error">Errors</option>
              </select>
              <button className="p-2 bg-ocean-700/50 hover:bg-ocean-700 rounded-lg transition-colors">
                <Filter className="w-5 h-5 text-ocean-300" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="text-center py-16 bg-ocean-900/30 backdrop-blur-sm border border-ocean-700/50 rounded-xl">
              <Activity className="w-12 h-12 text-ocean-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-ocean-200 mb-2">
                No events yet
              </h3>
              <p className="text-ocean-400">
                Events will appear here in real-time
              </p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-lg p-4 hover:border-ocean-500/50 transition-colors font-mono text-sm"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-ocean-500">
                      {formatTime(event.timestamp)}
                    </span>
                    <span className="text-ocean-600">|</span>
                    <span className="text-ocean-400">{event.agent}</span>
                    <span className="text-ocean-600">|</span>
                    <span
                      className={getEventColor(event.eventName)}
                    >
                      {event.eventName}
                    </span>
                  </div>
                  <span className="text-xs text-ocean-600">
                    {event.correlationId.slice(0, 8)}
                  </span>
                </div>
                <pre className="text-ocean-300 text-xs overflow-x-auto">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
