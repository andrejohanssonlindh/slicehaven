import { describe, expect, it } from 'vitest';
import { THINGS } from '../src/content/things';
import { HouseIndex } from '../src/core/world3d/houses';
import { MODEL_CACHE, type PlacedHouse, buildHouses, modelsHeld } from '../src/core/world3d/layout';

/** A street of houses along x, every 20 m, north and south of it. */
const street = (n: number): PlacedHouse[] =>
  Array.from({ length: n }, (_, k): PlacedHouse => ({ id: `h${k}`, x: k * 20, z: k % 2 ? 12 : -12, rot: 0, spec: { seed: k, width: 5, depth: 4 } }));

describe('the house index', () => {
  it('knows which houses stand in a chunk, and finds the ones near a place without making the rest', () => {
    let made = 0;
    const idx = new HouseIndex(street(200), () => (made++, { room: null, shapes: [], sources: [] }), THINGS);
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
    const idx = new HouseIndex(street(50), () => (made++, { room: null, shapes: [], sources: [] }), THINGS);
    expect(idx.outerBoxesNear(400, -12, 5).length).toBeGreaterThan(0);
    expect(idx.houseContaining(400, -12)?.built.place.id).toBe('h20');
    expect(idx.houseContaining(400, 0)).toBeNull();
    expect(made).toBe(0);
  });

  it('the sources of a room are found by rectangle', () => {
    const idx = new HouseIndex(street(10), (b) => ({ room: null, shapes: [], sources: [{ x: b.place.x, z: b.place.z, kind: 'fire' as const }] }), THINGS);
    expect(idx.sourcesIn(35, -20, 45, 20).map((s) => s.x)).toEqual([40]);
    expect(idx.sourcesIn(1000, 1000, 1010, 1010)).toEqual([]);
  });

  it('forgets furnished rooms it is told to, and makes them again, the same, when asked', () => {
    let made = 0;
    const idx = new HouseIndex(street(30), (b) => (made++, { room: b.place.id, shapes: [], sources: [] }), THINGS);
    idx.near(0, -20, 200, 20);
    const first = idx.made;
    expect(first).toBeGreaterThan(3);
    const gone = idx.forget((p) => p.x < 60);
    expect(gone).toBe(first - idx.made);
    expect(idx.made).toBeLessThan(first);
    const again = idx.near(0, -20, 200, 20);
    expect(idx.made).toBe(first);
    expect(again.map((e) => e.room)).toContain('h0');
  });

  it('forgets the models of far houses too, and builds them again the same (review item 6)', () => {
    const idx = new HouseIndex(street(30), (b) => ({ room: b.place.id, shapes: [], sources: [] }), THINGS);
    const before = JSON.stringify(idx.liteNear(0, -20, 600, 20).map((l) => l.built.model.parts.length));
    expect(idx.modelled).toBe(30);
    idx.forget((p) => p.x < 60);
    expect(idx.modelled).toBeLessThan(5);
    expect(JSON.stringify(idx.liteNear(0, -20, 600, 20).map((l) => l.built.model.parts.length))).toBe(before);
  });

  it('holds a bounded number of house models however many houses are built', () => {
    buildHouses({ houses: street(MODEL_CACHE + 50).map((h, i) => ({ ...h, spec: { ...h.spec, seed: 5000 + i } })) }, THINGS);
    expect(modelsHeld()).toBeLessThanOrEqual(MODEL_CACHE);
  });
});
