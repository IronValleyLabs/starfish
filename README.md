# 🐙 Starfish - Sistema Multi-Agente Autónomo

Sistema de agentes de IA verdaderamente autónomo y event-driven, sin cron jobs.

## 🚀 Inicio Rápido

### Requisitos
- Node.js 20+
- pnpm
- Docker Desktop (para Redis)

### Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/Faunny/starfish.git
cd starfish
```

2. Instala dependencias:
```bash
pnpm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env
# Edita .env con tu TELEGRAM_BOT_TOKEN, OPENROUTER_API_KEY, etc.
```

### Ejecutar el sistema

1. Inicia Redis con Docker Compose:
```bash
docker-compose up -d
```

2. Inicia los agentes:
```bash
chmod +x start.sh
./start.sh
```

3. Para detener los agentes:
```bash
./stop.sh
```

4. Para detener Redis:
```bash
docker-compose down
```

### Arquitectura

- **Redis**: bus de eventos (Pub/Sub) para comunicación entre agentes.
- **Memory**: guarda historial en SQLite y publica `context.loaded`.
- **Core**: recibe contexto, genera respuesta con OpenRouter/Claude y publica `action.completed`.
- **Chat**: recibe mensajes de Telegram, publica `message.received` y envía respuestas al usuario.
