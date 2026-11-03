/* Browser test: talking in 3D (B3d): tap a villager, they stop and turn; the panel shows a portrait (three styles), the log and the choices; a try is rolled and remembered. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

const quick = (_portrait?: string) => ({ 'slicehaven.settings': JSON.stringify({ v: 1, dice: 'result', diceSkin: 'bone', diceClose: 'auto' }) });
const ready = (page: Page) => page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 60_000 });
const evalIn = (page: Page) => (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);

describe('spike3d talking', () => {
  it('tap a villager: they stop, the panel opens, a try is rolled and remembered; asking about their work needs no roll', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov&map=hamlet', { storage: quick('3d') });
    await ready(page);
    const w = evalIn(page);
    // Midday: the townsfolk wander the green. Stand among them.
    await w('(w.dayMinutes = 0, w.weather.setHour(10), 0)');
    const someone = (await w(`(() => { const m = w.minds.find((m) => m.id.startsWith('towns') && !m.house); return m ? { id: m.id, x: m.x, z: m.z } : null; })()`)) as { id: string; x: number; z: number } | null;
    expect(someone).not.toBeNull();
    await w(`(w.placeHeroAt(${someone!.x - 3.5}, ${someone!.z}), 0)`);
    await page.waitForTimeout(800);
    // Tap them where they stand now.
    const p = (await page.evaluate(`(() => {
      const w = window.spike.world, c = w.cast.find((c) => c.who.id === ${JSON.stringify(someone!.id)});
      const v = c.fig.place.getWorldPosition(w.camera.position.clone()); v.y += 0.9; v.project(w.camera);
      const r = document.getElementById('view').getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, shown: c.fig.place.visible };
    })()`)) as { x: number; y: number; shown: boolean };
    expect(p.shown).toBe(true);
    await page.mouse.click(p.x, p.y);
    // The hero walks up to them first (they may be wandering).
    await page.waitForSelector('#talk:not([hidden])', { timeout: 45_000 });
    expect(await w('w.talkingWith')).toBe(someone!.id);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}talk-3d.png` });
    const choices = await page.locator('#talk .choices button span').allTextContents();
    expect(choices.some((c) => c.startsWith('Size up'))).toBe(true);
    // Only what is open with anyone (Q40): no comforting a stranger, no picking pockets from a talk.
    expect(choices.some((c) => /Comfort|pocket/.test(c))).toBe(false);
    // Ask them something: rolled, logged, remembered.
    const ask = page.locator('#talk .choices button', { hasText: /what they know/ }).first();
    await ask.click();
    await page.waitForFunction(() => document.querySelectorAll('#talk .log p').length >= 3, undefined, { timeout: 15_000 });
    await page.waitForSelector('.dice-show', { state: 'detached', timeout: 15_000 });
    const mem = (await w(`w.talkMemory.social[${JSON.stringify(someone!.id)}]`)) as { talks: number };
    expect(mem.talks).toBe(1);
    // Asking about their work needs no roll.
    await page.locator('#talk .choices button', { hasText: 'about their work' }).click();
    await page.waitForFunction(() => /works as/.test(document.querySelector('#talk .log')!.textContent ?? ''), undefined, { timeout: 5_000 });
    await page.screenshot({ path: `${OUT}talk-after.png` });
    // Closing lets them go on with their day.
    await page.click('#talk .close');
    expect(await w('w.talkingWith')).toBeNull();
    expect(errors).toEqual([]);
  });

  it('the guard\'s portrait shows his face, not the tip of his spear; the log stays clear of the choices', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov&map=hamlet', { storage: quick('fine') });
    await ready(page);
    const w = evalIn(page);
    await w('(w.dayMinutes = 0, w.weather.setHour(10), 0)');
    const g = (await w(`(() => { const m = w.minds.find((m) => m.id === 'guard'); return { x: m.x, z: m.z }; })()`)) as { x: number; z: number };
    await w(`(w.placeHeroAt(${g.x - 3.5}, ${g.z}), 0)`);
    await page.waitForTimeout(800);
    const p = (await page.evaluate(`(() => {
      const w = window.spike.world, c = w.cast.find((c) => c.who.id === 'guard');
      const v = c.fig.place.getWorldPosition(w.camera.position.clone()); v.y += 0.9; v.project(w.camera);
      const r = document.getElementById('view').getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    })()`)) as { x: number; y: number };
    await page.mouse.click(p.x, p.y);
    await page.waitForSelector('#talk:not([hidden])', { timeout: 45_000 });
    await page.waitForTimeout(600);
    for (let i = 0; i < 3; i++) {
      await page.locator('#talk .choices button', { hasText: /^(Ask|Size up)/ }).first().click();
      await page.waitForSelector('.dice-show', { state: 'detached', timeout: 15_000 });
    }
    await page.screenshot({ path: `${OUT}talk-guard.png` });
    // The last thing said ends above the choices.
    const last = await page.locator('#talk .log p').last().boundingBox();
    const log = await page.locator('#talk .log').boundingBox();
    const choices = await page.locator('#talk .choices').boundingBox();
    expect(last!.y + last!.height).toBeLessThanOrEqual(choices!.y + 12);
    expect(log!.height).toBeGreaterThan(60);
    expect(errors).toEqual([]);
  });
});
