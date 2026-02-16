'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { Plus, Activity, Settings, TrendingUp, FileText, MessageSquare, ChevronRight, ChevronLeft } from 'lucide-react'

interface TeamMember {
  id: string
  templateId: string
  name: string
  role: string
  icon: string
  jobDescription?: string
  goals?: string
  accessNotes?: string
  kpis?: string
  status: 'active' | 'paused'
  addedAt: number
  nanoCount: number
  actionsToday: number
  costToday: number
  lastAction: string
}

interface Metrics {
  actionsToday: number
  costToday: number
  lastAction: string
  lastActionTime: number
  nanoCount: number
}

interface AgentStatus {
  online: boolean
  pid: number
  uptime: number
}

interface MainProcessStatus {
  online: boolean
  pid: number
}

interface MemberWithMeta extends TeamMember {
  metrics: Metrics
  agentStatus: AgentStatus | null
}

const DEFAULT_METRICS: Metrics = {
  actionsToday: 0,
  costToday: 0,
  lastAction: 'Never',
  lastActionTime: 0,
  nanoCount: 0,
}

const MAX_TEAM_SIZE = 20
const POLL_INTERVAL_MS = 30000

function formatRelative(ts: number): string {
  if (!ts) return ''
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}

export default function Dashboard() {
  const [teamWithMeta, setTeamWithMeta] = useState<MemberWithMeta[]>([])
  const [metricsMap, setMetricsMap] = useState<Record<string, Metrics>>({})
  const [mainProcesses, setMainProcesses] = useState<Record<string, MainProcessStatus>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redisWarning, setRedisWarning] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const loadData = useCallback(async () => {
    const [teamRes, metricsRes, statusRes] = await Promise.all([
      fetch('/api/team', { cache: 'no-store' }),
      fetch('/api/metrics', { cache: 'no-store' }),
      fetch('/api/status', { cache: 'no-store' }),
    ])
    const teamData = await teamRes.json().catch(() => null)
    if (!teamRes.ok || teamData == null) throw new Error('Failed to load team')
    const team: TeamMember[] = Array.isArray(teamData) ? teamData : []
    setRedisWarning(!metricsRes.ok || !statusRes.ok)
    const metricsData: unknown = metricsRes.ok
      ? await metricsRes.json().catch(() => ({}))
      : {}
    const statusData: unknown = statusRes.ok
      ? await statusRes.json().catch(() => ({}))
      : {}
    const metrics: Record<string, Metrics> =
      typeof metricsData === 'object' && metricsData !== null ? (metricsData as Record<string, Metrics>) : {}
    const statusRaw: Record<string, AgentStatus | Record<string, MainProcessStatus>> =
      typeof statusData === 'object' && statusData !== null ? (statusData as Record<string, AgentStatus | Record<string, MainProcessStatus>>) : {}
    const { _main, ...status } = statusRaw
    if (_main && typeof _main === 'object') setMainProcesses(_main as Record<string, MainProcessStatus>)
    setMetricsMap(metrics)

    const merged: MemberWithMeta[] = team.map((m) => {
      const agentId = m.id.startsWith('mini-jelly-') ? m.id : `mini-jelly-${m.id}`
      const mMetrics = metrics[agentId] ?? DEFAULT_METRICS
      const agentStatus = (status as Record<string, AgentStatus>)[m.id] ?? null
      return {
        ...m,
        nanoCount: mMetrics.nanoCount,
        actionsToday: mMetrics.actionsToday,
        costToday: mMetrics.costToday,
        lastAction: mMetrics.lastAction === 'Never' ? 'Never' : mMetrics.lastAction,
        metrics: mMetrics,
        agentStatus,
      }
    })
    setTeamWithMeta(merged)
  }, [])

  useEffect(() => {
    loadData()
      .catch((e) => setError(e instanceof Error ? e.message : 'Error loading data'))
      .finally(() => setLoading(false))
  }, [loadData])

  useEffect(() => {
    const interval = setInterval(loadData, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [loadData])

  const team = teamWithMeta
  const activeCount = team.filter((m) => m.status === 'active').length
  const coreMetrics = metricsMap['core-agent-1'] ?? DEFAULT_METRICS
  const totalActions = team.reduce((sum, m) => sum + m.actionsToday, 0) + coreMetrics.actionsToday
  const totalNano = team.reduce((sum, m) => sum + m.nanoCount, 0) + coreMetrics.nanoCount
  const totalCost = team.reduce((sum, m) => sum + m.costToday, 0) + coreMetrics.costToday

  const sidebarW = sidebarCollapsed ? 'w-14' : 'w-52'

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-800 flex">
      <div className={`flex-1 min-w-0 transition-[margin] duration-200 ${sidebarCollapsed ? 'mr-14' : 'mr-52'}`}>
        <header className="border-b border-ocean-700/50 backdrop-blur-sm bg-ocean-900/50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🪼</div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-ocean-300 to-ocean-500 bg-clip-text text-transparent">
                  Jellyfish Platform
                </h1>
                <p className="text-sm text-ocean-400">
                  AI agents with clear KPIs. They work to hit targets and report findings to you.
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
        {redisWarning && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200 text-sm">
            Redis is not reachable. Metrics and live status may be missing. Start <code className="bg-black/20 px-1 rounded">redis-server</code> or use Redis Cloud and set REDIS_HOST in .env, then restart.
          </div>
        )}
        {loading ? (
          <div className="text-center py-12 text-ocean-400">Loading team...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-ocean-500/20 rounded-lg">
                    <Activity className="w-5 h-5 text-ocean-300" />
                  </div>
                  <div>
                    <p className="text-sm text-ocean-400">Active Mini Jellys</p>
                    <p className="text-2xl font-bold text-ocean-100">{activeCount}</p>
                  </div>
                </div>
              </div>
              <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-300" />
                  </div>
                  <div>
                    <p className="text-sm text-ocean-400">Actions Today</p>
                    <p className="text-2xl font-bold text-ocean-100">{totalActions}</p>
                  </div>
                </div>
              </div>
              <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <span className="text-lg">🪼</span>
                  </div>
                  <div>
                    <p className="text-sm text-ocean-400">Total Nano Jellys</p>
                    <p className="text-2xl font-bold text-ocean-100">{totalNano}</p>
                  </div>
                </div>
              </div>
              <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <span className="text-lg">💰</span>
                  </div>
                  <div>
                    <p className="text-sm text-ocean-400">AI Cost Today</p>
                    <p className="text-2xl font-bold text-ocean-100">
                      ${totalCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {Object.keys(mainProcesses).length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-4 px-2 py-3 bg-ocean-900/30 border border-ocean-700/50 rounded-xl">
                <span className="text-sm text-ocean-500">System agents</span>
                {['memory', 'core', 'action', 'chat', 'vision'].map((name) => {
                  const s = mainProcesses[name]
                  const online = s?.online ?? false
                  return (
                    <span key={name} className="flex items-center gap-1.5 text-sm" title={s ? `PID ${s.pid}` : ''}>
                      <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                      <span className="text-ocean-300 capitalize">{name}</span>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Main Jellyfish = orchestrator (Core) that replies when no Mini Jelly is mentioned */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-ocean-100 mb-4">
                Jellyfish (orchestrator)
              </h2>
              <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-600/50 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🪼</div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-ocean-100">
                          Default agent
                        </h3>
                        {mainProcesses.core && (
                          <span className="flex items-center gap-1.5 text-xs" title={mainProcesses.core.online ? `Online (PID ${mainProcesses.core.pid})` : 'Offline'}>
                            <span className={`w-2 h-2 rounded-full ${mainProcesses.core.online ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                            {mainProcesses.core.online ? 'Online' : 'Offline'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-ocean-400 mb-3">
                        Replies in Chat and Telegram when you don&apos;t mention a Mini Jelly. This is the main Jellyfish that can coordinate and delegate to your team.
                      </p>
                      <p className="text-sm text-ocean-500 mb-2">
                        Last action: {coreMetrics.lastAction}
                        {coreMetrics.lastActionTime > 0 && (
                          <span className="text-ocean-600 ml-1">({formatRelative(coreMetrics.lastActionTime)})</span>
                        )}
                      </p>
                      <div className="flex items-center gap-6 text-sm text-ocean-400">
                        <span>Actions today: <strong className="text-ocean-200">{coreMetrics.actionsToday}</strong></span>
                        <span>AI cost: <strong className="text-ocean-200">${coreMetrics.costToday.toFixed(2)}</strong></span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/prompts/core"
                    className="flex items-center gap-2 px-4 py-2 bg-ocean-700/50 hover:bg-ocean-700 text-ocean-300 rounded-lg transition-colors text-sm"
                    title="Edit orchestrator prompt"
                  >
                    <FileText className="w-4 h-4" />
                    Edit prompt
                  </Link>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-ocean-100 mb-4">
                Your Team ({team.length}/{MAX_TEAM_SIZE})
              </h2>

              {team.length === 0 ? (
                <div className="text-center py-16 bg-ocean-900/30 backdrop-blur-sm border border-ocean-700/50 rounded-xl">
                  <div className="text-6xl mb-4">🪼</div>
                  <h3 className="text-xl font-semibold text-ocean-200 mb-2">
                    No Mini Jellys yet
                  </h3>
                  <p className="text-ocean-400 mb-6">
                    Add up to {MAX_TEAM_SIZE} AI employees from the gallery
                  </p>
                  <Link
                    href="/gallery"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-ocean-500 hover:bg-ocean-600 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Browse Gallery
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {team.map((member) => (
                    <div
                      key={member.id}
                      className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6 hover:border-ocean-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="text-4xl">{member.icon}</div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-semibold text-ocean-100">
                                {member.name}
                                {member.role !== member.name && ` – ${member.role}`}
                              </h3>
                              <span
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  member.status === 'active'
                                    ? 'bg-green-500/20 text-green-300'
                                    : 'bg-gray-500/20 text-gray-300'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                {member.status === 'active' ? 'Active' : 'Paused'}
                              </span>
                              {member.agentStatus && (
                                <span
                                  className="flex items-center gap-1.5 text-xs"
                                  title={member.agentStatus.online ? `Online (PID ${member.agentStatus.pid})` : 'Offline'}
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      member.agentStatus.online
                                        ? 'bg-green-400 animate-pulse'
                                        : 'bg-gray-500'
                                    }`}
                                  />
                                  {member.agentStatus.online ? 'Online' : 'Offline'}
                                </span>
                              )}
                            </div>
                            {member.jobDescription && (
                              <div className="text-sm text-ocean-400 mb-2 line-clamp-3 [&_*]:inline [&_*]:text-inherit [&_strong]:font-semibold [&_a]:text-ocean-300 [&_a]:underline">
                                <ReactMarkdown>{member.jobDescription}</ReactMarkdown>
                              </div>
                            )}
                            {member.kpis && (
                              <p className="text-xs text-amber-200/90 mb-2 font-medium">
                                KPIs: {member.kpis.split(/\r?\n/).filter(Boolean).slice(0, 2).join(' · ')}
                                {member.kpis.split(/\r?\n/).filter(Boolean).length > 2 && ' …'}
                              </p>
                            )}
                            <p className="text-sm text-ocean-500 mb-3">
                              Last action: {member.lastAction}
                              {member.metrics.lastActionTime > 0 && (
                                <span className="text-ocean-600 ml-1">
                                  ({formatRelative(member.metrics.lastActionTime)})
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-6 text-sm">
                              <div>
                                <span className="text-ocean-400">Managing </span>
                                <span className="font-semibold text-ocean-200">
                                  {member.nanoCount} Nano Jellys
                                </span>
                              </div>
                              <div>
                                <span className="text-ocean-400">Actions today: </span>
                                <span className="font-semibold text-ocean-200">
                                  {member.actionsToday}
                                </span>
                              </div>
                              <div>
                                <span className="text-ocean-400">AI cost: </span>
                                <span className="font-semibold text-ocean-200">
                                  ${member.costToday.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/prompts/${member.id}`}
                            className="p-2 hover:bg-ocean-700/50 rounded-lg transition-colors"
                            title="Edit prompt"
                          >
                            <FileText className="w-5 h-5 text-ocean-300" />
                          </Link>
                          <Link
                            href={`/mini/${member.id}`}
                            className="p-2 hover:bg-ocean-700/50 rounded-lg transition-colors"
                            title="Settings"
                          >
                            <Settings className="w-5 h-5 text-ocean-300" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        </main>
      </div>

      <aside
        className={`fixed top-0 right-0 h-full ${sidebarW} bg-ocean-900/95 backdrop-blur-sm border-l border-ocean-700/50 flex flex-col transition-[width] duration-200 z-30`}
        aria-label="Navigation"
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed((c) => !c)}
          className="flex items-center justify-center w-full py-3 border-b border-ocean-700/50 text-ocean-400 hover:bg-ocean-800/50 hover:text-ocean-200 transition-colors"
          title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
        >
          {sidebarCollapsed ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
        <nav className="flex-1 py-4 flex flex-col gap-1">
          <Link
            href="/logs"
            className="flex items-center gap-3 px-4 py-2.5 text-ocean-200 hover:bg-ocean-800/80 transition-colors"
            title="Live Logs"
          >
            <Activity className="w-5 h-5 text-ocean-400 shrink-0" />
            {!sidebarCollapsed && <span>Live Logs</span>}
          </Link>
          <Link
            href="/chat"
            className="flex items-center gap-3 px-4 py-2.5 text-ocean-200 hover:bg-ocean-800/80 transition-colors"
            title="Chat"
          >
            <MessageSquare className="w-5 h-5 text-ocean-400 shrink-0" />
            {!sidebarCollapsed && <span>Chat</span>}
          </Link>
          <Link
            href="/analytics"
            className="flex items-center gap-3 px-4 py-2.5 text-ocean-200 hover:bg-ocean-800/80 transition-colors"
            title="Analytics"
          >
            <TrendingUp className="w-5 h-5 text-ocean-400 shrink-0" />
            {!sidebarCollapsed && <span>Analytics</span>}
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-2.5 text-ocean-200 hover:bg-ocean-800/80 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-ocean-400 shrink-0" />
            {!sidebarCollapsed && <span>Settings</span>}
          </Link>
          <div className="border-t border-ocean-700/50 my-2" />
          <Link
            href="/gallery"
            className="flex items-center gap-3 px-4 py-2.5 text-ocean-100 hover:bg-ocean-800/80 transition-colors font-medium"
            title="Add Mini Jelly"
          >
            <Plus className="w-5 h-5 text-ocean-400 shrink-0" />
            {!sidebarCollapsed && <span>Add Mini Jelly</span>}
          </Link>
        </nav>
      </aside>
    </div>
  )
}
