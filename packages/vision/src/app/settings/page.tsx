'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react'

export default function Settings() {
  const [showTokens, setShowTokens] = useState(false)
  const [config, setConfig] = useState({
    telegramToken: '',
    openrouterKey: '',
    aiModel: 'anthropic/claude-3.5-sonnet',
    redisHost: 'localhost',
  })

  const handleSave = () => {
    // TODO: Save to .env file via API
    alert('Settings saved! Restart agents to apply changes.')
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
                Jellyfish Settings
              </h1>
              <p className="text-sm text-ocean-400">
                Configure your Jellyfish platform
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* API Configuration */}
          <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ocean-100 mb-4">
              API Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ocean-300 mb-2">
                  Telegram Bot Token
                </label>
                <div className="relative">
                  <input
                    type={showTokens ? 'text' : 'password'}
                    value={config.telegramToken}
                    onChange={(e) =>
                      setConfig({ ...config, telegramToken: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 focus:outline-none focus:border-ocean-500"
                    placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  />
                  <button
                    onClick={() => setShowTokens(!showTokens)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ocean-400 hover:text-ocean-300"
                  >
                    {showTokens ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-ocean-500 mt-1">
                  Get from @BotFather on Telegram
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ocean-300 mb-2">
                  OpenRouter API Key
                </label>
                <input
                  type={showTokens ? 'text' : 'password'}
                  value={config.openrouterKey}
                  onChange={(e) =>
                    setConfig({ ...config, openrouterKey: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 focus:outline-none focus:border-ocean-500"
                  placeholder="sk-or-v1-..."
                />
                <p className="text-xs text-ocean-500 mt-1">
                  Get from{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ocean-400 hover:text-ocean-300"
                  >
                    openrouter.ai/keys
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ocean-300 mb-2">
                  AI Model
                </label>
                <select
                  value={config.aiModel}
                  onChange={(e) =>
                    setConfig({ ...config, aiModel: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 focus:outline-none focus:border-ocean-500"
                >
                  <option value="anthropic/claude-3.5-sonnet">
                    Claude 3.5 Sonnet (Recommended)
                  </option>
                  <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="google/gemini-pro-1.5">Gemini Pro 1.5</option>
                  <option value="openai/gpt-4o-mini">GPT-4o Mini (Cheapest)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ocean-300 mb-2">
                  Redis Host
                </label>
                <input
                  type="text"
                  value={config.redisHost}
                  onChange={(e) =>
                    setConfig({ ...config, redisHost: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 focus:outline-none focus:border-ocean-500"
                  placeholder="localhost"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              className="mt-6 flex items-center gap-2 px-6 py-2 bg-ocean-500 hover:bg-ocean-600 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </div>

          {/* Agent Prompts */}
          <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ocean-100 mb-4">
              Agent Prompts
            </h2>
            <p className="text-sm text-ocean-400 mb-4">
              Customize how your agents think and behave
            </p>

            <div className="space-y-3">
              <Link
                href="/prompts/core"
                className="block p-4 bg-ocean-800/30 hover:bg-ocean-800/50 border border-ocean-700/50 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-ocean-100">Core Agent</h3>
                    <p className="text-sm text-ocean-400">
                      Intent detection and decision making
                    </p>
                  </div>
                  <span className="text-ocean-500">→</span>
                </div>
              </Link>

              <Link
                href="/prompts/memory"
                className="block p-4 bg-ocean-800/30 hover:bg-ocean-800/50 border border-ocean-700/50 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-ocean-100">Memory Agent</h3>
                    <p className="text-sm text-ocean-400">
                      Conversation history and context
                    </p>
                  </div>
                  <span className="text-ocean-500">→</span>
                </div>
              </Link>

              <Link
                href="/prompts/action"
                className="block p-4 bg-ocean-800/30 hover:bg-ocean-800/50 border border-ocean-700/50 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-ocean-100">Action Agent</h3>
                    <p className="text-sm text-ocean-400">
                      Command execution and web search
                    </p>
                  </div>
                  <span className="text-ocean-500">→</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-ocean-100">Skills</h2>
                <p className="text-sm text-ocean-400">
                  Extend agent capabilities
                </p>
              </div>
              <Link
                href="/skills"
                className="px-4 py-2 bg-ocean-500/20 hover:bg-ocean-500 text-ocean-300 hover:text-white rounded-lg transition-colors text-sm"
              >
                Browse Skills
              </Link>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-ocean-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔍</span>
                  <div>
                    <p className="text-sm font-medium text-ocean-100">
                      Web Search
                    </p>
                    <p className="text-xs text-ocean-500">
                      DuckDuckGo integration
                    </p>
                  </div>
                </div>
                <span className="text-xs text-green-400">✓ Installed</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-ocean-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💻</span>
                  <div>
                    <p className="text-sm font-medium text-ocean-100">
                      Bash Execution
                    </p>
                    <p className="text-xs text-ocean-500">
                      Run terminal commands
                    </p>
                  </div>
                </div>
                <span className="text-xs text-green-400">✓ Installed</span>
              </div>
            </div>
          </div>

          {/* APIs & Documentation */}
          <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ocean-100 mb-4">
              APIs & Documentation
            </h2>
            <p className="text-sm text-ocean-400 mb-4">
              Dashboard APIs and where to find package configuration (Memory, Core, Chat, Action) in the repo.
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-ocean-300 mb-1">Team API</p>
                <p className="text-ocean-500 font-mono">
                  GET/POST /api/team — list, add, update, remove Mini Jellys
                </p>
              </div>
              <div>
                <p className="font-medium text-ocean-300 mb-1">Live events</p>
                <p className="text-ocean-500 font-mono">
                  GET /api/events — SSE stream (Redis)
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-2">
                <Link
                  href="/logs"
                  className="px-3 py-1.5 bg-ocean-700/50 hover:bg-ocean-700 text-ocean-300 rounded-lg"
                >
                  Live Logs
                </Link>
                <Link
                  href="/prompts/core"
                  className="px-3 py-1.5 bg-ocean-700/50 hover:bg-ocean-700 text-ocean-300 rounded-lg"
                >
                  Core prompt
                </Link>
                <Link
                  href="/prompts/memory"
                  className="px-3 py-1.5 bg-ocean-700/50 hover:bg-ocean-700 text-ocean-300 rounded-lg"
                >
                  Memory prompt
                </Link>
                <Link
                  href="/prompts/action"
                  className="px-3 py-1.5 bg-ocean-700/50 hover:bg-ocean-700 text-ocean-300 rounded-lg"
                >
                  Action prompt
                </Link>
              </div>
              <p className="text-ocean-500 text-xs pt-2">
                Package config (env, events, commands): see <code className="bg-ocean-800/50 px-1 rounded">docs/</code> in the project root (memory.md, core.md, chat.md, action.md, vision.md).
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
