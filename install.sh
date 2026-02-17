#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
cat << "EOF"
     🪼  Jellyfish Installer
     Autonomous AI workforce in one command
EOF
echo -e "${NC}"
echo ""
echo -e "${BLUE}In a few minutes you'll have your AI team ready.${NC}"
echo -e "${BLUE}We'll check your system and ask for a few keys — nothing scary.${NC}"
echo ""

# --- 1. Detect OS ---
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
  OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  OS="linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
  OS="windows"
fi
# sed in-place: macOS needs -i .bak, Linux -i.bak
if [[ "$OS" == "macos" ]]; then
  SED_I="sed -i .bak"
else
  SED_I="sed -i.bak"
fi
echo -e "${BLUE}Detected OS: ${OS}${NC}"

# --- 2. Node.js ---
echo ""
echo -e "${BLUE}Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found${NC}"
  echo ""
  echo "  Paste this in the SAME terminal (installs Node):"
  echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
  echo "  source ~/.nvm/nvm.sh 2>/dev/null || source ~/.bashrc; nvm install 20; nvm use 20"
  echo "  Then run:  ./install.sh"
  echo ""
  exit 1
fi
NODE_MAJOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo -e "${RED}❌ Node.js $NODE_MAJOR is too old. Jellyfish needs 18 or newer.${NC}"
  echo ""
  echo "  Paste this in the SAME terminal:"
  echo "  source ~/.nvm/nvm.sh 2>/dev/null; nvm install 20; nvm use 20"
  echo "  Then run:  ./install.sh"
  echo ""
  exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# --- 3. pnpm ---
echo ""
echo -e "${BLUE}Checking pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
  echo -e "${YELLOW}Installing pnpm globally (may take ~1 min)...${NC}"
  npm install -g pnpm
fi
echo -e "${GREEN}✅ pnpm $(pnpm -v)${NC}"

# --- 4. Repo: clone or use existing ---
echo ""
echo -e "${BLUE}Setting up Jellyfish...${NC}"
INSTALL_DIR=""
if [ -f "start.sh" ] && [ -f "package.json" ]; then
  echo -e "${GREEN}Already inside the project. Using current directory.${NC}"
  INSTALL_DIR="."
elif [ -d "jellyfish" ]; then
  echo "Directory 'jellyfish' already exists."
  read -p "Update existing installation? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd jellyfish
    git pull
    INSTALL_DIR="."
  else
    echo "Using existing installation."
    cd jellyfish
    INSTALL_DIR="."
  fi
else
  # To install from a different repo: JELLYFISH_REPO_URL=https://github.com/org/repo.git ./install.sh
  REPO_URL="${JELLYFISH_REPO_URL:-https://github.com/IronValleyLabs/jellyfish.git}"
  echo -e "${BLUE}Cloning repository (may take a minute)...${NC}"
  git clone "$REPO_URL" jellyfish
  cd jellyfish
  INSTALL_DIR="."
fi

cd "$INSTALL_DIR"

# --- 5. Dependencies ---
echo ""
echo -e "${BLUE}Installing dependencies (this may take 1–3 minutes)...${NC}"
pnpm install
echo -e "${GREEN}✅ Dependencies installed. Almost there.${NC}"

# --- 6. .env ---
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${GREEN}Created .env from .env.example${NC}"
fi

# --- 7. Configuration (all prompts in English) ---
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Configuration (3 short steps)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Step 1/3 — Redis
echo ""
echo -e "${YELLOW}Step 1/3 — Redis${NC}"
echo "Jellyfish uses Redis so agents can talk to each other (events, metrics). If Redis is missing or not running, the dashboard may show warnings and some features won't work."
echo ""
echo "  1) Redis Cloud (free, recommended — no install on your machine)"
echo "  2) Local Redis (we'll check if it's installed and help you start it)"
echo ""
read -p "Choose (1 or 2): " REDIS_OPTION

if [ "$REDIS_OPTION" = "1" ]; then
  echo -e "${GREEN}Good choice — no local Redis to install.${NC}"
  echo ""
  echo "  Sign up at https://redis.com/try-free/ and create a database."
  echo "  Copy the connection URL. Example: redis://default:YourPassword@redis-12345.redis.cloud.com:12345"
  echo ""
  read -p "Paste your Redis URL: " REDIS_URL
  if [[ -n "$REDIS_URL" ]]; then
    # Parse redis://user:password@host:port (e.g. redis://default:PASSWORD@host:port)
    if [[ $REDIS_URL =~ redis://([^:]+):([^@]+)@([^:]+):([0-9]+) ]]; then
      REDIS_PASSWORD="${BASH_REMATCH[2]}"
      REDIS_HOST="${BASH_REMATCH[3]}"
      REDIS_PORT="${BASH_REMATCH[4]}"
      $SED_I "s|REDIS_HOST=.*|REDIS_HOST=$REDIS_HOST|" .env
      $SED_I "s|REDIS_PORT=.*|REDIS_PORT=$REDIS_PORT|" .env
      grep -q "REDIS_PASSWORD" .env && $SED_I "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD|" .env || echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> .env
      rm -f .env.bak
      echo -e "${GREEN}✅ Redis configured${NC}"
    else
      echo -e "${RED}Invalid URL format. Edit .env and set REDIS_HOST, REDIS_PORT, REDIS_PASSWORD manually.${NC}"
    fi
  fi
else
  echo "Using local Redis (localhost:6379)."
  if command -v redis-cli &> /dev/null; then
    if redis-cli -h localhost ping 2>/dev/null | grep -q PONG; then
      echo -e "${GREEN}✅ Local Redis is running.${NC}"
    else
      echo -e "${YELLOW}Redis is installed but not running.${NC}"
      echo "  Start it before Jellyfish (from your system's menu or services), or use Redis Cloud (option 1) instead."
    fi
  else
    echo -e "${YELLOW}Redis is not installed.${NC}"
    echo "  👉 Easiest: go back and choose option 1 (Redis Cloud) — no installation, just sign up and paste values in .env."
    echo "  Or install Redis from https://redis.io/docs/install/ (follow the guide for your system, no copy-paste commands here)."
  fi
fi

# Step 2/3 — LLM
echo ""
echo -e "${YELLOW}Step 2/3 — AI provider${NC}"
echo "  OpenRouter = one key for Claude, Gemini, Llama, and more."
echo "  OpenAI = GPT-4o and other OpenAI models."
echo ""
echo "  1) OpenRouter (recommended)"
echo "  2) OpenAI"
echo ""
read -p "Choose (1 or 2): " LLM_OPTION

if [ "$LLM_OPTION" = "2" ]; then
  $SED_I "s|LLM_PROVIDER=.*|LLM_PROVIDER=openai|" .env
  echo ""
  echo "Get your key at https://platform.openai.com/api-keys"
  read -p "OpenAI API key: " OPENAI_KEY
  if [[ -n "$OPENAI_KEY" ]]; then
    $SED_I "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" .env
  fi
else
  $SED_I "s|LLM_PROVIDER=.*|LLM_PROVIDER=openrouter|" .env
  echo ""
  echo "Get your key at https://openrouter.ai/keys"
  read -p "OpenRouter API key: " OPENROUTER_KEY
  if [[ -n "$OPENROUTER_KEY" ]]; then
    $SED_I "s|OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=$OPENROUTER_KEY|" .env
  fi
  read -p "Model (default: anthropic/claude-3.5-sonnet): " AI_MODEL
  AI_MODEL=${AI_MODEL:-anthropic/claude-3.5-sonnet}
  $SED_I "s|AI_MODEL=.*|AI_MODEL=$AI_MODEL|" .env
fi
rm -f .env.bak

# Step 3/3 — Chat / messaging (at least one required for chat service)
echo ""
echo -e "${YELLOW}Step 3/3 — Chat / messaging${NC}"
echo "How will users talk to your agents? (You need at least one for the chat service to start.)"
echo ""
echo "  1) None — I'll configure in Settings later"
echo "  2) Telegram (bot)"
echo "  3) Twilio (WhatsApp or SMS)"
echo "  4) Line"
echo "  5) Slack (Socket Mode)"
echo "  6) Google Chat"
echo ""
read -p "Choose (1–6): " CHAT_OPTION

case "$CHAT_OPTION" in
  2)
    echo "Create a bot at https://t.me/BotFather and paste the token."
    read -p "Telegram bot token: " TELEGRAM_TOKEN
    if [[ -n "$TELEGRAM_TOKEN" ]]; then
      $SED_I "s|TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$TELEGRAM_TOKEN|" .env
      echo -e "${GREEN}✅ Telegram configured${NC}"
    fi
    ;;
  3)
    echo "Get credentials at https://console.twilio.com — then set webhook to https://YOUR_DOMAIN:3010/webhook/whatsapp"
    read -p "Twilio Account SID: " TWILIO_SID
    read -p "Twilio Auth Token: " TWILIO_AUTH
    read -p "WhatsApp From (e.g. whatsapp:+14155238886): " TWILIO_FROM
    if [[ -n "$TWILIO_SID" ]]; then $SED_I "s|TWILIO_ACCOUNT_SID=.*|TWILIO_ACCOUNT_SID=$TWILIO_SID|" .env; fi
    if [[ -n "$TWILIO_AUTH" ]]; then grep -q "TWILIO_AUTH_TOKEN" .env && $SED_I "s|TWILIO_AUTH_TOKEN=.*|TWILIO_AUTH_TOKEN=$TWILIO_AUTH|" .env || echo "TWILIO_AUTH_TOKEN=$TWILIO_AUTH" >> .env; fi
    if [[ -n "$TWILIO_FROM" ]]; then $SED_I "s|TWILIO_WHATSAPP_FROM=.*|TWILIO_WHATSAPP_FROM=$TWILIO_FROM|" .env; fi
    echo -e "${GREEN}✅ Twilio configured. Set CHAT_WEBHOOK_BASE_URL in .env and webhook in Twilio.${NC}"
    ;;
  4)
    echo "Create a channel at https://developers.line.biz — set webhook to https://YOUR_DOMAIN:3010/webhook/line"
    read -p "Line Channel Access Token: " LINE_TOKEN
    read -p "Line Channel Secret: " LINE_SECRET
    if [[ -n "$LINE_TOKEN" ]]; then $SED_I "s|LINE_CHANNEL_ACCESS_TOKEN=.*|LINE_CHANNEL_ACCESS_TOKEN=$LINE_TOKEN|" .env; fi
    if [[ -n "$LINE_SECRET" ]]; then grep -q "LINE_CHANNEL_SECRET" .env && $SED_I "s|LINE_CHANNEL_SECRET=.*|LINE_CHANNEL_SECRET=$LINE_SECRET|" .env || echo "LINE_CHANNEL_SECRET=$LINE_SECRET" >> .env; fi
    echo -e "${GREEN}✅ Line configured. Set CHAT_WEBHOOK_BASE_URL in .env.${NC}"
    ;;
  5)
    echo "Create an app at https://api.slack.com/apps (Socket Mode — no webhook)."
    read -p "Slack Bot Token (xoxb-...): " SLACK_BOT
    read -p "Slack App-Level Token (xapp-...): " SLACK_APP
    if [[ -n "$SLACK_BOT" ]]; then $SED_I "s|SLACK_BOT_TOKEN=.*|SLACK_BOT_TOKEN=$SLACK_BOT|" .env; fi
    if [[ -n "$SLACK_APP" ]]; then grep -q "SLACK_APP_TOKEN" .env && $SED_I "s|SLACK_APP_TOKEN=.*|SLACK_APP_TOKEN=$SLACK_APP|" .env || echo "SLACK_APP_TOKEN=$SLACK_APP" >> .env; fi
    echo -e "${GREEN}✅ Slack configured${NC}"
    ;;
  6)
    echo "Google Chat: set GOOGLE_CHAT_WEBHOOK_URL or GOOGLE_CHAT_PROJECT_ID in .env. Webhook: https://YOUR_DOMAIN:3010/webhook/google-chat"
    read -p "Google Chat Webhook URL (or leave empty to set in .env later): " GC_WEBHOOK
    if [[ -n "$GC_WEBHOOK" ]]; then
      grep -q "GOOGLE_CHAT_WEBHOOK_URL" .env && $SED_I "s|GOOGLE_CHAT_WEBHOOK_URL=.*|GOOGLE_CHAT_WEBHOOK_URL=$GC_WEBHOOK|" .env || echo "GOOGLE_CHAT_WEBHOOK_URL=$GC_WEBHOOK" >> .env
      echo -e "${GREEN}✅ Google Chat configured${NC}"
    fi
    ;;
  *)
    echo "You can add a chat platform later in Settings. At least one is required for the chat service to start."
    ;;
esac
rm -f .env.bak

# --- 8. Build & start ---
echo ""
echo -e "${BLUE}Building...${NC}"
pnpm build
echo -e "${GREEN}✅ Build done${NC}"

PROJECT_ROOT=$(pwd)
echo ""
echo -e "${BLUE}Starting Jellyfish...${NC}"
./start.sh &
sleep 2

# Wait for dashboard (root or /api/status)
echo -e "${BLUE}Waiting for dashboard...${NC}"
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q 200; then
    break
  fi
  sleep 1
done

# --- 9. Success ---
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Ready! Your jellyfish is swimming.${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Dashboard:${NC} http://localhost:3000"
echo ""
echo "Jellyfish is running in the background. Keep this terminal open if you want, or close it — to start again later, run the commands below from the project folder."
echo ""
echo -e "${CYAN}Project folder:${NC} $PROJECT_ROOT"
echo ""
echo "Next steps:"
echo "  1. The dashboard should open in your browser"
echo "  2. Add your first Mini Jelly from the Gallery"
echo "  3. Configure more in Settings"
echo ""
echo "Commands (run from project folder):"
echo "  To stop:    cd \"$PROJECT_ROOT\" && ./stop.sh"
echo "  To start:   cd \"$PROJECT_ROOT\" && ./start.sh"
echo ""

# Open browser
if command -v open &> /dev/null; then
  open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
  xdg-open http://localhost:3000
elif command -v start &> /dev/null; then
  start http://localhost:3000
fi
echo -e "${GREEN}Opening the dashboard...${NC}"
