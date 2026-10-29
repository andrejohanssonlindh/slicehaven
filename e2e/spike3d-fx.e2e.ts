/* Browser test: lightning on demand and hand-lit campfires, with screenshots. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

describe('spike3d lightning and fires', () => {
  it('strikes a bolt, lights and douses campfires, and shows the build stamp', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 30_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    expect(((await page.textContent('#build')) ?? '').length).toBeGreaterThan(0);

    await w("(w.weather.setTime('night'), w.weather.set('storm'), w.autoBolts = false, 0)");
    await page.waitForTimeout(1500);
    await w('(w.strike(), 0)');
    // Freeze the world at the first instant of the bolt, so the picture catches it (a real bolt lasts half a second).
    await w('(w.update = () => {}, 0)');
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}spike3d-bolt.png` });

    await w('(delete w.update, w.weather.set("clear"), 0)');
    await page.waitForTimeout(2500);
    expect(await w('w.lightFire()')).toBe(true);
    expect(await w('w.campfires')).toBe(1);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}spike3d-fire.png` });
    await w('(w.douseFires(), 0)');
    expect(await w('w.campfires')).toBe(0);
    expect(errors).toEqual([]);
  });
});
