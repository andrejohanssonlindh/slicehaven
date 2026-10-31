import { describe, expect, it } from 'vitest';
import { BEHAVIOURS } from '../src/content/behaviours';
import { type FurnishedRoom, furnishHouse } from '../src/content/furnish';
import { THINGS } from '../src/content/things';
import { Walking } from '../src/core/world3d/actors';
import { type Clock, type DoEntry, type Mind, type Place, newMind, scheduleProblems, stepMind } from '../src/core/world3d/behave';
import { HouseIndex } from '../src/core/world3d/houses';
import { type PlacedHouse, furnitureObstacles, levelWalls } from '../src/core/world3d/layout';
import { compileMap } from '../src/core/world3d/mapgen';
import { compile } from '../src/content/maps';
import { footprints } from '../src/core/world3d/roomplan';
import { NavGrid } from '../src/core/world3d/space';

/** What people do (`core/world3d/behave.ts`, `content/behaviours/`): schedules of behaviours, on the real walking grid. */

const INN: PlacedHouse = { id: 'inn', x: 0, z: -20, rot: 0, spec: { seed: 4, ...THINGS.building('inn').size!, plan: 'inn', roof: 'shingle' }, room: 'taproom' };
const COT: PlacedHouse = { id: 'cot', x: 25, z: -20, rot: 0, spec: { seed: 7, width: 5, depth: 4 } };

function setup(): Walking {
  const index = new HouseIndex<FurnishedRoom[]>([INN, COT], (b) => {
    const rooms = furnishHouse(b.model, (b.place.room ?? 'home') as never, b.place.spec.seed);
    return { room: rooms, shapes: [...levelWalls(b, 0), ...furnitureObstacles(b, rooms.filter((r) => r.level === 0).flatMap((r) => footprints(r.plan)))], sources: [] };
  }, THINGS);
  const ground = new NavGrid(200, { near: (x0, z0, x1, z1) => index.shapesNear(x0, z0, x1, z1) }, { radius: 0.2 });
  return new Walking(ground, 200, {
    holding: (x, z) => index.houseContaining(x, z, -0.1)?.built ?? null,
    byId: (id) => {
      const p = index.byId(id);
      return p ? index.lite(p).built : null;
    },
    furniture: (b, level) => index.entry(b.place).room.filter((r) => r.level === level).flatMap((r) => footprints(r.plan)),
  });
}

const PLACES: Record<string, Place> = {
  square: { kind: 'area', area: { circle: [0, 15, 6] } },
  well: { kind: 'spot', x: 0, z: 15 },
  lane: { kind: 'path', pts: [[-20, 5], [20, 5]], loop: false },
  camp: { kind: 'path', pts: [[30, 10], [40, 10], [40, 20], [30, 20]], loop: true },
};

/** Run some people for a while; what each was doing, and where, at the end. */
function run(minds: Mind[], does: DoEntry[], clock: Clock, seconds: number, w = setup()): Mind[] {
  for (let t = 0; t < seconds; t += 0.1) for (const m of minds) stepMind(m, does, BEHAVIOURS, { walking: w, places: PLACES, clock }, 0.1);
  return minds;
}

const DAY: Clock = { hour: 10, events: new Set() };
const NIGHT: Clock = { hour: 23, events: new Set() };

describe('behaviours', () => {
  it('are files in content/behaviours, each with a name schedules use', () => {
    expect(Object.keys(BEHAVIOURS.does).sort()).toEqual(expect.arrayContaining(['attend', 'beat', 'home', 'patrol', 'rounds', 'stay', 'wander']));
    expect(Object.keys(BEHAVIOURS.when).sort()).toEqual(expect.arrayContaining(['event', 'hours', 'notEvent']));
  });

  it('a schedule follows the first line that holds: wander the square by day, go home at night', () => {
    const does: DoEntry[] = [{ when: { hours: [8, 19] }, do: 'wander', in: 'square' }, { do: 'home' }];
    const day = run([newMind('a', 0, 5, 1, 0, 'cot')], does, DAY, 60)[0];
    expect(Math.hypot(day.actor.x, day.actor.z - 15)).toBeLessThan(7.5);
    const night = run([day], does, NIGHT, 60)[0];
    expect(night.entry).toBe(1);
    expect(night.actor.house).toBe('cot');
  });

  it('a crowd attends an event: each in their own spot round it, facing it, and goes back to its day when it ends', () => {
    const does: DoEntry[] = [{ when: { event: 'hanging' }, do: 'attend', at: 'well', ring: 3 }, { do: 'wander', in: 'square' }];
    const crowd = Array.from({ length: 14 }, (_, n) => newMind(`p${n}`, -10 + n, 0, n, n));
    const hanging: Clock = { hour: 12, events: new Set(['hanging']) };
    run(crowd, does, hanging, 40);
    for (const m of crowd) {
      const d = Math.hypot(m.actor.x, m.actor.z - 15);
      expect(d).toBeGreaterThan(2.5);
      expect(d).toBeLessThan(5.5);
    }
    // Nobody shares a spot.
    for (let i = 0; i < crowd.length; i++) for (let j = i + 1; j < crowd.length; j++) expect(Math.hypot(crowd[i].actor.x - crowd[j].actor.x, crowd[i].actor.z - crowd[j].actor.z)).toBeGreaterThan(0.4);
    run(crowd, does, DAY, 1);
    expect(crowd.every((m) => m.entry === 1)).toBe(true);
  });

  it('a guard patrols a loop round a camp, and a walker beats a lane there and back', () => {
    const guard = newMind('g', 30, 10, 1);
    const seen = new Set<string>();
    const w = setup();
    for (let t = 0; t < 90; t += 0.1) {
      stepMind(guard, [{ do: 'patrol', path: 'camp', wait: 0.2 }], BEHAVIOURS, { walking: w, places: PLACES, clock: DAY }, 0.1);
      seen.add(`${Math.round(guard.actor.x / 10)},${Math.round(guard.actor.z / 10)}`);
    }
    expect(seen).toEqual(new Set(['3,1', '4,1', '4,2', '3,2']));
    const walker = newMind('w', -20, 5, 1);
    let east = -Infinity, westAfter = Infinity;
    for (let t = 0; t < 90; t += 0.1) {
      stepMind(walker, [{ do: 'beat', path: 'lane' }], BEHAVIOURS, { walking: w, places: PLACES, clock: DAY }, 0.1);
      east = Math.max(east, walker.actor.x);
      if (east > 19) westAfter = Math.min(westAfter, walker.actor.x);
    }
    expect(east).toBeGreaterThan(19);
    expect(westAfter).toBeLessThan(-10);
  });

  it('an innkeeper goes the rounds of the inn, up the stairs', () => {
    const m = newMind('k', 0, -10, 1, 0, 'inn');
    const levels = new Set<number>();
    const w = setup();
    for (let t = 0; t < 120; t += 0.1) {
      stepMind(m, [{ do: 'rounds', house: 'home' }], BEHAVIOURS, { walking: w, places: PLACES, clock: DAY }, 0.1);
      levels.add(m.actor.level);
    }
    expect(levels.has(1)).toBe(true);
  });

  it('a mind is plain data: through JSON and back, it carries on the same', () => {
    const does: DoEntry[] = [{ do: 'wander', in: 'square' }];
    const w = setup();
    const a = run([newMind('a', 0, 10, 3)], does, DAY, 10, w)[0];
    const b = JSON.parse(JSON.stringify(a)) as Mind;
    run([a], does, DAY, 10, w);
    run([b], does, DAY, 10, w);
    expect(b.actor.x).toBeCloseTo(a.actor.x, 6);
    expect(b.actor.z).toBeCloseTo(a.actor.z, 6);
  });

  it('a schedule naming what is not there is reported', () => {
    const bad = scheduleProblems([
      { do: 'dance' },
      { do: 'wander', in: 'plaza', when: { hours: [8], moon: 'full' } },
      { do: 'home', house: 'castle', colour: 'red' },
      { do: 'stay' },
    ], BEHAVIOURS, PLACES, new Set(['inn']));
    expect(bad).toEqual(expect.arrayContaining([
      'line 1: no behaviour called dance',
      'line 2 (wander): no place called plaza',
      'line 2 (wander): hours: give [from, to] in hours, 0 to 24',
      'line 2 (wander): no condition called moon',
      'line 3 (home): no house castle',
      'line 3 (home): unknown key "colour"',
      'line 4 (stay): needs "at"',
    ]));
  });
});

describe('places, events and crowds in a map', () => {
  const base = { name: 't', seed: 1, size: 120, roads: [{ pts: [[-60, 0], [60, 0]] as [number, number][], width: 3 }], hero: [0, 6] as [number, number] };

  it('places are worked out: a stretch of road is a path, a loop goes round an area outside it', () => {
    const c = compile({ ...base, places: { lane: { road: 0, from: 10, to: 100 }, ring: { around: { rect: [10, 10, 20, 20] }, margin: 2 } } });
    expect(c.problems).toEqual([]);
    expect(c.places.lane).toMatchObject({ kind: 'path', loop: false });
    expect(c.places.ring).toEqual({ kind: 'path', loop: true, pts: [[8, 8], [22, 8], [22, 22], [8, 22]] });
  });

  it('a crowd is people of kinds and homes in turn, numbered so they spread out, starting at their doors', () => {
    const c = compile({
      ...base,
      houses: [{ id: 'h1', at: { road: 0, t: 0.4, side: 'north' } }, { id: 'h2', at: { road: 0, t: 0.6, side: 'north' } }],
      places: { green: { area: { circle: [0, 20, 6] } } },
      rules: [{ rule: 'crowd', id: 'folk', count: 4, kinds: [['human'], ['dwarf']], homes: ['h1', 'h2'], does: [{ do: 'wander', in: 'green' }] }],
    });
    expect(c.problems).toEqual([]);
    expect(c.cast.map((p) => [p.id, p.is[0], p.home, p.slot])).toEqual([['folk0', 'human', 'h1', 0], ['folk1', 'dwarf', 'h2', 1], ['folk2', 'human', 'h1', 2], ['folk3', 'dwarf', 'h2', 3]]);
    expect(c.cast[0].start[1]).toBeLessThan(0); // (outside h1's door, north of the road)
  });

  it('the map reports a schedule that names what is not there, and an unknown key in a place', () => {
    const c = compile({ ...base, places: { x: { at: [1, 1], colour: 'red' } as never }, people: [{ id: 'p', is: ['human'], does: [{ do: 'stay', at: 'nowhere' }] }] });
    expect(c.problems).toEqual(expect.arrayContaining(['place x: unknown key "colour"', 'person p: line 1 (stay): no place called nowhere']));
  });

  it('without a library of behaviours the compiler takes schedules as written', () => {
    expect(compileMap({ ...base, people: [{ id: 'p', is: ['human'], does: [{ do: 'dance' }] }] }, THINGS).problems).toEqual([]);
  });
});
