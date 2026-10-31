/* Browser test: a see-through oval where a person stands behind a tree, and no furniture through closed roofs. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

describe('spike3d see-through', () => {
  it('cuts an oval in the tree for a revealing person, and leaves it whole for a hidden one', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 30_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    // The camera sits toward +x/+z of the target, so behind the first tree is toward -x/-z of it.
    await w('(w.hero.x = 8.9, w.hero.z = -9.6, w.placeHero(), w.focus.x = 9.5, w.focus.z = -8, 0)');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}spike3d-see-revealed.png` });
    // Only the hero cuts an oval; the map's people are hidden by what stands in front of them.
    expect(await w('w.people.map((p) => p.id + p.reveals)')).toEqual(['villagerfalse', 'herotrue']);
    await w('(w.people.find((p) => p.id === "hero").reveals = false, 0)');
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}spike3d-see-hidden.png` });
    // No furniture shows while every roof is closed.
    expect(await w('w.houses.every((h) => h.furniture.every((f) => !f.visible))')).toBe(true);
    expect(errors).toEqual([]);
  });
});
