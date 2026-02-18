import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import {
  peerId,
  isApproved,
  findPendingCode,
  approveByCode,
  approveByPeer,
  normalizePairingData,
  type PairingData,
} from '@/lib/pairing'

const ROOT = path.resolve(process.cwd(), '..', '..')
const PAIRING_FILE = path.join(ROOT, 'data', 'pairing.json')

async function readPairing(): Promise<PairingData> {
  try {
    const raw = await fs.readFile(PAIRING_FILE, 'utf-8')
    return normalizePairingData(JSON.parse(raw))
  } catch {
    return { approved: [], pending: {} }
  }
}

async function writePairing(data: PairingData): Promise<void> {
  await fs.mkdir(path.dirname(PAIRING_FILE), { recursive: true })
  await fs.writeFile(PAIRING_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get('platform')?.trim()
  const userId = request.nextUrl.searchParams.get('userId')?.trim()
  if (!platform || !userId) {
    return Response.json({ error: 'platform and userId required' }, { status: 400 })
  }
  const data = await readPairing()
  if (isApproved(data, platform, userId)) {
    return Response.json({ approved: true })
  }
  let code = findPendingCode(data, platform, userId)
  if (!code) {
    code = crypto.randomBytes(4).toString('hex').toUpperCase()
    data.pending[code] = { platform, userId, createdAt: Date.now() }
    await writePairing(data)
  }
  return Response.json({ approved: false, code })
}

export async function PATCH(request: NextRequest) {
  let body: { code?: string; platform?: string; userId?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const data = await readPairing()
  if (body.code) {
    const result = approveByCode(data, body.code)
    if (!result) return Response.json({ error: 'Code not found or expired' }, { status: 404 })
    await writePairing(result.data)
    return Response.json({ ok: true, approved: result.approved })
  }
  if (body.platform && body.userId) {
    const next = approveByPeer(data, body.platform, body.userId)
    await writePairing(next)
    return Response.json({ ok: true, approved: peerId(body.platform.trim(), String(body.userId)) })
  }
  return Response.json({ error: 'Provide code or platform+userId' }, { status: 400 })
}
