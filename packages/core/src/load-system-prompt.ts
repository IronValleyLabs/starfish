import path from 'path';
import { promises as fs } from 'fs';

const AGENT_KEY = 'core' as const;

/**
 * Resolves the path to system-prompts.json.
 * - SYSTEM_PROMPTS_FILE (env): use as-is if set (absolute or relative to cwd).
 * - Else: repo root + packages/vision/data/system-prompts.json (from packages/core/dist).
 */
function getSystemPromptsPath(): string {
  const envPath = process.env.SYSTEM_PROMPTS_FILE;
  if (envPath && envPath.trim()) {
    return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath.trim());
  }
  const repoRoot = path.resolve(__dirname, '../../..');
  return path.join(repoRoot, 'packages', 'vision', 'data', 'system-prompts.json');
}

/**
 * Loads the system prompt for the Core agent from the shared JSON file.
 * Used by the main Core agent (not Mini Jellys).
 * Returns null on any error or missing/invalid data; caller should use a default.
 */
export async function loadSystemPrompt(): Promise<string | null> {
  const filePath = getSystemPromptsPath();
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[CoreAgent] Could not read system prompts file (${filePath}): ${msg}`);
    return null;
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.warn('[CoreAgent] system-prompts.json is not valid JSON');
    return null;
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  const value = (data as Record<string, unknown>)[AGENT_KEY];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Repo root (from packages/core/dist or packages/core). */
function getRepoRoot(): string {
  return path.resolve(__dirname, '../../..');
}

async function readDataFile(filename: string): Promise<string> {
  const filePath = path.join(getRepoRoot(), 'data', filename);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return raw.trim();
  } catch {
    return '';
  }
}

/**
 * Loads data/agent-role.md (job description). Agent uses this to act autonomously.
 */
export async function loadAgentRole(): Promise<string> {
  const content = await readDataFile('agent-role.md');
  return content ? `\n\n---\nYOUR ROLE (job description — act according to this):\n${content}` : '';
}

/**
 * Loads data/agent-kpis.md. Agent uses these to take initiative and do things on its own.
 */
export async function loadAgentKpis(): Promise<string> {
  const content = await readDataFile('agent-kpis.md');
  return content ? `\n\n---\nYOUR KPIs (work towards these on your own initiative):\n${content}` : '';
}

/**
 * Loads data/agent-knowledge.md so the agent can use what the user has taught it.
 */
export async function loadAgentKnowledge(): Promise<string> {
  const content = await readDataFile('agent-knowledge.md');
  return content ? `\n\n---\nKnowledge (use when relevant):\n${content}` : '';
}
