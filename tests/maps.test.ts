import { describe, expect, it } from 'vitest';
import { MAPS, mapNamed } from '../src/content/maps';
import { THINGS } from '../src/content/things';
import { type CompiledMap, type MapSpec, compileMap, roadLength, roadPoint } from '../src/core/world3d/mapgen';

const compile = (spec: MapSpec): CompiledMap => compileMap(spec, THINGS);

/** The gate every map passes: whatever the author wrote, it compiles to a world with nothing wrong in it. */
describe('every map', () => {
  for (const name of Object.keys(MAPS)) {
    it(`${name} compiles with no problems`, () => {
      const c = mapNamed(name);
      expect(c.problems).toEqual([]);
      expect(c.layout.houses.length).toBe(MAPS[name].houses.length);
    });

    it(`${name} compiles the same every time`, () => {
      expect(JSON.stringify(compile(MAPS[name]))).toBe(JSON.stringify(compile(MAPS[name])));
    });
  }
});

describe('placing along a road', () => {
  const base: MapSpec = {
    name: 't', seed: 1, size: 120, roads: [{ pts: [[-50, 0], [50, 0]], width: 3 }], houses: [], hero: [0, 0],
  };

  it('puts houses on the named side, facing the road, with the gap asked for', () => {
    const c = compile({
      ...base,
      houses: [
        { id: 'n', size: 'medium', at: { road: 0, t: 0.5, side: 'north', gap: 2 } },
        { id: 's', size: 'medium', at: { road: 0, t: 0.5, side: 'south', gap: 2 } },
      ],
    });
    const [n, s] = c.layout.houses;
    expect(n.z).toBeLessThan(0);
    expect(s.z).toBeGreaterThan(0);
    // Door (local +z) toward the road: world (sin rot, cos rot) points at it.
    expect(Math.cos(n.rot)).toBeGreaterThan(0.95); // north house faces south, +z
    expect(Math.cos(s.rot)).toBeLessThan(-0.95); // south house faces north, -z
    // Porch to road edge = gap.
    expect(Math.abs(n.z) - (4.6 / 2 + 0.6) - 1.5).toBeCloseTo(2, 0);
    expect(c.problems).toEqual([]);
  });

  it('reports a house in the lake, a road clash, and two houses touching', () => {
    const c = compile({
      ...base,
      lake: { x: 0, z: -12, r: 6 },
      houses: [
        { id: 'wet', at: { x: 0, z: -12 } },
        { id: 'onroad', at: { x: 30, z: 0 } },
        { id: 'a', at: { x: -30, z: 20 } },
        { id: 'b', at: { x: -33, z: 20 } },
      ],
    });
    expect(c.problems.some((p) => p.includes('wet') && p.includes('lake'))).toBe(true);
    expect(c.problems.some((p) => p.includes('onroad') && p.includes('road'))).toBe(true);
    expect(c.problems.some((p) => p.includes('a and b') || p.includes('b and a'))).toBe(true);
  });

  it('scatters keep clear of houses, roads, water and each other, and say when there is no room', () => {
    const c = compile({
      ...base,
      lake: { x: 30, z: 30, r: 8 },
      houses: [{ id: 'h', size: 'medium', at: { road: 0, t: 0.5, side: 'north' } }],
      scatter: [{ kind: 'tree', count: 40, area: { all: true } }, { kind: 'shrub', count: 25, area: { circle: [0, 20, 15] } }],
    });
    expect(c.problems).toEqual([]);
    expect(c.layout.trees.length).toBe(40);
    for (let i = 0; i < c.layout.trees.length; i++) {
      const t = c.layout.trees[i];
      expect(Math.abs(t.z)).toBeGreaterThan(1.5 + 1.4); // off the road
      expect(Math.hypot(t.x - 30, t.z - 30)).toBeGreaterThan(8 + 1.5); // off the lake
      for (let j = i + 1; j < c.layout.trees.length; j++) expect(Math.hypot(t.x - c.layout.trees[j].x, t.z - c.layout.trees[j].z)).toBeGreaterThan(2.5);
    }
    const crowded = compile({ ...base, size: 30, scatter: [{ kind: 'tree', count: 400, area: { all: true } }] });
    expect(crowded.problems.some((p) => p.includes('only room for'))).toBe(true);
  });

  it('lines torches up along a road, and stamps door mud', () => {
    const c = compile({
      ...base,
      doorMud: true,
      houses: [{ id: 'h', at: { road: 0, t: 0.5, side: 'north' } }],
      torchLines: [{ road: 0, every: 10, side: 'south' }],
    });
    const posts = c.layout.props.filter((p) => p.kind === 'torchpost');
    expect(posts.length).toBe(10);
    for (const { z } of posts) expect(z).toBeGreaterThan(1.5);
    expect(c.ground.mud.length).toBe(1);
    expect(roadLength(base.roads[0])).toBe(100);
    expect(roadPoint(base.roads[0], 25)).toMatchObject({ x: -25, z: 0, tx: 1, tz: 0 });
  });

  it('starts the hero in front of the named house, and complains about an unknown one', () => {
    const c = compile({ ...base, houses: [{ id: 'h', at: { road: 0, t: 0.5, side: 'north' } }], hero: { house: 'h' } });
    expect(c.problems).toEqual([]);
    expect(c.hero[1]).toBeLessThan(1.5); // between the house and the road, not across it
    expect(compile({ ...base, hero: { house: 'nope' } }).problems.some((p) => p.includes('nope'))).toBe(true);
  });
});
