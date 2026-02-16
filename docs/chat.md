# Chat Agent

Connects the system to Telegram: receives user messages and sends replies.

## Role

- Listens for text messages on Telegram.
- Publishes `message.received` with `platform`, `userId`, `conversationId`, `text`.
- Subscribes to `action.completed`: when there is a reply for a Telegram conversation, it sends it to the user.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | — |
| `REDIS_HOST` | Redis host | `localhost` |

## Events

- **Publishes:** `message.received`
- **Subscribes to:** `action.completed`

## Commands

```bash
pnpm --filter @jellyfish/chat dev
```

## Notes

- `conversationId` has the form `telegram_<userId>`.
- Replies are only sent for conversations whose `conversationId` starts with `telegram_` in `action.completed`.
