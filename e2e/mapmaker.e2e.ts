/*
 * Browser test: the map maker (plan C5) on a phone. Place a thing by tapping, pick it and drag it, pin a note with
 * text, undo, and open the draft in 3D. Pictures: e2e/out/mapmaker-*.png.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { type Env, OUT, openPage, startEnv, stopEnv } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

type MM = {
  mapmaker: {
    ready: boolean;
    spec: { props?: { kind: string; x: number; z: number }[]; notes?: { text: string; at: [number, number] }[] };
    plan: { toScreen(x: number, z: number): [number, number]; view: { scale: number } };
  };
};

/** The page point of a world spot. */
async function screenOf(page: Page, x: number, z: number): Promise<{ x: number; y: number }> {
  const [sx, sy] = await page.evaluate(([a, b]) => (window as unknown as MM).mapmaker.plan.toScreen(a, b), [x, z]);
  const box = (await page.locator('#plan').boundingBox())!;
  return { x: box.x + sx, y: box.y + sy };
}

const spec = (page: Page): Promise<MM['mapmaker']['spec']> => page.evaluate(() => (window as unknown as MM).mapmaker.spec);

describe('map maker', () => {
  it('places, moves and notes on a phone, and opens the draft in 3D', async () => {
    const { page, errors } = await openPage(env, '/mapmaker/?map=arena');
    await page.waitForFunction(() => (window as unknown as MM).mapmaker?.ready);
    const before = (await spec(page)).props!.length;
    await page.screenshot({ path: `${OUT}mapmaker-arena.png` });

    // + Thing → search → barrel → tap the sand.
    await page.getByRole('button', { name: '+ Thing' }).click();
    await page.fill('dialog input[type="search"]', 'barrel');
    await page.locator('dialog .kinds button', { hasText: /^barrel$/ }).first().click();
    const at = await screenOf(page, 2, 3);
    await page.touchscreen.tap(at.x, at.y);
    let s = await spec(page);
    expect(s.props!.length).toBe(before + 1);
    expect(s.props!.at(-1)).toMatchObject({ kind: 'barrel', x: 2, z: 3 });
    await page.getByRole('button', { name: 'Stop placing' }).click();

    // Tap it to pick it, then drag it 3 m east (a mouse drag stands in for a finger).
    await page.touchscreen.tap(at.x, at.y);
    await expect.poll(() => page.locator('#sel').textContent()).toContain('barrel');
    const to = await screenOf(page, 5, 3);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move((at.x + to.x) / 2, at.y, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
    s = await spec(page);
    expect(s.props!.at(-1)!.x).toBeCloseTo(5, 0);

    // + Note → tap → write → OK.
    await page.getByRole('button', { name: '+ Note' }).click();
    const n = await screenOf(page, -6, -3);
    await page.touchscreen.tap(n.x, n.y);
    await page.fill('dialog textarea', 'A well here, please');
    await page.getByRole('button', { name: 'OK', exact: true }).click();
    s = await spec(page);
    expect(s.notes).toHaveLength(1);
    expect(s.notes![0].text).toBe('A well here, please');
    await page.screenshot({ path: `${OUT}mapmaker-edited.png` });

    // Undo takes the note away; the draft is kept for the 3D world.
    await page.getByRole('button', { name: 'Undo' }).click();
    expect((await spec(page)).notes ?? []).toHaveLength(0);
    await page.getByRole('button', { name: 'Look in 3D' }).click();
    await page.waitForURL(/spike3d\/\?map=arena&draft/);
    await page.waitForFunction(() => !!(window as unknown as { spike?: { world?: unknown } }).spike?.world, null, { timeout: 60_000 });
    expect(errors).toEqual([]);
    await page.context().close();
  });
});
