# Autonomía: pairing, sesiones y mesh

Documentación de las funciones de seguridad (DM pairing), coordinación entre agentes (sessions) y ejecución de planes (mesh).

---

## DM pairing (Telegram)

Para que solo usuarios autorizados puedan hablar con el bot por Telegram:

1. En `.env` pon **`TELEGRAM_PAIRING_ENABLED=1`**.
2. Reinicia el agente Chat (`./stop.sh` y `./start.sh`, o reinicia solo el proceso Chat).
3. Cuando un usuario de Telegram que **no** está en la lista aprobada escribe al bot, recibe un mensaje con un **código de pairing** (por ejemplo `A1B2C3D4`). El bot **no procesa** su mensaje hasta que lo apruebes.
4. En el dashboard ve a **Settings → Pairing (Telegram)**. Ahí verás los códigos pendientes y los aprobados. Pulsa **Approve** junto al código que te envió el usuario.
5. A partir de ese momento, ese usuario puede hablar con el bot con normalidad.

**Excepciones:**

- Si tienes **`TELEGRAM_MAIN_USER_ID`** configurado (tu user ID de Telegram), ese usuario **nunca** recibe código: siempre puede escribir y se usa el flujo unificado con el dashboard.
- Si no usas pairing (`TELEGRAM_PAIRING_ENABLED` vacío o distinto de `1`), todos los usuarios pueden escribir sin aprobación.

**APIs:**

- `GET /api/pairing?platform=telegram&userId=123` — Devuelve `{ approved: true }` o `{ approved: false, code: "ABC12" }`. Si no está aprobado, puede crear y devolver un código nuevo.
- `PATCH /api/pairing` — Cuerpo: `{ code: "ABC12" }` para aprobar por código, o `{ platform: "telegram", userId: "123" }` para aprobar por usuario.
- `GET /api/pairing/list` — Lista de códigos pendientes y peers aprobados (para la UI de Settings).

Los datos se guardan en **`data/pairing.json`**.

---

## Sesiones (agent-to-agent)

Los agentes pueden **listar sesiones activas** y **enviar un mensaje a otro agente** para que haga una tarea y devuelva el resultado.

### Intents

- **`sessions_list`** — Sin parámetros. El agente obtiene la lista de sesiones (conversación → agente asignado) y puede usarla para decidir a quién delegar.
- **`sessions_send`** — Parámetros: `toAgentId` (id del agente, p. ej. `mini-jelly-xxx` o el id del template), `text` (el encargo o pregunta). El sistema inyecta un mensaje interno para ese agente, espera su respuesta y la devuelve al agente que llamó.

### Flujo interno

1. El agente A (o el Core en su nombre) emite el intent `sessions_send` con `toAgentId` = B y `text` = "Escribe un caption para el lunes".
2. Action publica un `message.received` con `conversationId` interno (`internal:session:<requestId>`) y `targetAgentId` = B.
3. Memory y Core procesan como un mensaje más; el agente B responde (o ejecuta herramientas).
4. Cuando B termina, se emite `action.completed` para esa conversación interna. Chat detecta el prefijo `internal:session:` y guarda la respuesta en Redis (vía `POST /api/sessions/response`).
5. Action hace polling a `GET /api/sessions/response?requestId=...` hasta recibir la respuesta (o timeout ~90 s) y la devuelve como resultado del intent a A.

### APIs (Vision)

- **`GET /api/sessions`** — Lista de sesiones: `[{ conversationId, agentId }, ...]` (desde `data/conversation-assignments.json`).
- **`POST /api/sessions/response`** — Cuerpo: `{ requestId, output }`. Lo usa el Chat al recibir `action.completed` para una conversación `internal:session:*`. Guarda en Redis con TTL.
- **`GET /api/sessions/response?requestId=`** — Consulta (y consume) la respuesta guardada. Lo usa Action para esperar el resultado de un `sessions_send`.

---

## Plan + ejecutar (mesh)

Para objetivos que requieren varios pasos (por ejemplo "organiza mi semana en redes" o "planifica y ejecuta la campaña"):

1. El usuario escribe algo como "/mesh organiza mi semana" o "planifica y ejecuta la campaña de lunes a viernes".
2. El Core puede devolver el intent **`execute_plan`** con **`params.steps`**: array de strings, cada uno es un paso (por ejemplo "Redactar post del lunes", "Programar en Metricool", "Redactar post del martes").
3. Action ejecuta cada paso en orden: para cada uno hace el mismo flujo que `sessions_send` pero **al mismo agente** (envía el paso como mensaje interno, espera la respuesta, sigue con el siguiente).
4. Las salidas de todos los pasos se concatenan y se devuelven como resultado del intent.

Así, **una sola petición del usuario** se convierte en **varios pasos ejecutados** de forma autónoma.

---

## Comandos en el chat

- **`/status`** — El agente Chat lo intercepta antes de publicar el mensaje. Llama a `GET /api/status` de Vision y envía al usuario un resumen de procesos (memory, core, action, chat, vision, etc.) con ✓/✗. No pasa por el Core.
- **`/reset`** — Desasigna la conversación del agente actual; el siguiente mensaje irá al agente por defecto o al que menciones.
- **`/mesh <objetivo>`** — No es un comando especial a nivel de Chat: el texto se envía como mensaje normal. El Core puede interpretarlo y devolver `execute_plan` con los pasos correspondientes.

---

## Tests

En la raíz del repo:

```bash
pnpm test
```

Se ejecutan tests de:

- **Pairing**: `peerId`, `normalizePairingData`, `isApproved`, `findPendingCode`, `approveByCode`, `approveByPeer` (lógica en `packages/vision/src/lib/pairing.ts`).
- **Sessions**: Formato de sesiones y de `conversationId` interno.
- **Chat commands**: Patrón de `/status`.
- **Mesh**: Forma del intent `execute_plan` (steps array).

Configuración: **Vitest** en `vitest.config.ts`; tests en **`tests/`**.
