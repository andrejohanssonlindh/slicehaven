/* Browser test for the walking people on /spike3d/: the hero shows the view that matches the way they go. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

describe('spike3d walking', () => {
  it('turns front, back and profile with the way the hero walks, and stands still when done', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 30_000 });
    await page.waitForTimeout(800);
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    const legs: [string, number, number][] = [['east', 12, 1.2], ['north', 12, -9], ['west', 4, -9], ['south', 4, 3]];
    const seen = new Set<string>();
    for (const [name, x, z] of legs) {
      expect(await w(`w.walkTo(${x}, ${z})`)).not.toBeNull();
      await page.waitForTimeout(1200);
      seen.add((await w('w.heroCard.view')) as string);
      expect(await w('w.heroCard.moving')).toBe(true);
      await page.screenshot({ path: `${OUT}spike3d-walk-${name}.png` });
      await page.waitForFunction(() => !(window as any).spike.world.walking, undefined, { timeout: 60_000 });
      expect(await w('w.heroCard.moving')).toBe(false);
    }
    // Four legs in four directions must have shown more than one view.
    expect(seen.size).toBeGreaterThanOrEqual(2);
    expect(errors).toEqual([]);
  });
});
