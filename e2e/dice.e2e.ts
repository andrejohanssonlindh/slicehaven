/* Browser test: the one roll system's show (B2) at each level, on glass, icons and result only, with pictures mid-throw and landed; closing by OK or by itself; many dice on a wide phone. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

const settings = (dice: string, diceSkin = 'bone', diceClose = 'auto'): Record<string, string> => ({
  'slicehaven.settings': JSON.stringify({ v: 1, dice, diceSkin, diceClose }),
});

describe('dice', () => {
  it('in the character creator: a table roll is thrown, lands, and the result is applied', async () => {
    const { page, errors } = await openPage(env, '/chargen/', { storage: settings('glass') });
    // To the Homeland step, which rolls 2 × D100.
    await page.locator('[data-act="goto"][data-val="1"]').first().click({ timeout: 20_000 });
    const btn = page.locator('[data-act="rollHomeland"]');
    await btn.waitFor({ timeout: 20_000 });
    await btn.click();
    await page.waitForSelector('.dice-lines', { timeout: 15_000 });
    await page.screenshot({ path: `${OUT}dice-chargen.png` });
    expect(await page.locator('.dice-lines').textContent()).toMatch(/D100: \d+/);
    expect(await page.locator('.dice-lines div').count()).toBe(2);
    await page.waitForSelector('.dice-show', { state: 'detached', timeout: 8_000 });
    expect(errors).toEqual([]);
  });

  for (const level of ['glass', 'icons', 'result'] as const) {
    it(`shows a roll ${level === 'result' ? 'as its result' : level === 'glass' ? 'as dice on glass' : 'as spinning icons'}, then goes`, async () => {
      for (const skin of level === 'glass' ? ['bone', 'ember'] : ['bone']) {
        const { page, errors } = await openPage(env, '/spike3d/?nogov', { storage: settings(level, skin) });
        await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 60_000 });
        const roll = (label: string) => page.evaluate((l) => {
          [...document.querySelectorAll<HTMLButtonElement>('#row-game button')].find((b) => b.textContent === l)!.click();
        }, label);
        await roll('Roll 4D6 vs 14');
        await page.waitForTimeout(450);
        expect(await page.locator('.dice-show').count()).toBe(1);
        await page.screenshot({ path: `${OUT}dice-${level}-${skin}-throw.png` });
        await page.waitForSelector('.dice-lines', { timeout: 15_000 });
        // (Read before the picture: the result-only show is up for two seconds.)
        expect(await page.locator('.dice-lines').textContent()).toMatch(/Test 4D6 vs 14: \d+, (success|failure)/);
        await page.screenshot({ path: `${OUT}dice-${level}-${skin}-landed.png` });
        // A tap closes it.
        await page.mouse.click(200, 300).catch(() => undefined);
        await page.waitForSelector('.dice-show', { state: 'detached', timeout: 5_000 });
        // A table roll, and a sum of another die.
        await roll('Roll D100');
        await page.waitForSelector('.dice-lines', { timeout: 15_000 });
        expect(await page.locator('.dice-lines').textContent()).toMatch(/Table D100: \d+/);
        await page.screenshot({ path: `${OUT}dice-${level}-${skin}-d100.png` });
        await page.waitForSelector('.dice-show', { state: 'detached', timeout: 8_000 });
        await roll('Roll D10+2');
        await page.waitForSelector('.dice-lines', { timeout: 15_000 });
        expect(await page.locator('.dice-lines').textContent()).toMatch(/Sum D10\+2: \d+/);
        await page.waitForSelector('.dice-show', { state: 'detached', timeout: 8_000 });
        expect(errors).toEqual([]);
        await page.context().close();
      }
    });
  }

  it('with "press OK" the result stays until OK is pressed; many dice on a wide phone lie side by side', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov', { storage: settings('glass', 'bone', 'ok') });
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 60_000 });
    await page.setViewportSize({ width: 800, height: 380 });
    await page.evaluate(() => {
      [...document.querySelectorAll<HTMLButtonElement>('#row-game button')].find((b) => b.textContent === 'Roll 10D6+2')!.click();
    });
    await page.waitForSelector('.dice-ok', { timeout: 20_000 });
    await page.screenshot({ path: `${OUT}dice-glass-wide-many.png` });
    // A tap elsewhere doesn't close it, nor does waiting.
    await page.mouse.click(300, 150);
    await page.waitForTimeout(2500);
    expect(await page.locator('.dice-show').count()).toBe(1);
    await page.locator('.dice-ok').click();
    await page.waitForSelector('.dice-show', { state: 'detached', timeout: 3_000 });
    expect(errors).toEqual([]);
  });
});
