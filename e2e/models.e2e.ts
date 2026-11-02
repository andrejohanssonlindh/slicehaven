/*
 * Browser test: every furniture model stands alone in the gallery without errors, and gets its picture taken from two
 * sides, next to its old card: e2e/out/model-<id>-a.png and -b.png. Run it after making or changing a model
 * (`npm run test:e2e -- models`) and look at the pictures (see director/design/models-authoring.md).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MODELS } from '../src/content/things/models';
import { type Env, OUT, openPage, startEnv, stopEnv } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

describe('furniture models', () => {
  for (const id of Object.keys(MODELS).sort()) {
    it(`${id} stands in the gallery`, async () => {
      const { page, errors } = await openPage(env, `/models/?only=${id}`);
      type G = { models?: { furnItems: unknown[]; state: { turning: boolean; angle: number; zoom: number } } };
      await page.waitForFunction(() => ((window as unknown as G).models?.furnItems.length ?? 0) > 0);
      // Close up, still, from the front-left and then the back-right.
      await page.evaluate(() => {
        const m = (window as unknown as G).models!;
        m.state.turning = false;
        m.state.angle = 0.5;
      });
      await page.click('#zoom button[data-zoom="1"]');
      await page.waitForTimeout(400);
      await page.locator('#stage').screenshot({ path: `${OUT}model-${id}-a.png` });
      await page.evaluate(() => { (window as unknown as G).models!.state.angle = 3.6; });
      await page.waitForTimeout(300);
      await page.locator('#stage').screenshot({ path: `${OUT}model-${id}-b.png` });
      expect(errors).toEqual([]);
      await page.context().close();
    });
  }
});
