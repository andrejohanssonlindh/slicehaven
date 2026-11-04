/* Browser test: taking and carrying (B3b): pick up a stool in a house (it leaves its spot and is in the hero's arms, slower), put it down, it stays there after a reload; carried out of the house, its household know it when they see it. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

const easy = { 'slicehaven.settings': JSON.stringify({ v: 1, dice: 'result', diceSkin: 'bone', diceClose: 'auto', difficulty: 'easy' }) };

describe('spike3d taking and carrying', () => {
  it('a stool picked up leaves its spot, is held, put down stays put through a reload, and is recognised outdoors', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=hamlet&nogov&save', { storage: easy });
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    await page.waitForTimeout(1500);
    // A stool in a house that has a household (any standing house will do).
    const found = (await w(`(() => {
      for (const hs of w.houses) for (const g of hs.furniture) {
        const t = w.targetOf(g);
        if (t.kind === 'stool' && w.cast.some((c) => c.who.home === t.house)) return t;
      }
      return null;
    })()`)) as { id: string; kind: string; x: number; z: number; level: number; house: string } | null;
    expect(found).not.toBeNull();
    const t = found!;
    const target = JSON.stringify(t);
    const strong = '{ id: "hero", dice: () => ({ n: 9, mod: 0 }) }';
    await w(`(w.placeHeroAt(${t.x}, ${t.z}, ${t.level}), 0)`);

    const r = (await w(`w.act('verb:pick-up', ${target}, ${strong})`)) as { done: boolean; wrongs?: unknown[] };
    expect(r.done).toBe(true);
    expect(r.wrongs).toBeUndefined();
    expect(await w('w.holding')).toBe('stool');
    expect(await w(`w.houses.some((hs) => hs.furniture.some((g) => g.userData.thing.id === ${JSON.stringify(t.id)}))`)).toBe(false);
    expect(await w('w.heldGs.has("hero") && w.carryPace < 1')).toBe(true);
    // With full hands there is no sitting, and where you stand offers putting it down.
    const here = (await w(`w.offersFor(null, ${strong}).map((o) => o.label)`)) as string[];
    expect(here).toContain('Put down the stool');
    // (Close in, turned a little, to see the stool in their arms.)
    for (let i = 0; i < 8; i++) await page.click('#zoom button[data-zoom="1"]');
    await w(`(() => { const d = w.houseIndex.byId(${JSON.stringify(t.house)}); w.placeHeroAt(d.x + 9, d.z + 9, 0); w.heroFig.want = w.yaw + 0.7; return 0; })()`);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}carry-held.png` });
    const at = (await w(`(() => {
      const v = w.heroFig.place.getWorldPosition(w.focus.clone()); v.y += 0.8; v.project(w.camera);
      return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
    })()`)) as { x: number; y: number };
    await page.screenshot({ path: `${OUT}carry-held-close.png`, clip: { x: Math.max(0, at.x - 60), y: Math.max(0, at.y - 70), width: 120, height: 120 } });
    await w(`(w.placeHeroAt(${t.x}, ${t.z}, ${t.level}), 0)`);

    expect(((await w(`w.act('verb:put-down', null, ${strong})`)) as { done: boolean }).done).toBe(true);
    expect(await w('w.holding')).toBeNull();
    expect(await w(`w.looseDrawn.has(${JSON.stringify(t.id)})`)).toBe(true);
    const saved = (await w('w.saveState().carry')) as { loose: Record<string, { at: unknown }> };
    expect(saved.loose[t.id].at).not.toBeNull();

    // A reload: it is still where it was put, not back in the plan's spot.
    await page.reload();
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    await page.waitForTimeout(1500);
    expect(await w(`w.looseDrawn.has(${JSON.stringify(t.id)})`)).toBe(true);
    expect(await w(`w.houses.filter((hs) => hs.furniture.some((g) => g.userData.thing.id === ${JSON.stringify(t.id)})).length`)).toBe(1);

    // Picked up again and carried out of the house: one of its household sees it with you, and knows it.
    const loose = (await w(`w.targetOf(w.looseDrawn.get(${JSON.stringify(t.id)}).g)`)) as object;
    await w(`(w.placeHeroAt(${t.x}, ${t.z}, ${t.level}), w.act('verb:pick-up', ${JSON.stringify(loose)}, ${strong}), 0)`);
    expect(await w('w.holding')).toBe('stool');
    const owner = (await w(`(() => {
      const c = w.cast.find((x) => x.who.home === ${JSON.stringify(t.house)});
      const door = w.houseIndex.byId(${JSON.stringify(t.house)});
      w.placeHeroAt(door.x + 9, door.z + 9, 0);
      c.mind.senses.sees = ['hero'];
      w.checkCarry();
      return { id: c.who.id, regard: w.regardOf(c.who.id) };
    })()`)) as { id: string; regard: number };
    expect(await w('w.heroSpot().house')).toBeNull();
    expect(owner.regard).toBeLessThan(0);
    expect(errors).toEqual([]);
  });

  it('a moved stool stops feet where it lies, not where it stood; borrowed and given back; a neighbour brings it home', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=hamlet&nogov', { storage: easy });
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    await page.waitForTimeout(1500);
    const t = (await w(`(() => {
      for (const hs of w.houses) for (const g of hs.furniture) {
        const t = w.targetOf(g);
        if (t.kind === 'stool' && t.level === 0 && w.cast.some((c) => c.who.home === t.house)) return t;
      }
      return null;
    })()`)) as { id: string; kind: string; x: number; z: number; level: number; house: string };
    expect(t).toBeTruthy();
    const strong = '{ id: "hero", dice: () => ({ n: 9, mod: 0 }) }';
    const id = JSON.stringify(t.id);

    // Feet: its spot is blocked; picked up, it is free; put down by the door outside, that spot is blocked.
    expect(await w(`w.nav.walkable(${t.x}, ${t.z})`)).toBe(false);
    await w(`(w.placeHeroAt(${t.x}, ${t.z}, 0), w.act('verb:pick-up', ${JSON.stringify(t)}, ${strong}), 0)`);
    expect(await w(`w.nav.walkable(${t.x}, ${t.z})`)).toBe(true);

    // Borrowed from one of its household (a strong hand: yes), then given back: it is home again, in no one's hands.
    const owner = (await w(`w.cast.find((c) => c.who.home === ${JSON.stringify(t.house)}).who.id`)) as string;
    const b = (await w(`w.talkTo('talk:borrow', ${JSON.stringify(owner)}, ${strong}, {})`)) as { done: boolean; success: boolean; borrow?: string };
    expect(b.done).toBe(true);
    if (b.success) expect(await w(`w.carry.loose[${id}].loan > w.worldHours`)).toBe(true);
    const g = (await w(`w.talkTo('talk:giveback', ${JSON.stringify(owner)}, ${strong}, {})`)) as { giveBack?: string };
    expect(g.giveBack).toBe(t.id);
    expect(await w('w.holding')).toBeNull();
    expect(await w(`(() => { const l = w.carry.loose[${id}]; return Math.hypot(l.at.x - l.home.x, l.at.z - l.home.z); })()`)).toBeLessThan(0.01);

    // Taken out and put down in the street: it stops feet there. Someone of its household near it carries it home.
    const door = (await w(`(() => { const d = w.houseIndex.byId(${JSON.stringify(t.house)}); return { x: d.x, z: d.z }; })()`)) as { x: number; z: number };
    await w(`(w.placeHeroAt(${t.x}, ${t.z}, 0), w.act('verb:pick-up', w.targetOf(w.looseDrawn.get(${id}).g), ${strong}), 0)`);
    await w(`(w.placeHeroAt(${door.x + 8}, ${door.z + 8}, 0), w.heroFig.want = 0, w.act('verb:put-down', null, ${strong}), 0)`);
    const lies = (await w(`w.carry.loose[${id}].at`)) as { x: number; z: number; house: string | null };
    expect(lies.house).toBeNull();
    expect(await w(`w.nav.walkable(${lies.x}, ${lies.z})`)).toBe(false);
    await w(`(w.placeHeroAt(${door.x - 20}, ${door.z - 20}, 0), 0)`);
    await w(`(() => {
      const c = w.cast.find((x) => x.who.id === ${JSON.stringify(owner)});
      delete c.mind.answer;
      c.mind.actor.x = ${lies.x} + 3; c.mind.actor.z = ${lies.z}; c.mind.actor.legs = []; c.mind.actor.house = null; c.mind.actor.level = 0; c.mind.actor.stair = null;
      return 0;
    })()`);
    await page.waitForFunction((tid) => {
      const w = (window as any).spike.world;
      return !!w.carry.loose[tid].by;
    }, t.id, { timeout: 20_000 });
    await page.waitForFunction((tid) => {
      const w = (window as any).spike.world, l = w.carry.loose[tid];
      return !l.by && l.at && Math.hypot(l.at.x - l.home.x, l.at.z - l.home.z) < 0.01;
    }, t.id, { timeout: 60_000 });
    expect(errors).toEqual([]);
  });
});
