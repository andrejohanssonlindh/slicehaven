/* Every page opens without errors, and the hub links to the pages that exist. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Env, openPage, startEnv, stopEnv } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

describe('pages', () => {
  it('the hub links only to pages that open', async () => {
    const { page, errors } = await openPage(env, '/');
    const links = await page.locator('.hub a').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')));
    expect(links).toEqual(['spike3d/', 'chargen/', 'npcs/', 'skills/', 'director/']);
    expect(errors).toEqual([]);
    await page.context().close();
  });

  for (const path of ['/chargen/', '/npcs/', '/skills/', '/director/']) {
    it(`${path} opens without errors`, async () => {
      const { page, errors } = await openPage(env, path);
      await page.waitForTimeout(800);
      expect(errors).toEqual([]);
      await page.context().close();
    });
  }

  it('the archive page shows its pictures', async () => {
    const { page, errors } = await openPage(env, '/director/#archive/2d-art');
    await page.waitForSelector('#doc img');
    await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>('#doc img')].every((i) => i.complete));
    const broken = await page.locator('#doc img').evaluateAll((imgs) => imgs.filter((i) => (i as HTMLImageElement).naturalWidth === 0).length);
    expect(broken).toBe(0);
    expect(errors).toEqual([]);
    await page.context().close();
  });
});
