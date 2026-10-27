import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { apply, attempt, checkFor, lookAround, newSceneState, spotted, usefulSkills } from '../src/core/scene';
import type { ObjectDef } from '../src/core/scene';
import { type HookDef, type Library, expandObject, expandScene, hooksFor, kindChain } from '../src/core/skillweb';
import { isRollable } from '../src/content/rollables';
import { KIND_PARENTS, LIBRARY } from '../src/content/skillweb';
import { GATE_SCENE } from '../src/content/scenes/gate';

/** An Rng that returns these d6 faces in order (then 1s). */
function dice(...faces: number[]): Rng {
  const r = Rng.fromSeed(1);
  let i = 0;
  r.int = (n: number) => (n === 6 ? (faces[i++] ?? 1) - 1 : 0);
  return r;
}

const hook = (over: Partial<HookDef>): HookDef => ({
  id: 'h', kind: 'thing', layer: 1, intention: 'i', label: 'Do it to {name}', skills: ['Charm'], difficulty: 6,
  success: [{ say: 'ok {name}' }], failure: [{ say: 'no' }], ...over,
});
const obj = (over: Partial<ObjectDef> = {}): ObjectDef => ({ id: 'o', name: 'Thing', hexes: [[0, 0]], look: '', ...over });
const lib = (...hooks: HookDef[]): Library => ({ parents: { thing: undefined, creature: 'thing', humanoid: 'creature', dwarf: 'humanoid' }, hooks, kindDefaults: {}, peoples: [], relations: {} });

describe('skill web: kinds and lookup', () => {
  it('walks a kind up to the root', () => {
    expect(kindChain('dwarf', lib().parents)).toEqual(['dwarf', 'humanoid', 'creature', 'thing']);
    expect(kindChain(undefined, lib().parents)).toEqual([]);
  });

  it('children inherit hooks from their parent kinds', () => {
    const l = lib(hook({ id: 'a', kind: 'humanoid', intention: 'talk' }), hook({ id: 'b', kind: 'creature', intention: 'look' }));
    expect(hooksFor(obj({ kind: 'dwarf' }), l).map((h) => h.id).sort()).toEqual(['a', 'b']);
    expect(hooksFor(obj({ kind: 'creature' }), l).map((h) => h.id)).toEqual(['b']);
  });

  it('a more specific kind wins for the same intention; a tag beats no tag', () => {
    const l = lib(
      hook({ id: 'humanoid', kind: 'humanoid', intention: 'talk' }),
      hook({ id: 'dwarf', kind: 'dwarf', intention: 'talk' }),
      hook({ id: 'dwarf-rich', kind: 'dwarf', intention: 'talk', tag: 'rich' }),
    );
    expect(hooksFor(obj({ kind: 'dwarf' }), l).map((h) => h.id)).toEqual(['dwarf']);
    expect(hooksFor(obj({ kind: 'dwarf', tags: ['rich'] }), l).map((h) => h.id)).toEqual(['dwarf-rich']);
    expect(hooksFor(obj({ kind: 'humanoid' }), l).map((h) => h.id)).toEqual(['humanoid']);
  });

  it('hooks for the root kind apply to everything', () => {
    const l = lib(hook({ kind: 'thing' }));
    expect(hooksFor(obj(), l)).toHaveLength(1);
  });
});

describe('skill web: expanding objects into checks', () => {
  it('adds library hooks as ordinary checks, filled with the thing\'s name', () => {
    const o = expandObject(obj({ id: 'cow', name: 'Cow' }), lib(hook({})));
    const c = checkFor(o, newSceneState(GATE_SCENE), 'Charm')!;
    expect(c.id).toBe('cow/h');
    expect(c.label).toBe('Do it to cow');
    expect(c.fromLibrary).toBe(true);
    expect(usefulSkills(o, newSceneState(GATE_SCENE))).toEqual(['Charm']);
  });

  it('a thing\'s own check shadows the library for the same intention', () => {
    const own = { id: 'mine', intention: 'i', label: 'Own', skills: ['Charm'], difficulty: 10, success: [], failure: [] };
    const o = expandObject(obj({ checks: [own] }), lib(hook({})));
    expect(o.checks).toHaveLength(1);
    expect(o.checks![0].id).toBe('mine');
  });

  it('a finished own check does not bring the library hook back', () => {
    const s = newSceneState(GATE_SCENE);
    s.flags.done = true;
    const own = { id: 'mine', intention: 'i', label: 'Own', skills: ['Charm'], difficulty: 10, when: { none: ['done'] }, success: [], failure: [] };
    const o = expandObject(obj({ checks: [own] }), lib(hook({})));
    expect(checkFor(o, s, 'Charm')).toBeUndefined();
  });

  it('flags can name the thing with {id}', () => {
    const o = expandObject(obj({ id: 'guard' }), lib(hook({ success: [{ set: 'read:{id}' }] })));
    const s = newSceneState(GATE_SCENE);
    apply(s, attempt(s, checkFor(o, s, 'Charm')!, { n: 3, mod: 0 }, dice(5, 5, 5)).effects);
    expect(s.flags['read:guard']).toBe(true);
  });
});

describe('skill web: outcomes', () => {
  const o = expandObject(obj(), lib(hook({ difficulty: 6, strong: [{ say: 'bonus' }] })));
  const s = newSceneState(GATE_SCENE);
  const c = checkFor(o, s, 'Charm')!;
  const texts = (e: ReturnType<typeof attempt>['effects']) => e.map((x) => ('say' in x ? x.say : ''));

  it('fails, succeeds and succeeds strongly (2+ advantages)', () => {
    expect(texts(attempt(s, c, { n: 1, mod: 0 }, dice(1)).effects)).toEqual(['no']);
    expect(texts(attempt(s, c, { n: 2, mod: 0 }, dice(3, 4)).effects)).toEqual(['ok thing']); // 7: success, no advantage
    expect(texts(attempt(s, c, { n: 4, mod: 4 }, dice(5, 5, 5, 5)).effects)).toEqual(['ok thing', 'bonus']); // 24 vs 6: 3 advantages
  });
});

describe('skill web: looking around is a roll', () => {
  const dist: Record<string, number> = { rock: 2, cart: 4, travellers: 9 };
  const look = (rng: Rng, faces: { n: number; mod: number }, key = '4,11', s = newSceneState(GATE_SCENE)) =>
    ({ s, r: lookAround(GATE_SCENE.objects, s, key, (o) => dist[o.id] ?? 99, 5, faces, rng) });

  it('a poor roll notices nothing', () => {
    const { r } = look(dice(1, 1), { n: 2, mod: 0 });
    expect(r.again).toBe(false);
    if (!r.again) expect(r.found).toEqual([]);
  });

  it('a better roll notices the near, obvious thing first', () => {
    const { r } = look(dice(4, 4, 1), { n: 3, mod: 0 }); // total 9: boulder (spot 8, distance 2), not the cart (12 + 2)
    if (!r.again) expect(r.found.map((f) => f.o.id)).toEqual(['rock']);
  });

  it('a great roll notices more, and hints describe the thing, not the solution', () => {
    const { r } = look(dice(5, 5, 5, 5), { n: 4, mod: 0 });
    if (r.again) throw new Error('should roll');
    expect(r.found.map((f) => f.o.id)).toEqual(['rock', 'cart']);
    for (const f of r.found) expect(f.hint).not.toMatch(/could|climb|search/i);
  });

  it('each spot can be looked over once', () => {
    const first = look(dice(5, 5, 5), { n: 3, mod: 0 });
    const again = lookAround(GATE_SCENE.objects, first.s, '4,11', () => 2, 5, { n: 3, mod: 0 }, dice(5, 5, 5));
    expect(again.again).toBe(true);
    const elsewhere = lookAround(GATE_SCENE.objects, first.s, '5,11', () => 2, 5, { n: 3, mod: 0 }, dice(5, 5, 5));
    expect(elsewhere.again).toBe(false);
  });

  it('far things are harder to notice', () => {
    expect(spotted(10, 10, 2)).toBe(true);
    expect(spotted(10, 10, 4)).toBe(false);
    expect(spotted(0, undefined, 0)).toBe(false);
  });
});

describe('skill web: library data', () => {
  it('every hook names real skills and a known kind', () => {
    for (const h of LIBRARY.hooks) {
      expect(h.kind in KIND_PARENTS, `${h.id} kind`).toBe(true);
      for (const k of h.skills) expect(isRollable(k), `${h.id}: ${k}`).toBe(true);
    }
  });

  it('hook ids are unique and the kind tree has no loops', () => {
    expect(new Set(LIBRARY.hooks.map((h) => h.id)).size).toBe(LIBRARY.hooks.length);
    for (const k of Object.keys(KIND_PARENTS)) expect(kindChain(k, KIND_PARENTS).length).toBeLessThan(10);
  });

  it('in the gate scene: the guard can be sized up, the rock climbed by its own check, the palisade not', () => {
    const def = expandScene(GATE_SCENE, LIBRARY);
    const s = newSceneState(def);
    const by = (id: string) => def.objects.find((o) => o.id === id)!;
    expect(checkFor(by('guard'), s, 'Genomskåda')?.fromLibrary).toBe(true);
    expect(checkFor(by('rock'), s, 'Klättra')?.id).toBe('climb');
    expect(checkFor(by('rock'), s, 'Naturlära')?.fromLibrary).toBe(true);
    expect(checkFor(by('palisade'), s, 'Klättra')).toBeUndefined();
    // The travellers' own, one-shot check is not duplicated by the library.
    expect(by('travellers').checks!.filter((c) => c.intention === 'size-up')).toHaveLength(1);
  });
});
