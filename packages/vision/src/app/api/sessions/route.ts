import { promises as fs } from 'fs'
import path from 'path'

const ROOT = path.resolve(process.cwd(), '..', '..')
const ASSIGNMENTS_FILE = path.join(ROOT, 'data', 'conversation-assignments.json')

/** GET — List active sessions (conversationId -> agentId) for sessions_list intent. */
export async function GET() {
  try {
    const raw = await fs.readFile(ASSIGNMENTS_FILE, 'utf-8')
    const assignments = JSON.parse(raw)
    const sessions = Object.entries(assignments).map(([conversationId, agentId]) => ({
      conversationId,
      agentId: agentId as string,
    }))
    return Response.json(sessions)
  } catch {
    return Response.json([])
  }
}
