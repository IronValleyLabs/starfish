# 🪼 Jellyfish

Autonomous AI workforce platform with distributed intelligence. Event-driven multi-agent system: Memory, Core, Chat, Action, and a Next.js dashboard (Vision) for team management, live logs, and configuration.

## Requirements

- **Node.js 20** (Node 24 is not supported: Memory uses `better-sqlite3`, which does not build on Node 24)
- **pnpm**
- **Docker** (for Redis), or a Redis server

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd starfish-project   # or your repo name
pnpm install
```

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env` with:

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from [@BotFather](https://t.me/BotFather) |
| `OPENROUTER_API_KEY` | API key from [OpenRouter](https://openrouter.ai/keys) |
| `AI_MODEL` | Model ID, e.g. `anthropic/claude-3.5-sonnet` |
| `REDIS_HOST` | Redis host (default `localhost`) |
| `DATABASE_URL` | SQLite path for Memory (default `./sqlite.db`) |

### 3. Start Redis

```bash
docker-compose up -d
```

(Or use an existing Redis instance and set `REDIS_HOST` accordingly.)

### 4. Run the platform

```bash
chmod +x start.sh
./start.sh
```

This builds shared + core, memory, chat, then starts:

- **Memory** – conversation history (SQLite), publishes `context.loaded`
- **Core** – intent + response generation (OpenRouter/Claude), publishes `action.completed`
- **Chat** – Telegram bot, publishes `message.received`, sends replies
- **Vision** – Next.js dashboard at **http://localhost:3000**

### 5. Stop

```bash
./stop.sh
```

To stop Redis: `docker-compose down`.

## Dashboard (Vision)

- **Home** – Team overview (up to 20 Mini Jellys), stats, links to Gallery and Settings
- **Gallery** – 20 predefined AI roles by category; add to team with optional job description
- **Mini Jelly config** (`/mini/[id]`) – Edit job description, status (active/paused), remove from team
- **Live Logs** – Real-time event stream from Redis (SSE)
- **Settings** – API keys, model, Redis; links to prompt editors (Core, Memory, Action) and docs

## APIs (Vision)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/events` | Server-Sent Events stream (Redis) |
| GET | `/api/team` | List team members (Mini Jellys) |
| POST | `/api/team` | Add member (`templateId`, optional `jobDescription`) |
| PATCH | `/api/team?id=` | Update member (e.g. `jobDescription`, `status`) |
| DELETE | `/api/team?id=` | Remove member from team |

## Documentation

- **[docs/](docs/README.md)** – Per-package configuration (Memory, Core, Chat, Action, Vision): env vars, events, and commands.

## Project structure

```
├── docs/                 # Configuration and reference (memory, core, chat, action, vision)
├── packages/
│   ├── shared/           # EventBus, Redis, event types
│   ├── memory/           # SQLite + Drizzle, context.loaded
│   ├── core/             # OpenRouter/Claude, action.completed
│   ├── chat/             # Telegram (Telegraf)
│   ├── action/           # Bash executor, DuckDuckGo search
│   └── vision/           # Next.js 14 dashboard, team API, data/team.json
├── start.sh
├── stop.sh
├── .env.example
└── README.md
```

## Node version

Use **Node 20**. If you use nvm:

```bash
nvm use
# or: nvm install 20 && nvm use 20
```

The repo includes an `.nvmrc` with `20`. `start.sh` checks for Node 24+ and exits with instructions to switch to Node 20.
