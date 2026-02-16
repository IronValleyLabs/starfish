# 🪼 Jellyfish

**Autonomous AI workforce platform.** Event-driven multi-agent system: Memory, Core, Chat, Action, and a Next.js dashboard (Vision) for team management, live logs, and configuration.

- **GitHub:** https://github.com/IronValleyLabs/jellyfish

---

## Requirements

- **Node.js 18 or 20** (20 recommended; Node 24 is not supported — Memory uses `better-sqlite3`, which does not build on Node 24)
- **pnpm**
- **Redis** — local (`redis-server`) or [Redis Cloud](https://redis.com/try-free/) (free tier, no Docker needed)

---

## Quick Start (one command)

From an empty directory, run the interactive installer. It checks prerequisites, installs dependencies, and guides you through Redis + LLM + optional Telegram setup.

```bash
curl -fsSL https://raw.githubusercontent.com/IronValleyLabs/jellyfish/main/install.sh -o install.sh
chmod +x install.sh
./install.sh
```

Or, if you already have the repo:

```bash
git clone https://github.com/IronValleyLabs/jellyfish.git
cd jellyfish
chmod +x install.sh
./install.sh
```

The script will:

- Detect OS (macOS, Linux, WSL)
- Check/install Node.js 18+ and pnpm
- Clone or use existing repo, run `pnpm install`
- Configure Redis (Redis Cloud or local), LLM (OpenRouter or OpenAI), and optional Telegram
- Build and start Jellyfish, then open the dashboard in your browser

**To install from a different repo:**

```bash
JELLYFISH_REPO_URL=https://github.com/your-org/your-repo.git ./install.sh
```

---

## Manual setup

### 1. Clone and install

```bash
git clone https://github.com/IronValleyLabs/jellyfish.git
cd jellyfish
pnpm install
```

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env`. Main variables:

| Variable | Description |
|----------|-------------|
| **Chat** (set at least one) | |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from [@BotFather](https://t.me/BotFather) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | WhatsApp via Twilio; webhook: `http(s)://your-host:3010/webhook/whatsapp` |
| `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN` | Slack (Socket Mode) |
| `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET` | Line; webhook: `http(s)://your-host:3010/webhook/line` |
| `GOOGLE_CHAT_PROJECT_ID` or `GOOGLE_CHAT_WEBHOOK_URL` | Google Chat; webhook: `http(s)://your-host:3010/webhook/google-chat` |
| `CHAT_WEBHOOK_BASE_URL` | Base URL for webhook signature validation (e.g. `https://your-domain.com`) |
| `CHAT_WEBHOOK_PORT` | Webhook server port (default `3010`) |
| **LLM** | |
| `LLM_PROVIDER` | `openrouter` or `openai` |
| `OPENROUTER_API_KEY` | From [OpenRouter](https://openrouter.ai/keys) |
| `OPENAI_API_KEY` | From [OpenAI](https://platform.openai.com/api-keys) |
| `AI_MODEL` | e.g. `anthropic/claude-3.5-sonnet` |
| **Redis** | |
| `REDIS_HOST` | Redis host (default `localhost`) |
| `REDIS_PORT` | Redis port (default `6379`) |
| `REDIS_PASSWORD` | Redis password (leave empty for local) |
| **Other** | |
| `DATABASE_URL` | SQLite path for Memory (default `./sqlite.db`) |

### 3. Redis

- **Option A — Redis Cloud:** Sign up at [redis.com/try-free](https://redis.com/try-free/), create a database, and set `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` (or the full connection URL) in `.env`.
- **Option B — Local:** Run Redis (e.g. `redis-server` or `docker run -p 6379:6379 redis`) and keep `REDIS_HOST=localhost`.

### 4. Run the platform

```bash
chmod +x start.sh
./start.sh
```

This builds packages and starts:

- **Memory** — conversation history (SQLite), publishes `context.loaded`
- **Core** — intent detection + response generation (OpenRouter/OpenAI), publishes `action.completed`
- **Chat** — Telegram/WhatsApp/Slack/Line/Google Chat; publishes `message.received`, sends replies
- **Action** — bash commands and web search
- **Vision** — Next.js dashboard at **http://localhost:3000**

### 5. Stop

```bash
./stop.sh
```

---

## Dashboard (Vision)

- **Home** — Team overview (up to 20 Mini Jellys), status, links to Gallery and Settings
- **Gallery** — Predefined AI roles; add to team with optional job description
- **Mini Jelly** (`/mini/[id]`) — Edit job description, status (active/paused), remove from team
- **Live Logs** — Real-time event stream from Redis (SSE)
- **Settings** — API keys, model, Redis; prompt editors (Core, Memory, Action)

---

## APIs (Vision)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/events` | Server-Sent Events stream (Redis) |
| GET | `/api/team` | List team members (Mini Jellys) |
| POST | `/api/team` | Add member (`templateId`, optional `jobDescription`) |
| PATCH | `/api/team?id=` | Update member |
| DELETE | `/api/team?id=` | Remove member |
| GET | `/api/status` | Process status |
| GET | `/api/metrics` | Token usage / metrics |
| GET/POST | `/api/settings` | Read/write settings (LLM, Redis, etc.) |

---

## Documentation

- **[docs/](docs/README.md)** — Per-package configuration (Memory, Core, Chat, Action, Vision): env vars, events, and commands.

---

## Project structure

```
├── docs/                 # Configuration and reference
├── packages/
│   ├── shared/           # EventBus, Redis, event types, metrics
│   ├── memory/           # SQLite + Drizzle, context.loaded
│   ├── core/             # OpenRouter/OpenAI, intent + response, action.completed
│   ├── chat/             # Telegram, WhatsApp, Slack, Line, Google Chat
│   ├── action/           # Bash executor, web search
│   └── vision/           # Next.js dashboard, team API
├── install.sh            # One-command interactive installer
├── start.sh
├── stop.sh
├── .env.example
└── README.md
```

---

## Node version

Use **Node 18 or 20**. If you use nvm:

```bash
nvm use
# or: nvm install 20 && nvm use 20
```

The repo may include an `.nvmrc` with `20`. `start.sh` checks for Node 24+ and exits with instructions to switch to Node 20.
