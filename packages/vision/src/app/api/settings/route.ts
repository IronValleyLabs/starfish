import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const ALLOWED_KEYS = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_MAIN_USER_ID',
  'LLM_PROVIDER',
  'OPENROUTER_API_KEY',
  'OPENAI_API_KEY',
  'AI_MODEL',
  'REDIS_HOST',
] as const

function getEnvPath(): string {
  return path.resolve(process.cwd(), '..', '..', '.env')
}

function maskSecret(value: string): string {
  if (!value || value.length < 4) return '••••'
  return '••••' + value.slice(-4)
}

function parseEnvLines(content: string): { key: string; value: string; raw: string }[] {
  const lines: { key: string; value: string; raw: string }[] = []
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match) {
      const [, key, value] = match
      const unquoted = value.replace(/^["']|["']$/g, '').trim()
      lines.push({ key, value: unquoted, raw: line })
    } else {
      lines.push({ key: '', value: '', raw: line })
    }
  }
  return lines
}

function getByKey(lines: { key: string; value: string }[], key: string): string {
  const found = lines.find((l) => l.key === key)
  return found ? found.value : ''
}

export async function GET() {
  try {
    const envPath = getEnvPath()
    const content = await fs.readFile(envPath, 'utf-8')
    const lines = parseEnvLines(content)

    const telegramToken = getByKey(lines, 'TELEGRAM_BOT_TOKEN')
    const telegramMainUserId = getByKey(lines, 'TELEGRAM_MAIN_USER_ID')
    const llmProvider = getByKey(lines, 'LLM_PROVIDER') || 'openrouter'
    const openrouterKey = getByKey(lines, 'OPENROUTER_API_KEY')
    const openaiKey = getByKey(lines, 'OPENAI_API_KEY')
    const aiModel = getByKey(lines, 'AI_MODEL')
    const redisHost = getByKey(lines, 'REDIS_HOST')

    return Response.json({
      telegramToken: telegramToken ? maskSecret(telegramToken) : '',
      telegramMainUserId: telegramMainUserId || '',
      llmProvider: llmProvider || 'openrouter',
      openrouterKey: openrouterKey ? maskSecret(openrouterKey) : '',
      openaiKey: openaiKey ? maskSecret(openaiKey) : '',
      aiModel: aiModel || 'anthropic/claude-3.5-sonnet',
      redisHost: redisHost || 'localhost',
    })
  } catch (err) {
    console.error('[GET /api/settings]', err)
    return Response.json(
      { error: 'Could not read .env' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let body: {
    telegramToken?: string
    telegramMainUserId?: string
    llmProvider?: string
    openrouterKey?: string
    openaiKey?: string
    aiModel?: string
    redisHost?: string
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { telegramToken, telegramMainUserId, llmProvider, openrouterKey, openaiKey, aiModel, redisHost } = body
  if (typeof aiModel !== 'string' || !aiModel.trim()) {
    return Response.json({ error: 'aiModel is required' }, { status: 400 })
  }
  if (typeof redisHost !== 'string' || !redisHost.trim()) {
    return Response.json({ error: 'redisHost is required' }, { status: 400 })
  }
  const provider = (llmProvider ?? '').trim().toLowerCase()
  if (provider && provider !== 'openrouter' && provider !== 'openai') {
    return Response.json({ error: 'llmProvider must be openrouter or openai' }, { status: 400 })
  }

  const envPath = getEnvPath()
  let content: string
  try {
    content = await fs.readFile(envPath, 'utf-8')
  } catch (err) {
    console.error('[POST /api/settings] read .env', err)
    return Response.json({ error: 'Could not read .env' }, { status: 500 })
  }

  const lines = parseEnvLines(content)
  const isMask = (v: string) => /^••••.{0,4}$/.test(v)
  const useToken = (v: unknown, current: string): string => {
    if (typeof v !== 'string' || !v.trim() || isMask(v.trim())) return current
    return v.trim().replace(/\r?\n/g, '')
  }
  const safe = (s: string) => s.trim().replace(/\r?\n/g, '')
  const updates: Record<string, string> = {
    TELEGRAM_BOT_TOKEN: useToken(telegramToken, getByKey(lines, 'TELEGRAM_BOT_TOKEN')),
    TELEGRAM_MAIN_USER_ID: typeof telegramMainUserId === 'string' ? telegramMainUserId.trim() : getByKey(lines, 'TELEGRAM_MAIN_USER_ID'),
    LLM_PROVIDER: provider ? provider : (getByKey(lines, 'LLM_PROVIDER') || 'openrouter'),
    OPENROUTER_API_KEY: useToken(openrouterKey, getByKey(lines, 'OPENROUTER_API_KEY')),
    OPENAI_API_KEY: useToken(openaiKey, getByKey(lines, 'OPENAI_API_KEY')),
    AI_MODEL: safe(aiModel),
    REDIS_HOST: safe(redisHost),
  }

  const keyToUpdate = new Set(ALLOWED_KEYS)
  const newLines: string[] = []
  let seen = new Set<string>()

  for (const { key, value, raw } of lines) {
    if (key && keyToUpdate.has(key as (typeof ALLOWED_KEYS)[number])) {
      const newVal = updates[key as keyof typeof updates]
      if (newVal !== undefined) {
        newLines.push(`${key}=${newVal}`)
        seen.add(key)
      } else {
        newLines.push(raw)
      }
    } else {
      newLines.push(raw)
    }
  }

  for (const k of ALLOWED_KEYS) {
    if (!seen.has(k) && updates[k]) {
      newLines.push(`${k}=${updates[k]}`)
    }
  }

  if (newLines.length > 0 && newLines[newLines.length - 1] !== '') {
    newLines.push('')
  }

  try {
    await fs.writeFile(envPath, newLines.join('\n'), 'utf-8')
  } catch (err) {
    console.error('[POST /api/settings] write .env', err)
    return Response.json({ error: 'Could not write .env' }, { status: 500 })
  }

  return Response.json({
    ok: true,
    message: 'Settings saved. Restart agents to apply changes.',
  })
}
