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
echo -e "${BLUE}We'll check your system, set up dependencies, and guide you through configuration.${NC}"
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
  echo "Please install Node.js 20 first:"
  if [[ "$OS" == "macos" ]]; then
    echo "  brew install node@20"
  elif [[ "$OS" == "linux" ]]; then
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
  else
    echo "  Download from: https://nodejs.org"
  fi
  exit 1
fi
NODE_MAJOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo -e "${YELLOW}⚠️  Node.js $NODE_MAJOR detected. Node.js 18+ is recommended.${NC}"
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# --- 3. pnpm ---
echo ""
echo -e "${BLUE}Checking pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
  echo -e "${YELLOW}Installing pnpm...${NC}"
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
  REPO_URL="${JELLYFISH_REPO_URL:-https://github.com/IronValleyLabs/jellyfish.git}"
  git clone "$REPO_URL" jellyfish
  cd jellyfish
  INSTALL_DIR="."
fi

cd "$INSTALL_DIR"

# --- 5. Dependencies ---
echo ""
echo -e "${BLUE}Installing dependencies...${NC}"
pnpm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# --- 6. .env ---
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${GREEN}Created .env from .env.example${NC}"
fi

# --- 7. Configuration (all prompts in English) ---
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Configuration${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Redis
echo ""
echo -e "${YELLOW}Redis${NC}"
echo "Jellyfish uses Redis for real-time communication between agents."
echo ""
echo "  1) Redis Cloud (free tier, recommended — no local install)"
echo "  2) Local Redis (you must have redis-server running)"
echo ""
read -p "Choose (1 or 2): " REDIS_OPTION

if [ "$REDIS_OPTION" = "1" ]; then
  echo ""
  echo -e "${BLUE}Redis Cloud${NC}"
  echo "  1. Go to: https://redis.com/try-free/"
  echo "  2. Sign up (no credit card required)"
  echo "  3. Create a database and copy the connection URL"
  echo ""
  read -p "Paste your Redis URL (e.g. redis://default:xxx@host:port): " REDIS_URL
  if [[ -n "$REDIS_URL" ]]; then
    # Parse redis://[user]:password@host:port
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
      echo -e "${RED}Invalid URL format. Set REDIS_HOST and REDIS_PORT in .env manually.${NC}"
    fi
  fi
else
  echo "Using local Redis (localhost:6379). Ensure redis-server is running."
fi

# LLM
echo ""
echo -e "${YELLOW}AI provider${NC}"
echo "  1) OpenRouter (recommended, many models)"
echo "  2) OpenAI"
echo ""
read -p "Choose (1 or 2): " LLM_OPTION

if [ "$LLM_OPTION" = "2" ]; then
  $SED_I "s|LLM_PROVIDER=.*|LLM_PROVIDER=openai|" .env
  echo ""
  echo "Get your key: https://platform.openai.com/api-keys"
  read -p "OpenAI API key: " OPENAI_KEY
  if [[ -n "$OPENAI_KEY" ]]; then
    $SED_I "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" .env
  fi
else
  $SED_I "s|LLM_PROVIDER=.*|LLM_PROVIDER=openrouter|" .env
  echo ""
  echo "Get your key: https://openrouter.ai/keys"
  read -p "OpenRouter API key: " OPENROUTER_KEY
  if [[ -n "$OPENROUTER_KEY" ]]; then
    $SED_I "s|OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=$OPENROUTER_KEY|" .env
  fi
  read -p "Model (default: anthropic/claude-3.5-sonnet): " AI_MODEL
  AI_MODEL=${AI_MODEL:-anthropic/claude-3.5-sonnet}
  $SED_I "s|AI_MODEL=.*|AI_MODEL=$AI_MODEL|" .env
fi
rm -f .env.bak

# Telegram (optional)
echo ""
echo -e "${YELLOW}Telegram bot (optional)${NC}"
read -p "Configure Telegram now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Create a bot: https://t.me/BotFather"
  read -p "Bot token: " TELEGRAM_TOKEN
  if [[ -n "$TELEGRAM_TOKEN" ]]; then
    $SED_I "s|TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$TELEGRAM_TOKEN|" .env
    rm -f .env.bak
    echo -e "${GREEN}✅ Telegram configured${NC}"
  fi
else
  echo "You can add it later in Settings."
fi

# --- 8. Build & start ---
echo ""
echo -e "${BLUE}Building...${NC}"
pnpm build
echo -e "${GREEN}✅ Build done${NC}"

echo ""
echo -e "${BLUE}Starting Jellyfish...${NC}"
./start.sh &
START_PID=$!
sleep 2

# Wait for dashboard
echo -e "${BLUE}Waiting for dashboard...${NC}"
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q 200; then
    break
  fi
  sleep 1
done

# --- 9. Success ---
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Jellyfish is running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Dashboard:${NC} http://localhost:3000"
echo ""
echo "Next steps:"
echo "  1. Open the dashboard in your browser"
echo "  2. Add your first Mini Jelly from the Gallery"
echo "  3. Configure more integrations in Settings"
echo ""
echo "Commands:"
echo "  Stop:    ./stop.sh   (or Ctrl+C in the start.sh terminal)"
echo "  Restart: ./start.sh"
echo ""

# Open browser
if command -v open &> /dev/null; then
  open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
  xdg-open http://localhost:3000
elif command -v start &> /dev/null; then
  start http://localhost:3000
fi
