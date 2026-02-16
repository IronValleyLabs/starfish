# Core Agent

Detects user intent and generates responses using the configured model (OpenRouter).

## Role

- Subscribes to `context.loaded` (from Memory) with history and current message.
- Calls OpenRouter/Claude to generate the response.
- Publishes `action.completed` with the reply text or `action.failed` on error.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | API key from [OpenRouter](https://openrouter.ai/keys) | — |
| `AI_MODEL` | Model to use | `anthropic/claude-3.5-sonnet` |
| `REDIS_HOST` | Redis host | `localhost` |

Example models: `openai/gpt-4-turbo`, `google/gemini-pro-1.5`, `openai/gpt-4o-mini`.

## Events

- **Subscribes to:** `context.loaded`
- **Publishes:** `action.completed`, `action.failed`

## Prompts

The Core system prompt can be edited in the dashboard: **Settings → Agent Prompts → Core Agent** (`/prompts/core`). Changes require restarting the agent.

## Commands

```bash
pnpm --filter @jellyfish/core dev
```
