import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { apply, attempt, checkFor, newSceneState } from '../src/core/scene';
import { expandObject, expandScene, hooksFor, kindChain } from '../src/core/skillweb';
import { GATE_SCENE } from '../src/content/scenes/gate';
import { isRollable } from '../src/content/rollables';
import { KIND_PARENTS, LIBRARY } from '../src/content/skillweb';
import { THING_HOOKS, THING_KINDS } from '../src/content/skillweb/things';
import type { ObjectDef } from '../src/core/scene';

function dice(...faces: number[]): Rng {
  const r = Rng.fromSeed(1);
  let i = 0;
  r.int = (n: number) => (n === 6 ? (faces[i++] ?? 1) - 1 : 0);
  return r;
}

const thing = (kind: string, over: Partial<ObjectDef> = {}): ObjectDef =>
  expandObject({ id: 'x', name: 'Old oak', kind, hexes: [[0, 0]], look: '', ...over }, LIBRARY);

describe('hooks on things', () => {
  it('every hook runs on a real kind, lists real skills and has a unique id', () => {
    const ids = LIBRARY.hooks.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const h of THING_HOOKS) {
      expect(KIND_PARENTS[h.kind] !== undefined || h.kind === 'thing', h.id).toBe(true);
      expect(h.skills.length, h.id).toBeGreaterThan(0);
      for (const s of h.skills) expect(isRollable(s), `${h.id}: ${s}`).toBe(true);
      expect(h.layer, h.id).toBe(2);
      expect(h.success.length, h.id).toBeGreaterThan(0);
      expect(h.failure.length, h.id).toBeGreaterThan(0);
    }
  });

  it('the new kinds sit under the broad ones, which are left alone', () => {
    expect(kindChain('lock', KIND_PARENTS)).toEqual(['lock', 'structure', 'feature', 'thing']);
    expect(kindChain('tree', KIND_PARENTS)).toEqual(['tree', 'plant', 'feature', 'thing']);
    expect(kindChain('food', KIND_PARENTS)).toEqual(['food', 'item', 'thing']);
    expect(Object.keys(THING_KINDS)).toHaveLength(10);
    // No hook is written for structure or item themselves, so a scene's own palisade or cart keeps its own rules.
    for (const h of THING_HOOKS) expect(['structure', 'item'], h.id).not.toContain(h.kind);
  });

  it('the gate\'s palisade and cart gain nothing', () => {
    const def = expandScene(GATE_SCENE, LIBRARY);
    for (const id of ['palisade', 'cart', 'gate', 'campfire']) {
      const o = def.objects.find((x) => x.id === id)!;
      expect((o.checks ?? []).filter((c) => c.fromLibrary), id).toEqual([]);
    }
  });

  it('hidden reads only exist on things that carry lore, and say the lore either way', () => {
    const reads = THING_HOOKS.filter((h) => h.needs === 'lore');
    expect(reads.length).toBeGreaterThan(5);
    for (const h of reads) {
      expect(h.hidden, h.id).toBe(true);
      expect(h.intention, h.id).toBe('study');
      expect(JSON.stringify(h.success), h.id).toContain('{lore}');
      expect(JSON.stringify(h.failure), h.id).toContain('{lore}');
    }
    // Everything else says something that is true whatever the roll.
    for (const h of THING_HOOKS.filter((x) => !x.needs)) expect(JSON.stringify([...h.success, ...h.failure]), h.id).not.toContain('{lore}');
    // A wall with no lore cannot be studied; one with lore can.
    expect(hooksFor({ kind: 'wall' }, LIBRARY).some((h) => h.intention === 'study')).toBe(false);
    expect(hooksFor({ kind: 'wall', lore: { true: 'a', false: 'b' } }, LIBRARY).some((h) => h.intention === 'study')).toBe(true);
  });

  it('each kind offers what a person would expect of it', () => {
    const intents = (kind: string) => hooksFor({ kind }, LIBRARY).map((h) => h.intention);
    expect(intents('wall')).toEqual(expect.arrayContaining(['climb', 'search', 'craft']));
    expect(intents('lock')).toEqual(expect.arrayContaining(['pick', 'force']));
    expect(intents('door')).toEqual(expect.arrayContaining(['force', 'search']));
    expect(intents('tree')).toEqual(expect.arrayContaining(['climb', 'forage']));
    expect(intents('plant')).not.toContain('climb');
    expect(intents('water')).toEqual(expect.arrayContaining(['swim', 'forage']));
    expect(intents('gap')).toEqual(['jump']);
    expect(intents('trail')).toEqual(['track']);
    expect(intents('animal')).toEqual(expect.arrayContaining(['calm', 'forage']));
    // The rock keeps the hooks it always had.
    expect(intents('rock')).toEqual(['climb', 'study']);
  });

  it('which skills do it: the climbing, jumping, swimming and healing sets', () => {
    const skills = (kind: string, intention: string, tags?: string[]) =>
      hooksFor({ kind, tags }, LIBRARY).find((h) => h.intention === intention)!.skills;
    expect(skills('tree', 'climb')).toContain('Klättra');
    expect(skills('gap', 'jump')).toContain('Hoppa');
    expect(skills('water', 'swim')).toContain('Simma');
    expect(skills('lock', 'pick')).toContain('E:Låsdyrkning');
    expect(skills('trail', 'track')).toContain('Spåra');
    expect(skills('human', 'heal', ['ill'])).toContain('Läkekonst');
  });

  it('only the ill and wounded can be tended', () => {
    expect(hooksFor({ kind: 'human' }, LIBRARY).some((h) => h.intention === 'heal')).toBe(false);
    expect(hooksFor({ kind: 'human', tags: ['ill'] }, LIBRARY).some((h) => h.intention === 'heal')).toBe(true);
  });
});

describe('a try on a thing', () => {
  it('a good climb sets what the scene can wait for', () => {
    const o = thing('tree');
    const s = newSceneState(GATE_SCENE);
    const c = checkFor(o, s, 'Klättra')!;
    expect(c.id).toBe('x/climb-tree');
    const r = attempt(s, c, { n: 6, mod: 0 }, dice(5, 5, 5, 5, 5, 5));
    expect(r.result.success).toBe(true);
    apply(s, r.effects);
    expect(s.flags['climbed:x']).toBe(true);
  });

  it('a failed one does not', () => {
    const o = thing('tree');
    const s = newSceneState(GATE_SCENE);
    const r = attempt(s, checkFor(o, s, 'Klättra')!, { n: 1, mod: 0 }, dice(1));
    expect(r.result.success).toBe(false);
    apply(s, r.effects);
    expect(s.flags['climbed:x']).toBeUndefined();
  });

  it('a lock can be picked, and a stubborn one allows only so many tries', () => {
    const o = thing('lock');
    expect(o.checks!.find((c) => c.intention === 'pick')!.tries).toBe(3);
    const s = newSceneState(GATE_SCENE);
    const r = attempt(s, checkFor(o, s, 'E:Låsdyrkning')!, { n: 6, mod: 0 }, dice(5, 5, 5, 5, 5, 5));
    apply(s, r.effects);
    expect(s.flags['opened:x']).toBe(true);
  });

  it('breaking a lock open is noisy', () => {
    const o = thing('lock');
    const s = newSceneState(GATE_SCENE);
    const c = o.checks!.find((x) => x.intention === 'force')!;
    const r = attempt(s, c, { n: 8, mod: 0 }, dice(5, 5, 5, 5, 5, 5, 5, 5));
    apply(s, r.effects);
    expect(s.flags['opened:x']).toBe(true);
    expect(s.flags['noisy:x']).toBe(true);
  });

  it('a hidden read gives an answer either way', () => {
    const o = thing('plant', { lore: { true: 'It is a harmless herb.', false: 'It is deadly nightshade.' } });
    const s = newSceneState(GATE_SCENE);
    const c = o.checks!.find((x) => x.intention === 'study')!;
    expect(c.hidden).toBe(true);
    const ok = attempt(s, c, { n: 6, mod: 0 }, dice(6, 6, 6, 6, 6, 6)).effects.map((e) => ('say' in e ? e.say : ''));
    const bad = attempt(newSceneState(GATE_SCENE), c, { n: 1, mod: 0 }, dice(1)).effects.map((e) => ('say' in e ? e.say : ''));
    expect(ok[0]).toBe('It is a harmless herb.');
    expect(bad[0]).toBe('It is deadly nightshade.');
  });

  it('a general search never claims to have found something', () => {
    const o = thing('wall');
    const s = newSceneState(GATE_SCENE);
    const c = o.checks!.find((x) => x.intention === 'search')!;
    const ok = attempt(s, c, { n: 6, mod: 0 }, dice(6, 6, 6, 6, 6, 6)).effects.map((e) => ('say' in e ? e.say : '')).join(' ');
    expect(ok).toMatch(/nothing out of place/);
  });

  it('a thing\'s own check for an intention wins over the library\'s', () => {
    const own = { id: 'own', intention: 'climb', label: 'Climb it my way', skills: ['Klättra'], difficulty: 3, success: [], failure: [] };
    const o = expandObject({ id: 'x', name: 'Wall', kind: 'wall', hexes: [[0, 0]], look: '', checks: [own] }, LIBRARY);
    expect(o.checks!.filter((c) => c.intention === 'climb')).toEqual([own]);
  });

  it('tending the ill lifts their mood and is not a social try', () => {
    const o = expandObject({ id: 'p', name: 'Old Rae', kind: 'human', tags: ['ill'], hexes: [[0, 0]], look: '' }, LIBRARY);
    const c = o.checks!.find((x) => x.intention === 'heal')!;
    expect(c.talk).toBeUndefined();
    const s = newSceneState(GATE_SCENE);
    const r = attempt(s, c, { n: 6, mod: 0 }, dice(6, 6, 6, 6, 6, 6));
    apply(s, r.effects);
    expect(s.social.p?.mood).toBe(2);
    expect(s.flags['tended:p']).toBe(true);
  });
});
