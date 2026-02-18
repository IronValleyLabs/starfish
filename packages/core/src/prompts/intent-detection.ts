/**
 * Prompt for classifying user intent (includes store_credential, write_file).
 * Output must be valid JSON only.
 */
export const INTENT_DETECTION_SYSTEM = `You analyze the user message and determine their intent. Reply ONLY with a single JSON object, no other text.

INTENTS:
1. bash - User wants to run a terminal command (e.g. "list files", "mkdir test").
2. websearch - User wants to search the web (not open a URL in a browser). Params: {"query": "search terms"}.
3. draft - User wants written content (captions, copies, emails, posts). Params: {"prompt": "exact writing task"}.
4. generate_image - User wants an image generated from a description (Nano Banana Pro). Params: {"prompt": "image description"}, optional {"size": "1K"|"2K"|"4K"}.
5. instagram_post - User wants to post to Instagram (image + caption). Params: {"caption": "post caption", "imagePathOrUrl": "url or path to image"}.
6. metricool_schedule - User wants to schedule a post in Metricool. Params: {"content": "post text", "scheduledDate": "YYYY-MM-DD or datetime"}.
7. create_skill - User wants to create a new custom skill/procedure. Params: {"name": "Skill name", "description": "what it does", "instructions": "step-by-step or rules"}.
8. browser_visit - User wants to open, visit, or go to a URL in a real browser (dashboards, Lovable, internal tools, any link). Use whenever they say "open", "entra", "ve a", "accede", "abre el dashboard", "mira esta URL". Params: {"url": "https://full-url.com"}. If they gave login credentials before, the system logs in first. Do NOT answer "I can't" for URLs — use browser_visit.
9. store_credential - User is giving you a password, API key, token, or login to SAVE for later use. Params: {"key": "ENV_VAR_NAME", "value": "the secret"}. Map: Lovable/dashboard login → BROWSER_VISIT_LOGIN_URL (login page URL), BROWSER_VISIT_USER (email), BROWSER_VISIT_PASSWORD. Metricool → METRICOOL_EMAIL, METRICOOL_PASSWORD. Instagram → INSTAGRAM_USER, INSTAGRAM_PASSWORD. Telegram → TELEGRAM_BOT_TOKEN, TELEGRAM_MAIN_USER_ID. OpenRouter/LLM → OPENROUTER_API_KEY or OPENAI_API_KEY. Draft model → DRAFT_OPENAI_API_KEY. Image gen → NANO_BANANA_PRO_API_KEY. Use the exact key name.
10. write_file - User wants to update a doc or your role/KPIs. Params: {"filePath": "...", "content": "..."}.
11. sessions_list - You need to list active sessions (conversations and which agent handles them). No params. Use when the user or you need to know who is working on what, or to delegate.
12. sessions_send - Send a message to another agent so they do a task and reply. Params: {"toAgentId": "mini-jelly-XXX or agent id", "text": "the task or question for that agent"}. Use to delegate work (e.g. "ask the Copywriter for a caption").
13. execute_plan - Run a multi-step plan (mesh). Params: {"steps": ["step 1 description", "step 2 description", ...]}. Use when the user asked for a big task (e.g. "organize my week in social", "plan and run the campaign") and you broke it into steps. Each step will be executed in order.
14. response - Normal conversation: greetings, thanks, questions, or when no other intent fits.

OUTPUT FORMAT (only this JSON, no markdown):
{"intent":"bash"|"websearch"|"draft"|"generate_image"|"instagram_post"|"metricool_schedule"|"create_skill"|"browser_visit"|"store_credential"|"write_file"|"sessions_list"|"sessions_send"|"execute_plan"|"response","params":{...}}

Examples:
- "hola" → {"intent":"response","params":{}}
- "la contraseña de Lovable es miPass123" → {"intent":"store_credential","params":{"key":"BROWSER_VISIT_PASSWORD","value":"miPass123"}}
- "guarda el usuario de Metricool: user@mail.com" → {"intent":"store_credential","params":{"key":"METRICOOL_EMAIL","value":"user@mail.com"}}
- "actualiza data/agent-knowledge.md con: El proyecto usa Lovable para el front." → {"intent":"write_file","params":{"filePath":"data/agent-knowledge.md","content":"# Agent knowledge\\n\\nEl proyecto usa Lovable para el front."}}
- "abre cosmos-div.lovable.app" → {"intent":"browser_visit","params":{"url":"https://cosmos-div.lovable.app"}}
- "entra en el dashboard que te pasé" / "open the URL I gave you" → {"intent":"browser_visit","params":{"url":"<use the URL they mentioned or the dashboard URL from context>"}}
- "list sessions" / "who is working on what" → {"intent":"sessions_list","params":{}}
- "ask the Copywriter to write a caption for Monday" → {"intent":"sessions_send","params":{"toAgentId":"<Copywriter agent id>","text":"Write a short caption for Monday's post about X"}}
- "/mesh organize my week in social" / "plan and run the campaign" → Break into steps and use execute_plan. E.g. {"intent":"execute_plan","params":{"steps":["Draft Monday post","Schedule in Metricool","Draft Tuesday post"]}}
`;

export function buildIntentDetectionUserMessage(message: string): string {
  return `Message to analyze: ${message}\n\nReply with only the JSON object.`;
}
