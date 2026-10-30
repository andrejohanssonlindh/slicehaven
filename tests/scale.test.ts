import { describe, expect, it } from 'vitest';
import { mapNamed } from '../src/content/maps';
import { spikeFilamentWorld } from '../src/content/spike3d';
import { THINGS } from '../src/content/things';
import { buildHouses } from '../src/core/world3d/layout';
import { CHUNK } from '../src/core/world3d/chunks';
import { FilamentField, type FilamentWorld } from '../src/core/world3d/filaments3d';
import { NavGrid, ShapeIndex, circle, findPath, shapeDist } from '../src/core/world3d/space';
import { lakeDist, roadDist } from '../src/core/world3d/terrain';

/** Maps of any size: nothing is paid for until a place is looked at, and what is made is the same however it is reached. */
describe('the wilds, eight kilometres across', () => {
  const t0 = performance.now();
  const map = mapNamed('wilds');
  const compileMs = performance.now() - t0;
  const g = map.ground;

  it('compiles at once and is clean', () => {
    expect(map.problems).toEqual([]);
    expect(g.size).toBe(8192);
    expect(compileMs).toBeLessThan(4000);
    expect(map.placed.generatedChunks).toBe(0); // nothing is made until somebody looks
  });

  it('a chunk is the same whenever and in whatever order it is made', () => {
    const first = JSON.stringify(map.placed.chunk(40, -3));
    for (let j = -8; j < 8; j++) for (let i = 30; i < 50; i++) map.placed.chunk(i, j); // wander elsewhere first
    expect(JSON.stringify(map.placed.chunk(40, -3))).toBe(first);
    // And it is a real wood: enough trees, kinds mixed.
    let trees = 0;
    const kinds = new Set<string>();
    for (let j = -8; j < 8; j++) for (let i = 30; i < 50; i++) for (const t of map.placed.chunk(i, j).trees) { trees++; kinds.add(t.kind ?? 'oak'); }
    expect(trees).toBeGreaterThan(800);
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });

  it('trees keep off the roads, the lake and the houses', () => {
    const houses = map.layout.houses.length;
    expect(houses).toBeGreaterThan(5);
    const cx = Math.floor(-1500 / CHUNK), cz = Math.floor(700 / CHUNK); // by the lake
    let checked = 0;
    for (let j = cz - 6; j <= cz + 6; j++) {
      for (let i = cx - 6; i <= cx + 6; i++) {
        for (const t of map.placed.chunk(i, j).trees) {
          expect(lakeDist(g, t.x, t.z)).toBeGreaterThan(1.5);
          for (const r of g.roads) expect(roadDist(r, t.x, t.z)).toBeGreaterThan(r.width / 2);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
    const h = map.layout.houses[0];
    for (const t of map.placed.chunk(Math.floor(h.x / CHUNK), Math.floor(h.z / CHUNK)).trees) expect(Math.hypot(t.x - h.x, t.z - h.z)).toBeGreaterThan(2);
  });

  it('the hero can walk three hundred metres through the woods and only the ground on the way is worked out', () => {
    const shapes = new ShapeIndex(); // houses and such: none here, the placed index is the source
    const nav = new NavGrid(g.size, { near: (x0, z0, x1, z1) => [...map.placed.near(x0, z0, x1, z1), ...shapes.near(x0, z0, x1, z1)] }, { radius: 0.2, blocked: (x, z) => lakeDist(g, x, z) < 0.2 });
    const madeBefore = map.placed.generatedChunks;
    const from = { x: map.hero[0], z: map.hero[1] };
    const to = { x: from.x + 300, z: from.z + 40 };
    const path = findPath(nav, from, to);
    expect(path).not.toBeNull();
    const p = path!;
    expect(Math.hypot(p[p.length - 1].x - to.x, p[p.length - 1].z - to.z)).toBeLessThan(2);
    for (let k = 0; k < p.length - 1; k++) {
      for (let s = 0; s <= 1; s += 0.05) {
        const x = p[k].x + (p[k + 1].x - p[k].x) * s, z = p[k].z + (p[k + 1].z - p[k].z) * s;
        for (const sh of map.placed.near(x - 1, z - 1, x + 1, z + 1)) expect(shapeDist(sh, x, z)).toBeGreaterThan(0);
      }
    }
    // A 300 m walk touches a corridor of the map, a tiny share of its 4096² blocks.
    expect(nav.blocksBuilt).toBeLessThan(6000);
    expect(map.placed.generatedChunks - madeBefore).toBeLessThan(150);
  });

  it('the filament field reads the far side of the map without building it', () => {
    const world: FilamentWorld = {
      size: g.size,
      ground: () => 'grass',
      indoors: () => false,
      sources: [],
      sourcesIn: (x0, z0, x1, z1) => map.placed.sourcesIn(x0, z0, x1, z1),
    };
    const field = new FilamentField(world);
    const t = performance.now();
    const r = field.readAt(3000, -2000);
    expect(r.foto).toBeDefined();
    expect(performance.now() - t).toBeLessThan(500);
  });

  it('the shape index finds what is near and forgets what is removed', () => {
    const ix = new ShapeIndex([], 8);
    const a = circle(100, 100, 1), b = circle(900, 900, 1);
    ix.add(a);
    ix.add(b);
    expect(ix.near(95, 95, 105, 105)).toEqual([a]);
    expect(ix.near(895, 895, 905, 905)).toEqual([b]);
    ix.remove(a);
    expect(ix.near(95, 95, 105, 105)).toEqual([]);
    expect(ix.count).toBe(1);
  });
});

describe('forgetting far ground', () => {
  it('lets go of generated chunks it is told to and makes them again the same', () => {
    const map = mapNamed('wilds');
    const at = (i: number, j: number): string => JSON.stringify(map.placed.chunk(i, j));
    const before = [at(-40, 3), at(-39, 3), at(40, 3)];
    map.placed.forget(() => false);
    expect(map.placed.generatedChunks).toBe(0);
    expect([at(-40, 3), at(-39, 3), at(40, 3)]).toEqual(before);
    expect(map.placed.generatedChunks).toBe(3);
    expect(map.placed.forget((i) => i > 0)).toBe(2);
    expect(map.placed.generatedChunks).toBe(1);
  });

  it('the walking grid lets go of far blocks and works them out again the same (review item 6)', () => {
    const grid = new NavGrid(400, [circle(100, 100, 2)], { radius: 0.2 });
    const probe = (): boolean[] => [[100, 100], [101.9, 100], [-150, -150], [150, -150]].map(([x, z]) => grid.walkable(x, z));
    const before = probe();
    expect(grid.blocksBuilt).toBe(3); // (the first two points share a block)
    expect(grid.forget((x) => x > 0)).toBe(1);
    expect(grid.blocksBuilt).toBe(2);
    expect(probe()).toEqual(before);
  });

  it('the filament field lets go of far cells and reads them again the same (review item 6)', () => {
    const map = mapNamed('spike');
    const field = new FilamentField(spikeFilamentWorld(map.ground, buildHouses(map.layout, THINGS)));
    const read = (): string => JSON.stringify([field.readAt(0, 0), field.readAt(-20, 20), field.readAt(25, -25)]);
    const before = read();
    expect(field.forget(() => false)).toBeGreaterThan(0);
    expect(read()).toBe(before);
    expect(field.forget(() => true)).toBe(0);
  });
});
