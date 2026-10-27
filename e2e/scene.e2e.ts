/* Browser tests for the village gate scene (/scene/). */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { OUT, openPage, startEnv, stopEnv, type Env, type Watched } from './harness';

const PATH = '/scene/';
const STORAGE = { 'slicehaven.sceneHero': 'default' }; // the default shepherd, whatever is in the roster

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

type Hooks = {
  state: { silver: number; time: string; ended?: string; flags: Record<string, boolean>; removed: string[] };
  battle: { units: { id: string; at: { q: number; r: number } }[] };
};
const get = <T>(page: Page, fn: (s: Hooks) => T): Promise<T> =>
  page.evaluate(`(${fn.toString()})(window.scene)`) as Promise<T>;

async function open(seed = 1): Promise<Watched> {
  const w = await openPage(env, PATH, { seed, storage: STORAGE });
  await w.page.waitForFunction(() => !!(window as unknown as { scene?: unknown }).scene, undefined, { timeout: 8000 });
  return w;
}

/** Wait until the scene is idle (no walking or animation running). */
const settle = (page: Page) => page.waitForFunction(() => !(window as any).scene.isBusy(), undefined, { timeout: 15_000 });
const call = async (page: Page, expr: string) => {
  await page.evaluate(`window.scene.${expr}`);
  await settle(page);
};
const sheetOpen = (page: Page) => page.evaluate(() => !document.getElementById('sheet')!.hidden);
const sheetTitle = (page: Page) => page.evaluate(() => document.querySelector('#sheet h2')?.textContent ?? '');
const optionLabels = (page: Page) => page.$$eval('#sheet .opt:not([disabled]) .opt-label', (e) => e.map((x) => x.textContent ?? ''));
const logText = (page: Page) => page.$$eval('#console li', (e) => e.map((x) => x.textContent ?? ''));

async function pick(page: Page, label: string): Promise<void> {
  await page.locator('#sheet .opt', { has: page.locator('.opt-label', { hasText: label }) }).first().click();
  await settle(page);
}
const closeSheet = async (page: Page) => {
  if (await sheetOpen(page)) await page.locator('#sheet .sheet-x').click();
};

describe('smoke', () => {
  it('loads with no errors, a painted canvas, intro text and the debug hooks', async () => {
    const { page, errors } = await open();
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
    expect((await logText(page)).join(' ')).toContain('gate is shut');
    expect(await page.textContent('#info')).toContain('100 silver');
    const painted = await page.evaluate(() => {
      const c = document.getElementById('view') as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++;
      return lit;
    });
    expect(painted).toBeGreaterThan(50);
    await page.screenshot({ path: `${OUT}scene-start.png` });
    await page.context().close();
  });
});

describe('bar and sheet', () => {
  it('Use a skill opens a grouped skill list, with folds that open', async () => {
    const { page, errors } = await open();
    await page.locator('#scene-bar button', { hasText: 'Use a skill' }).click();
    expect(await sheetOpen(page)).toBe(true);
    expect(await sheetTitle(page)).toBe('Use a skill here');
    const folds = await page.$$eval('#sheet .sheet-sec.fold', (e) => e.map((x) => x.textContent ?? ''));
    expect(folds.length).toBeGreaterThan(2);
    await page.locator('#sheet .sheet-sec.fold').first().click();
    await page.screenshot({ path: `${OUT}scene-skills.png` });
    await closeSheet(page);
    expect(await sheetOpen(page)).toBe(false);
    expect(errors).toEqual([]);
    await page.context().close();
  });

  it('the hints switch toggles and marks useful skills only when on', async () => {
    const { page } = await open();
    const hint = page.locator('#scene-bar button', { hasText: 'Mark useful skills' });
    expect(await hint.textContent()).toContain('Hints: on');
    await page.locator('#scene-bar button', { hasText: 'Use a skill' }).click();
    expect(await page.locator('#sheet .sheet-sec', { hasText: 'Useful here' }).count()).toBe(1);
    await closeSheet(page);
    await hint.click();
    expect(await hint.textContent()).toContain('Hints: off');
    await page.locator('#scene-bar button', { hasText: 'Use a skill' }).click();
    expect(await page.locator('#sheet .sheet-sec', { hasText: 'Useful here' }).count()).toBe(0);
    await page.context().close();
  });

  it('the game difficulty button cycles', async () => {
    const { page } = await open();
    const btn = page.locator('#scene-bar button', { hasText: 'Game difficulty' });
    const a = await btn.textContent();
    await btn.click();
    expect(await btn.textContent()).not.toBe(a);
    await page.context().close();
  });

  it('the log opens and shows the intro', async () => {
    const { page } = await open();
    await page.locator('#console .console-head').click();
    expect(await page.evaluate(() => document.getElementById('console')!.classList.contains('open'))).toBe(true);
    await page.screenshot({ path: `${OUT}scene-log.png` });
    await page.context().close();
  });

  it('tapping the hero shows the character sheet', async () => {
    const { page, errors } = await open();
    await call(page, 'tapHex(4, 11)');
    expect(await sheetOpen(page)).toBe(true);
    await page.screenshot({ path: `${OUT}scene-hero.png` });
    expect(errors).toEqual([]);
    await page.context().close();
  });
});

describe('walking and things', () => {
  it('tapping ground walks the hero there', async () => {
    const { page, errors } = await open();
    const before = await get(page, (s) => JSON.stringify(s.battle.units.find((u) => u.id === 'hero')!.at));
    await call(page, 'tapHex(4, 8)');
    const after = await get(page, (s) => JSON.stringify(s.battle.units.find((u) => u.id === 'hero')!.at));
    expect(after).not.toBe(before);
    expect(await page.evaluate(() => (window as any).scene.isBusy())).toBe(false);
    expect(errors).toEqual([]);
    await page.context().close();
  });

  it('tapping the palisade does not walk through it', async () => {
    const { page } = await open();
    await call(page, 'tapHex(8, 3)');
    await page.waitForTimeout(100);
    expect(await get(page, (s) => s.state.ended ?? '')).toBe('');
    await page.context().close();
  });

  it('interacting with each thing walks next to it and opens a menu', async () => {
    const { page, errors } = await open();
    for (const id of ['guard', 'rock', 'cart', 'campfire', 'travellers', 'gate', 'palisade']) {
      await call(page, `interact('${id}')`);
      expect(await sheetOpen(page), `${id} menu`).toBe(true);
      expect(await optionLabels(page), `${id} options`).toContain('Use a skill…');
      await closeSheet(page);
    }
    expect(errors).toEqual([]);
    await page.context().close();
  });

  it('the guard offers Talk and the social challenge', async () => {
    const { page } = await open();
    await call(page, "interact('guard')");
    expect(await optionLabels(page)).toContain('Talk');
    await pick(page, 'Talk');
    const labels = await optionLabels(page);
    expect(labels.some((l) => l.includes('social challenge'))).toBe(true);
    await page.screenshot({ path: `${OUT}scene-talk.png` });
    await page.context().close();
  });
});

describe('ways through the gate', () => {
  it('sleep by the fire: lose 70% of silver, the gate opens, you walk in', async () => {
    const { page, errors } = await open();
    await call(page, "interact('campfire')");
    await pick(page, 'Rest by the fire');
    // The click returns before the scene marks itself busy, so wait for the effect itself.
    await page.waitForFunction(() => (window as any).scene.state.flags.gateOpen);
    await settle(page);
    expect(await get(page, (s) => s.state.silver)).toBe(30);
    expect(await get(page, (s) => s.state.flags.gateOpen)).toBe(true);
    expect((await logText(page)).join(' ')).toContain('Dawn');
    await closeSheet(page); // while a sheet is open, a tap on the map only closes it
    await call(page, 'tapHex(4, 3)');
    expect(await get(page, (s) => s.state.ended ?? '')).not.toBe('');
    expect(await page.textContent('#info')).toContain('You made it in');
    await page.screenshot({ path: `${OUT}scene-through.png` });
    expect(errors).toEqual([]);
    await page.context().close();
  });

  it('after resting you cannot rest again', async () => {
    const { page } = await open();
    await call(page, "interact('campfire')");
    await pick(page, 'Rest by the fire');
    await call(page, "interact('campfire')");
    expect(await optionLabels(page)).not.toContain('Rest by the fire until dawn');
    await page.context().close();
  });

  it('the gate stays shut and blocks walking before it opens', async () => {
    const { page } = await open();
    await call(page, 'tapHex(4, 3)');
    expect(await get(page, (s) => s.state.ended ?? '')).toBe('');
    await page.context().close();
  });

  for (const [thing, skill] of [['rock', 'Climb'], ['cart', 'Search']]) {
    it(`using ${skill} on the ${thing} rolls and reports, across seeds`, async () => {
      for (const seed of [1, 2, 3, 4, 5]) {
        const { page, errors } = await open(seed);
        const before = (await logText(page)).length;
        await call(page, `interact('${thing}')`);
        await pick(page, 'Use a skill');
        await page.locator('#sheet .opt:visible', { has: page.locator('.opt-label', { hasText: skill }) }).first().click();
        await settle(page);
        expect((await logText(page)).length, `log grew, seed ${seed}`).toBeGreaterThan(before + 1);
        expect((await logText(page)).join(' '), `rolled, seed ${seed}`).toMatch(/\d/);
        expect(errors, `seed ${seed}`).toEqual([]);
        await page.context().close();
      }
    });
  }

  it('looking around with Search describes what is near', async () => {
    const { page, errors } = await open(7);
    await call(page, 'tapHex(4, 6)');
    await page.locator('#scene-bar button', { hasText: 'Use a skill' }).click();
    await page.locator('#sheet .opt', { has: page.locator('.opt-label', { hasText: 'Search' }) }).first().click();
    await settle(page);
    expect(await sheetTitle(page)).toMatch(/look around|Search/i);
    expect(errors).toEqual([]);
    await page.context().close();
  });

  it('the bribe route runs a three-roll conflict to an end, across seeds', async () => {
    for (const seed of [1, 2, 3]) {
      const { page, errors } = await open(seed);
      await call(page, "interact('guard')");
      await pick(page, 'Talk');
      await page.locator('#sheet .opt', { has: page.locator('.opt-label', { hasText: 'social challenge' }) }).first().click();
      await settle(page);
      expect(await sheetOpen(page), `approaches seed ${seed}`).toBe(true);
      await page.screenshot({ path: `${OUT}scene-approach-${seed}.png` });
      // Drive the conflict by always taking the first enabled option until the sheet closes.
      let steps = 0;
      while ((await sheetOpen(page)) && steps++ < 20) {
        const btn = page.locator('#sheet .opt:not([disabled]):visible').first();
        if (!(await btn.count())) break;
        await btn.click();
        await settle(page);
      }
      expect(steps, `conflict ended in time, seed ${seed}`).toBeLessThan(20);
      expect(errors, `seed ${seed}`).toEqual([]);
      await page.context().close();
    }
  });
});

describe('fuzz', () => {
  /** Tiny seeded generator so a failing run can be repeated. */
  const lcg = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;

  for (const seed of [11, 22, 33]) {
    it(`random taps, menus and skills (seed ${seed}) raise no errors and never stay busy`, async () => {
      const rnd = lcg(seed);
      const { page, errors } = await open(seed);
      const ids = ['guard', 'rock', 'cart', 'campfire', 'travellers', 'gate', 'palisade', 'drifter', 'cottage-w', 'cottage-e'];
      const trail: string[] = [];
      for (let i = 0; i < 60 && !(await get(page, (s) => s.state.ended)); i++) {
        const r = rnd();
        try {
          if (r < 0.3) {
            const c = Math.floor(rnd() * 10), row = Math.floor(rnd() * 12);
            trail.push(`tap ${c},${row}`);
            await call(page, `tapHex(${c}, ${row})`);
          } else if (r < 0.45) {
            const id = ids[Math.floor(rnd() * ids.length)];
            trail.push(`interact ${id}`);
            await call(page, `interact('${id}')`);
          } else if (r < 0.55) {
            trail.push('bar skill');
            await closeSheet(page);
            await page.locator('#scene-bar button', { hasText: 'Use a skill' }).click();
          } else {
            const btns = page.locator('#sheet .opt:not([disabled]):visible');
            const n = await btns.count();
            if (n) {
              const k = Math.floor(rnd() * n);
              trail.push(`opt ${k}/${n}`);
              await btns.nth(k).click({ timeout: 3000 });
              await settle(page);
            }
          }
        } catch (e) {
          throw new Error(`step ${i} (${trail.at(-1)}) failed: ${(e as Error).message}\ntrail: ${trail.join(' | ')}`);
        }
        await settle(page);
      }
      await page.screenshot({ path: `${OUT}scene-fuzz-${seed}.png` });
      expect(errors, `trail: ${trail.join(' | ')}`).toEqual([]);
      expect(await page.evaluate(() => (window as any).scene.isBusy())).toBe(false);
      await page.context().close();
    });
  }
});
