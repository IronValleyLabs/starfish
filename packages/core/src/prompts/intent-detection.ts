/**
 * Prompt for classifying user intent (bash, websearch, draft, generate_image, instagram_post, metricool_schedule, response).
 * Output must be valid JSON only.
 */
export const INTENT_DETECTION_SYSTEM = `You analyze the user message and determine their intent. Reply ONLY with a single JSON object, no other text.

INTENTS:
1. bash - User wants to run a terminal command (e.g. "list files", "mkdir test").
2. websearch - User wants to search the web for information.
3. draft - User wants written content (captions, copies, emails, posts). Params: {"prompt": "exact writing task"}.
4. generate_image - User wants an image generated from a description (Nano Banana Pro). Params: {"prompt": "image description"}, optional {"size": "1K"|"2K"|"4K"}.
5. instagram_post - User wants to post to Instagram (image + caption). Params: {"caption": "post caption", "imagePathOrUrl": "url or path to image"}, or {"prompt": "image URL/path"} and caption in message.
6. metricool_schedule - User wants to schedule a post in Metricool. Params: {"content": "post text", "scheduledDate": "YYYY-MM-DD or datetime"}.
7. response - Normal conversation: greetings, thanks, questions, or when no other intent fits.

OUTPUT FORMAT (only this JSON, no markdown):
{"intent":"bash"|"websearch"|"draft"|"generate_image"|"instagram_post"|"metricool_schedule"|"response","params":{...}}

Examples:
- "hola" → {"intent":"response","params":{}}
- "lista archivos" → {"intent":"bash","params":{"command":"ls -la"}}
- "genera una imagen de un atardecer en la playa" → {"intent":"generate_image","params":{"prompt":"sunset on the beach, peaceful","size":"2K"}}
- "publica en Instagram esta foto con caption Hola mundo" → {"intent":"instagram_post","params":{"caption":"Hola mundo","imagePathOrUrl":""}}
- "programa en Metricool para mañana: oferta 20% off" → {"intent":"metricool_schedule","params":{"content":"oferta 20% off","scheduledDate":""}}
- "escribe 5 copies para Instagram" → {"intent":"draft","params":{"prompt":"Write 5 Instagram captions..."}}
- "qué es docker" → {"intent":"websearch","params":{"query":"what is docker"}}
`;

export function buildIntentDetectionUserMessage(message: string): string {
  return `Message to analyze: ${message}\n\nReply with only the JSON object.`;
}
