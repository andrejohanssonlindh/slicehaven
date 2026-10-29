import { describe, expect, it } from 'vitest';
import type { HexFilaments } from '../src/core/filaments';
import { hex, hexKey, hexesWithin } from '../src/core/hex';
import { sense, senseDetail, senseRadius } from '../src/core/sensing';

const reading = (level: number) => ({ level, raw: level, parts: [{ label: 'test', value: level }] });
function flatMap(level: number): Map<string, HexFilaments> {
  const m = new Map<string, HexFilaments>();
  for (const h of hexesWithin(hex(0, 0), 8)) {
    m.set(hexKey(h), { bio: reading(level), foto: reading(0), geo: reading(0), hydro: reading(0), nekro: reading(0), pneumo: reading(0), pyro: reading(0), skoto: reading(-level), termo: reading(0), kryo: reading(0), helio: reading(0), astro: reading(0), selene: reading(0), kosmo: reading(0), ikono: reading(0), semo: reading(0) });
  }
  return m;
}

describe('sensing', () => {
  it('reaches further with better rolls, up to 6 hexes', () => {
    expect([0, 1, 2, 3, 5, 7, 20].map(senseRadius)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('senses close hexes more clearly', () => {
    expect(senseDetail(4, 0)).toBe('exact');
    expect(senseDetail(4, 2)).toBe('level');
    expect(senseDetail(4, 4)).toBe('sign');
  });

  it('reads the filament map around the caster', () => {
    const r = sense(flatMap(2), hex(0, 0), 2, ['bio', 'skoto']);
    expect(r.radius).toBe(2);
    expect(r.hexes).toHaveLength(19);
    const far = r.hexes.find((h) => h.distance === 2)!;
    expect(far.aspects).toEqual({ bio: 1, skoto: -1 });
    expect(r.hexes.find((h) => h.distance === 0)!.aspects.bio).toBe(2);
  });
});
