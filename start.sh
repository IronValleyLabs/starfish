#!/bin/bash
# Start Jellyfish (build + run agents). Does NOT pull from GitHub.
# To get latest code and start:  ./update.sh   or:  git pull && ./start.sh
cd "$(dirname "$0")"

# Node 18+ required
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "❌ Falta Node.js. Jellyfish lo necesita para funcionar."
  echo ""
  echo "  🪼 Tip de Jellyfish: Copia y pega abajo estos comandos, uno por uno (pulsa Enter después de cada uno)."
  echo "     Cuando termine el último, copia y pega otra vez el de abajo para arrancar."
  echo ""
  echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
  echo "  source ~/.nvm/nvm.sh 2>/dev/null || source ~/.bashrc; nvm install 20; nvm use 20"
  echo ""
  echo "  ./start.sh"
  echo ""
  exit 1
fi
NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/')
if [ -n "$NODE_MAJOR" ] && [ "$NODE_MAJOR" -lt 18 ]; then
  echo ""
  echo "❌ Tu Node.js es muy antiguo (versión $NODE_MAJOR). Jellyfish necesita 18 o más nuevo."
  echo ""
  echo "  🪼 Tip de Jellyfish: Copia y pega abajo este comando. Luego el segundo para arrancar."
  echo ""
  echo "  source ~/.nvm/nvm.sh 2>/dev/null; nvm install 20; nvm use 20"
  echo ""
  echo "  ./start.sh"
  echo ""
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo ""
  echo "❌ Falta pnpm. Primero hay que ejecutar el instalador."
  echo ""
  echo "  🪼 Tip de Jellyfish: Copia y pega abajo este comando (instala todo lo necesario)."
  echo ""
  echo "  ./install.sh"
  echo ""
  exit 1
fi

if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "✅ .env loaded"
fi

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

redis_ok() {
  node -e "
    const net = require('net');
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const s = net.connect(port, host, () => { s.destroy(); process.exit(0); });
    s.on('error', () => process.exit(1));
    s.setTimeout(3000, () => { s.destroy(); process.exit(1); });
  " 2>/dev/null
}

if ! redis_ok; then
  echo ""
  echo "❌ Jellyfish necesita Redis. Usa Redis Cloud (gratis, sin instalar nada en tu PC)."
  echo ""
  echo "  1) Entra en https://redis.com/try-free/ y crea una base gratis. Copia: host, puerto y contraseña."
  echo "  2) En esta misma terminal, copia y pega el comando de abajo para abrir el archivo de configuración."
  echo ""
  echo "  🪼 Tip de Jellyfish: Copia y pega este comando:"
  echo ""
  echo "  nano .env"
  echo ""
  echo "  3) Añade estas 3 líneas (con TUS datos del paso 1), cada una en una línea:"
  echo "     REDIS_HOST=tu-host.redis.cloud.com"
  echo "     REDIS_PORT=12345"
  echo "     REDIS_PASSWORD=tu_contraseña"
  echo "  4) Guarda: Ctrl+O, Enter. Sal: Ctrl+X."
  echo "  5) Para arrancar Jellyfish, copia y pega:  ./start.sh"
  echo ""
  exit 1
fi
echo "✅ Redis is connected."

# At least one chat platform required (Chat agent exits otherwise)
if [ -z "${TELEGRAM_BOT_TOKEN}" ] && [ -z "${TWILIO_ACCOUNT_SID}" ] && [ -z "${SLACK_BOT_TOKEN}" ] && [ -z "${LINE_CHANNEL_ACCESS_TOKEN}" ] && [ -z "${GOOGLE_CHAT_WEBHOOK_URL}" ] && [ -z "${GOOGLE_CHAT_PROJECT_ID}" ]; then
  echo "❌ Falta conectar un chat (por ejemplo Telegram) para hablar con Jellyfish."
  echo ""
  echo "  1) En Telegram busca @BotFather, crea un bot y copia el token que te da."
  echo "  2) En esta misma terminal, copia y pega el comando de abajo para abrir la configuración."
  echo ""
  echo "  🪼 Tip de Jellyfish: Copia y pega este comando:"
  echo ""
  echo "  nano .env"
  echo ""
  echo "  3) Añade una línea (pega tu token):  TELEGRAM_BOT_TOKEN=tu_token_aquí"
  echo "  4) Guarda: Ctrl+O, Enter. Sal: Ctrl+X."
  echo "  5) Para arrancar, copia y pega:  ./start.sh"
  echo ""
  exit 1
fi
echo "✅ Chat platform configured"

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
