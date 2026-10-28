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

const clickBtn = (page: Page, label: string) => page.locator('#panel button', { hasText: new RegExp(`^${label}`) }).first().click();

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
    await clickBtn(page, 'Inside');
    await page.locator('#zoom button[data-zoom="1"]').click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}spike3d-inside.png` });
    const stats = await page.textContent('#stats');
    console.info(stats);
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
