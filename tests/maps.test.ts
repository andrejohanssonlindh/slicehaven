import { describe, expect, it } from 'vitest';
import { MAPS, MAP_RULES, compile, housePieces, mapNamed } from '../src/content/maps';
import { THINGS } from '../src/content/things';
import { type MapSpec, compileMap, roadLength, roadPoint } from '../src/core/world3d/mapgen';

describe('houses against the view (review item 10)', () => {
  const at = (side: 'north' | 'south') => ({ road: 0, t: 0.5, side });
  const spec = (side: 'north' | 'south', plan?: string): MapSpec => ({
    name: 't', seed: 1, size: 80, roads: [{ pts: [[-40, 0], [40, 0]], width: 3 }], hero: [0, 0], houses: [{ id: 'h', at: at(side), ...(plan ? { plan } : {}) }],
  });
  const problems = (s: MapSpec): string[] => compileMap(s, THINGS, { pieces: housePieces }).problems;

  it('a stable or an inn turned away from the view is reported (its horses and beds are painted from the front)', () => {
    expect(problems(spec('south', 'stable'))).toEqual([expect.stringMatching(/house h faces away from the view, and its horse/)]);
    expect(problems(spec('south', 'inn'))).toEqual([expect.stringMatching(/house h faces away from the view, and its bed/)]);
    expect(problems(spec('north', 'stable'))).toEqual([]);
  });

  it('a cottage may face any way (nothing in it is painted for one way of looking)', () => {
    expect(problems(spec('south'))).toEqual([]);
  });
});

/** The gate every map passes: whatever the author wrote, it compiles to a world with nothing wrong in it. */
describe('every map', () => {
  it('is a JSON file in content/maps, found without a list', () => {
    expect(Object.keys(MAPS).sort()).toEqual(expect.arrayContaining(['hamlet', 'spike', 'wilds']));
    for (const [name, m] of Object.entries(MAPS)) expect(m.name).toBe(name);
  });

  for (const name of Object.keys(MAPS)) {
    it(`${name} compiles with no problems`, () => {
      const c = mapNamed(name);
      expect(c.problems).toEqual([]);
      expect(c.layout.houses.length).toBeGreaterThan(0);
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
        { id: 's', size: 'medium', at: { road: 0, m: 50, side: 'south', gap: 2 } },
      ],
    });
    const [n, s] = c.layout.houses;
    expect(n.z).toBeLessThan(0);
    expect(s.z).toBeGreaterThan(0);
    // (Half way, as a share or in metres, is the same spot.)
    expect(s.x).toBeCloseTo(n.x, 0);
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
      rules: [{ rule: 'scatter', kind: 'tree', count: 40, area: { all: true } }, { rule: 'scatter', kind: 'shrub', count: 25, area: { circle: [0, 20, 15] } }],
    });
    expect(c.problems).toEqual([]);
    expect(c.layout.trees.length).toBe(40);
    for (let i = 0; i < c.layout.trees.length; i++) {
      const t = c.layout.trees[i];
      expect(Math.abs(t.z)).toBeGreaterThan(1.5 + 1.4); // off the road
      expect(Math.hypot(t.x - 30, t.z - 30)).toBeGreaterThan(8 + 1.5); // off the lake
      for (let j = i + 1; j < c.layout.trees.length; j++) expect(Math.hypot(t.x - c.layout.trees[j].x, t.z - c.layout.trees[j].z)).toBeGreaterThan(2.5);
    }
    const crowded = compile({ ...base, size: 30, rules: [{ rule: 'scatter', kind: 'tree', count: 400, area: { all: true } }] });
    expect(crowded.problems.some((p) => p.includes('only room for'))).toBe(true);
  });

  it('lines torches up along a road, and stamps door mud', () => {
    const c = compile({
      ...base,
      doorMud: true,
      houses: [{ id: 'h', at: { road: 0, t: 0.5, side: 'north' } }],
      rules: [{ rule: 'torches', road: 0, every: 10, side: 'south' }],
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

describe('map rules', () => {
  const base: MapSpec = { name: 't', seed: 1, size: 400, roads: [{ pts: [[-200, 0], [200, 0]], width: 3 }], hero: [0, 0] };

  it('are files in content/maps/rules, each with a name maps call it by', () => {
    expect(Object.keys(MAP_RULES).sort()).toEqual(expect.arrayContaining(['scatter', 'street', 'torches']));
  });

  it('a street by turns: a house every so many metres on both sides, each the next look, a look with a `max` only that often', () => {
    const c = compile({
      ...base,
      rules: [{
        rule: 'street', id: 'st', road: 0, from: 20, to: 120, every: 20, sides: ['north', 'south'],
        cycle: [{ size: 'small' }, { room: 'inn', size: 'large', max: 1 }],
      }],
    });
    expect(c.problems).toEqual([]);
    expect(c.layout.houses.map((h) => h.id)).toEqual(['st0n', 'st0s', 'st1n', 'st1s', 'st2n', 'st2s', 'st3n', 'st3s', 'st4n', 'st4s']);
    expect(c.layout.houses.filter((h) => h.room === 'inn').length).toBe(1);
    // A house every 20 m along the road (x), north (z < 0) and south of it.
    const north = c.layout.houses.filter((h) => h.id.endsWith('n'));
    for (let k = 1; k < north.length; k++) expect(north[k].x - north[k - 1].x).toBeCloseTo(20, 0);
    expect(north.every((h) => h.z < 0)).toBe(true);
  });

  it('a listed street: the houses in order, their ids kept, both sides of each spot', () => {
    const c = compile({ ...base, rules: [{ rule: 'street', road: 0, from: 30, every: 25, houses: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }] });
    expect(c.problems).toEqual([]);
    const [a, b, cc] = c.layout.houses;
    expect([a.id, b.id, cc.id]).toEqual(['a', 'b', 'c']);
    expect(a.z < 0 && b.z > 0).toBe(true);
    expect(cc.x - a.x).toBeCloseTo(25, 0);
  });

  it('wilds: the hamlet and Eastgate are streets (one inn in Eastgate, as before)', () => {
    const w = mapNamed('wilds');
    expect(w.layout.houses.filter((h) => h.id.startsWith('east')).length).toBe(70);
    expect(w.layout.houses.filter((h) => h.room === 'inn').map((h) => h.id)).toEqual(['inn', 'east3n']);
  });

  it('a typo is reported: an unknown key anywhere, an unknown rule, a key a rule does not take', () => {
    const c = compile({
      ...base,
      // (Typos on purpose: TypeScript would catch these in code, JSON has nobody else.)
      ...({ rooof: 1 } as object),
      houses: [{ id: 'h', at: { road: 0, t: 0.5, side: 'north', sidee: 1 } as never, colour: 'red' } as never],
      rules: [{ rule: 'avenue' }, { rule: 'torches', road: 0, every: 10, side: 'south', evry: 3 }],
    });
    expect(c.problems).toEqual(expect.arrayContaining([
      'map: unknown key "rooof"',
      'house h: unknown key "colour"',
      'house h at: unknown key "sidee"',
      'rule 1: no map rule called avenue',
      'rule 2 (torches): unknown key "evry"',
    ]));
  });

  it('the wilds keep their woods to an area, written as data', () => {
    const c = compile({ ...base, wild: { trees: 40, area: { rect: [0, -200, 200, 200] } } });
    const west = c.placed.chunk(-3, 1), east = c.placed.chunk(2, 1);
    expect(west.trees.length).toBe(0);
    expect(east.trees.length).toBeGreaterThan(0);
  });
});
