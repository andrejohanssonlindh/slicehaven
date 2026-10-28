import { describe, expect, it } from 'vitest';
import { ROOM_SETS, type RoomSet, furnitureOf } from '../src/content/rooms3d';
import { SPIKE_LAYOUT } from '../src/content/spike3d';

const sets = Object.keys(ROOM_SETS) as RoomSet[];

describe('room sets for the 3D houses', () => {
  it('every set has furniture, none of it people, all inside the room', () => {
    for (const s of sets) {
      const items = furnitureOf(s);
      expect(items.length, s).toBeGreaterThan(5);
      for (const it of items) {
        expect(it.person, s).toBeFalsy();
        expect(it.u, s).toBeGreaterThanOrEqual(0);
        expect(it.u, s).toBeLessThanOrEqual(1);
        expect(it.d, s).toBeGreaterThanOrEqual(0);
        expect(it.d, s).toBeLessThanOrEqual(1);
      }
    }
  });

  it('the village people are really left out (the sets that have them)', () => {
    for (const s of ['fisher', 'inn', 'bakery', 'herbalist', 'fishmonger', 'general', 'weaver'] as const) {
      expect(ROOM_SETS[s].items().some((i) => i.person), s).toBe(true);
      expect(furnitureOf(s).length, s).toBeLessThan(ROOM_SETS[s].items().length);
    }
  });

  it('rugs and straw are flat, the hearth is not', () => {
    const flat = furnitureOf('home').filter((i) => i.prop.flat);
    expect(flat.length).toBeGreaterThanOrEqual(3);
    expect(furnitureOf('home').some((i) => !i.prop.flat)).toBe(true);
  });

  it('fires burn inside the room, and every house in the spike names a real set', () => {
    for (const s of sets) {
      const f = ROOM_SETS[s].fire;
      if (f) for (const v of [f.u, f.d]) expect(v, s).toBeGreaterThan(0), expect(v, s).toBeLessThan(1);
    }
    for (const h of SPIKE_LAYOUT.houses) expect(sets, h.id).toContain(h.room ?? 'home');
    // Not all the same inside.
    expect(new Set(SPIKE_LAYOUT.houses.map((h) => h.room ?? 'home')).size).toBeGreaterThanOrEqual(3);
  });
});
