# 🪼 Jellyfish

**Autonomous AI workforce platform.** Event-driven multi-agent system: Memory, Core, Chat, Action, and a Next.js dashboard (Vision) for team management, live logs, and configuration.

- **GitHub:** https://github.com/IronValleyLabs/jellyfish

---

## Requirements

- **Node.js 18+** (18, 20, 22 supported; Memory uses `better-sqlite3` v12)
- **pnpm**
- **Redis** — local (`redis-server`) or [Redis Cloud](https://redis.com/try-free/) (free tier, no Docker needed)

---

## Quick Start (one command)

Clone the repo and run the installer. It checks prerequisites and asks only for API keys (no browser popups).

```bash
git clone https://github.com/IronValleyLabs/jellyfish.git
cd jellyfish
chmod +x install.sh
./install.sh
```

You will be asked for:

1. **Redis** — Choose Redis Cloud (paste connection URL from https://redis.com/try-free/) or local (you must run `redis-server` yourself).
2. **AI provider** — OpenRouter or OpenAI, then paste the API key (from https://openrouter.ai/keys or https://platform.openai.com/api-keys).
3. **Telegram** (optional) — Bot token from https://t.me/BotFather.

Then the script builds, starts Jellyfish, and opens the dashboard. If you see any error, check **Troubleshooting** below.

**Alternative (run installer without cloning first):**

```bash
curl -fsSL https://raw.githubusercontent.com/IronValleyLabs/jellyfish/main/install.sh -o install.sh
chmod +x install.sh
./install.sh
```

(Use your branch instead of `main` if needed.)

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
| **Draft LLM** (optional) | Use a cheaper model for copies, captions, emails (saves tokens on main model). |
| `DRAFT_OPENAI_API_KEY` | e.g. your ChatGPT/OpenAI key; used only for "draft" writing tasks |
| `DRAFT_AI_MODEL` | e.g. `gpt-4o-mini` (default) |
| **Image (Nano Banana Pro)** | |
| `NANO_BANANA_PRO_API_KEY` | Get at [nanobnana.com](https://nanobnana.com/dashboard/api-keys); for generate_image intent |
| **Instagram (browser)** | |
| `INSTAGRAM_USER`, `INSTAGRAM_PASSWORD` | For instagram_post intent |
| **Metricool (browser)** | |
| `METRICOOL_EMAIL`, `METRICOOL_PASSWORD` | For metricool_schedule intent |
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
- **Action** — bash, web search, and **draft** (copies/captions/emails via optional Draft LLM to save tokens)
- **Vision** — Next.js dashboard at **http://localhost:3000**

### 5. Stop

```bash
./stop.sh
```

---

## Dashboard (Vision)

- **Home** — Team overview (up to 20 Mini Jellys), status, links to Gallery and Settings
- **Chat** — Full history of incoming and outgoing messages from all platforms (Telegram, WhatsApp, etc.) with user id, platform, and which Mini Jelly replied
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

## Troubleshooting

**`Redis is not reachable` / `[ioredis] ECONNREFUSED`**

Redis must be running before you start Jellyfish. Either:

- **Redis Cloud (easiest):** Sign up at https://redis.com/try-free/, create a database, copy the connection URL. In the project folder, edit `.env` and set `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` from that URL (or run `./install.sh` again and choose option 1 for Redis).
- **Local:** Install Redis (`brew install redis` on macOS) and run `redis-server` in a terminal, then run `./start.sh` again.

**`Node ... is too old`**

You need Node 18 or newer. Install Node 20: `nvm install 20 && nvm use 20`, or from https://nodejs.org.

**`pnpm: command not found`**

Run `npm install -g pnpm`, then run the installer or `pnpm install` again.

**Dashboard shows "Body is disturbed or locked" or blank / error**

Usually means the backend could not connect to Redis. Fix Redis (see above), then restart with `./stop.sh` and `./start.sh`, and refresh the browser.

**Installer fails on `pnpm install` (e.g. better-sqlite3)**

Ensure Node 18+ is active (`node -v`). If you still see a build error, open an issue on GitHub with your OS and Node version.

---

## Full autonomy: what’s in place and what’s next

**In place today**

- **KPIs and goals** — Each agent has configurable KPIs and goals; the system prompt tells them to work towards these and report findings and recommendations to the human.
- **Draft LLM** — Optional secondary model (e.g. ChatGPT / `gpt-4o-mini`). Set `DRAFT_OPENAI_API_KEY` and optionally `DRAFT_AI_MODEL` in `.env`. When the user asks for copies, captions, emails, or posts, the **draft** intent sends the task to this model so the main LLM is only used for reasoning; writing cost is on the draft model (often cheaper).
- **Access notes** — Per-agent “Access & credentials” field describes what the agent can use (e.g. “Instagram login in 1Password”, “Metricool API key in .env”). The agent sees this and can tell the human what it can or cannot do.
- **Tools** — Chat, safe bash, web search, draft (writing), generate_image (DALL·E 3), instagram_post (Puppeteer), metricool_schedule (Puppeteer).

**Missing for e.g. “Social Media Manager: here’s the Instagram account, do copies, schedule in Metricool”**

1. **Posting/scheduling integrations** — No Instagram API, Metricool API, or browser automation yet. To make an agent truly autonomous for social:
   - **Option A:** Add skills that call real APIs (Instagram Graph API, Metricool if they offer one) using credentials stored in env or a secrets store.
   - **Option B:** Browser automation (Puppeteer/Playwright) so the agent can log in and post/schedule when the human has stored login details (prefer not storing passwords in the app; use env or 1Password CLI, etc.).
2. **Images/videos** — No image or video generation wired in. Would require an API (DALL·E, etc.) or external tool and a “generate_creative” intent/skill.
3. **Stored credentials per agent** — Today only “access notes” (free text). For real autonomy, you’d add a secure place (env vars, or per-agent secrets in a vault) so a skill can “post as @account” without the human pasting tokens every time.

Once those are in place, you could give the Social Media Manager the Instagram account and Metricool, and say: “Here’s the account; do copies (draft model), images (future), and schedule (Metricool skill).” The agent would already use the draft model for copies and report to you; the rest is integration work.

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
├── .nvmrc                 # Node 20 (for nvm use)
├── install.sh             # One-command interactive installer
├── start.sh
├── stop.sh
├── .env.example
└── README.md
```

---

## Node version

**Node 18 or newer** (18, 20, 22 are supported). The repo includes an **`.nvmrc`** with `20` if you use nvm: run `nvm use` in the project directory.
