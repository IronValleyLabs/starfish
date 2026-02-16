'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

const DEFAULT_PROMPT = `You are a helpful, friendly assistant. Reply concisely and clearly in the same language as the user.
When the user asks something, give a direct, practical answer.
If you don't know something, say so naturally.`

export default function CorePromptPage() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)

  const handleSave = () => {
    // TODO: Persist via API
    alert('Core agent prompt saved! Restart the Core agent to apply changes.')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-800">
      <header className="border-b border-ocean-700/50 backdrop-blur-sm bg-ocean-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="p-2 hover:bg-ocean-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-ocean-300" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-ocean-300 to-ocean-500 bg-clip-text text-transparent">
                Core Agent Prompt
              </h1>
              <p className="text-sm text-ocean-400">
                Intent detection and conversational response
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
          <p className="text-sm text-ocean-400 mb-4">
            This system prompt defines how the Core agent interprets messages and
            generates replies. Changes require restarting the Core agent.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 focus:outline-none focus:border-ocean-500 font-mono text-sm resize-y"
            placeholder="Enter the system prompt..."
          />
          <button
            onClick={handleSave}
            className="mt-4 flex items-center gap-2 px-6 py-2 bg-ocean-500 hover:bg-ocean-600 text-white rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Prompt
          </button>
        </div>
      </main>
    </div>
  )
}
