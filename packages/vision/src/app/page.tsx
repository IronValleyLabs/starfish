'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Activity, Pause, Settings, TrendingUp } from 'lucide-react'

interface TeamMember {
  id: string
  templateId: string
  name: string
  role: string
  icon: string
  jobDescription?: string
  status: 'active' | 'paused'
  addedAt: number
  nanoCount: number
  actionsToday: number
  costToday: number
  lastAction: string
}

const MAX_TEAM_SIZE = 20

export default function Dashboard() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/team')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load team'))))
      .then((data: TeamMember[]) => setTeam(Array.isArray(data) ? data : []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error loading team'))
      .finally(() => setLoading(false))
  }, [])

  const activeCount = team.filter((m) => m.status === 'active').length
  const totalActions = team.reduce((sum, m) => sum + m.actionsToday, 0)
  const totalNano = team.reduce((sum, m) => sum + m.nanoCount, 0)
  const totalCost = team.reduce((sum, m) => sum + m.costToday, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-800">
      <header className="border-b border-ocean-700/50 backdrop-blur-sm bg-ocean-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🪼</div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-ocean-300 to-ocean-500 bg-clip-text text-transparent">
                  Jellyfish Platform
                </h1>
                <p className="text-sm text-ocean-400">
                  Autonomous AI that flows through your business
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/logs"
                className="flex items-center gap-2 px-4 py-2 bg-ocean-700/50 hover:bg-ocean-700 text-ocean-300 rounded-lg transition-colors"
              >
                <Activity className="w-4 h-4" />
                Live Logs
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-4 py-2 bg-ocean-700/50 hover:bg-ocean-700 text-ocean-300 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <Link
                href="/gallery"
                className="flex items-center gap-2 px-4 py-2 bg-ocean-500 hover:bg-ocean-600 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Mini Jelly
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
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
                            </div>
                            {member.jobDescription && (
                              <p className="text-sm text-ocean-400 mb-2 line-clamp-2">
                                {member.jobDescription}
                              </p>
                            )}
                            <p className="text-sm text-ocean-500 mb-3">
                              Last action: {member.lastAction}
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
                            href={`/mini/${member.id}`}
                            className="p-2 hover:bg-ocean-700/50 rounded-lg transition-colors"
                            title="Configure"
                          >
                            <Activity className="w-5 h-5 text-ocean-300" />
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
  )
}
