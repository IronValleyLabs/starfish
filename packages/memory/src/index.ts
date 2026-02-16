import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import { EventBus, MessageReceivedPayload } from '@starfish/shared';
import * as schema from './schema';
import { eq, desc } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();
class MemoryAgent {
  private eventBus: EventBus;
  private db: ReturnType<typeof drizzle<typeof schema>>;
  constructor() {
    console.log('[MemoryAgent] Iniciando...');
    this.eventBus = new EventBus('memory-agent-1');
    const dbPath = process.env.DATABASE_URL || './sqlite.db';
    const sqlite = new Database(dbPath);
    this.db = drizzle(sqlite, { schema });
    console.log(`[MemoryAgent] Base de datos conectada: ${dbPath}`);
    this.setupSubscriptions();
  }
  private setupSubscriptions() {
    this.eventBus.subscribe('message.received', async (event) => {
      const payload = event.payload as MessageReceivedPayload;
      console.log(`[MemoryAgent] Guardando mensaje de usuario para ${payload.conversationId}`);
      await this.db.insert(schema.messages).values({
        conversationId: payload.conversationId,
        role: 'user',
        content: payload.text,
        timestamp: new Date(event.timestamp),
      });
      const history = await this.db.query.messages.findMany({
        where: eq(schema.messages.conversationId, payload.conversationId),
        orderBy: [desc(schema.messages.timestamp)],
        limit: 20,
      });
      await this.eventBus.publish(
        'context.loaded',
        {
          conversationId: payload.conversationId,
          history: history.reverse().map((h) => ({ role: h.role, content: h.content })),
          currentMessage: payload.text,
        },
        event.correlationId
      );
    });
    this.eventBus.subscribe('action.completed', async (event) => {
      const payload = event.payload as { conversationId?: string; result?: { output?: string } };
      if (payload.result?.output && payload.conversationId) {
        console.log(`[MemoryAgent] Guardando respuesta de asistente para ${payload.conversationId}`);
        await this.db.insert(schema.messages).values({
          conversationId: payload.conversationId,
          role: 'assistant',
          content: payload.result.output,
          timestamp: new Date(event.timestamp),
        });
      }
    });
  }
}
new MemoryAgent();
