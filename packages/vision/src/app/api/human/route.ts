import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const HUMAN_FILE = path.join(process.cwd(), 'data', 'human.json')

export interface HumanInfo {
  name: string
  description: string
}

async function readHuman(): Promise<HumanInfo> {
  try {
    const raw = await fs.readFile(HUMAN_FILE, 'utf-8')
    const data = JSON.parse(raw) as Partial<HumanInfo>
    return {
      name: typeof data.name === 'string' ? data.name : '',
      description: typeof data.description === 'string' ? data.description : '',
    }
  } catch {
    return { name: '', description: '' }
  }
}

export async function GET() {
  try {
    const human = await readHuman()
    return Response.json(human)
  } catch (err) {
    console.error('[GET /api/human]', err)
    return Response.json({ error: 'Could not read human info' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  let body: Partial<HumanInfo>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  try {
    await fs.mkdir(path.dirname(HUMAN_FILE), { recursive: true })
    await fs.writeFile(
      HUMAN_FILE,
      JSON.stringify({ name, description }, null, 2),
      'utf-8'
    )
    return Response.json({ name, description })
  } catch (err) {
    console.error('[PATCH /api/human]', err)
    return Response.json({ error: 'Could not save human info' }, { status: 500 })
  }
}
