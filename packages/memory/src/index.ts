import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import { promises as fs } from 'fs';
import { EventBus, MessageReceivedPayload } from '@jellyfish/shared';
import * as schema from './schema';
import { eq, desc } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const ROOT = path.resolve(__dirname, '../../..');
const ASSIGNMENTS_FILE = path.join(ROOT, 'data', 'conversation-assignments.json');

async function readAssignments(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(ASSIGNMENTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeAssignments(assignments: Record<string, string>): Promise<void> {
  await fs.mkdir(path.dirname(ASSIGNMENTS_FILE), { recursive: true });
  await fs.writeFile(ASSIGNMENTS_FILE, JSON.stringify(assignments, null, 2), 'utf-8');
}

function addMessagesColumnsIfNeeded(sqlite: InstanceType<typeof Database>): void {
  const cols = ['user_id', 'platform', 'agent_id'];
  for (const col of cols) {
    try {
      sqlite.exec(`ALTER TABLE messages ADD COLUMN ${col} TEXT`);
    } catch (e: unknown) {
      if (String((e as { message?: string })?.message ?? '').includes('duplicate column')) {
        // already exists
      } else {
        throw e;
      }
    }
  }
}

class MemoryAgent {
  private eventBus: EventBus;
  private db: ReturnType<typeof drizzle<typeof schema>>;
  constructor() {
    console.log('[MemoryAgent] Starting...');
    this.eventBus = new EventBus('memory-agent-1');
    const dbPath = process.env.DATABASE_URL || './sqlite.db';
    const sqlite = new Database(dbPath);
    addMessagesColumnsIfNeeded(sqlite);
    this.db = drizzle(sqlite, { schema });
    console.log(`[MemoryAgent] Database connected: ${dbPath}`);
    this.setupSubscriptions();
  }
  private setupSubscriptions() {
    this.eventBus.subscribe('message.received', async (event) => {
      const payload = event.payload as MessageReceivedPayload;
      const text = (payload.text || '').trim();

      const assignMatch = text.match(/^\/assign(?:\s+(.+))?$/i);
      if (assignMatch) {
        const assignments = await readAssignments();
        const conversationId = payload.conversationId;
        const arg = assignMatch[1]?.trim();
        if (arg) {
          const agentId = arg.startsWith('mini-jelly-') ? arg : `mini-jelly-${arg}`;
          assignments[conversationId] = agentId;
          await writeAssignments(assignments);
          await this.eventBus.publish(
            'action.completed',
            {
              conversationId,
              result: { output: `Assigned to agent ${agentId}. Send messages and this agent will reply.` },
            },
            event.correlationId
          );
        } else {
          delete assignments[conversationId];
          await writeAssignments(assignments);
          await this.eventBus.publish(
            'action.completed',
            {
              conversationId,
              result: { output: 'Assignment cleared. Using default agent.' },
            },
            event.correlationId
          );
        }
        return;
      }

      await this.db.insert(schema.messages).values({
        conversationId: payload.conversationId,
        role: 'user',
        content: payload.text,
        timestamp: new Date(event.timestamp),
        userId: payload.userId ?? null,
        platform: payload.platform ?? null,
      });
      const history = await this.db.query.messages.findMany({
        where: eq(schema.messages.conversationId, payload.conversationId),
        orderBy: [desc(schema.messages.timestamp)],
        limit: 20,
      });
      const assignments = await readAssignments();
      const assignedAgentId = assignments[payload.conversationId] ?? null;
      const targetAgentId = payload.targetAgentId ?? assignedAgentId ?? undefined;
      await this.eventBus.publish(
        'context.loaded',
        {
          conversationId: payload.conversationId,
          history: history.reverse().map((h) => ({ role: h.role, content: h.content })),
          currentMessage: payload.text,
          targetAgentId: targetAgentId || undefined,
          assignedAgentId: assignedAgentId || undefined,
        },
        event.correlationId
      );
    });
    this.eventBus.subscribe('conversation.unassigned', async (event) => {
      const payload = event.payload as { conversationId?: string };
      if (payload.conversationId) {
        const assignments = await readAssignments();
        delete assignments[payload.conversationId];
        await writeAssignments(assignments);
      }
    });
    this.eventBus.subscribe('action.completed', async (event) => {
      const payload = event.payload as { conversationId?: string; result?: { output?: string }; agentId?: string };
      if (payload.result?.output && payload.conversationId) {
        await this.db.insert(schema.messages).values({
          conversationId: payload.conversationId,
          role: 'assistant',
          content: payload.result.output,
          timestamp: new Date(event.timestamp),
          agentId: payload.agentId ?? null,
        });
      }
    });
  }
}
new MemoryAgent();
