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
  echo -e "${RED}❌ Node.js $NODE_MAJOR is too old. Jellyfish needs Node.js 18 or 20.${NC}"
  echo ""
  echo "Install Node.js 20:"
  if [[ "$OS" == "macos" ]]; then
    echo "  brew install node@20"
  elif [[ "$OS" == "linux" ]]; then
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
  else
    echo "  https://nodejs.org"
  fi
  exit 1
fi
if [ "$NODE_MAJOR" -ge 21 ]; then
  echo -e "${RED}❌ Node.js $NODE_MAJOR is not supported. The Memory agent uses better-sqlite3, which only builds on Node 18 or 20.${NC}"
  echo ""
  echo "Switch to Node 20 and run the installer again:"
  if command -v nvm &> /dev/null; then
    echo "  nvm install 20"
    echo "  nvm use 20"
    echo "  ./install.sh"
  elif [[ "$OS" == "macos" ]]; then
    echo "  brew install node@20"
    echo "  brew unlink node && brew link --overwrite node@20"
    echo "  Or use nvm: https://github.com/nvm-sh/nvm"
  elif [[ "$OS" == "linux" ]]; then
    echo "  nvm install 20 && nvm use 20"
    echo "  Or: https://nodejs.org (download Node 20 LTS)"
  else
    echo "  https://nodejs.org (download Node 20 LTS)"
  fi
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
echo "Jellyfish uses Redis so agents can talk to each other."
echo ""
echo "  1) Redis Cloud (free, recommended — no install on your machine)"
echo "  2) Local Redis (you run redis-server yourself)"
echo ""
read -p "Choose (1 or 2): " REDIS_OPTION

if [ "$REDIS_OPTION" = "1" ]; then
  echo -e "${GREEN}Good choice — no local Redis to install.${NC}"
  echo ""
  read -p "Open Redis Cloud signup in your browser? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
      open "https://redis.com/try-free/"
    elif command -v xdg-open &> /dev/null; then
      xdg-open "https://redis.com/try-free/"
    elif command -v start &> /dev/null; then
      start "https://redis.com/try-free/"
    fi
    echo "When you have the connection URL, paste it here."
  fi
  echo ""
  echo "  Create a database at Redis Cloud, then copy the connection URL."
  echo "  Example: redis://default:YourPassword@redis-12345.redis.cloud.com:12345"
  echo ""
  read -p "Paste your Redis URL here (don't share it elsewhere): " REDIS_URL
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
  echo "Using local Redis (localhost:6379). Make sure redis-server is running."
fi

# Step 2/3 — LLM
echo ""
echo -e "${YELLOW}Step 2/3 — AI provider${NC}"
echo "  1) OpenRouter (recommended, many models)"
echo "  2) OpenAI"
echo ""
read -p "Choose (1 or 2): " LLM_OPTION

if [ "$LLM_OPTION" = "2" ]; then
  $SED_I "s|LLM_PROVIDER=.*|LLM_PROVIDER=openai|" .env
  echo ""
  read -p "Open OpenAI API keys page in browser? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then open "https://platform.openai.com/api-keys"; elif command -v xdg-open &> /dev/null; then xdg-open "https://platform.openai.com/api-keys"; elif command -v start &> /dev/null; then start "https://platform.openai.com/api-keys"; fi
  fi
  echo "Paste your key here (don't share it with anyone):"
  read -p "OpenAI API key: " OPENAI_KEY
  if [[ -n "$OPENAI_KEY" ]]; then
    $SED_I "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" .env
  fi
else
  $SED_I "s|LLM_PROVIDER=.*|LLM_PROVIDER=openrouter|" .env
  echo ""
  read -p "Open OpenRouter keys page in browser? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then open "https://openrouter.ai/keys"; elif command -v xdg-open &> /dev/null; then xdg-open "https://openrouter.ai/keys"; elif command -v start &> /dev/null; then start "https://openrouter.ai/keys"; fi
  fi
  echo "Paste your key here (don't share it with anyone):"
  read -p "OpenRouter API key: " OPENROUTER_KEY
  if [[ -n "$OPENROUTER_KEY" ]]; then
    $SED_I "s|OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=$OPENROUTER_KEY|" .env
  fi
  read -p "Model (default: anthropic/claude-3.5-sonnet): " AI_MODEL
  AI_MODEL=${AI_MODEL:-anthropic/claude-3.5-sonnet}
  $SED_I "s|AI_MODEL=.*|AI_MODEL=$AI_MODEL|" .env
fi
rm -f .env.bak

# Step 3/3 — Telegram (optional)
echo ""
echo -e "${YELLOW}Step 3/3 — Telegram bot (optional)${NC}"
read -p "Configure Telegram now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  read -p "Open BotFather in browser? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then open "https://t.me/BotFather"; elif command -v xdg-open &> /dev/null; then xdg-open "https://t.me/BotFather"; elif command -v start &> /dev/null; then start "https://t.me/BotFather"; fi
  fi
  echo "Create a bot, then paste the token here (don't share it):"
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
