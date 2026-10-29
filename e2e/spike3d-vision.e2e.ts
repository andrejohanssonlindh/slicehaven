/* Browser test: sight is the hero's; what was seen stays on the map in grey; the rest is black. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

describe('spike3d vision and the explored map', () => {
  it('remembers where the hero has been', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=wilds&vision=on&nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    expect(await w('w.vision.outer')).toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    const x0 = (await w('w.hero.x')) as number, z0 = (await w('w.hero.z')) as number;
    expect(await w(`w.explored.has(${x0}, ${z0})`)).toBe(true);
    expect(await w(`w.explored.has(${x0} + 300, ${z0})`)).toBe(false);
    const seen0 = (await w('w.explored.count')) as number;
    await page.screenshot({ path: `${OUT}vision-start.png` });

    // Walk on (in jumps, so the test does not wait for the stroll), then look back at where the hero was.
    for (let k = 1; k <= 8; k++) {
      await w(`(w.hero.x = ${x0} + ${k * 25}, w.hero.z = ${z0}, w.focus.x = w.hero.x, w.focus.z = w.hero.z, 0)`);
      await page.waitForTimeout(250);
    }
    expect(await w('w.explored.count')).toBeGreaterThan(seen0 * 2);
    expect(await w(`w.explored.has(${x0} + 100, ${z0})`)).toBe(true);
    await page.screenshot({ path: `${OUT}vision-now.png` });
    await w(`(w.follow = false, w.focus.x = ${x0} + 60, w.focus.z = ${z0}, 0)`);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}vision-remembered.png` });
    expect(await w('w.chunkCount')).toBeLessThan(80);

    // Forgetting empties the map.
    await w('(w.forgetMap(), 0)');
    // (A frame may run before the next look, and the hero sees what is round them again: only the faraway past is gone.)
    expect(await w(`w.explored.has(${x0}, ${z0})`)).toBe(false);
    expect(await w('w.explored.count')).toBeLessThan(seen0 * 2);
    expect(errors).toEqual([]);
  });

  it('a torch is seen from far beyond plain sight at night, with the ground it lights, but not from behind', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?world=224&vision=on&nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    await w('(w.weather.setHour(0), w.weather.set("clear"), w.dayMinutes = 0, 0)');
    // Stand 50 m out in front of the door torch, facing it (the house is behind the torch, not in the way).
    const torch = (await w('({ x: w.fires.find((f) => f.kind === "fire").x, z: w.fires.find((f) => f.kind === "fire").z })')) as { x: number; z: number };
    const rot = (await w('w.houses[0].built.place.rot')) as number;
    const fx = Math.sin(rot), fz = Math.cos(rot); // the way the door faces
    const face = Math.atan2(-fz, -fx);
    await w(`(w.hero.x = ${torch.x + fx * 50}, w.hero.z = ${torch.z + fz * 50}, w.heroDir = { x: ${-fx}, z: ${-fz} }, w.facing = ${face}, w.focus.x = w.hero.x, w.focus.z = w.hero.z, 0)`);
    await page.waitForTimeout(2500);
    const range = (await w('w.spec.range')) as number;
    expect(range).toBeLessThan(45);
    expect(await w('w.sightLights.length')).toBeGreaterThan(0);
    expect(await w(`w.seen(${torch.x}, ${torch.z})`)).toBeGreaterThan(0.2);
    expect(await w(`w.seen(${torch.x} + 15, ${torch.z})`)).toBe(0);
    // Look across at the torch from where the hero stands (the camera is let go to the torch).
    await w(`(w.follow = false, w.focus.x = ${torch.x}, w.focus.z = ${torch.z}, 0)`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}vision-torch-far.png` });
    await w('(w.follow = true, 0)');
    // Turned away, it is out of sight.
    await w(`(w.heroDir = { x: ${fx}, z: ${fz} }, w.facing = ${face + Math.PI}, 0)`);
    await page.waitForTimeout(800);
    expect(await w(`w.seen(${torch.x}, ${torch.z})`)).toBe(0);
    expect(errors).toEqual([]);
  });

  it('a torch in the hand widens the lit circle round the hero at night and burns in the field', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=wilds&vision=on&nogov');
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    await w("(w.weather.setTime('night'), w.weather.set('clear'), 0)");
    await page.waitForTimeout(1500);
    const near0 = (await w('w.spec.near')) as number, range0 = (await w('w.spec.range')) as number;
    await w('(w.toggleTorch(), 0)');
    await page.waitForTimeout(1500);
    expect(await w('w.torchOn')).toBe(true);
    expect((await w('w.spec.near')) as number).toBeGreaterThan(near0 + 3);
    expect((await w('w.spec.range')) as number).toBeGreaterThan(range0);
    await page.screenshot({ path: `${OUT}vision-hand-torch.png` });
    await w('(w.toggleTorch(), 0)');
    await page.waitForTimeout(500);
    expect((await w('w.spec.near')) as number).toBeCloseTo(near0, 1);
    expect(errors).toEqual([]);
  });
});
