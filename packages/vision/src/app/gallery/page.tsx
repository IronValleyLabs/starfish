'use client'

import { useState } from 'react'
import { getMiniJellysByCategory, MiniJellyTemplate } from '@/lib/mini-jelly-templates'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X } from 'lucide-react'

const MAX_TEAM_SIZE = 20

export default function Gallery() {
  const router = useRouter()
  const categories = getMiniJellysByCategory()
  const [modal, setModal] = useState<{
    template: MiniJellyTemplate
    jobDescription: string
    goals: string
    kpis: string
    accessNotes: string
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openAddModal = (template: MiniJellyTemplate) => {
    const defaultGoals = (template.defaultGoals ?? []).join('\n')
    const defaultKpis = (template.defaultKpis ?? []).join('\n')
    const defaultAccess =
      (template.requiredAccess ?? []).length > 0
        ? `Suggested: ${template.requiredAccess.join(', ')}. Describe how this agent can use them (e.g. login email, where credentials are). Do not paste real passwords.`
        : ''
    setModal({ template, jobDescription: '', goals: defaultGoals, kpis: defaultKpis, accessNotes: defaultAccess })
    setError(null)
  }

  const closeModal = () => {
    if (!submitting) {
      setModal(null)
      setError(null)
    }
  }

  const handleAddToTeam = async () => {
    if (!modal) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: modal.template.id,
          jobDescription: modal.jobDescription.trim() || undefined,
          goals: modal.goals.trim() || undefined,
          kpis: modal.kpis.trim() || undefined,
          accessNotes: modal.accessNotes.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to add to team')
        return
      }
      closeModal()
      router.push('/')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
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
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-ocean-300 to-ocean-500 bg-clip-text text-transparent">
                Mini Jelly Gallery
              </h1>
              <p className="text-sm text-ocean-400">
                Add role-based AI agents (max {MAX_TEAM_SIZE}). Set their KPIs; they work to achieve them and keep you informed with findings and recommendations.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {Object.entries(categories).map(([category, templates]) => (
          <div key={category} className="mb-12">
            <h2 className="text-xl font-semibold text-ocean-100 mb-4">
              {category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6 hover:border-ocean-500/50 transition-all hover:scale-[1.02] cursor-pointer group"
                >
                  <div className="text-center">
                    <div className="text-5xl mb-3">{template.icon}</div>
                    <h3 className="font-semibold text-ocean-100 mb-2">
                      {template.name}
                    </h3>
                    <p className="text-sm text-ocean-400 mb-4 line-clamp-2">
                      {template.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => openAddModal(template)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-ocean-500/20 group-hover:bg-ocean-500 text-ocean-300 group-hover:text-white rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Team
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {modal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-ocean-900 border border-ocean-700 rounded-xl max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ocean-100">
                Add {modal.template.name} to team
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 hover:bg-ocean-700/50 rounded-lg text-ocean-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-ocean-400 mb-2">
              <strong>Goals & targets</strong> — What this agent should do (e.g. &quot;Post 3 times per day&quot;). One per line.
            </p>
            <textarea
              value={modal.goals}
              onChange={(e) =>
                setModal((m) => (m ? { ...m, goals: e.target.value } : null))
              }
              rows={4}
              className="w-full px-4 py-3 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 text-sm focus:outline-none focus:border-ocean-500 resize-y mb-4"
              placeholder="One goal per line..."
            />
            <p className="text-sm text-ocean-400 mb-2">
              <strong>KPIs</strong> — Metrics this agent is measured on (e.g. ROAS &gt; 2, response time &lt; 1h). The agent will work to achieve them and report findings and recommendations to you.
            </p>
            <textarea
              value={modal.kpis}
              onChange={(e) =>
                setModal((m) => (m ? { ...m, kpis: e.target.value } : null))
              }
              rows={3}
              className="w-full px-4 py-3 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 text-sm focus:outline-none focus:border-ocean-500 resize-y mb-4"
              placeholder="e.g. ROAS > 2, CPA < $50, Weekly report to human"
            />
            <p className="text-sm text-ocean-400 mb-4">
              Optional: <strong>Job description</strong> or role summary (Markdown supported).
            </p>
            <p className="text-sm text-ocean-400 mb-2">
              <strong>Access & credentials</strong> — Describe what this agent can use (e.g. &quot;Login: agent@company.com&quot;, &quot;API keys in .env&quot;, &quot;Browser: use 1Password for Bank X&quot;). Do not paste real passwords. The agent will see this so it knows what it can do.
            </p>
            <textarea
              value={modal.accessNotes}
              onChange={(e) =>
                setModal((m) => (m ? { ...m, accessNotes: e.target.value } : null))
              }
              rows={3}
              className="w-full px-4 py-3 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 text-sm focus:outline-none focus:border-ocean-500 resize-y mb-4"
              placeholder="e.g. No API yet; only web search. Or: QuickBooks login in 1Password under 'Finance'."
            />
            {error && (
              <p className="text-sm text-red-400 mb-4 rounded-lg bg-red-500/10 px-3 py-2">
                {error}
              </p>
            )}
            <textarea
              value={modal.jobDescription}
              onChange={(e) =>
                setModal((m) => (m ? { ...m, jobDescription: e.target.value } : null))
              }
              placeholder="e.g. Manages our Instagram and Twitter, replies within 1h"
              className="w-full h-24 px-4 py-3 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 text-sm focus:outline-none focus:border-ocean-500 resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 bg-ocean-700/50 hover:bg-ocean-700 text-ocean-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddToTeam}
                disabled={submitting}
                className="px-4 py-2 bg-ocean-500 hover:bg-ocean-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? 'Adding…' : 'Add to Team'}
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
