/**
 * Predefined browser flows for Instagram and Metricool.
 * Credentials from env: INSTAGRAM_USER, INSTAGRAM_PASSWORD; METRICOOL_EMAIL, METRICOOL_PASSWORD.
 * Uses Puppeteer; runs headless. Site selectors may need updates if UIs change.
 */
// Types from puppeteer (optional dependency)
type Browser = import('puppeteer').Browser;
import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';

const INSTAGRAM_USER = process.env.INSTAGRAM_USER?.trim();
const INSTAGRAM_PASSWORD = process.env.INSTAGRAM_PASSWORD?.trim();
const METRICOOL_EMAIL = process.env.METRICOOL_EMAIL?.trim();
const METRICOOL_PASSWORD = process.env.METRICOOL_PASSWORD?.trim();

const FLOW_TIMEOUT_MS = 120_000;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function downloadToTemp(url: string): Promise<string> {
  const tmpDir = path.join(process.cwd(), 'tmp');
  await fs.mkdir(tmpDir, { recursive: true });
  const filename = path.join(tmpDir, `img-${Date.now()}.jpg`);
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  await fs.writeFile(filename, Buffer.from(res.data));
  return filename;
}

export async function instagramPost(
  browser: Browser,
  caption: string,
  imagePathOrUrl: string
): Promise<{ output: string; error?: string }> {
  if (!INSTAGRAM_USER || !INSTAGRAM_PASSWORD) {
    return {
      output: '',
      error: 'Set INSTAGRAM_USER and INSTAGRAM_PASSWORD in .env to post to Instagram.',
    };
  }
  let imagePath = imagePathOrUrl.trim();
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      imagePath = await downloadToTemp(imagePath);
    } catch (e) {
      return { output: '', error: `Could not download image: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  }
  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(FLOW_TIMEOUT_MS);
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

    const hasInbox = await page.$('a[href="/direct/inbox/"]');
    if (!hasInbox) {
      await page.type('input[name="username"]', INSTAGRAM_USER, { delay: 50 });
      await page.type('input[name="password"]', INSTAGRAM_PASSWORD, { delay: 50 });
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
        page.click('button[type="submit"]'),
      ]);
      await page.waitForSelector('a[href="/direct/inbox/"]', { timeout: 15000 }).catch(() => null);
    }

    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
    const newPostSvg = await page.$$('svg[aria-label="New post"]');
    if (newPostSvg.length === 0) {
      return { output: '', error: 'Could not find New post on Instagram. UI may have changed or login failed.' };
    }
    await newPostSvg[0].click();
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) return { output: '', error: 'File input not found.' };
    await (fileInput as any).uploadFile([imagePath]);
    await delay(2000);
    const nextButtons = await page.$$('button');
    for (const btn of nextButtons) {
      const text = await page.evaluate((el: Element) => el.textContent, btn);
      if (text && text.trim() === 'Next') {
        await btn.click();
        break;
      }
    }
    await delay(1500);
    const captionArea = await page.$('textarea[placeholder*="caption"], textarea[aria-label*="caption"]');
    if (captionArea && caption) await captionArea.type(caption, { delay: 30 });
    await delay(500);
    const shareButtons = await page.$$('button');
    for (const btn of shareButtons) {
      const text = await page.evaluate((el: Element) => el.textContent, btn);
      if (text && text.trim() === 'Share') {
        await btn.click();
        break;
      }
    }
    await delay(3000);
    return { output: 'Instagram post published.' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { output: '', error: `Instagram flow failed: ${msg}` };
  } finally {
    await page.close().catch(() => {});
  }
}

export async function metricoolSchedule(
  browser: Browser,
  content: string,
  scheduledDate?: string
): Promise<{ output: string; error?: string }> {
  if (!METRICOOL_EMAIL || !METRICOOL_PASSWORD) {
    return {
      output: '',
      error: 'Set METRICOOL_EMAIL and METRICOOL_PASSWORD in .env to schedule in Metricool.',
    };
  }
  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(FLOW_TIMEOUT_MS);
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://app.metricool.com/login', { waitUntil: 'networkidle2' });
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passInput = await page.$('input[type="password"], input[name="password"]');
    if (emailInput) await emailInput.type(METRICOOL_EMAIL, { delay: 50 });
    if (passInput) await passInput.type(METRICOOL_PASSWORD, { delay: 50 });
    const submit = await page.$('button[type="submit"], input[type="submit"]');
    if (submit) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
        submit.click(),
      ]);
    }
    await delay(3000);
    await page.goto('https://app.metricool.com/content/calendar', { waitUntil: 'networkidle2' }).catch(() => {});
    await delay(2000);
    const contentArea = await page.$('textarea, [contenteditable="true"]');
    if (contentArea && content) await contentArea.type(content, { delay: 30 });
    if (scheduledDate) {
      const dateInput = await page.$('input[type="datetime-local"], input[type="date"]');
      if (dateInput) await dateInput.type(scheduledDate, { delay: 50 });
    }
    const saveButtons = await page.$$('button');
    for (const btn of saveButtons) {
      const text = await page.evaluate((el: Element) => el.textContent, btn);
      if (text && (text.includes('Schedule') || text.includes('Save') || text.includes('Publish'))) {
        await btn.click();
        break;
      }
    }
    await delay(2000);
    return { output: 'Post scheduled in Metricool.' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { output: '', error: `Metricool flow failed: ${msg}` };
  } finally {
    await page.close().catch(() => {});
  }
}
