/* Shared Playwright harness: a Vite dev server and a phone-sized page with error capture. */
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { mkdirSync } from 'node:fs';

export const OUT = new URL('./out/', import.meta.url).pathname;

export interface Env {
  server: ViteDevServer;
  browser: Browser;
  base: string;
}

export async function startEnv(): Promise<Env> {
  mkdirSync(OUT, { recursive: true });
  const server = await createServer({ server: { port: 5199, strictPort: false }, logLevel: 'error' });
  await server.listen();
  const url = server.resolvedUrls!.local[0].replace(/\/$/, '');
  const browser = await chromium.launch();
  return { server, browser, base: url };
}

export async function stopEnv(env: Env): Promise<void> {
  await env.browser.close();
  await env.server.close();
}

/** A page plus the errors it raised. Logs `console.error` and uncaught exceptions. */
export interface Watched {
  page: Page;
  errors: string[];
}

export async function openPage(env: Env, path: string, opts: { seed?: number; storage?: Record<string, string> } = {}): Promise<Watched> {
  const ctx = await env.browser.newContext({ viewport: { width: 400, height: 720 }, deviceScaleFactor: 2, hasTouch: true });
  if (opts.storage) {
    await ctx.addInitScript((kv) => {
      for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v);
    }, opts.storage);
  }
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  const q = opts.seed === undefined ? '' : `?seed=${opts.seed}`;
  await page.goto(`${env.base}${path}${q}`);
  return { page, errors };
}
