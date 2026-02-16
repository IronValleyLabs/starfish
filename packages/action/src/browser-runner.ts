/**
 * Launches Puppeteer and runs predefined flows (Instagram post, Metricool schedule).
 * Set INSTAGRAM_* or METRICOOL_* in .env. If puppeteer is not installed, flows return a clear error.
 */
import { instagramPost, metricoolSchedule } from './browser-flows';

let puppeteer: typeof import('puppeteer') | null = null;
try {
  puppeteer = require('puppeteer');
} catch {
  // optional dependency
}

export type FlowName = 'instagram_post' | 'metricool_schedule';

export interface FlowParams {
  instagram_post?: { caption: string; imagePathOrUrl: string };
  metricool_schedule?: { content: string; scheduledDate?: string };
}

export class BrowserRunner {
  isAvailable(): boolean {
    return puppeteer !== null;
  }

  async run(flow: FlowName, params: FlowParams[FlowName]): Promise<{ output: string; error?: string }> {
    if (!puppeteer) {
      return {
        output: '',
        error:
          'Puppeteer not installed. Run: pnpm add puppeteer (in packages/action or root). Then set INSTAGRAM_* or METRICOOL_* in .env.',
      };
    }
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      if (flow === 'instagram_post' && params && 'caption' in params && 'imagePathOrUrl' in params) {
        return await instagramPost(browser, params.caption, params.imagePathOrUrl);
      }
      if (flow === 'metricool_schedule' && params && 'content' in params) {
        return await metricoolSchedule(browser, params.content, params.scheduledDate);
      }
      return { output: '', error: `Unknown flow or missing params: ${flow}` };
    } finally {
      await browser.close().catch(() => {});
    }
  }
}
