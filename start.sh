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
  echo "✅ Variables de .env cargadas"
fi
echo "🪼 Iniciando Jellyfish..."
echo ""
echo "✅ Compilando paquetes..."
pnpm build
echo ""
echo "🚀 Iniciando agentes..."
echo ""
pnpm --filter @jellyfish/memory dev &
MEMORY_PID=$!
sleep 2
pnpm --filter @jellyfish/core dev &
CORE_PID=$!
sleep 2
pnpm --filter @jellyfish/chat dev &
CHAT_PID=$!
sleep 2
pnpm --filter @jellyfish/vision dev &
VISION_PID=$!
echo ""
echo "✅ Jellyfish está corriendo!"
echo "   - Memory Agent (PID: $MEMORY_PID)"
echo "   - Core Agent (PID: $CORE_PID)"
echo "   - Chat Agent (PID: $CHAT_PID)"
echo "   - Dashboard Vision (PID: $VISION_PID)"
echo ""
echo "🌐 Dashboard: http://localhost:3000"
echo "📱 Telegram: habla con tu bot"
echo "🛑 Presiona Ctrl+C para detener"
echo ""
wait
