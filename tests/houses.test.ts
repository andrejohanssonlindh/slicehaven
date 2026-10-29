import { describe, expect, it } from 'vitest';
import { HouseIndex } from '../src/core/world3d/houses';
import type { PlacedHouse } from '../src/core/world3d/layout';

/** A street of houses along x, every 20 m, north and south of it. */
const street = (n: number): PlacedHouse[] =>
  Array.from({ length: n }, (_, k): PlacedHouse => ({ id: `h${k}`, x: k * 20, z: k % 2 ? 12 : -12, rot: 0, spec: { seed: k, width: 5, depth: 4 } }));

describe('the house index', () => {
  it('knows which houses stand in a chunk, and finds the ones near a place without making the rest', () => {
    let made = 0;
    const idx = new HouseIndex(street(200), () => (made++, { room: null, shapes: [], sources: [] }));
    // Chunk (0, -1) holds the houses at z -12 with x in 0..32 (that is x = 0 only: 20 is north of the street) - and chunk (0, 0) the rest.
    const inChunks = [-1, 0].flatMap((j) => [0, 1].flatMap((i) => idx.inChunk(i, j)));
    expect(inChunks.map((h) => h.id).sort()).toEqual(['h0', 'h1', 'h2', 'h3']);
    const near = idx.near(1000, -5, 1030, 5);
    expect(near.length).toBeGreaterThan(0);
    expect(near.length).toBeLessThan(8);
    expect(made).toBe(near.length);
    expect(idx.made).toBe(near.length);
    // Asking again makes nothing new.
    idx.near(1000, -5, 1030, 5);
    expect(made).toBe(near.length);
  });

  it('boxes are cheap: asking for them does not furnish anything', () => {
    let made = 0;
    const idx = new HouseIndex(street(50), () => (made++, { room: null, shapes: [], sources: [] }));
    expect(idx.outerBoxesNear(400, -12, 5).length).toBeGreaterThan(0);
    expect(idx.houseContaining(400, -12)?.built.place.id).toBe('h20');
    expect(idx.houseContaining(400, 0)).toBeNull();
    expect(made).toBe(0);
  });

  it('the sources of a room are found by rectangle', () => {
    const idx = new HouseIndex(street(10), (b) => ({ room: null, shapes: [], sources: [{ x: b.place.x, z: b.place.z, kind: 'fire' as const }] }));
    expect(idx.sourcesIn(35, -20, 45, 20).map((s) => s.x)).toEqual([40]);
    expect(idx.sourcesIn(1000, 1000, 1010, 1010)).toEqual([]);
  });
});
