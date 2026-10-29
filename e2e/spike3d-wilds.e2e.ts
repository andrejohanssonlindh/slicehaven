/* Browser test: the eight-kilometre map loads at once, streams woods in and out as the hero walks far, and stays light. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

describe('spike3d wilds', () => {
  it('walks a kilometre of road through generated woods', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=wilds&nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    console.info(`wilds built in ${((await page.evaluate('window.spike.built')) as number).toFixed(0)} ms (software WebGL)`);
    expect(await w('w.ground.size')).toBe(8192);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}wilds-start.png` });
    const made0 = (await w('w.placed.generatedChunks')) as number;
    expect(made0).toBeGreaterThan(0);
    expect(made0).toBeLessThan(200);

    // Walk east along the road, a kilometre, and keep the camera on the hero.
    await w('(w.speedMul = 3, 0)');
    const x0 = (await w('w.hero.x')) as number, z0 = (await w('w.hero.z')) as number;
    const dest = (await w(`(() => { const p = w.walkTo(${x0} + 1000, ${z0}); return p; })()`)) as number | null;
    expect(dest).not.toBeNull();
    await page.waitForTimeout(8000);
    const x1 = (await w('w.hero.x')) as number;
    expect(x1).toBeGreaterThan(x0 + 20);
    await page.screenshot({ path: `${OUT}wilds-walk.png` });
    // Far from where it started: chunks have streamed, and the ones left behind are gone.
    const resident = (await w('w.chunkCount')) as number;
    expect(resident).toBeLessThan(80);
    expect(await w('w.placed.generatedChunks')).toBeGreaterThan(made0);

    // Look at the woods half a kilometre off the road: find the thickest chunk nearby and fly there.
    const spot = (await w(`(() => { let best = null, n = 0; for (let j = -40; j < 0; j++) for (let i = 0; i < 40; i++) { const c = w.placed.chunk(i + 20, j - 10).trees.length; if (c > n) { n = c; best = [(i + 20.5) * 32, (j - 9.5) * 32]; } } return best; })()`)) as number[];
    await w(`(w.follow = false, w.focus.x = ${spot[0]}, w.focus.z = ${spot[1]}, 0)`);
    await page.waitForTimeout(4000);
    expect(await w('w.chunkCount')).toBeLessThan(80);
    await page.screenshot({ path: `${OUT}wilds-woods.png` });
    expect(errors).toEqual([]);
  });
});
