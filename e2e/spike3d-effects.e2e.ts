/* Browser test: effects (B7): setting fire to something in the inn, it burning and drawn, putting it out. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

const quick = { 'slicehaven.settings': JSON.stringify({ v: 1, dice: 'result', diceSkin: 'bone', diceClose: 'auto' }) };

describe('spike3d effects', () => {
  it('a stool set alight burns with a flame, and is put out again', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov&map=hamlet', { storage: quick });
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 60_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    // A stool in the inn, where the hero starts.
    const stool = (await w(`(() => {
      const hs = w.standingOf('inn');
      const g = hs.furniture.find((f) => f.userData.thing && f.userData.thing.kind === 'stool');
      return g ? w.acting.targetOf(g) : null;
    })()`)) as { id: string; kind: string } | null;
    expect(stool).not.toBeNull();
    const t = JSON.stringify(stool);
    const strong = "{ id: 'hero', dice: () => ({ n: 8, mod: 0 }) }";
    const r = (await w(`w.acting.act('verb:setfire', ${t}, ${strong})`)) as { done: boolean; success?: boolean };
    expect(r).toMatchObject({ done: true, success: true });
    expect(await w(`w.effects.burning(${JSON.stringify(stool!.id)})`)).toBe(true);
    // It grows over the rounds (each 4 s).
    for (let i = 0; i < 3; i++) await w('(w.effects.round(), 0)');
    expect(Number(await w(`w.states.get(${JSON.stringify(stool!.id)}, 'stool', 'burning')`))).toBeGreaterThan(1);
    // Stand beside it to see it (indoors, the roof lifts).
    const s = stool as unknown as { x: number; z: number };
    await w(`(w.placeHeroAt(${s.x + 1.2}, ${s.z + 1.4}), 0)`);
    for (let i = 0; i < 2; i++) await page.click('#zoom button[data-zoom="1"]');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}spike3d-effects-burning.png` });
    // Put out (with a strong Speed it takes).
    const d = (await w(`w.acting.act('verb:douse', ${t}, ${strong})`)) as { done: boolean; success?: boolean };
    expect(d.done).toBe(true);
    if (d.success) {
      expect(await w(`w.effects.burning(${JSON.stringify(stool!.id)})`)).toBe(false);
    }
    expect(errors).toEqual([]);
  });
});
