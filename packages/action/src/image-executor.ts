import axios from 'axios';

const NANO_BANANA_BASE = 'https://nanobnana.com/api/v2';
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_WAIT_MS = 60000;

/**
 * Generates images via Nano Banana Pro (nanobnana.com). Uses NANO_BANANA_PRO_API_KEY.
 * Async API: submit task, poll status until done, return image URL(s).
 */
export class ImageExecutor {
  private apiKey: string | null = null;

  constructor() {
    const key =
      process.env.NANO_BANANA_PRO_API_KEY?.trim() ||
      process.env.NANOBANANA_API_KEY?.trim();
    if (key) this.apiKey = key;
  }

  isEnabled(): boolean {
    return this.apiKey !== null;
  }

  async execute(prompt: string, size?: string): Promise<{ output: string; error?: string }> {
    if (!this.apiKey) {
      return {
        output: '',
        error:
          'Image generation not configured. Set NANO_BANANA_PRO_API_KEY in .env (get key at https://nanobnana.com/dashboard/api-keys).',
      };
    }
    const text = (prompt || '').trim();
    if (!text) {
      return { output: '', error: 'No image prompt provided.' };
    }
    const allowedSizes = ['1K', '2K', '4K'];
    const safeSize = size && allowedSizes.includes(size) ? size : '2K';
    try {
      const genRes = await axios.post(
        `${NANO_BANANA_BASE}/generate`,
        {
          prompt: text,
          size: safeSize,
          aspect_ratio: '1:1',
          format: 'png',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 15000,
        }
      );
      const taskId = genRes.data?.data?.task_id;
      if (!taskId) {
        const msg = genRes.data?.message ?? 'No task_id in response';
        if (genRes.data?.code === 402) {
          return { output: '', error: 'Nano Banana Pro: insufficient credits. Recharge at nanobnana.com' };
        }
        return { output: '', error: `Nano Banana Pro: ${msg}` };
      }

      const start = Date.now();
      while (Date.now() - start < POLL_MAX_WAIT_MS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const statusRes = await axios.get(
          `${NANO_BANANA_BASE}/status`,
          {
            params: { task_id: taskId },
            headers: { Authorization: `Bearer ${this.apiKey}` },
            timeout: 10000,
          }
        );
        const data = statusRes.data?.data;
        if (!data) {
          return { output: '', error: 'Nano Banana Pro: invalid status response.' };
        }
        if (data.status === -1) {
          return {
            output: '',
            error: data.error_message ?? 'Nano Banana Pro: task failed.',
          };
        }
        if (data.status === 1 && data.response) {
          let urls: string[] = [];
          try {
            urls = JSON.parse(data.response);
          } catch {
            urls = [data.response];
          }
          const url = Array.isArray(urls) ? urls[0] : urls;
          if (url) {
            return { output: `Image generated (Nano Banana Pro): ${url}` };
          }
        }
      }
      return { output: '', error: 'Nano Banana Pro: timeout waiting for image.' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image generation failed';
      console.error('[ImageExecutor]', message);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return { output: '', error: 'Nano Banana Pro: invalid API key. Check NANO_BANANA_PRO_API_KEY.' };
      }
      return { output: '', error: message };
    }
  }
}
