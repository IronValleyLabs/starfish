import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

/** Keys the agent can set via chat (credentials, API keys, etc.). */
const CREDENTIAL_KEYS = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_MAIN_USER_ID',
  'VISION_CHAT_URL',
  'OPENROUTER_API_KEY',
  'OPENAI_API_KEY',
  'DRAFT_OPENAI_API_KEY',
  'NANO_BANANA_PRO_API_KEY',
  'INSTAGRAM_USER',
  'INSTAGRAM_PASSWORD',
  'METRICOOL_EMAIL',
  'METRICOOL_PASSWORD',
  'BROWSER_VISIT_LOGIN_URL',
  'BROWSER_VISIT_USER',
  'BROWSER_VISIT_PASSWORD',
] as const

const CREDENTIAL_KEYS_SET = new Set<string>(CREDENTIAL_KEYS)

function getEnvPath(): string {
  const configDir = process.env.JELLYFISH_CONFIG_DIR
  if (configDir) return path.join(configDir, '.env')
  return path.resolve(process.cwd(), '..', '..', '.env')
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

/**
 * POST /api/settings/env — Set a single env var (for agent storing credentials from chat).
 * Body: { key: string, value: string }. Only keys in CREDENTIAL_KEYS are allowed.
 */
export async function POST(request: NextRequest) {
  let body: { key?: string; value?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const key = typeof body.key === 'string' ? body.key.trim() : ''
  const value = typeof body.value === 'string' ? body.value.trim().replace(/\r?\n/g, '') : ''

  if (!key) {
    return Response.json({ error: 'key is required' }, { status: 400 })
  }
  if (!CREDENTIAL_KEYS_SET.has(key)) {
    return Response.json(
      { error: `Key not allowed. Allowed: ${CREDENTIAL_KEYS.slice(0, 5).join(', ')}...` },
      { status: 400 }
    )
  }

  const envPath = getEnvPath()
  let content: string
  try {
    content = await fs.readFile(envPath, 'utf-8')
  } catch (err) {
    console.error('[POST /api/settings/env] read .env', err)
    return Response.json({ error: 'Could not read .env' }, { status: 500 })
  }

  const lines = parseEnvLines(content)
  let found = false
  const newLines = lines.map(({ key: k, raw }) => {
    if (k === key) {
      found = true
      return `${key}=${value}`
    }
    return raw
  })
  if (!found) {
    newLines.push(`${key}=${value}`)
  }
  if (newLines.length > 0 && newLines[newLines.length - 1] !== '') {
    newLines.push('')
  }

  try {
    await fs.writeFile(envPath, newLines.join('\n'), 'utf-8')
  } catch (err) {
    console.error('[POST /api/settings/env] write .env', err)
    return Response.json({ error: 'Could not write .env' }, { status: 500 })
  }

  return Response.json({
    ok: true,
    key,
    message: `Saved ${key}. Restart agents to apply.`,
  })
}
