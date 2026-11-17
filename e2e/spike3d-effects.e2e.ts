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
    // Standing in it burns you (outside a fight, the rules' burn each round).
    await w(`(w.placeHeroAt(${s.x}, ${s.z + 0.3}), 0)`);
    for (let i = 0; i < 2; i++) await w('(w.effects.round(), 0)');
    expect(await w("w.fights.injuriesOf('hero') !== null")).toBe(true);
    await w(`(w.placeHeroAt(${s.x + 1.5}, ${s.z + 1.5}), 0)`);
    // Put out (with a strong Speed it takes).
    const d = (await w(`w.acting.act('verb:douse', ${t}, ${strong})`)) as { done: boolean; success?: boolean };
    expect(d.done).toBe(true);
    if (d.success) {
      expect(await w(`w.effects.burning(${JSON.stringify(stool!.id)})`)).toBe(false);
    }
    expect(errors).toEqual([]);
  });

  it('a stool smashed lies as wreckage: no longer in the way, not to be sat on', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov&map=hamlet', { storage: quick });
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 60_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    const stool = (await w(`(() => {
      const hs = w.standingOf('inn');
      const g = hs.furniture.find((f) => f.userData.thing && f.userData.thing.kind === 'stool');
      return w.acting.targetOf(g);
    })()`)) as { id: string; kind: string; x: number; z: number };
    const t = JSON.stringify(stool);
    const blocks = () => w(`(() => { const b = w.moves.byId('inn'); return w.carrying.furnitureRects(b, 0).length; })()`) as Promise<number>;
    const before = await blocks();
    const offers = () => w(`w.acting.offersFor(${t}, { id: 'hero', dice: () => ({ n: 3, mod: 0 }) }).map((o) => o.id)`) as Promise<string[]>;
    expect(await offers()).toContain('verb:smash');
    const r = (await w(`w.acting.act('verb:smash', ${t}, { id: 'hero', dice: () => ({ n: 10, mod: 0 }) })`)) as { done: boolean; success?: boolean };
    expect(r).toMatchObject({ done: true, success: true });
    expect(await w(`w.states.get(${JSON.stringify(stool.id)}, 'stool', 'broken')`)).toBe(true);
    expect(await blocks()).toBe(before - 1);
    const after = await offers();
    expect(after).not.toContain('verb:sit');
    expect(after).not.toContain('verb:smash');
    expect(errors).toEqual([]);
  });

  it('the innkeeper sees a stool burning in the inn and goes to put it out', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov&map=hamlet', { storage: quick });
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 60_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    const stool = (await w(`(() => {
      const hs = w.standingOf('inn');
      const g = hs.furniture.find((f) => f.userData.thing && f.userData.thing.kind === 'stool');
      return w.acting.targetOf(g);
    })()`)) as { id: string; kind: string; x: number; z: number };
    // The keeper on the taproom floor, a few metres off; the stool alight.
    await w(`(() => { const a = w.cast.find((c) => c.who.id === 'keeper').mind.actor; a.legs = []; a.stair = null; a.foot = null; a.x = ${stool.x + 2.5}; a.z = ${stool.z + 1.5}; a.house = 'inn'; a.level = 0; return 0; })()`);
    await w(`(w.states.set(${JSON.stringify(stool.id)}, 'stool', 'burning', 2), 0)`);
    await w('(w.effects.round(), 0)');
    expect(await w("w.schedule.minds.find((m) => m.id === 'keeper').doing")).toBe('firefight');
    await page.waitForFunction(`window.spike.world.acting.recentActs.some((a) => a.who === 'keeper' && a.offer === 'verb:douse')`, undefined, { timeout: 40_000 });
    expect(errors).toEqual([]);
  });

  it('out in a storm you get soaked, and stay wet a while under a roof', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov&map=hamlet', { storage: quick });
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 60_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    await w("(w.weather.set('storm'), w.weather.rain = 1, 0)");
    expect(await w("w.hero.house")).toBeNull();
    expect(await w("w.effects.wetOf('hero')")).toBe(4);
    for (let i = 0; i < 40; i++) await w('(w.effects.round(), 0)');
    await w("(w.walkIn('inn'), 0)");
    await page.waitForFunction(() => !(window as any).spike.world.walking, undefined, { timeout: 30_000 });
    expect(await w("w.effects.wetOf('hero')")).toBe(2);
    expect(errors).toEqual([]);
  });
});
