import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const ROOT = path.resolve(process.cwd(), '..', '..')
const PAIRING_FILE = path.join(ROOT, 'data', 'pairing.json')

/** GET — List pending pairing codes and approved peers (for dashboard). */
export async function GET() {
  try {
    await fs.mkdir(path.dirname(PAIRING_FILE), { recursive: true })
    const raw = await fs.readFile(PAIRING_FILE, 'utf-8')
    const data = JSON.parse(raw)
    return NextResponse.json({
      approved: Array.isArray(data.approved) ? data.approved : [],
      pending: data.pending && typeof data.pending === 'object' ? data.pending : {},
    })
  } catch {
    return NextResponse.json({ approved: [], pending: {} })
  }
}
