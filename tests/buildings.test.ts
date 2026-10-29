import { describe, expect, it } from 'vitest';
import { furnishHouse, type FurnishedRoom } from '../src/content/furnish';
import { type HouseModel, type HousePlan, PLAN_SIZE, buildHouse } from '../src/core/world3d/house';
import { type BuiltHouse, furnitureObstacles, houseWalls, levelWalls } from '../src/core/world3d/layout';
import { buildHouses } from '../src/core/world3d/layout';
import { footprints } from '../src/core/world3d/roomplan';
import { NavGrid, findPath, pathLength } from '../src/core/world3d/space';

/** The bigger buildings: the inn, the shop and the stable, with their storeys, stairs and rooms. */

const PLANS: { plan: Exclude<HousePlan, 'cottage'>; main: string; levels: number; stairs: number }[] = [
  { plan: 'inn', main: 'inn', levels: 3, stairs: 2 },
  { plan: 'shop', main: 'general', levels: 2, stairs: 1 },
  { plan: 'stable', main: 'home', levels: 1, stairs: 0 },
];

const make = (plan: Exclude<HousePlan, 'cottage'>, seed = 4): { built: BuiltHouse; rooms: FurnishedRoom[]; model: HouseModel } => {
  const { width, depth } = PLAN_SIZE[plan];
  const built = buildHouses({ houses: [{ id: plan, x: 0, z: 0, rot: 0, spec: { seed, width, depth, plan, roof: 'shingle' }, room: PLANS.find((p) => p.plan === plan)!.main }] })[0];
  return { built, rooms: furnishHouse(built.model, PLANS.find((p) => p.plan === plan)!.main as never, seed), model: built.model };
};

/** The walking grid of one storey, as the world builds it. */
const navOf = ({ built, rooms }: { built: BuiltHouse; rooms: FurnishedRoom[] }, level: number): NavGrid =>
  new NavGrid(80, [...levelWalls(built, level), ...furnitureObstacles(built, rooms.filter((r) => r.level === level).flatMap((r) => footprints(r.plan)))], { radius: 0.2 });

describe('the bigger buildings', () => {
  it('are bigger than a cottage by the right amount, with the right storeys and stairs', () => {
    const small = 5 * 4;
    for (const p of PLANS) {
      const { model } = make(p.plan);
      expect(model.levels.length, p.plan).toBe(p.levels);
      expect(model.stairs.length, p.plan).toBe(p.stairs);
    }
    // The inn is about six cottages on the ground (5 to 6 times), the shop two to three, the stable three.
    const area = (p: keyof typeof PLAN_SIZE): number => PLAN_SIZE[p].width * PLAN_SIZE[p].depth;
    expect(area('inn') / small).toBeGreaterThan(4.8);
    expect(area('inn') / small).toBeLessThan(6.5);
    expect(area('shop') / small).toBeGreaterThan(2);
    expect(area('stable') / small).toBeGreaterThan(2.5);
  });

  it('have floors one above the other, with a stair rising to each', () => {
    for (const p of PLANS) {
      const { model } = make(p.plan);
      model.levels.forEach((lv, i) => {
        if (i > 0) expect(lv.floorY, `${p.plan} floor ${i}`).toBeGreaterThan(model.levels[i - 1].floorY + 2);
      });
      for (const s of model.stairs) {
        expect(s.to).toBe(s.from + 1);
        // The walk up climbs from one floor to the next, and no step is higher than a person will take.
        expect(s.path[0].y).toBeCloseTo(model.levels[s.from].floorY);
        expect(s.path[3].y).toBeCloseTo(model.levels[s.to].floorY);
        const rise = s.path[3].y - s.path[0].y, run = s.rect.x1 - s.rect.x0;
        expect(rise / (run / 0.26), `${p.plan} riser`).toBeLessThan(0.21);
        // The stair is inside the walls.
        expect(s.rect.x0).toBeGreaterThan(model.room.x0 - 1e-6);
        expect(s.rect.x1).toBeLessThan(model.room.x1);
      }
    }
  });

  it('are furnished in every room, with the beds an inn needs and a horse in each stall', () => {
    const inn = make('inn');
    const beds = (rooms: FurnishedRoom[], level: number): number => rooms.filter((r) => r.level === level).reduce((n, r) => n + r.plan.pieces.filter((q) => q.id.startsWith('bed')).length, 0);
    expect(beds(inn.rooms, 1), 'guest room beds').toBeGreaterThanOrEqual(5);
    expect(beds(inn.rooms, 2), 'attic beds').toBeGreaterThanOrEqual(3);
    // Every guest room has at least one.
    for (const r of inn.rooms.filter((q) => q.room.role === 'guest')) expect(r.plan.pieces.some((q) => q.id.startsWith('bed'))).toBe(true);
    const stable = make('stable');
    const stalls = stable.rooms.filter((r) => r.room.role === 'stall');
    expect(stalls.length).toBeGreaterThanOrEqual(4);
    for (const s of stalls) expect(s.plan.pieces.some((q) => q.id === 'horse')).toBe(true);
    // And the horses are not all the same colour.
    const coats = new Set(stalls.map((s) => JSON.stringify(Array.from(s.props.get('horse')!.frames[0].data.slice(0, 4000)))));
    expect(coats.size).toBeGreaterThan(1);
  });

  it('keep furniture inside its room, off the stairs, off each other', () => {
    for (const p of PLANS) {
      const { rooms } = make(p.plan);
      for (const r of rooms) {
        const fps = footprints(r.plan);
        const rc = r.room.rect;
        fps.forEach((f, i) => {
          expect(f.x - f.hw, `${p.plan} ${r.room.role} ${f.id}`).toBeGreaterThanOrEqual(rc.x0 - 1e-6);
          expect(f.x + f.hw, `${p.plan} ${r.room.role} ${f.id}`).toBeLessThanOrEqual(rc.x1 + 1e-6);
          expect(f.z - f.hd, `${p.plan} ${r.room.role} ${f.id}`).toBeGreaterThanOrEqual(rc.z0 - 1e-6);
          expect(f.z + f.hd, `${p.plan} ${r.room.role} ${f.id}`).toBeLessThanOrEqual(rc.z1 + 1e-6);
          for (const q of r.room.reserved) {
            const clear = f.x + f.hw <= q.x0 || f.x - f.hw >= q.x1 || f.z + f.hd <= q.z0 || f.z - f.hd >= q.z1;
            expect(clear, `${p.plan} ${r.room.role} ${f.id} is on the stairs`).toBe(true);
          }
          for (const g of fps.slice(i + 1)) expect(Math.abs(f.x - g.x) < f.hw + g.hw && Math.abs(f.z - g.z) < f.hd + g.hd, `${f.id} / ${g.id}`).toBe(false);
        });
      }
    }
  });

  it('can be walked: from the door to the foot of the stairs, up to each floor, and to every room', () => {
    for (const p of PLANS) {
      const house = make(p.plan);
      const { model } = house;
      const doorOut = { x: model.door[0], z: model.door[2] + 1.5 };
      const ground = navOf(house, 0);
      const goes = (nav: NavGrid, a: { x: number; z: number }, b: { x: number; z: number }, what: string): void => {
        const path = findPath(nav, a, b);
        expect(path, `${p.plan}: ${what}`).not.toBeNull();
        // The far end really is where it was asked for (a goal in a wall would be moved to the nearest free spot).
        const end = path![path!.length - 1];
        expect(Math.hypot(end.x - b.x, end.z - b.z), `${p.plan}: ${what} ends near`).toBeLessThan(1.2);
        expect(pathLength(path!)).toBeGreaterThan(0);
      };
      // Ground floor: the door reaches the middle of every room (the stalls' fronts too) and the first flight's foot.
      for (const r of house.rooms.filter((q) => q.level === 0)) {
        const c = r.room.rect;
        goes(ground, doorOut, { x: r.room.role === 'stall' ? r.room.doorX : (c.x0 + c.x1) / 2, z: r.room.role === 'stall' ? c.z1 - 0.2 : (c.z0 + c.z1) / 2 + 0.3 }, `door to ${r.room.role}`);
      }
      for (const s of model.stairs) {
        const nav = navOf(house, s.from);
        const lower = s.path[0];
        // The foot is reachable from where you come in on that floor (the door below; the head of the flight below that above).
        const arrive = s.from === 0 ? doorOut : model.stairs.find((q) => q.to === s.from)!.path[3];
        goes(nav, arrive, lower, `to the foot of the flight from floor ${s.from}`);
        // And at the top the head reaches every room of the floor above.
        const up = navOf(house, s.to);
        for (const r of house.rooms.filter((q) => q.level === s.to)) {
          const c = r.room.rect;
          goes(up, s.path[3], { x: (c.x0 + c.x1) / 2, z: r.room.role === 'landing' ? c.z0 + 0.5 : (c.z0 + c.z1) / 2 }, `head to ${r.room.role} on floor ${s.to}`);
        }
      }
    }
  });

  it('close a floor above the ground behind real walls, with a door gap only on the ground', () => {
    const { built } = make('inn');
    expect(houseWalls(built, true).length).toBe(houseWalls(built, false).length + 1);
  });

  it('are deterministic', () => {
    for (const p of PLANS) expect(JSON.stringify(make(p.plan, 9).model)).toBe(JSON.stringify(make(p.plan, 9).model));
    const a = buildHouse({ seed: 3, width: 12.4, depth: 8.4, plan: 'inn' });
    expect(a.parts.every((x) => x.mesh.positions.every(Number.isFinite))).toBe(true);
  });
});
