/* Browser test: owners and the scale (B3c): putting out the town's torch in front of the guard is a wrong; his view of the hero drops, he grumbles, and done again he scolds (walks up); the view is in the save. */
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

describe('spike3d owners and the scale', () => {
  it('a wrong seen by the guard lowers his view of you, and he answers it', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=hamlet&nogov', { storage: easy });
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    await page.waitForTimeout(1500);
    // Night: the guard stands at the speaker's spot and watches the hero in front of him.
    await w('(w.dayMinutes = 0, w.weather.setHour(23), 0)');
    await page.waitForTimeout(2500);
    const g = (await w('w.minds.find((m) => m.id === "guard")')) as { x: number; z: number };
    await w(`(w.placeHeroAt(${g.x}, ${g.z} + 4), 0)`);
    await page.waitForFunction(() => (window as any).spike.world.senses.find((s: { id: string }) => s.id === 'guard').sees.includes('hero'), undefined, { timeout: 15_000 });

    // The town's torch nearest the hero (any will do: the act needs no reach when called directly).
    const torch = (await w(`(() => {
      let best = null;
      for (const [id, f] of w.placedFires) if (f.kind === 'torchpost') {
        const p = f.torch.light.position, d = Math.hypot(p.x - w.hero.x, p.z - w.hero.z);
        if (!best || d < best.d) best = { id, kind: f.kind, x: p.x, z: p.z, d };
      }
      return best;
    })()`)) as { id: string; kind: string; x: number; z: number };
    const target = JSON.stringify({ id: torch.id, kind: torch.kind, x: torch.x, z: torch.z, level: 0, house: null });
    const strong = '{ id: "hero", dice: () => ({ n: 9, mod: 0 }) }';

    const r1 = (await w(`w.act('verb:putout', ${target}, ${strong})`)) as { wrongs?: unknown[]; events: { kind: string; by?: { id: string }[] }[] };
    expect(r1.wrongs).toEqual([{ act: 'meddle', owner: { town: true } }]);
    expect(r1.events.find((e) => e.kind === 'seen')?.by?.map((b) => b.id)).toContain('guard');
    const once = (await w('w.regardOf("guard")')) as number;
    expect(once).toBeLessThan(0);
    expect(((await w('w.answers.find((a) => a.id === "guard")')) as { answer: string }).answer).toBe('grumble');

    // Lit again (the town lets anyone light its torches), and put out again: he scolds, and comes up to you.
    expect(((await w(`w.act('verb:light', ${target}, ${strong})`)) as { wrongs?: unknown[] }).wrongs).toBeUndefined();
    await w(`w.act('verb:putout', ${target}, ${strong})`);
    expect((await w('w.regardOf("guard")')) as number).toBeLessThan(once);
    expect(((await w('w.answers.find((a) => a.id === "guard")')) as { answer: string }).answer).toBe('scold');
    await page.waitForFunction(() => (window as any).spike.world.minds.find((m: { id: string }) => m.id === 'guard').doing === 'confront', undefined, { timeout: 5000 });
    await page.screenshot({ path: `${OUT}owners-scold.png` });

    // What he thinks of you is kept with the map.
    expect(((await w('w.saveState().standing.regard')) as Record<string, number>).guard).toBeLessThan(0);
    expect(errors).toEqual([]);
  });

  it('the inn is open below and closed upstairs until you take a room; walking into a home at night is seen', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=hamlet&nogov', { storage: easy });
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    await page.waitForTimeout(1500);
    await w('(w.weather.setHour(14), 0)');
    // Into the inn: the taproom, the keeper's, open to anyone.
    expect(await w('w.walkIn("inn")')).not.toBeNull();
    await page.waitForFunction(() => (window as any).spike.world.hero.house === 'inn' && !(window as any).spike.world.hero.legs.length, undefined, { timeout: 20_000 });
    const below = (await w('w.whoseAt(w.heroSpot())')) as { members: string[]; room: string; open: unknown; leave: boolean };
    expect(below.room).toBe('taproom');
    expect(below.open).toEqual([6, 24]);
    expect(below.members.length).toBe(1);
    // Up the stairs: not open to you.
    expect(await w('w.climb(1)')).not.toBeNull();
    await page.waitForFunction(() => (window as any).spike.world.hero.level === 1, undefined, { timeout: 20_000 });
    const up = (await w('w.whoseAt(w.heroSpot())')) as { room: string; open: unknown; leave: boolean };
    expect(up.open).toBeNull();
    // A room for the night from the keeper: then you have leave.
    const hero = '{ kind: "human", people: "asharier", tags: [] }';
    const r = (await w(`w.talkTo('talk:leave', 'keeper', { id: 'hero', dice: () => ({ n: 4, mod: 0 }) }, ${hero})`)) as { leave?: string };
    expect(r.leave).toBe('inn');
    expect(((await w('w.whoseAt(w.heroSpot())')) as { leave: boolean }).leave).toBe(true);

    // Night: the villagers are at home. Into one of their homes, in front of them: a wrong, answered.
    await w('(w.weather.setHour(23), w.placeHeroAt(0, 14), 0)');
    await page.waitForFunction(() => (window as any).spike.world.minds.some((m: { house: string | null }) => m.house && m.house.startsWith('home')), undefined, { timeout: 60_000 });
    await page.waitForTimeout(3000);
    const home = (await w('w.minds.find((m) => m.house && m.house.startsWith("home"))')) as { id: string; house: string; x: number; z: number } | undefined;
    expect(home).toBeDefined();
    await w(`(w.placeHeroAt(${home!.x}, ${home!.z} + 1.2), 0)`);
    await page.waitForFunction((id) => (window as any).spike.world.regardOf(id) < 0, home!.id, { timeout: 15_000 });
    expect(((await w(`w.answers.find((a) => a.id === ${JSON.stringify(home!.id)})`)) as { answer: string }).answer).toBe('grumble');
    await page.screenshot({ path: `${OUT}owners-trespass.png` });
    expect(errors).toEqual([]);
  });
});
