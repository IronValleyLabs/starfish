# Jellyfish – Documentation and configuration

Per-package configuration and quick reference.

- **[Autonomy: pairing, sessions, mesh](autonomy-pairing-sessions.md)** — DM pairing (Telegram), agent-to-agent (sessions_list / sessions_send), plan+execute (mesh), /status and /reset.

## System packages

| Package | Description | Config |
|---------|-------------|--------|
| [Memory](memory.md) | Conversation history and context (SQLite) | `DATABASE_URL`, Redis |
| [Core](core.md) | Intent detection and response generation (OpenRouter/Claude) | `OPENROUTER_API_KEY`, `AI_MODEL` |
| [Chat](chat.md) | Telegram input/output | `TELEGRAM_BOT_TOKEN` |
| [Action](action.md) | Bash execution and web search | Redis, permissions |
| [Vision](vision.md) | Next.js dashboard, live logs, prompts, team | `REDIS_HOST`, APIs |

## Environment variables (root)

See [.env.example](../.env.example). Summary:

- `TELEGRAM_BOT_TOKEN` – Telegram bot token (@BotFather)
- `OPENROUTER_API_KEY` – [OpenRouter](https://openrouter.ai/keys)
- `AI_MODEL` – e.g. `anthropic/claude-3.5-sonnet`
- `REDIS_HOST` – Redis host (default `localhost`)
- `DATABASE_URL` – SQLite path for Memory (default `./sqlite.db`)

## Useful commands

```bash
# Start everything (Memory, Core, Chat, Vision)
./start.sh

# Build only
pnpm build

# Dashboard only
pnpm --filter @jellyfish/vision dev

# Stop agents
./stop.sh

# Run tests (pairing, sessions, chat commands, mesh)
pnpm test
```

## Dashboard APIs (Vision)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/events` | Live event stream (Redis SSE) |
| GET | `/api/team` | List team Mini Jellys |
| POST | `/api/team` | Add Mini Jelly (`templateId`, optional `jobDescription`) |
| PATCH | `/api/team?id=` | Update (e.g. job description, status) |
| DELETE | `/api/team?id=` | Remove from team |
