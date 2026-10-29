import { describe, expect, it } from 'vitest';
import { mapNamed } from '../src/content/maps';
import { type Ground3D, groundHeight, roadDist, splatAt } from '../src/core/world3d/terrain';

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const smooth = (e0: number, e1: number, v: number): number => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/** The ground's features are indexed in buckets; what a sample reads must be exactly what looping over all of them gives. */
describe('ground feature index', () => {
  const g = mapNamed('hamlet').ground;

  it('splat road, mud and shade equal the brute-force values everywhere sampled', () => {
    let seen = 0;
    for (let x = -70; x <= 70; x += 3.7) {
      for (let z = -70; z <= 70; z += 3.7) {
        let road = 0, mud = 0, shade = 0;
        for (const r of g.roads) road = Math.max(road, 1 - smooth(r.width * 0.35, r.width * 0.6, roadDist(r, x, z)));
        for (const m of g.mud) mud = Math.max(mud, 1 - smooth(m.r * 0.55, m.r, Math.hypot(x - m.x, z - m.z)));
        for (const s of g.shade) shade = Math.max(shade, 1 - smooth(s.r * 0.5, s.r, Math.hypot(x - s.x, z - s.z)));
        const sp = splatAt(g, x, z);
        expect(sp.road).toBeCloseTo(road, 9);
        expect(sp.mud).toBeCloseTo(mud, 9);
        expect(sp.shade).toBeCloseTo(shade, 9);
        if (road > 0 || shade > 0) seen++;
      }
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('a feature far away changes nothing here, and a feature added later is noticed', () => {
    const base = splatAt(g, 3, 3), h0 = groundHeight(g, 3, 3);
    const more: Ground3D = { ...g, mud: [...g.mud, { x: 5000, z: 5000, r: 4 }], pads: [...g.pads, { x: -5000, z: 0, hw: 3, hd: 3, rot: 0 }] };
    expect(splatAt(more, 3, 3)).toEqual(base);
    expect(groundHeight(more, 3, 3)).toBe(h0);
    expect(splatAt(more, 5000, 5000).mud).toBeGreaterThan(0.9);
    const grown = { ...g, mud: [...g.mud] };
    splatAt(grown, 3, 3);
    grown.mud.push({ x: 3, z: 3, r: 2 });
    expect(splatAt(grown, 3, 3).mud).toBeGreaterThan(0.9);
  });
});
