// A map seen from above, as the map maker draws it (plan C5): how Claude looks at a map and reads its notes.
//   npm run map:shot -- <name> [out.png] [--draft-file path.json] [--size 1200]
// Starts its own dev server, opens /mapmaker/?map=<name>&shot, saves the picture (default e2e/out/map-<name>.png),
// and prints the map's notes with their numbers and spots and any problems the compiler found.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const args = process.argv.slice(2);
const flag = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const draftFile = flag('--draft-file');
const size = Number(flag('--size') ?? 1200);
const [name, out = `e2e/out/map-${name}.png`] = args;
if (!name) {
  console.error('usage: npm run map:shot -- <map name> [out.png] [--draft-file file.json] [--size px]');
  process.exit(1);
}

const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // A draft from a file (a map pasted in the chat, not yet saved): put it in the browser as the map maker would.
  if (draftFile) {
    const spec = readFileSync(draftFile, 'utf8');
    await page.addInitScript(([n, s]) => localStorage.setItem(`slicehaven.mapdraft.${n}`, s), [name, spec]);
  }
  await page.goto(`${url}mapmaker/?map=${encodeURIComponent(name)}&shot`);
  await page.waitForFunction(() => window.mapmaker?.ready, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out });
  const { notes, problems } = await page.evaluate(() => ({ notes: window.mapmaker.spec.notes ?? [], problems: window.mapmaker.problems }));
  console.log(`picture: ${out}`);
  for (const [i, n] of notes.entries())
    console.log(`note ${i + 1} (${n.id}) at [${n.at}]${n.r ? ` r ${n.r} m` : ''} by ${n.by ?? 'director'}${n.done ? ', done' : ''}: ${n.text}`);
  if (problems.length) console.log(`problems:\n  ${problems.join('\n  ')}`);
  if (errors.length) console.log(`page errors:\n  ${errors.join('\n  ')}`);
} finally {
  await browser.close();
  await server.close();
}
