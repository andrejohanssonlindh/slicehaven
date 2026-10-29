/* Browser test: sight is the hero's; what was seen stays on the map in grey; the rest is black. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

describe('spike3d vision and the explored map', () => {
  it('remembers where the hero has been', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=wilds&vision=on&nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    expect(await w('w.vision.outer')).toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    const x0 = (await w('w.hero.x')) as number, z0 = (await w('w.hero.z')) as number;
    expect(await w(`w.explored.has(${x0}, ${z0})`)).toBe(true);
    expect(await w(`w.explored.has(${x0} + 300, ${z0})`)).toBe(false);
    const seen0 = (await w('w.explored.count')) as number;
    await page.screenshot({ path: `${OUT}vision-start.png` });

    // Walk on (in jumps, so the test does not wait for the stroll), then look back at where the hero was.
    for (let k = 1; k <= 8; k++) {
      await w(`(w.hero.x = ${x0} + ${k * 25}, w.hero.z = ${z0}, w.focus.x = w.hero.x, w.focus.z = w.hero.z, 0)`);
      await page.waitForTimeout(250);
    }
    expect(await w('w.explored.count')).toBeGreaterThan(seen0 * 2);
    expect(await w(`w.explored.has(${x0} + 100, ${z0})`)).toBe(true);
    await page.screenshot({ path: `${OUT}vision-now.png` });
    await w(`(w.follow = false, w.focus.x = ${x0} + 60, w.focus.z = ${z0}, 0)`);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}vision-remembered.png` });
    expect(await w('w.chunkCount')).toBeLessThan(80);

    // Forgetting empties the map.
    await w('(w.forgetMap(), 0)');
    expect(await w('w.explored.count')).toBe(0);
    expect(errors).toEqual([]);
  });
});
