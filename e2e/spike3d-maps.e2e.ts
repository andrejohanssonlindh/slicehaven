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
    expect(await w('w.houses.length')).toBe(11);
    expect(await w('w.layout.trees.length')).toBeGreaterThan(60);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}hamlet-start.png` });
    await w('(w.focus.x = 0, w.focus.z = -2, 0)');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}hamlet-street.png` });
    const inn = (await w('w.houses.findIndex((h) => h.built.place.id === "inn")')) as number;
    expect(await w(`w.walkIn(${inn})`)).not.toBeNull();
    await page.waitForFunction(() => !(window as any).spike.world.walking, undefined, { timeout: 90_000 });
    expect(await w('w.heroHouse()')).toBe(inn);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}hamlet-inn.png` });
    expect(errors).toEqual([]);
  });
});
