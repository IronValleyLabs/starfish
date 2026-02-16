# Memory Agent

Manages conversation history and context for the rest of the agents.

## Role

- Subscribes to `message.received` (from Chat).
- Stores messages in SQLite (table `messages`).
- Publishes `context.loaded` with recent history and current message for Core.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis host (event bus) | `localhost` |
| `DATABASE_URL` | SQLite file path | `./sqlite.db` |

The `.env` file is loaded from the monorepo root.

## Events

- **Subscribes to:** `message.received`, `action.completed`
- **Publishes:** `context.loaded`

## Schema (Drizzle)

- `messages`: `id`, `conversationId`, `role`, `content`, `timestamp`

## Commands

```bash
# Development (build shared + tsc + run)
pnpm --filter @jellyfish/memory dev

# Migrations / schema (if using drizzle-kit)
pnpm --filter @jellyfish/memory db:push
```
