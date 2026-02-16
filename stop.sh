#!/bin/bash
echo "🛑 Deteniendo Starfish..."
pkill -f "@starfish/memory"
pkill -f "@starfish/core"
pkill -f "@starfish/chat"
echo "✅ Todos los agentes detenidos"
