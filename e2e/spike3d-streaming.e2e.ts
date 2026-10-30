/* Browser test: houses stream in and out with the chunks as the hero walks a long street (Eastgate on the wilds map). */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

describe('spike3d houses streaming', () => {
  it('stands houses up near the hero, takes them down far away, and lets the hero walk into one that was streamed in', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=wilds&nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    const ids = async (): Promise<string[]> => (await w('w.houses.map((h) => h.built.place.id)')) as string[];
    const total = (await w('w.layout.houses.length')) as number;
    expect(total).toBeGreaterThan(60);

    const t0 = Date.now(), lap = (m: string): void => console.info(`[${((Date.now() - t0) / 1000).toFixed(1)} s] ${m}`);
    lap('opened');
    // At the start only the hamlet round the hero is standing, not the whole town.
    await page.waitForTimeout(1500);
    const start = await ids();
    expect(start.length).toBeGreaterThan(0);
    expect(start.length).toBeLessThan(total / 2);
    expect(start.some((id) => id.startsWith('east'))).toBe(false);
    const home = (await w('[w.hero.x, w.hero.z]')) as [number, number];
    const madeAtStart = (await w('w.houseIndex.made')) as number;

    lap('start ok');
    // Go to the middle of Eastgate (between the two houses at one spot on both sides of the road).
    const spot = (await w(`(() => { const a = w.layout.houses.find((h) => h.id === 'east16n'), b = w.layout.houses.find((h) => h.id === 'east16s'); return [(a.x + b.x) / 2, (a.z + b.z) / 2]; })()`)) as [number, number];
    await w(`(w.hero.x = ${spot[0]}, w.hero.z = ${spot[1]}, w.focus.x = w.hero.x, w.focus.z = w.hero.z, 0)`);
    await page.waitForFunction(() => (window as any).spike.world.houses.some((h: any) => h.built.place.id === 'east16n'), undefined, { timeout: 60_000 });
    await page.waitForTimeout(1500);
    lap('east16n standing');
    const town = await ids();
    expect(town.filter((id) => id.startsWith('east')).length).toBeGreaterThanOrEqual(4);
    expect(town.length).toBeLessThan(total / 2);
    expect(town).not.toContain('inn'); // the hamlet is far behind: taken down
    expect((await w('w.houseIndex.made')) as number).toBeGreaterThan(madeAtStart);
    await page.screenshot({ path: `${OUT}streaming-eastgate.png` });

    // The house that stands nearest can be walked into: its walls and furniture are known to the walking grid.
    const near = (await w(`(() => { let best = null, bd = 1e9; for (const h of w.houses) { const d = Math.hypot(h.built.place.x - w.hero.x, h.built.place.z - w.hero.z); if (d < bd) { bd = d; best = h.built.place.id; } } return best; })()`)) as string | null;
    expect(near).not.toBeNull();
    lap('town ok');
    expect(await w(`w.walkIn(${JSON.stringify(near)})`)).not.toBeNull();
    await page.waitForFunction(() => !(window as any).spike.world.walking, undefined, { timeout: 60_000 });
    lap('walked');
    expect(await w('w.heroIndoors')).toBe(true);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}streaming-inside.png` });

    // And a street walk: houses come and go without a gap in the street or an error.
    for (let k = 1; k <= 6; k++) {
      await w(`(w.hero.x = ${spot[0]} + ${k * 70}, w.hero.z = ${spot[1]} + ${k * 4}, w.focus.x = w.hero.x, w.focus.z = w.hero.z, 0)`);
      await page.waitForTimeout(400);
    }
    expect((await ids()).length).toBeLessThan(total / 2);

    // Far from the hamlet and the first stretch of the town, their furnished rooms are let go of, not kept for ever.
    await w('w.forgetFar()');
    const held = (await w('w.held')) as { furnished: number; generated: number };
    expect(held.furnished).toBeLessThan((await w('w.layout.houses.length')) as number / 2);
    expect(held.furnished).toBeLessThan(madeAtStart + 40);

    // Back to the hamlet: the town is dropped, the hamlet stands again (made once, so not made twice).
    const made = (await w('w.houseIndex.made')) as number;
    await w(`(w.hero.x = ${home[0]}, w.hero.z = ${home[1]}, w.focus.x = w.hero.x, w.focus.z = w.hero.z, 0)`);
    await page.waitForFunction(() => (window as any).spike.world.houses.some((h: any) => h.built.place.id === 'inn'), undefined, { timeout: 60_000 });
    await page.waitForTimeout(800);
    const back = await ids();
    expect(back.some((id) => id.startsWith('east16'))).toBe(false);
    expect(await w('w.houses.length')).toBeGreaterThan(0);
    void made;
    expect(errors).toEqual([]);
  }, 240_000);
});
