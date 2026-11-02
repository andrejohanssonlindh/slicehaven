/* Browser test: the saved world (B1): a hearth put out, the hero's spot and the clock survive a reload; New game forgets them. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

describe('spike3d save', () => {
  it('keeps a hearth put out, the hero and the hour across a reload', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov&save');
    const ready = () => page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 60_000 });
    await ready();
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    // Walk into the first house; its hearth is the nearest.
    expect(await w('w.walkIn()')).not.toBeNull();
    await page.waitForFunction(() => !(window as any).spike.world.walking, undefined, { timeout: 40_000 });
    const fire = (await w('w.firesNear()[0]')) as { id: string; kind: string; lit: boolean };
    expect(fire.lit).toBe(true);
    await w(`(w.states.set(${JSON.stringify(fire.id)}, ${JSON.stringify(fire.kind)}, 'lit', false), w.weather.setHour(20), 0)`);
    // Out: no smoke from its chimney, its light no longer in the pool.
    expect(await w(`w.houses.find((h) => h.fireOf && h.fireOf.id === ${JSON.stringify(fire.id)}).chimney`)).toBeNull();
    const hero = (await w('({ x: w.hero.x, z: w.hero.z })')) as { x: number; z: number };
    await page.reload();
    await ready();
    await page.waitForTimeout(500);
    expect(await w(`w.states.get(${JSON.stringify(fire.id)}, ${JSON.stringify(fire.kind)}, 'lit')`)).toBe(false);
    expect(await w('Math.round(w.weather.hour)')).toBe(20);
    const back = (await w('({ x: w.hero.x, z: w.hero.z, indoors: w.heroIndoors })')) as { x: number; z: number; indoors: boolean };
    expect(Math.abs(back.x - hero.x) + Math.abs(back.z - hero.z)).toBeLessThan(0.01);
    expect(back.indoors).toBe(true);
    expect(await w(`w.houses.find((h) => h.fireOf && h.fireOf.id === ${JSON.stringify(fire.id)}).chimney`)).toBeNull();
    await page.screenshot({ path: `${OUT}spike3d-save-hearth-out.png` });
    // A new game forgets it all (and leaving the page then does not save it again).
    await Promise.all([
      page.waitForEvent('load'),
      page.evaluate(() => {
        const b = [...document.querySelectorAll<HTMLButtonElement>('#row-game button')].find((x) => x.textContent === 'New game')!;
        b.click();
      }),
    ]);
    await ready();
    expect(await w(`w.states.get(${JSON.stringify(fire.id)}, ${JSON.stringify(fire.kind)}, 'lit')`)).toBe(true);
    expect(errors).toEqual([]);
  });
});
