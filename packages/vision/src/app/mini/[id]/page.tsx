'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'

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

export default function MiniJellyConfig() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [member, setMember] = useState<TeamMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [jobDescription, setJobDescription] = useState('')
  const [goals, setGoals] = useState('')
  const [accessNotes, setAccessNotes] = useState('')
  const [kpis, setKpis] = useState('')
  const [status, setStatus] = useState<'active' | 'paused'>('active')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/team')
      .then((res) => res.json())
      .then((team: TeamMember[]) => {
        const m = team.find((t) => t.id === id)
        setMember(m ?? null)
        if (m) {
          setJobDescription(m.jobDescription ?? '')
          setGoals(m.goals ?? '')
          setAccessNotes(m.accessNotes ?? '')
          setKpis(m.kpis ?? '')
          setStatus(m.status)
        }
      })
      .catch(() => setMember(null))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    if (!member) return
    setSaving(true)
    try {
      const res = await fetch(`/api/team?id=${encodeURIComponent(member.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: jobDescription.trim() || undefined,
          goals: goals.trim() || undefined,
          accessNotes: accessNotes.trim() || undefined,
          kpis: kpis.trim() || undefined,
          status,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setMember(updated)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!member || !confirm(`Remove ${member.name} from the team?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/team?id=${encodeURIComponent(member.id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push('/')
        router.refresh()
      }
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-800 flex items-center justify-center">
        <div className="text-ocean-400">Loading...</div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-ocean-300 mb-4">Mini Jelly not found</p>
          <Link
            href="/"
            className="text-ocean-400 hover:text-ocean-300 underline"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-800">
      <header className="border-b border-ocean-700/50 backdrop-blur-sm bg-ocean-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-ocean-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-ocean-300" />
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{member.icon}</span>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-ocean-300 to-ocean-500 bg-clip-text text-transparent">
                  {member.name}
                </h1>
                <p className="text-sm text-ocean-400">{member.role}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ocean-100 mb-2">
              Job description
            </h2>
            <p className="text-sm text-ocean-500 mb-4">
              Describe the role or responsibilities for this agent (visible on the dashboard). <strong>Markdown</strong> supported.
            </p>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full h-28 px-4 py-3 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 text-sm focus:outline-none focus:border-ocean-500 resize-none"
              placeholder="e.g. Manages our Instagram and Twitter..."
            />
          </div>

          <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ocean-100 mb-2">Goals & targets</h2>
            <p className="text-sm text-ocean-500 mb-4">
              One goal per line. The agent will follow these (e.g. &quot;Post 3 times per day&quot;, &quot;Respond within 1 hour&quot;).
            </p>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 text-sm focus:outline-none focus:border-ocean-500 resize-y"
              placeholder="One goal per line..."
            />
          </div>

          <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ocean-100 mb-2">KPIs</h2>
            <p className="text-sm text-ocean-500 mb-4">
              Metrics this agent is measured on. The agent works to achieve them and reports findings and recommendations to you.
            </p>
            <textarea
              value={kpis}
              onChange={(e) => setKpis(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 text-sm focus:outline-none focus:border-ocean-500 resize-y"
              placeholder="e.g. ROAS > 2, Response time < 1h, Report weekly to human"
            />
          </div>

          <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ocean-100 mb-2">Access & credentials</h2>
            <p className="text-sm text-ocean-500 mb-4">
              Describe what this agent can use (login email, where credentials are, which APIs). Do not paste real passwords. The agent sees this to know what it can do. Today it only has web search and bash unless you add integrations.
            </p>
            <textarea
              value={accessNotes}
              onChange={(e) => setAccessNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 text-sm focus:outline-none focus:border-ocean-500 resize-y"
              placeholder="e.g. No API yet. Or: QuickBooks login in 1Password 'Finance'."
            />
          </div>

          <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ocean-100 mb-2">Status</h2>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'paused')}
              className="w-full max-w-xs px-4 py-2 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 focus:outline-none focus:border-ocean-500"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleRemove}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Remove from team
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-ocean-500 hover:bg-ocean-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
