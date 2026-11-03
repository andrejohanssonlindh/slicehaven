/* Browser test: the Kinds of person page (B4): a tirak's gifts are shown fixed; a map's cast lists everyone, each with their own sheet. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

describe('npcs page', () => {
  it('shows a tirak guard\'s gifts as fixed, and the basic skills', async () => {
    const { page, errors } = await openPage(env, '/npcs/?people=tirak&kind=guard-sword&level=novice&seed=1');
    await page.waitForSelector('.sheet');
    const text = await page.locator('main').textContent();
    expect(text).toMatch(/Gifts of their people/);
    expect(text).toMatch(/Darkvision/);
    expect(text).toMatch(/Basic skills, untrained/);
    await page.screenshot({ path: `${OUT}npcs-tirak-gifts.png`, fullPage: true });
    expect(errors).toEqual([]);
  });

  it('lists who lives in the hamlet, each with their own sheet, the same on a reload', async () => {
    const { page, errors } = await openPage(env, '/npcs/?map=hamlet&who=keeper');
    await page.waitForSelector('.cast button');
    expect(await page.locator('.cast button').count()).toBeGreaterThan(10);
    expect(await page.locator('.who .name').textContent()).toMatch(/^keeper/);
    const first = await page.locator('.sheet').textContent();
    await page.locator('.cast button', { hasText: 'towns3' }).click();
    expect(await page.locator('.who .name').textContent()).toMatch(/^towns3/);
    await page.screenshot({ path: `${OUT}npcs-cast.png`, fullPage: true });
    await page.reload();
    await page.waitForSelector('.cast button');
    await page.locator('.cast button', { hasText: 'keeper' }).click();
    expect(await page.locator('.sheet').textContent()).toBe(first);
    expect(errors).toEqual([]);
  });
});
