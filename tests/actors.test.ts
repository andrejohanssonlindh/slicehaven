import { describe, expect, it } from 'vitest';
import { type FurnishedRoom, furnishHouse } from '../src/content/furnish';
import { type Actor, Walking, keeperRounds, newActor, stepRounds } from '../src/core/world3d/actors';
import { PLAN_SIZE } from '../src/core/world3d/house';
import { HouseIndex } from '../src/core/world3d/houses';
import { type PlacedHouse, furnitureObstacles, houseToWorld, levelWalls } from '../src/core/world3d/layout';
import { footprints } from '../src/core/world3d/roomplan';
import { NavGrid } from '../src/core/world3d/space';

/** Walking for everyone (`core/world3d/actors.ts`), on a patch with an inn and a cottage, as the world sets it up. */

const INN: PlacedHouse = { id: 'inn', x: 0, z: 0, rot: 0, spec: { seed: 4, ...PLAN_SIZE.inn, plan: 'inn', roof: 'shingle' }, room: 'inn' };
const COTTAGE: PlacedHouse = { id: 'cot', x: 22, z: 4, rot: 0.4, spec: { seed: 7, width: 5, depth: 4 } };

function setup(): { w: Walking; index: HouseIndex<FurnishedRoom[]> } {
  const index = new HouseIndex<FurnishedRoom[]>([INN, COTTAGE], (b) => {
    const rooms = furnishHouse(b.model, (b.place.room ?? 'home') as never, b.place.spec.seed);
    return { room: rooms, shapes: [...levelWalls(b, 0), ...furnitureObstacles(b, rooms.filter((r) => r.level === 0).flatMap((r) => footprints(r.plan)))], sources: [] };
  });
  const ground = new NavGrid(200, { near: (x0, z0, x1, z1) => index.shapesNear(x0, z0, x1, z1) }, { radius: 0.2 });
  const w = new Walking(ground, 200, {
    holding: (x, z) => index.houseContaining(x, z, -0.1)?.built ?? null,
    byId: (id) => {
      const p = index.byId(id);
      return p ? index.lite(p).built : null;
    },
    furniture: (b, level) => index.entry(b.place).room.filter((r) => r.level === level).flatMap((r) => footprints(r.plan)),
  });
  return { w, index };
}

/** Step until the walk is done (or time runs out); the storeys passed through. */
function walkOut(w: Walking, a: Actor, seconds = 120): Set<number> {
  const seen = new Set<number>([a.level]);
  for (let t = 0; t < seconds && a.legs.length; t += 0.05) {
    w.step(a, 0.05, 2);
    seen.add(a.level);
  }
  return seen;
}

const inside = (p: PlacedHouse, level: number, w: Walking): { x: number; z: number } => {
  const r = w.byId(p.id)!.model.levels[level].rooms[0].rect;
  return houseToWorld(p, (r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2);
};

describe('walking', () => {
  it('goes from the road up to the attic of the inn, by both flights, and ends there', () => {
    const { w } = setup();
    const a = newActor(0, 12);
    const p = inside(INN, 2, w);
    expect(w.walkTo(a, p.x, p.z, 2)).toBeGreaterThan(10);
    expect(a.legs.filter((l) => l.kind === 'climb').map((l) => l.kind === 'climb' && l.to)).toEqual([1, 2]);
    const seen = walkOut(w, a);
    expect(a.legs).toEqual([]);
    expect([...seen].sort()).toEqual([0, 1, 2]);
    expect(a).toMatchObject({ house: 'inn', level: 2, foot: null, stair: null });
  });

  it('comes down and out again, and is outdoors on the ground at the end', () => {
    const { w } = setup();
    const a = newActor(0, 12);
    const p = inside(INN, 2, w);
    w.walkTo(a, p.x, p.z, 2);
    walkOut(w, a);
    expect(w.walkTo(a, 6, 14)).not.toBeNull();
    walkOut(w, a);
    expect(a).toMatchObject({ house: null, level: 0, stair: null });
  });

  it('walks from one house into another (the inn upstairs to the cottage)', () => {
    const { w } = setup();
    const a = newActor(0, 12);
    const p = inside(INN, 1, w);
    w.walkTo(a, p.x, p.z, 1);
    walkOut(w, a);
    const q = inside(COTTAGE, 0, w);
    expect(w.walkTo(a, q.x, q.z)).not.toBeNull();
    walkOut(w, a);
    expect(a).toMatchObject({ house: 'cot', level: 0 });
  });

  it('can stop half way up a flight, and a new walk to the ground floor goes back down', () => {
    const { w } = setup();
    const a = newActor(0, 12);
    const p = inside(INN, 1, w);
    w.walkTo(a, p.x, p.z, 1);
    for (let t = 0; t < 60 && !a.stair; t += 0.05) w.step(a, 0.05, 2);
    w.step(a, 0.3, 2); // a little further up
    expect(a.stair).not.toBeNull();
    expect(a.stair!.t).toBeGreaterThan(0);
    expect(a.stair!.t).toBeLessThan(1);
    const g = inside(INN, 0, w);
    w.walkTo(a, g.x, g.z, 0);
    expect(a.legs[0]).toMatchObject({ kind: 'climb', to: 0 });
    walkOut(w, a);
    expect(a).toMatchObject({ house: 'inn', level: 0, stair: null });
  });

  it('steering into the foot of a flight takes them on to it, and on along it to the next storey', () => {
    const { w } = setup();
    const b = w.byId('inn')!, s = b.model.stairs[0];
    const foot = houseToWorld(INN, s.path[0].x, s.path[0].z), mouth = houseToWorld(INN, s.path[1].x, s.path[1].z);
    const a = newActor(foot.x, foot.z);
    w.settle(a);
    expect(a.house).toBe('inn');
    const d = Math.hypot(mouth.x - foot.x, mouth.z - foot.z);
    expect(w.steer(a, (mouth.x - foot.x) / d, (mouth.z - foot.z) / d, 0.1)).toBeNull();
    expect(a.stair).toMatchObject({ house: 'inn', i: 0 });
    const top = houseToWorld(INN, s.path[2].x, s.path[2].z), l = Math.hypot(top.x - mouth.x, top.z - mouth.z);
    for (let k = 0; k < 100 && a.stair; k++) w.steer(a, (top.x - mouth.x) / l, (top.z - mouth.z) / l, 0.1);
    expect(a).toMatchObject({ level: 1, stair: null, foot: null });
    expect(w.stairsHint(a)).toEqual({ up: true, down: true });
  });

  it('stepping out through the door puts them on the ground, whatever storey they were on', () => {
    const { w } = setup();
    const a = newActor(0, 0);
    w.settle(a);
    a.level = 1; // (as if they had been upstairs, then were moved out by hand)
    a.x = 0;
    a.z = 15;
    w.settle(a);
    expect(a).toMatchObject({ house: null, level: 0 });
  });

  it('an actor is plain data: it survives a trip through JSON mid-walk', () => {
    const { w } = setup();
    const a = newActor(0, 12);
    const p = inside(INN, 2, w);
    w.walkTo(a, p.x, p.z, 2);
    for (let t = 0; t < 8; t += 0.05) w.step(a, 0.05, 2);
    const b = JSON.parse(JSON.stringify(a)) as Actor;
    expect(b).toEqual(a);
    walkOut(w, b);
    expect(b).toMatchObject({ house: 'inn', level: 2 });
  });
});

describe('rounds', () => {
  it("the keeper's round visits every storey of the inn and comes back out to the door", () => {
    const { w } = setup();
    const r = keeperRounds(w.byId('inn')!);
    const levels = new Set<number>();
    let outdoors = 0;
    for (let t = 0; t < 600; t += 0.1) {
      stepRounds(w, r, 0.1, 2);
      if (r.actor.house === 'inn') levels.add(r.actor.level);
      else if (t > 5) outdoors++;
    }
    expect([...levels].sort()).toEqual([0, 1, 2]);
    expect(outdoors).toBeGreaterThan(0);
  });
});
