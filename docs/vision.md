# Vision (Dashboard)

Next.js 14 app: control panel, live logs, configuration, and Mini Jelly team management.

## Role

- **Dashboard:** team overview (Mini Jellys), metrics, links to Gallery and Settings.
- **Live Logs:** real-time SSE stream of Redis events.
- **Settings:** API keys, model, Redis; links to prompt and skills editors.
- **Gallery:** 20 Mini Jelly templates by category; add to team with optional job description.
- **Prompts:** system prompt editor for Core, Memory, Action.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis host (event SSE) | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |

Vision uses `.env.local` in the package or process environment variables.

## APIs (Next.js Route Handlers)

- `GET /api/events` – Server-Sent Events from Redis (event channels).
- `GET /api/team` – List team Mini Jellys (persisted in `data/team.json`).
- `POST /api/team` – Add Mini Jelly (body: `templateId`, optional `jobDescription`).
- `PATCH /api/team` – Update (query: `id`; body: `jobDescription`, `status`, etc.).
- `DELETE /api/team` – Remove from team (query: `id`).

## Commands

```bash
# Development (port 3000)
pnpm --filter @jellyfish/vision dev

# Build
pnpm --filter @jellyfish/vision build

# Production
pnpm --filter @jellyfish/vision start
```

## Relevant structure

- `src/app/page.tsx` – Dashboard.
- `src/app/logs/page.tsx` – Live event stream.
- `src/app/settings/page.tsx` – Settings.
- `src/app/gallery/page.tsx` – Template gallery.
- `src/app/prompts/[agent]/page.tsx` – Prompt editor.
- `src/app/mini/[id]/page.tsx` – Mini Jelly configuration.
- `src/lib/mini-jelly-templates.ts` – 20 default templates.
