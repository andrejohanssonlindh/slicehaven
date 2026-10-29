/* Browser tests for the 3D spike (/spike3d/): it loads, renders every sky and time, and the cut-away opens. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

const clickBtn = async (page: Page, label: string) => {
  // The panel starts folded (the admin menu has the same settings); open it to click.
  await page.evaluate(() => document.getElementById('panel')!.classList.remove('folded'));
  await page.locator('#panel button', { hasText: new RegExp(`^${label}`) }).first().click();
};

describe('spike3d', () => {
  it('builds, renders the looks with no errors, and opens the house', async () => {
    const { page, errors } = await openPage(env, '/spike3d/');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 30_000 });
    await page.waitForTimeout(1500);
    const built = await page.evaluate(() => (window as any).spike.built as number);
    console.info(`world built in ${built.toFixed(0)} ms (software WebGL)`);
    await page.screenshot({ path: `${OUT}spike3d-day.png` });
    // Close up with shells at 2 and off, for the on/off comparison.
    await page.locator('#zoom button[data-zoom="1"]').click();
    await clickBtn(page, 'Shells');
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}spike3d-shells2.png` });
    await clickBtn(page, 'Shells');
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}spike3d-shells0.png` });
    await clickBtn(page, 'Shells');
    await page.locator('#zoom button[data-zoom="-1"]').click();
    for (const [btn, shot] of [['Dusk', 'dusk'], ['Night', 'night']] as const) {
      await clickBtn(page, btn);
      await page.waitForTimeout(4000);
      await page.screenshot({ path: `${OUT}spike3d-${shot}.png` });
    }
    await clickBtn(page, 'Day');
    await clickBtn(page, 'Rain');
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${OUT}spike3d-rain.png` });
    await clickBtn(page, 'Clear');
    // The stream and its bridge, and pools in the hollows after rain.
    await page.evaluate(() => { const w = (window as any).spike.world; w.follow = false; w.focus.x = 6; w.focus.z = -16; });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}spike3d-stream.png` });
    await page.evaluate(() => { const w = (window as any).spike.world; w.pool = 1; w.focus.x = 2; w.focus.z = 2; });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}spike3d-pools.png` });
    // Mist on demand, looking at the washing line.
    await page.evaluate(() => { const w = (window as any).spike.world; w.follow = false; w.focus.x = 15.5; w.focus.z = 7; });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}spike3d-laundry.png` });
    await page.evaluate(() => (window as any).spike.world.setMist(0.6));
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${OUT}spike3d-mist.png` });
    await page.evaluate(() => { const w = (window as any).spike.world; w.setMist(0); w.follow = true; });
    await clickBtn(page, 'Inside');
    await page.locator('#zoom button[data-zoom="1"]').click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}spike3d-inside.png` });
    const stats = await page.textContent('#stats');
    console.info(stats);
    expect(errors).toEqual([]);
  });
});

describe('spike3d admin menu', () => {
  it('opens on å, sets the wind, and the panel stays folded', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 30_000 });
    await page.waitForTimeout(800);
    expect(await page.locator('#panel').isVisible()).toBe(false);
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'å' })));
    expect(await page.locator('#radial').isVisible()).toBe(true);
    await page.screenshot({ path: `${OUT}spike3d-admin.png` });
    await page.locator('#radial button', { hasText: /^Wind$/ }).click();
    await page.locator('#radial button', { hasText: /^Force 4$/ }).click();
    await page.screenshot({ path: `${OUT}spike3d-admin-wind.png` });
    expect(await page.evaluate(() => (window as any).spike.world.weather.windForce)).toBe(4);
    // A sky change leaves the pinned wind alone.
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'å' })));
    expect(await page.locator('#radial').isVisible()).toBe(false);
    await page.evaluate(() => (window as any).spike.world.weather.set('clear'));
    expect(await page.evaluate(() => (window as any).spike.world.weather.windForce)).toBe(4);
    expect(errors).toEqual([]);
  });
});

describe('spike3d streaming', () => {
  it('streams chunks in and out as the view moves over a bigger world', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?world=224&tier=low&nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 30_000 });
    const count = () => page.evaluate(() => (window as any).spike.world.chunkCount as number);
    const built = () => page.evaluate(() => (window as any).spike.world.chunksBuilt as number);
    await page.waitForTimeout(1500);
    const first = await count();
    // A phone-sized view of a 224 m world holds only a few of its 64 chunks.
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(16);
    const b0 = await built();
    // Walk the focus across the world (the pan clamps to the edge).
    for (let k = 0; k < 6; k++) {
      await page.evaluate((x) => { (window as any).spike.world.focus.x = x; }, -80 + k * 32);
      await page.waitForTimeout(900);
    }
    const b1 = await built();
    expect(b1).toBeGreaterThan(b0);
    expect(await count()).toBeLessThan(16);
    await page.screenshot({ path: `${OUT}spike3d-streamed.png` });
    expect(errors).toEqual([]);
  });
});

describe('spike3d walking', () => {
  it('taps the ground and the hero walks round the house to it', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 30_000 });
    await page.waitForTimeout(1000);
    const hero = () => page.evaluate(() => { const h = (window as any).spike.world.hero; return { x: h.x as number, z: h.z as number }; });
    const start = await hero();
    // Ask for a spot across the house, behind it: the path has to bend round the walls.
    const metres = await page.evaluate(() => (window as any).spike.world.walkTo(-1, -6) as number | null);
    expect(metres).not.toBeNull();
    expect(metres!).toBeGreaterThan(Math.hypot(-1 - start.x, -6 - start.z));
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => (window as any).spike.world.walking)).toBe(true);
    await page.screenshot({ path: `${OUT}spike3d-walking.png` });
    await page.waitForFunction(() => !(window as any).spike.world.walking, undefined, { timeout: 40_000 });
    const end = await hero();
    expect(Math.hypot(end.x + 1, end.z + 6)).toBeLessThan(0.6);
    // A real tap on the canvas lands on the ground and starts a walk.
    await page.mouse.click(200, 420);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).spike.world.walking)).toBe(true);
    expect(errors).toEqual([]);
  });
});

describe('spike3d filaments', () => {
  it('draws the heat map per aspect and reads it at the hero', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 30_000 });
    await page.waitForTimeout(800);
    // Water is the fourth stop: life, light, earth, water.
    for (let k = 0; k < 4; k++) await clickBtn(page, 'Filaments');
    expect(await page.evaluate(() => (window as any).spike.world.shownAspect)).toBe('hydro');
    // Look at the lake's shore.
    await page.evaluate(() => { const w = (window as any).spike.world; w.focus.x = -9; w.focus.z = -5; });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}spike3d-heat-water.png` });
    const txt = await page.textContent('#stats');
    expect(txt).toMatch(/Hydrotropy at hero/);
    // Fire by night: the torches warm their ground.
    await clickBtn(page, 'Night');
    for (let k = 0; k < 3; k++) await clickBtn(page, 'Filaments');
    expect(await page.evaluate(() => (window as any).spike.world.shownAspect)).toBe('pyro');
    await page.evaluate(() => { const w = (window as any).spike.world; w.focus.x = 3; w.focus.z = 3; });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}spike3d-heat-fire.png` });
    // The hero reads the same field the overlay draws.
    const r = await page.evaluate(() => { const w = (window as any).spike.world; return w.field.readAt(w.hero.x, w.hero.z).pyro.level as number; });
    expect(r).toBeGreaterThanOrEqual(-2);
    // Off again after the last aspect (there are sixteen now, pyro is the seventh): no overlay left.
    for (let k = 0; k < 10; k++) await clickBtn(page, 'Filaments');
    expect(await page.evaluate(() => (window as any).spike.world.shownAspect)).toBeNull();
    expect(errors).toEqual([]);
  });
});

describe('spike3d entering', () => {
  it('walks in through the door, the roof lifts, and lowers again outside', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 30_000 });
    await page.waitForTimeout(800);
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    expect(await w('w.heroIndoors')).toBe(false);
    expect(await w('w.walkIn()')).not.toBeNull();
    await page.waitForFunction(() => !(window as any).spike.world.walking, undefined, { timeout: 40_000 });
    expect(await w('w.heroIndoors')).toBe(true);
    expect(await w('w.inside')).toBe(true);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}spike3d-hero-inside.png` });
    await w('w.walkTo(3, 3)');
    await page.waitForFunction(() => !(window as any).spike.world.walking, undefined, { timeout: 40_000 });
    expect(await w('w.heroIndoors')).toBe(false);
    expect(await w('w.inside')).toBe(false);
    expect(errors).toEqual([]);
  });
});

describe('spike3d layout', () => {
  it('shows the other houses, roofs and props, and walks into the east house', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 30_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    for (const [name, x, z] of [['east', 18, -2], ['west', -20, 0], ['props', 0, -4]] as const) {
      await w(`(w.focus.x = ${x}, w.focus.z = ${z}, 0)`);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${OUT}spike3d-layout-${name}.png` });
    }
    expect(await w('w.houses.length')).toBe(4);
    expect(await w('w.walkIn(2)')).not.toBeNull();
    await page.waitForFunction(() => !(window as any).spike.world.walking, undefined, { timeout: 60_000 });
    expect(await w('w.heroHouse()')).toBe(2);
    expect(await w('w.houses.map((h) => h.open)')).toEqual([false, false, true, false]);
    expect(errors).toEqual([]);
  });
});
