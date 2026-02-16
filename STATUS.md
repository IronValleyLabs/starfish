# Jellyfish – Estado general del sistema

## Resumen ejecutivo

- **Flujo de mensajes**: E2E automático (Telegram → Chat → Memory → Core → Action/Core → Chat).
- **Routing**: Por mención (@Nombre, "Hola Nombre") y por asignación (Redis + archivo); `/reset` desasigna en Redis y en archivo (Memory).
- **Métricas**: Core y Action escriben en Redis; dashboard y analytics leen en tiempo real.
- **Estado de procesos**: Solo Mini Jellys (processes.json); Core/Memory/Chat/Action no se comprueban desde el dashboard.

---

## 1. Flujo de eventos (autónomo)

| Origen   | Evento                  | Consumidores        | Notas |
|----------|-------------------------|---------------------|-------|
| Chat     | `message.received`      | Memory              | Incluye `targetAgentId` si hay mención/asignación. |
| Chat     | `conversation.unassigned` | Memory            | Solo en `/reset`; Memory limpia el archivo de asignaciones. |
| Chat     | `action.completed`      | Chat (envío), Memory (guardar) | Chat envía al usuario; Memory persiste respuesta. |
| Memory   | `context.loaded`        | Core (todos)        | Incluye `targetAgentId` / `assignedAgentId`. |
| Core     | `intent.detected`       | Action              | Incluye `agentId` para métricas. |
| Core     | `action.completed`      | Chat, Memory        | Respuesta generada por Core. |
| Action   | `action.completed`      | Chat, Memory        | Resultado de bash/websearch. |
| Action   | `action.failed`         | Chat (si se usa)    | Errores de acción. |

**¿Es 100% autónomo?** Sí, una vez arrancados los procesos (start.sh o equivalentes). No hace falta intervención para: recibir mensaje → cargar contexto → detectar intención → ejecutar respuesta o acción → enviar al usuario y guardar en memoria.

---

## 2. Routing (asignación de conversaciones)

- **Fuentes de “quién responde”**:
  - **Redis** (ConversationRouter): actualizado por Chat al detectar mención; renovado en cada mensaje (TTL 24 h).
  - **Archivo** (`data/conversation-assignments.json`): actualizado por Memory con `/assign` y limpiado por Memory al recibir `conversation.unassigned` (Chat publica esto en `/reset`).

- **Lógica**:
  - Mensaje con mención → Chat asigna en Redis y pone `targetAgentId` en `message.received`.
  - Mensaje sin mención → Chat mira Redis; si hay asignación, pone `targetAgentId`.
  - Memory: `targetAgentId = payload.targetAgentId ?? assignedAgentId` (archivo). Así se combinan Redis (mención) y archivo (`/assign`).
  - `/reset`: Chat desasigna en Redis, publica `conversation.unassigned` y `action.completed`; Memory borra esa conversación del archivo.

**Fallo corregido**: Antes `/reset` solo limpiaba Redis; si antes se había usado `/assign`, el archivo seguía con asignación. Ahora Memory escucha `conversation.unassigned` y limpia el archivo.

---

## 3. Core Agent

- **Intención**: Siempre llama a `detectIntent()` (LLM) y según resultado:
  - `response` → genera respuesta con `generateResponse()`, registra métricas (acciones, coste estimado, `response_generated`) y publica `action.completed`.
  - `bash` / `websearch` → publica `intent.detected` con `agentId` para que Action atribuya métricas.
- **Filtro**: Solo procesa si `targetAgentId ?? assignedAgentId` es null (agente por defecto) o coincide con `this.agentId`.
- **Coste**: Se calcula con `usage` de la respuesta (prompt + completion tokens) y precios por modelo; **no** se incluye el coste de la llamada a `detectIntent()` (subestimación pequeña).

---

## 4. Action Agent

- Recibe `intent.detected`, ejecuta bash/websearch/response (texto), publica `action.completed` o `action.failed`.
- Usa `payload.agentId` (por defecto `core-agent-1`) para métricas: `incrementActions`, `incrementNanoCount`, `recordAction(agentId, 'action_${intent}')`.

---

## 5. Métricas (Redis)

- **Clave**: `metrics:{agentId}:{YYYY-MM-DD}` (hash: actions, cost, lastAction, lastActionTime, nanos). TTL 7 días.
- **Quién escribe**:
  - Core: en respuestas generadas (acciones, coste, `response_generated`).
  - Action: en cada acción exitosa (acciones, nanos, `action_${intent}`).
- **Quién lee**: Vision vía GET `/api/metrics` (todo o por `miniJellyId`). Dashboard y Analytics usan estos datos.

**Dashboard**: Los totales (Actions today, Nano Jellys, AI cost) incluyen **core-agent-1** además de los Mini Jellys, para no subestimar cuando solo contesta el core principal.

---

## 6. Status (online/offline)

- **GET /api/status**: Lee `packages/vision/data/processes.json` y comprueba `process.kill(pid, 0)` por entrada.
- **Alcance**: Solo procesos de **Mini Jellys** (los que spawna Vision). Core, Memory, Chat y Action se lanzan con start.sh y no están en processes.json, por tanto no tienen indicador online en el dashboard.

---

## 7. Dependencias externas

| Dependencia   | Uso                          | Si falla |
|---------------|-------------------------------|----------|
| Redis         | EventBus, routing, métricas   | No hay mensajes ni métricas. |
| Telegram API  | Chat (Telegram)               | No llegan mensajes por Telegram. |
| OpenRouter    | Core (intención + respuesta)  | No hay respuestas ni detección de intención. |
| SQLite        | Memory                        | No se guarda historial ni contexto. |
| Vision (Next) | Dashboard, APIs, spawn        | No hay UI ni respawn de Mini Jellys. |

---

## 8. Qué no es autónomo / limitaciones

1. **Arranque**: Hay que ejecutar `./start.sh` (o cada proceso por separado). No hay un solo “supervisor” que levante todo.
2. **Reintentos**: No hay retry automático ante fallos de Redis/OpenRouter; un fallo puntual puede dejar un mensaje sin respuesta.
3. **Múltiples plataformas**: El coste de la llamada LLM de detección de intención no se suma a las métricas (solo el de `generateResponse`).
4. **Status del core principal**: El proceso “core-agent-1” no aparece en online/offline porque no está en processes.json.
5. **Múltiples plataformas**: Solo Telegram está implementado; WhatsApp/Line/Google Chat son stubs.

---

## 9. Checklist rápido

- [x] Mensaje Telegram → respuesta o acción sin intervención.
- [x] Mención (@Nombre) asigna y solo ese agente responde.
- [x] `/assign` / `/reset` coherentes con Redis y archivo.
- [x] Métricas en Redis y mostradas en dashboard (incluyendo core-agent-1 en totales).
- [x] Online/offline para Mini Jellys según processes.json.
- [x] System prompts editables (Vision) y Core principal los carga desde archivo.
- [x] Coste de `detectIntent` en métricas.
- [x] Indicador de estado para Core/Memory/Chat/Action (main-processes.json + dashboard).
- [x] Action agent en start.sh.
- [x] Chat envía al usuario los errores (action.failed).
