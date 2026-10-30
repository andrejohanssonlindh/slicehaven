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

describe('spike3d magic lights, speed, and tapping round the back', () => {
  it('shows the orb and the ray, walks faster, and lets a tap behind a house walk behind it', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 30_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    await w("(w.weather.setTime('night'), w.weather.set('clear'), 0)");
    for (let i = 0; i < 2; i++) await page.click('#zoom button[data-zoom="1"]');
    // Walk a few metres so the hero faces somewhere, then light both.
    await w('w.walkTo(w.hero.x + 5, w.hero.z + 3)');
    await page.waitForFunction(() => !(window as any).spike.world.walking, undefined, { timeout: 30_000 });
    // Raising a light must not freeze the game: no frame gap anywhere near the second a shader rebuild takes.
    const worstGap = async (fn: string): Promise<number> => page.evaluate(`new Promise((done) => {
      const w = window.spike.world; let last = performance.now(), worst = 0, n = 0;
      ${fn};
      const f = (t) => { worst = Math.max(worst, t - last); last = t; if (++n < 40) requestAnimationFrame(f); else done(worst); };
      requestAnimationFrame(f);
    })`) as Promise<number>;
    await page.waitForTimeout(500);
    const calm = await worstGap('0');
    const orbGap = await worstGap('w.toggleOrb()');
    const rayGap = await worstGap('w.toggleRay()');
    console.info(`frame gaps: calm ${calm.toFixed(0)} ms, raising the orb ${orbGap.toFixed(0)} ms, the ray ${rayGap.toFixed(0)} ms`);
    expect(orbGap).toBeLessThan(Math.max(300, calm * 4));
    expect(rayGap).toBeLessThan(Math.max(300, calm * 4));
    await w('(w.toggleOrb(), w.toggleRay(), 0)');
    await w('(w.toggleOrb(), w.toggleRay(), 0)');
    await page.waitForTimeout(1200);
    expect(await w('w.orbOn && w.rayOn')).toBe(true);
    await page.screenshot({ path: `${OUT}spike3d-magic-light.png` });
    await w('(w.toggleOrb(), w.toggleRay(), 0)');
    expect(await w('w.orbOn || w.rayOn')).toBe(false);

    // Speed: three times a stroll covers the ground three times as fast.
    const dist = async (mul: number): Promise<number> => {
      await w(`(w.speedMul = ${mul}, w.hero.x = 6, w.hero.z = 8, w.walkTo(14, 8), 0)`);
      await page.waitForTimeout(1500);
      return (await w('w.hero.x')) as number;
    };
    const slow = (await dist(1)) - 6, fast = (await dist(3)) - 6;
    expect(fast).toBeGreaterThan(slow * 2);

    // A tap on the ground behind the first house (where its roof is on screen) is a walk, not an entry.
    await w('(w.speedMul = 3, w.hero.x = 8, w.hero.z = 8, 0)');
    const behind = (await w('(() => { const h = w.houses[0].built.place; return [h.x, h.z - 4.2]; })()')) as number[];
    expect(await w(`w.walkTo(${behind[0]}, ${behind[1]}) !== null`)).toBe(true);
    await page.waitForFunction(() => !(window as any).spike.world.walking, undefined, { timeout: 30_000 });
    expect(Math.hypot(((await w('w.hero.x')) as number) - behind[0], ((await w('w.hero.z')) as number) - behind[1])).toBeLessThan(1);
    expect(await w('w.heroIndoors')).toBe(false);
    // Behind the house the hero shows through it, in a see-through oval.
    await w('(w.weather.setTime("day"), 0)');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}spike3d-behind-house.png` });
    expect(errors).toEqual([]);
  });
});

describe('spike3d village props', () => {
  it('shows the well, fence, crates and cart', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 30_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    for (let i = 0; i < 2; i++) await page.click('#zoom button[data-zoom="1"]');
    for (const [name, x, z] of [['well', -8.5, 10], ['fence', 0, -7.5], ['crates', -18.4, 0.6], ['cart', 10, -1.6]] as const) {
      await w(`(w.follow = false, w.focus.x = ${x}, w.focus.z = ${z}, 0)`);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${OUT}spike3d-prop-${name}.png` });
    }
    expect(errors).toEqual([]);
  });
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
    for (let i = 0; i < 3; i++) await page.click('#zoom button[data-zoom="1"]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}spike3d-fire.png` });
    await w('(w.douseFires(), 0)');
    expect(await w('w.campfires')).toBe(0);

    // Nothing is kept on the GPU after it is put away: campfires, the hand torch, the orb and the ray, again and again.
    const geos = () => page.evaluate('window.spike.pipeline.renderer.info.memory.geometries') as Promise<number>;
    await page.waitForTimeout(500);
    const before = await geos();
    for (let i = 0; i < 4; i++) {
      await w('(w.lightFire(), w.lightFire(), w.toggleTorch(), w.toggleOrb(), w.toggleRay(), 0)');
      await page.waitForTimeout(300);
      await w('(w.douseFires(), w.toggleTorch(), w.toggleOrb(), w.toggleRay(), 0)');
      await page.waitForTimeout(300);
    }
    expect(await geos()).toBeLessThanOrEqual(before);

    // A strike on open ground by day leaves a burnt, fern-scarred patch that stays (and is ash to the filament field).
    await w("(w.weather.setHour(12), w.autoBolts = false, w.strike({ x: w.hero.x + 3, z: w.hero.z + 4 }), 0)");
    await page.waitForTimeout(1500);
    expect(await w('w.scorches.length')).toBe(2); // (the night's bolt left one too)
    expect(await w('w.field.readAt(w.hero.x + 3, w.hero.z + 4).nekro.parts.some((p) => p.label.startsWith("Ash"))')).toBe(true);
    await page.screenshot({ path: `${OUT}spike3d-scorch.png` });
    expect(errors).toEqual([]);
  });

  it('lightning is seeded: it falls in the same places on every visit (its scorch feeds the filament field) (review item 13)', async () => {
    const strikes: unknown[] = [];
    for (let visit = 0; visit < 2; visit++) {
      const { page, errors } = await openPage(env, '/spike3d/?nogov');
      await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 30_000 });
      const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
      strikes.push(await w('(w.autoBolts = false, w.focus.x = 0, w.focus.z = 0, [w.strike(), w.strike()])'));
      expect(errors).toEqual([]);
      await page.close();
    }
    expect(strikes[1]).toEqual(strikes[0]);
  });
});
