/* Browser test: the hero stays on their storey while the view is dragged away and their house streams out and back (review bug 1). */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

describe('spike3d storeys', () => {
  it('upstairs in the inn, the hero keeps their storey when the inn streams out of view and back', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=hamlet&nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    const done = () => page.waitForFunction(() => !(window as any).spike.world.walking, undefined, { timeout: 90_000 });
    const standing = 'w.houses.some((h) => h.built.place.id === "inn")';
    await w('(w.speedMul = 3, 0)');
    const inn = (await w('w.houses.findIndex((h) => h.built.place.id === "inn")')) as number;
    expect(await w(`w.walkIn(${inn})`)).not.toBeNull();
    await done();
    expect(await w('w.climb(1)')).not.toBeNull();
    await done();
    expect(await w('w.heroLevel')).toBe(1);
    const y = (await w('w.heroCard.mesh.position.y')) as number;
    // Drag the view to the far corner until the inn is taken down.
    await w('(w.follow = false, w.focus.x = 60, w.focus.z = 60, 0)');
    await page.waitForFunction(`!(() => { const w = window.spike.world; return ${standing}; })()`, undefined, { timeout: 60_000 });
    await page.waitForTimeout(500);
    expect(await w('w.heroLevel')).toBe(1);
    // And back: the inn stands again, and the hero is still upstairs, at the same height.
    await w('(w.focus.x = w.hero.x, w.focus.z = w.hero.z, 0)');
    await page.waitForFunction(`(() => { const w = window.spike.world; return ${standing}; })()`, undefined, { timeout: 60_000 });
    await page.waitForTimeout(500);
    expect(await w('w.heroLevel')).toBe(1);
    expect(await w('w.heroCard.mesh.position.y')).toBeCloseTo(y, 2);
    expect(await w('w.stairsHint')).toEqual({ up: true, down: true });
    expect(errors).toEqual([]);
  });
});
