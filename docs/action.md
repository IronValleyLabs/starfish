# Action Agent

Executes concrete actions: bash commands and web search (DuckDuckGo).

## Role

- Subscribes to `intent.detected` with `intent` (`bash`, `websearch`, `response`) and `params`.
- **bash:** runs the command on the system (with security blocklists).
- **websearch:** search via DuckDuckGo.
- **response:** returns text without executing anything.
- Publishes `action.completed` with the result or `action.failed` on error.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis host | `localhost` |

Blocked commands (among others): `rm -rf`, `sudo`, `mkfs`, `dd`, redirects to block devices.

## Events

- **Subscribes to:** `intent.detected`
- **Publishes:** `action.completed`, `action.failed`

## Prompts

The Action Agent prompt can be edited at **Settings → Agent Prompts → Action Agent** (`/prompts/action`).

## Commands

```bash
pnpm --filter @jellyfish/action dev
```
