#!/bin/bash
cd "$(dirname "$0")"
if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "✅ Variables de .env cargadas"
fi
echo "🐙 Iniciando Starfish..."
echo ""
echo "✅ Compilando paquetes..."
pnpm build
echo ""
echo "🚀 Iniciando agentes..."
echo ""
pnpm --filter @starfish/memory dev &
MEMORY_PID=$!
sleep 2
pnpm --filter @starfish/core dev &
CORE_PID=$!
sleep 2
pnpm --filter @starfish/chat dev &
CHAT_PID=$!
echo ""
echo "✅ Starfish está corriendo!"
echo "   - Memory Agent (PID: $MEMORY_PID)"
echo "   - Core Agent (PID: $CORE_PID)"
echo "   - Chat Agent (PID: $CHAT_PID)"
echo ""
echo "📱 Abre Telegram y habla con tu bot"
echo "🛑 Presiona Ctrl+C para detener"
echo ""
wait
