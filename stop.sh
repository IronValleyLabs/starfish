#!/bin/bash
echo "🛑 Deteniendo Starfish..."
pkill -f "@jellyfish/memory"
pkill -f "@jellyfish/core"
pkill -f "@jellyfish/chat"
echo "✅ Todos los agentes detenidos"
