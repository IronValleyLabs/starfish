'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { useParams } from 'next/navigation'

const AGENT_PROMPTS: Record<
  string,
  { title: string; description: string; defaultPrompt: string }
> = {
  core: {
    title: 'Core Agent',
    description: 'Detects user intent and decides which action to take',
    defaultPrompt: `You are the Core Agent of Jellyfish AI.

Your job is to analyze user messages and detect their intent.

Classify each message into one of these intents:
- "response": User wants a conversational response
- "bash": User wants to execute a command
- "websearch": User wants information from the web

Respond in JSON format:
{
  "intent": "response" | "bash" | "websearch",
  "params": {
    "query": "search query" (for websearch),
    "command": "bash command" (for bash)
  }
}

Examples:
- "Hello" → {"intent": "response", "params": {}}
- "List files" → {"intent": "bash", "params": {"command": "ls -la"}}
- "Search for AI news" → {"intent": "websearch", "params": {"query": "AI news"}}`,
  },
  memory: {
    title: 'Memory Agent',
    description: 'Manages conversation history and context',
    defaultPrompt: `You are the Memory Agent of Jellyfish AI.

Your job is to:
1. Store all messages in the database
2. Load conversation history when needed
3. Provide context to other agents

You work silently in the background.`,
  },
  action: {
    title: 'Action Agent',
    description: 'Executes commands and searches the web',
    defaultPrompt: `You are the Action Agent of Jellyfish AI.

Your job is to:
1. Execute bash commands safely (block dangerous commands)
2. Search the web using DuckDuckGo
3. Return results to the user

Blocked commands:
- rm -rf
- sudo
- mkfs
- dd
- Any command with >/dev/sd*

Always return results in a clear, readable format.`,
  },
}

export default function PromptEditor() {
  const params = useParams()
  const agent = params.agent as string
  const agentConfig = AGENT_PROMPTS[agent]

  const [prompt, setPrompt] = useState(agentConfig?.defaultPrompt ?? '')

  useEffect(() => {
    if (agentConfig) setPrompt(agentConfig.defaultPrompt)
  }, [agent])

  const handleSave = () => {
    // TODO: Save to file via API
    alert('Prompt saved! Restart agents to apply changes.')
  }

  if (!agentConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-800 flex items-center justify-center">
        <div className="text-ocean-300">Agent not found</div>
      </div>
    )
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
                {agentConfig.title}
              </h1>
              <p className="text-sm text-ocean-400">
                {agentConfig.description}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-ocean-300 mb-2">
              System Prompt
            </label>
            <p className="text-xs text-ocean-500 mb-4">
              This prompt defines how the agent thinks and behaves. Changes
              require agent restart.
            </p>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-96 px-4 py-3 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 font-mono text-sm focus:outline-none focus:border-ocean-500 resize-none"
            placeholder="Enter system prompt..."
          />

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setPrompt(agentConfig.defaultPrompt)}
              className="px-4 py-2 bg-ocean-700/50 hover:bg-ocean-700 text-ocean-300 rounded-lg transition-colors text-sm"
            >
              Reset to Default
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-ocean-500 hover:bg-ocean-600 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
