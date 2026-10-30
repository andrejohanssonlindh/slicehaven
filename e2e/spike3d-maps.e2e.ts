/* Browser test: every map loads with no errors, and the hamlet (written as intent, not coordinates) shows up. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

describe('spike3d maps', () => {
  it('loads the hamlet, walks the hero into the inn, and shows the street', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=hamlet&nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    console.info(`hamlet built in ${((await page.evaluate('window.spike.built')) as number).toFixed(0)} ms (software WebGL)`);
    expect(await w('w.layout.houses.length')).toBe(12); // (the ones near the view are standing; the rest stream in with their chunk)
    expect(await w('w.houses.length')).toBeGreaterThanOrEqual(5);
    expect(await w('w.layout.trees.length')).toBeGreaterThan(60);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}hamlet-start.png` });
    await w('(w.focus.x = 0, w.focus.z = -2, 0)');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}hamlet-street.png` });
    // Houses are named by their map id, which streaming never changes (an index into what stands did).
    expect(await w('w.walkIn("no-such-house")')).toBeNull();
    expect(await w('w.walkIn("inn")')).not.toBeNull();
    await page.waitForFunction(() => !(window as any).spike.world.walking, undefined, { timeout: 90_000 });
    expect(await w('w.heroHouse()')).toBe('inn');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}hamlet-inn.png` });
    expect(errors).toEqual([]);
  });
});
