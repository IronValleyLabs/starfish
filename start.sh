#!/bin/bash
cd "$(dirname "$0")"

# Node 20 required: better-sqlite3 does not build on Node 24 (C++20 headers)
NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/')
if [ -n "$NODE_MAJOR" ] && [ "$NODE_MAJOR" -ge 24 ]; then
  echo "⚠️  Node 24+ detected. Memory agent (better-sqlite3) needs Node 20."
  echo "   Run: nvm use 20   (or install Node 20 and use it)"
  echo "   Then run ./start.sh again."
  exit 1
fi

if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "✅ .env loaded"
fi
echo "🪼 Starting Jellyfish..."
echo ""
echo "✅ Building packages..."
pnpm build
echo ""
echo "🚀 Starting agents..."
echo ""
pnpm --filter @jellyfish/memory dev &
MEMORY_PID=$!
sleep 2
pnpm --filter @jellyfish/core dev &
CORE_PID=$!
sleep 2
pnpm --filter @jellyfish/action dev &
ACTION_PID=$!
sleep 2
pnpm --filter @jellyfish/chat dev &
CHAT_PID=$!
sleep 2
pnpm --filter @jellyfish/vision dev &
VISION_PID=$!
sleep 5
mkdir -p data
echo "{\"memory\":$MEMORY_PID,\"core\":$CORE_PID,\"action\":$ACTION_PID,\"chat\":$CHAT_PID,\"vision\":$VISION_PID}" > data/main-processes.json
echo ""
echo "🪼 Respawn Mini Jellys (if any)..."
curl -s -X POST http://localhost:3000/api/team/respawn >/dev/null 2>&1 || true
echo ""
echo "✅ Jellyfish is running!"
echo "   - Memory Agent (PID: $MEMORY_PID)"
echo "   - Core Agent (PID: $CORE_PID)"
echo "   - Action Agent (PID: $ACTION_PID)"
echo "   - Chat Agent (PID: $CHAT_PID)"
echo "   - Dashboard Vision (PID: $VISION_PID)"
echo ""
echo "🌐 Dashboard: http://localhost:3000"
echo "📱 Telegram: talk to your bot"
echo "🛑 Press Ctrl+C to stop"
echo ""
wait
