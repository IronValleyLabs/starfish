import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { getDefaultPromptForTemplate } from './default-prompts'

const VISION_CWD = process.cwd()
const ROOT = path.resolve(VISION_CWD, '..', '..')
const CORE_INDEX = path.join(ROOT, 'packages', 'core', 'dist', 'index.js')
const DATA_DIR = path.join(VISION_CWD, 'data')
const PROCESSES_FILE = path.join(DATA_DIR, 'processes.json')
const PROMPTS_FILE = path.join(DATA_DIR, 'prompts.json')
const HUMAN_FILE = path.join(DATA_DIR, 'human.json')
const LOGS_DIR = path.join(ROOT, 'logs')

async function readStoredPrompts(): Promise<Record<string, { systemPrompt: string; updatedAt: number }>> {
  try {
    const raw = await fs.readFile(PROMPTS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export interface TeamMember {
  id: string
  templateId: string
  name: string
  role: string
  icon: string
  jobDescription?: string
  goals?: string
  accessNotes?: string
  kpis?: string
  status: string
  addedAt: number
  nanoCount: number
  actionsToday: number
  costToday: number
  lastAction: string
}

export interface ProcessEntry {
  pid: number
  spawnedAt: number
}

export type ProcessesMap = Record<string, ProcessEntry>

async function readProcesses(): Promise<ProcessesMap> {
  try {
    const raw = await fs.readFile(PROCESSES_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function writeProcesses(processes: ProcessesMap): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(PROCESSES_FILE, JSON.stringify(processes, null, 2), 'utf-8')
}

export async function getSystemPromptForMember(
  member: TeamMember,
  templateDescription: string
): Promise<string> {
  const store = await readStoredPrompts()
  const custom = store[member.id]
  if (custom?.systemPrompt?.trim()) {
    return custom.systemPrompt.trim()
  }
  const defaultByTemplate = getDefaultPromptForTemplate(member.templateId)
  const withRole = [
    `You are ${member.name}, a ${member.role}.`,
    defaultByTemplate,
  ]
  if (member.jobDescription?.trim()) {
    withRole.push(`Your specific role: ${member.jobDescription.trim()}`)
  }
  if (member.goals?.trim()) {
    withRole.push(`Your goals (follow these):\n${member.goals.trim()}`)
  }
  if (member.kpis?.trim()) {
    withRole.push(
      `Your KPIs (you are measured on these; prioritize achieving them):\n${member.kpis.trim()}\n\n` +
        `Work towards these KPIs: analyze data (via web search, reports, or context the human provides), take decisions to improve them, and act. ` +
        `Regularly inform your human of findings, progress, and concrete recommendations to hit these targets. Proactively suggest next steps.`
    )
  }
  if (member.accessNotes?.trim()) {
    withRole.push(`What access you have (use this when answering): ${member.accessNotes.trim()}`)
  }
  withRole.push(
    `Your available tools: chat, safe bash, web search (DuckDuckGo), draft (copies/captions/emails), generate_image (Nano Banana Pro from description), instagram_post (post image+caption if INSTAGRAM_* set), metricool_schedule (schedule post if METRICOOL_* set). Use them to act autonomously; report results and findings to your human.`
  )
  let prompt = withRole.join('\n\n')
  try {
    const raw = await fs.readFile(HUMAN_FILE, 'utf-8')
    const human = JSON.parse(raw) as { name?: string; description?: string }
    const name = typeof human.name === 'string' ? human.name.trim() : ''
    const desc = typeof human.description === 'string' ? human.description.trim() : ''
    if (name || desc) {
      const parts = ['You work for a human.']
      if (name) parts.push(`Their name or how to address them: ${name}.`)
      if (desc) parts.push(`About them: ${desc}`)
      prompt = prompt + '\n\n' + parts.join(' ')
    }
  } catch {
    // no human.json or invalid — ignore
  }
  return prompt
}

export async function spawnMiniJelly(
  member: TeamMember,
  templateDescription: string
): Promise<{ pid: number }> {
  try {
    await fs.access(CORE_INDEX)
  } catch {
    throw new Error('Core agent not built. Run: pnpm build')
  }
  const systemPrompt = await getSystemPromptForMember(member, templateDescription)
  await fs.mkdir(LOGS_DIR, { recursive: true })
  const logPath = path.join(LOGS_DIR, `mini-jelly-${member.id}.log`)
  const logStream = await fs.open(logPath, 'a')

  const env = {
    ...process.env,
    MINI_JELLY_ID: member.id,
    MINI_JELLY_SYSTEM_PROMPT: systemPrompt,
  }

  const child = spawn(process.execPath, [CORE_INDEX], {
    cwd: ROOT,
    env,
    stdio: ['ignore', logStream.fd, logStream.fd],
    detached: true,
  })

  child.unref()
  logStream.close()

  const pid = child.pid
  if (pid == null) {
    throw new Error('Failed to get PID from spawned process')
  }

  const processes = await readProcesses()
  processes[member.id] = { pid, spawnedAt: Date.now() }
  await writeProcesses(processes)

  return { pid }
}

export async function killMiniJelly(memberId: string): Promise<boolean> {
  const processes = await readProcesses()
  const entry = processes[memberId]
  if (!entry) return true
  try {
    process.kill(entry.pid, 'SIGTERM')
  } catch {
    try {
      process.kill(entry.pid, 'SIGKILL')
    } catch {
      // process may already be dead
    }
  }
  delete processes[memberId]
  await writeProcesses(processes)
  return true
}

export async function getProcesses(): Promise<ProcessesMap> {
  return readProcesses()
}
