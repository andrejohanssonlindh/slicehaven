/* Browser test: every house shows its own room when its roof is lifted. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

describe('spike3d rooms', () => {
  it('lifts each roof and shows its furniture', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 30_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    // Close in, to judge how each room is laid out.
    for (let i = 0; i < 3; i++) await page.click('#zoom button[data-zoom="1"]');
    const ids = (await w('w.houses.map((h) => h.built.place.id)')) as string[];
    for (const [i, id] of ids.entries()) {
      await w(`(w.inside = false, w.toggleRoof(${i}), w.focus.x = w.houses[${i}].built.place.x, w.focus.z = w.houses[${i}].built.place.z, 0)`);
      await page.waitForTimeout(1800);
      expect(await w(`w.houses[${i}].furniture.every((f, k) => f.visible === (w.houses[${i}].furnLevel[k] === w.houses[${i}].view))`)).toBe(true);
      await page.screenshot({ path: `${OUT}spike3d-room-${id}.png` });
    }
    expect(errors).toEqual([]);
  });
});
