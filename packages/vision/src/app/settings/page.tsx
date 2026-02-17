'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Eye, EyeOff, User, RotateCw, X, Copy } from 'lucide-react'

function MyHumanSection() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/human')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load'))))
      .then((data: { name?: string; description?: string }) => {
        setName(data.name ?? '')
        setDescription(data.description ?? '')
      })
      .catch(() => setMsg({ type: 'error', text: 'Could not load My human' }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setMsg(null)
    setSaving(true)
    try {
      const res = await fetch('/api/human', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMsg({ type: 'success', text: 'Saved. Restart Mini Jellys for agents to use the new info.' })
      } else {
        setMsg({ type: 'error', text: data.error ?? 'Failed to save' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-ocean-100 mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          My human
        </h2>
        <p className="text-ocean-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-ocean-100 mb-2 flex items-center gap-2">
        <User className="w-5 h-5" />
        My human
      </h2>
      <p className="text-sm text-ocean-400 mb-4">
        Describe who you are so your agents know who they work for (name, role, company, preferences). Used in each agent&apos;s system prompt.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ocean-300 mb-2">Name or how to address you</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 focus:outline-none focus:border-ocean-500"
            placeholder="e.g. Alex, or The founder"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ocean-300 mb-2">About you (role, company, context)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 text-sm focus:outline-none focus:border-ocean-500 resize-y"
            placeholder="e.g. Founder of Acme. I care about speed and clear communication. Prefer short answers."
          />
        </div>
        {msg && (
          <p className={`text-sm ${msg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-ocean-500 hover:bg-ocean-600 text-white rounded-lg text-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

interface TeamMember {
  id: string
  name: string
  role: string
}

function ConversationRouting() {
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [team, setTeam] = useState<TeamMember[]>([])
  const [conversationId, setConversationId] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    Promise.all([fetch('/api/assignments'), fetch('/api/team')])
      .then(([a, t]) => Promise.all([a.json(), t.json()]))
      .then(([assign, teamList]: [Record<string, string>, TeamMember[]]) => {
        setAssignments(assign || {})
        setTeam(Array.isArray(teamList) ? teamList : [])
      })
      .catch(() => setMsg({ type: 'error', text: 'Failed to load' }))
      .finally(() => setLoading(false))
  }, [])

  const handleSetAssignment = async () => {
    const cid = conversationId.trim()
    if (!cid) {
      setMsg({ type: 'error', text: 'Enter a conversation ID (e.g. telegram_123)' })
      return
    }
    setMsg(null)
    setSaving(true)
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: cid,
          assignedAgentId: selectedAgentId || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setAssignments((prev) => {
          const next = { ...prev }
          if (data.assignedAgentId) next[cid] = data.assignedAgentId
          else delete next[cid]
          return next
        })
        setMsg({ type: 'success', text: data.assignedAgentId ? `Assigned ${cid} to agent` : `Cleared assignment for ${cid}` })
      } else {
        setMsg({ type: 'error', text: data.error ?? 'Failed to save' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-ocean-100 mb-4">Conversation routing</h2>
        <p className="text-ocean-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-ocean-100 mb-2">Conversation routing</h2>
      <p className="text-sm text-ocean-400 mb-4">
        Assign a conversation to a Mini Jelly so only that agent replies. Telegram: use <code className="bg-ocean-800/50 px-1 rounded">telegram_&lt;userId&gt;</code>. In chat, use <code className="bg-ocean-800/50 px-1 rounded">/assign mj-xxx</code> or <code className="bg-ocean-800/50 px-1 rounded">/assign</code> to clear.
      </p>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-ocean-500 mb-1">Conversation ID</label>
            <input
              type="text"
              value={conversationId}
              onChange={(e) => setConversationId(e.target.value)}
              placeholder="telegram_123456"
              className="w-full px-3 py-2 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 text-sm"
            />
          </div>
          <div className="w-48">
            <label className="block text-xs text-ocean-500 mb-1">Agent</label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full px-3 py-2 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 text-sm"
            >
              <option value="">Default (main Core)</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleSetAssignment}
            disabled={saving}
            className="px-4 py-2 bg-ocean-500 hover:bg-ocean-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Set'}
          </button>
        </div>
        {msg && (
          <p className={`text-sm ${msg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {msg.text}
          </p>
        )}
        {Object.keys(assignments).length > 0 && (
          <div>
            <p className="text-xs text-ocean-500 mb-2">Current assignments</p>
            <ul className="text-sm text-ocean-300 space-y-1">
              {Object.entries(assignments).map(([cid, agentId]) => (
                <li key={cid}>
                  <code className="bg-ocean-800/50 px-1 rounded">{cid}</code> → {agentId}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Settings() {
  const [showTokens, setShowTokens] = useState(false)
  const [config, setConfig] = useState({
    telegramToken: '',
    telegramMainUserId: '',
    llmProvider: 'openrouter' as 'openrouter' | 'openai',
    openrouterKey: '',
    openaiKey: '',
    aiModel: 'anthropic/claude-3.5-sonnet',
    redisHost: 'localhost',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showRestartModal, setShowRestartModal] = useState(false)
  const [restartCopied, setRestartCopied] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load'))))
      .then((data: { telegramToken?: string; telegramMainUserId?: string; llmProvider?: string; openrouterKey?: string; openaiKey?: string; aiModel?: string; redisHost?: string }) => {
        const provider = (data.llmProvider ?? 'openrouter').toLowerCase()
        setConfig({
          telegramToken: data.telegramToken ?? '',
          telegramMainUserId: data.telegramMainUserId ?? '',
          llmProvider: provider === 'openai' ? 'openai' : 'openrouter',
          openrouterKey: data.openrouterKey ?? '',
          openaiKey: data.openaiKey ?? '',
          aiModel: data.aiModel ?? 'anthropic/claude-3.5-sonnet',
          redisHost: data.redisHost ?? 'localhost',
        })
      })
      .catch(() => setMessage({ type: 'error', text: 'Could not load settings' }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setMessage(null)
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramToken: config.telegramToken,
          telegramMainUserId: config.telegramMainUserId,
          llmProvider: config.llmProvider,
          openrouterKey: config.openrouterKey,
          openaiKey: config.openaiKey,
          aiModel: config.aiModel,
          redisHost: config.redisHost,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage({ type: 'success', text: data.message ?? 'Settings saved. Restart agents to apply changes.' })
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed to save settings' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
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
          {/* My human */}
          <MyHumanSection />

          {/* API Configuration */}
          <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ocean-100 mb-4">
              API Configuration
            </h2>

            {loading ? (
              <p className="text-ocean-400">Loading settings...</p>
            ) : (
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
                  Get from @BotFather on Telegram. Leave masked value to keep current.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ocean-300 mb-2">
                  Telegram Main User ID (unified chat)
                </label>
                <input
                  type="text"
                  value={config.telegramMainUserId}
                  onChange={(e) =>
                    setConfig({ ...config, telegramMainUserId: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 focus:outline-none focus:border-ocean-500"
                  placeholder="e.g. 123456789"
                />
                <p className="text-xs text-ocean-500 mt-1">
                  Your Telegram user ID so your messages use the same thread as the dashboard. Get it from @userinfobot. Restart agents after saving.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ocean-300 mb-2">
                  LLM Provider
                </label>
                <select
                  value={config.llmProvider}
                  onChange={(e) =>
                    setConfig({ ...config, llmProvider: e.target.value as 'openrouter' | 'openai' })
                  }
                  className="w-full px-4 py-2 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 focus:outline-none focus:border-ocean-500"
                >
                  <option value="openrouter">OpenRouter (Claude, GPT, Gemini, etc.)</option>
                  <option value="openai">OpenAI (GPT only)</option>
                </select>
                <p className="text-xs text-ocean-500 mt-1">
                  Set the matching API key below. Restart Core agent after changing.
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
                  Used when LLM Provider is OpenRouter.{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ocean-400 hover:text-ocean-300"
                  >
                    openrouter.ai/keys
                  </a>
                  . Leave masked to keep current.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ocean-300 mb-2">
                  OpenAI API Key
                </label>
                <input
                  type={showTokens ? 'text' : 'password'}
                  value={config.openaiKey}
                  onChange={(e) =>
                    setConfig({ ...config, openaiKey: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-ocean-800/50 border border-ocean-700 rounded-lg text-ocean-100 focus:outline-none focus:border-ocean-500"
                  placeholder="sk-..."
                />
                <p className="text-xs text-ocean-500 mt-1">
                  Used when LLM Provider is OpenAI. Leave masked to keep current.
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
                  <optgroup label="OpenRouter">
                    <option value="anthropic/claude-3.5-sonnet">
                      Claude 3.5 Sonnet (Recommended)
                    </option>
                    <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="google/gemini-pro-1.5">Gemini Pro 1.5</option>
                    <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                  </optgroup>
                  <optgroup label="OpenAI">
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </optgroup>
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
            )}

            {message && (
              <p
                className={`mt-4 text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}
              >
                {message.text}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="mt-6 flex items-center gap-2 px-6 py-2 bg-ocean-500 hover:bg-ocean-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Configuration'}
            </button>
          </div>

          {/* Conversation routing */}
          <ConversationRouting />

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

          {/* How agents run */}
          <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ocean-100 mb-2">How agents run</h2>
            <p className="text-sm text-ocean-400">
              There are <strong className="text-ocean-300">no cron jobs</strong>. Agents react to events: when someone sends a message (Telegram, WhatsApp, etc.), the pipeline runs (Memory → Core → Action if needed → reply). They self-manage by having access to tools: chat, safe bash commands, and web search. You give them access; they act when users talk to them.
            </p>
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

          {/* Restart Jellyfish */}
          <div className="bg-ocean-900/50 backdrop-blur-sm border border-ocean-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ocean-100 mb-2 flex items-center gap-2">
              <RotateCw className="w-5 h-5" />
              Restart Jellyfish
            </h2>
            <p className="text-sm text-ocean-400 mb-4">
              After changing settings or .env, restart all agents so they pick up the new config.
            </p>
            <button
              type="button"
              onClick={() => setShowRestartModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-ocean-700/50 hover:bg-ocean-700 text-ocean-300 rounded-lg transition-colors"
              title="Restart Jellyfish"
            >
              <RotateCw className="w-4 h-4" />
              How to restart
            </button>
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

      {showRestartModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowRestartModal(false)}
        >
          <div
            className="bg-ocean-900 border border-ocean-700 rounded-xl max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ocean-100 flex items-center gap-2">
                <RotateCw className="w-5 h-5" />
                Restart Jellyfish
              </h3>
              <button
                type="button"
                onClick={() => setShowRestartModal(false)}
                className="p-2 hover:bg-ocean-700/50 rounded-lg text-ocean-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-ocean-300 mb-4">
              To apply config changes or restart all agents:
            </p>
            <ol className="list-decimal list-inside text-sm text-ocean-300 space-y-2 mb-4">
              <li>In the terminal where Jellyfish is running, press <kbd className="px-1.5 py-0.5 bg-ocean-800 rounded text-ocean-200">Ctrl+C</kbd></li>
              <li>Run the command below:</li>
            </ol>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-ocean-800 rounded-lg text-ocean-200 text-sm">./start.sh</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('./start.sh').then(() => {
                    setRestartCopied(true)
                    setTimeout(() => setRestartCopied(false), 2000)
                  })
                }}
                className="flex items-center gap-2 px-3 py-2 bg-ocean-500 hover:bg-ocean-600 text-white rounded-lg transition-colors text-sm"
              >
                <Copy className="w-4 h-4" />
                {restartCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-ocean-500 mt-4">
              This restarts Memory, Core, Action, Chat and Vision. Mini Jellys are respawned automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
