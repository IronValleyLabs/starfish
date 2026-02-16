import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { MINI_JELLY_TEMPLATES } from '@/lib/mini-jelly-templates'

const TEAM_FILE = path.join(process.cwd(), 'data', 'team.json')
const MAX_TEAM_SIZE = 20

export interface TeamMember {
  id: string
  templateId: string
  name: string
  role: string
  icon: string
  jobDescription?: string
  status: 'active' | 'paused'
  addedAt: number
  nanoCount: number
  actionsToday: number
  costToday: number
  lastAction: string
}

async function readTeam(): Promise<TeamMember[]> {
  try {
    await fs.mkdir(path.dirname(TEAM_FILE), { recursive: true })
    const raw = await fs.readFile(TEAM_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeTeam(team: TeamMember[]): Promise<void> {
  await fs.mkdir(path.dirname(TEAM_FILE), { recursive: true })
  await fs.writeFile(TEAM_FILE, JSON.stringify(team, null, 2), 'utf-8')
}

function generateId(): string {
  return `mj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function GET() {
  const team = await readTeam()
  return Response.json(team)
}

export async function POST(request: NextRequest) {
  const team = await readTeam()
  if (team.length >= MAX_TEAM_SIZE) {
    return Response.json(
      { error: `Maximum ${MAX_TEAM_SIZE} Mini Jellys allowed` },
      { status: 400 }
    )
  }
  let body: { templateId: string; jobDescription?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { templateId, jobDescription } = body
  if (!templateId || typeof templateId !== 'string') {
    return Response.json({ error: 'templateId is required' }, { status: 400 })
  }
  const template = MINI_JELLY_TEMPLATES.find((t) => t.id === templateId)
  if (!template) {
    return Response.json({ error: 'Template not found' }, { status: 404 })
  }
  const member: TeamMember = {
    id: generateId(),
    templateId: template.id,
    name: template.name,
    role: template.name,
    icon: template.icon,
    jobDescription: typeof jobDescription === 'string' ? jobDescription : undefined,
    status: 'active',
    addedAt: Date.now(),
    nanoCount: 0,
    actionsToday: 0,
    costToday: 0,
    lastAction: 'Never',
  }
  team.push(member)
  await writeTeam(team)
  return Response.json(member, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return Response.json({ error: 'id query param required' }, { status: 400 })
  }
  let body: { jobDescription?: string; status?: 'active' | 'paused' }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const team = await readTeam()
  const index = team.findIndex((m) => m.id === id)
  if (index === -1) {
    return Response.json({ error: 'Member not found' }, { status: 404 })
  }
  if (body.jobDescription !== undefined) team[index].jobDescription = body.jobDescription
  if (body.status !== undefined) team[index].status = body.status
  await writeTeam(team)
  return Response.json(team[index])
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return Response.json({ error: 'id query param required' }, { status: 400 })
  }
  const team = await readTeam()
  const filtered = team.filter((m) => m.id !== id)
  if (filtered.length === team.length) {
    return Response.json({ error: 'Member not found' }, { status: 404 })
  }
  await writeTeam(filtered)
  return Response.json({ ok: true })
}
