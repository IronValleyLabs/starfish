import path from 'path'
import fs from 'fs'
import { NextRequest } from 'next/server'
import dotenv from 'dotenv'

const rootEnv = [path.join(process.cwd(), '.env'), path.join(process.cwd(), '..', '..', '.env')].find((p) => fs.existsSync(p))
if (rootEnv) dotenv.config({ path: rootEnv })

const ROOT = path.resolve(process.cwd(), '..', '..')
const WEB_PREFIX = 'web_'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getDbPath(): string {
  const url = process.env.DATABASE_URL?.trim()
  if (url && path.isAbsolute(url)) return url
  // Memory runs from packages/memory so relative paths are from there
  if (url) return path.join(ROOT, 'packages', 'memory', url)
  return path.join(ROOT, 'packages', 'memory', 'sqlite.db')
}

function getSystemPrompt(): string {
  const p = path.join(ROOT, 'packages', 'vision', 'data', 'system-prompts.json')
  try {
    const raw = fs.readFileSync(p, 'utf-8')
    const data = JSON.parse(raw) as Record<string, string>
    return (data.core ?? 'You are Jellyfish, a helpful AI assistant.').trim()
  } catch {
    return 'You are Jellyfish, a helpful AI assistant.'
  }
}

function getLLMConfig(): { apiKey: string; baseURL: string; model: string; headers?: Record<string, string> } {
  const provider = (process.env.LLM_PROVIDER ?? '').toLowerCase()
  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY?.trim() ?? ''
    if (!apiKey) throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai')
    return {
      apiKey,
      baseURL: 'https://api.openai.com/v1',
      model: process.env.AI_MODEL ?? 'gpt-4o',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    }
  }
  if (provider === 'openrouter' || process.env.OPENROUTER_API_KEY?.trim()) {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim() ?? ''
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is required')
    const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    headers['HTTP-Referer'] = process.env.LLM_HTTP_REFERER ?? 'https://github.com/IronValleyLabs/jellyfish'
    headers['X-Title'] = process.env.LLM_X_TITLE ?? 'Jellyfish'
    return { apiKey, baseURL: 'https://openrouter.ai/api/v1', model: process.env.AI_MODEL ?? 'anthropic/claude-3.5-sonnet', headers }
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    const apiKey = process.env.OPENAI_API_KEY.trim()
    return {
      apiKey,
      baseURL: 'https://api.openai.com/v1',
      model: process.env.AI_MODEL ?? 'gpt-4o',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    }
  }
  throw new Error('Set OPENROUTER_API_KEY or OPENAI_API_KEY in .env')
}

const MAX_HISTORY_MESSAGES = 8
const MAX_RESPONSE_TOKENS = 280

async function generateResponseSync(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  currentMessage: string
): Promise<string> {
  const { baseURL, model, headers } = getLLMConfig()
  const recent = history.slice(-MAX_HISTORY_MESSAGES)
  const messages = [
    { role: 'system' as const, content: systemPrompt + '\n\nReply concisely. Do not repeat or paraphrase the user\'s message.' },
    ...recent.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user' as const, content: currentMessage },
  ]
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: MAX_RESPONSE_TOKENS }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LLM request failed: ${res.status} ${err}`)
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content?.trim()
  return content ?? 'Sorry, I could not generate a response.'
}

const UNIFIED_CONVERSATION_ID = WEB_PREFIX + 'dashboard'

/** Send reply to Telegram for unified chat (dashboard + main Telegram user). */
async function sendToTelegramIfConfigured(conversationId: string, text: string): Promise<void> {
  if (conversationId !== UNIFIED_CONVERSATION_ID) return
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_MAIN_USER_ID?.trim()
  if (!token || !chatId) return
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    if (!res.ok) console.error('[Chat/send] Telegram push failed:', await res.text())
  } catch (e) {
    console.error('[Chat/send] Telegram push error:', e)
  }
}

export async function POST(request: NextRequest) {
  let body: { text?: string; conversationId?: string; platform?: string; userId?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const conversationId =
    typeof body.conversationId === 'string' && (body.conversationId.startsWith(WEB_PREFIX) || body.conversationId === UNIFIED_CONVERSATION_ID)
      ? body.conversationId
      : UNIFIED_CONVERSATION_ID
  const platform = typeof body.platform === 'string' ? body.platform : 'web'
  const userId = typeof body.userId === 'string' ? body.userId : 'web-user'

  if (!text) {
    return Response.json({ error: 'text is required' }, { status: 400 })
  }

  if (platform === 'telegram') {
    console.log('[Chat/send] Request from Telegram for', conversationId, 'userId', userId)
  }

  // Direct sync path for dashboard chat: no Redis, same DB as Memory, call LLM from here
  try {
    const dbPath = getDbPath()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3')
    const db = new Database(dbPath)

    const tableExists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='messages'").get()
    if (!tableExists) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          user_id TEXT,
          platform TEXT,
          agent_id TEXT
        )
      `)
    }

    const now = Date.now()
    try {
      db.prepare(
        'INSERT INTO messages (conversation_id, role, content, timestamp, user_id, platform) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(conversationId, 'user', text, now, userId, platform)
    } catch {
      db.prepare('INSERT INTO messages (conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?)').run(conversationId, 'user', text, now)
    }

    const rows = db
      .prepare(
        `SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT ${MAX_HISTORY_MESSAGES}`
      )
      .all(conversationId) as Array<{ role: string; content: string }>
    const history = rows.reverse()

    const systemPrompt = getSystemPrompt()
    const content = await generateResponseSync(systemPrompt, history, text)

    try {
      db.prepare(
        'INSERT INTO messages (conversation_id, role, content, timestamp, user_id, platform, agent_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(conversationId, 'assistant', content, Date.now(), null, platform, 'core-agent-1')
    } catch {
      db.prepare('INSERT INTO messages (conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?)').run(conversationId, 'assistant', content, Date.now())
    }

    db.close()

    await sendToTelegramIfConfigured(conversationId, content)
    return Response.json({ output: content })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Chat/send] Sync response failed:', message)
    return Response.json(
      {
        error:
          message.includes('OPENROUTER') || message.includes('OPENAI')
            ? 'Missing or invalid API key. Set OPENROUTER_API_KEY or OPENAI_API_KEY in .env'
            : message,
      },
      { status: 500 }
    )
  }
}
