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
  const [modal, setModal] = useState<{ template: MiniJellyTemplate; jobDescription: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const openAddModal = (template: MiniJellyTemplate) => {
    setModal({ template, jobDescription: '' })
  }

  const closeModal = () => {
    if (!submitting) setModal(null)
  }

  const handleAddToTeam = async () => {
    if (!modal) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: modal.template.id,
          jobDescription: modal.jobDescription.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to add to team')
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
                Choose an AI employee for your team (max {MAX_TEAM_SIZE})
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
                    <div className="text-xs text-ocean-500 mb-4">
                      {template.estimatedCost}
                    </div>
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
            <p className="text-sm text-ocean-400 mb-4">
              Optional: add a job description or role summary for this agent.
            </p>
            <textarea
              value={modal.jobDescription}
              onChange={(e) =>
                setModal((m) => (m ? { ...m, jobDescription: e.target.value } : null))
              }
              placeholder="e.g. Manages our Instagram and Twitter, posts 3x daily, replies within 1h"
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
