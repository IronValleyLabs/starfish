#!/bin/bash
# Pull latest code from GitHub and start Jellyfish.
cd "$(dirname "$0")"
echo "📥 Pulling latest from GitHub..."
git pull
echo ""
exec ./start.sh
