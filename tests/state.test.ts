import { describe, expect, it } from 'vitest';
import { THINGS } from '../src/content/things';
import { furnishHouse } from '../src/content/furnish';
import { mapNamed } from '../src/content/maps';
import { buildHouses } from '../src/core/world3d/layout';
import { WORLD_SAVE_VERSION, clearWorld, loadWorld, saveWorld } from '../src/core/world3d/save';
import { ThingStates, pieceId, placedId } from '../src/core/world3d/state';

/** A Storage in memory. */
const memory = (): Storage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: () => null, get length() { return m.size; } };
};

describe('states on placed things (B1)', () => {
  it('come from the kind, inherited: every fire, the hearth and the torch post too, starts lit', () => {
    for (const k of ['hearth', 'oven', 'forge', 'campfire', 'torchpost', 'walltorch']) expect(THINGS.get(k).states?.lit, k).toEqual({ default: true });
    expect(THINGS.get('table').states).toBeUndefined();
  });

  it('store only what differs from the start, so an untouched world saves as nothing', () => {
    const s = new ThingStates(THINGS);
    expect(s.get('h/0/hearth', 'hearth', 'lit')).toBe(true);
    expect(s.set('h/0/hearth', 'hearth', 'lit', false)).toBe(true);
    expect(s.set('h/0/hearth', 'hearth', 'lit', false)).toBe(false);
    expect(s.toJSON()).toEqual({ 'h/0/hearth': { lit: false } });
    s.set('h/0/hearth', 'hearth', 'lit', true);
    expect(s.toJSON()).toEqual({});
    expect(s.count).toBe(0);
  });

  it('refuse a state the kind does not have, or a value of the wrong type', () => {
    const s = new ThingStates(THINGS);
    expect(() => s.set('t', 'table', 'lit', false)).toThrow(/no state called lit/);
    expect(() => s.set('h', 'hearth', 'lit', 'yes')).toThrow(/boolean/);
    expect(s.has('hearth', 'lit')).toBe(true);
    expect(s.has('table', 'lit')).toBe(false);
  });

  it('tell listeners what changed, also when a save is taken back', () => {
    const s = new ThingStates(THINGS);
    const heard: string[] = [];
    s.on((c) => heard.push(`${c.id}.${c.key}`));
    s.set('a', 'hearth', 'lit', false);
    s.assign({ b: { lit: false } });
    expect(heard).toEqual(['a.lit', 'a.lit', 'b.lit']);
    expect(s.get('a', 'hearth', 'lit')).toBe(true);
    expect(s.get('b', 'hearth', 'lit')).toBe(false);
  });

  it('give every placed thing an id that is the same each time the map is built', () => {
    expect(placedId({ kind: 'well', x: 3.04, z: -12.36 })).toBe('well@30,-124');
    const ids = (): string[] => {
      const map = mapNamed('hamlet');
      return buildHouses(map.layout, THINGS).flatMap((b) => furnishHouse(b.model, b.place.room ?? 'home', b.place.spec.seed, b.place.spec.plan)
        .flatMap((r, ri) => r.plan.pieces.filter((p) => p.fire).map((p) => pieceId(b.place.id, ri, p.id))));
    };
    const a = ids();
    expect(a.length).toBeGreaterThan(2);
    expect(new Set(a).size).toBe(a.length);
    expect(ids()).toEqual(a);
  });
});

describe('the saved world (B1)', () => {
  const sample = { map: 'hamlet', hour: 17.5, hero: { x: 4, z: -2, level: 1 }, explored: { '0,0': 'AAE=' }, things: { 'h/0/hearth': { lit: false } }, flags: { 'searched:x': true }, talk: { social: { keeper: { talks: 1, mood: 1 } }, tokens: [], fails: {} }, leads: { 'statue-north': { lines: ['A statue.'], heard: [0], at: 110 } }, standing: { regard: { keeper: -12 }, leave: { home1: 24 } }, carry: { held: 'h/0/stool', hidden: false, loose: { 'h/0/stool': { kind: 'stool', seed: 3, home: { x: 1, z: 2, level: 0, house: 'h', rot: 0, room: 0 }, at: null } } } };

  it('writes and reads back one record per map, with its version', () => {
    const st = memory();
    expect(saveWorld(sample, st)).toBe(true);
    expect(loadWorld('hamlet', st)).toEqual({ v: WORLD_SAVE_VERSION, ...sample });
    expect(loadWorld('spike', st)).toBeNull();
    clearWorld('hamlet', st);
    expect(loadWorld('hamlet', st)).toBeNull();
  });

  it('drops a save of another version, or one that is not JSON', () => {
    const st = memory();
    st.setItem('slicehaven.world.hamlet', JSON.stringify({ ...sample, v: WORLD_SAVE_VERSION - 1 }));
    expect(loadWorld('hamlet', st)).toBeNull();
    st.setItem('slicehaven.world.hamlet', '{oops');
    expect(loadWorld('hamlet', st)).toBeNull();
  });

  it('says so when the browser will not take it', () => {
    const full = { setItem: () => { throw new Error('quota'); } };
    expect(saveWorld(sample, full)).toBe(false);
  });
});
