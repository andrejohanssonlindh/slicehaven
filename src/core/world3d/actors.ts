import { type BuiltHouse, furnitureObstacles, houseToWorld, levelWalls } from './layout';
import { NavGrid, type P2, findPath, followPath, pathLength } from './space';

/**
 * People who walk: the hero and everyone else. An `Actor` is plain data (where they stand, the house and storey they
 * are on, the walk in hand), so it can go into a save; houses are held by id, never by what the renderer stood up,
 * so a house streaming out of view changes nothing for the people in it. `Walking` plans and steps walks for any
 * actor: along a floor, out by the door, up and down the stairs, or steered by keys. `Rounds` is a routine on top of
 * it (the innkeeper's: room to room on every storey, and out to the door).
 *
 * The renderer only places cards where the actors are (`engine3d/world.ts`).
 */

export interface Pt3 {
  x: number;
  z: number;
  y: number;
}

/** A stage of a walk: along a floor, or up or down a flight of stairs (world points, each with the house-local height of the foot). */
export type Leg =
  | { kind: 'walk'; path: P2[]; house: string | null; level: number }
  | { kind: 'climb'; house: string; stair: number; pts: Pt3[]; to: number };

export interface Actor {
  x: number;
  z: number;
  /** The house they are in (its id), null outdoors. */
  house: string | null;
  /** The storey they are on in it (0 outdoors). */
  level: number;
  /** While on stairs, the foot's height, local to the house; null on a floor. */
  foot: number | null;
  /** Between two floors on a flight: which (index in the house's `stairs`), and how far up, 0 at the foot to 1 at the top. */
  stair: { house: string; i: number; t: number } | null;
  /** The walk in hand: its stages, the one being walked, and metres done along it. */
  legs: Leg[];
  legI: number;
  legS: number;
  /** The way they last went (world x, z). */
  dir: { x: number; z: number };
}

export const newActor = (x: number, z: number): Actor => ({ x, z, house: null, level: 0, foot: null, stair: null, legs: [], legI: 0, legS: 0, dir: { x: 0, z: 1 } });

/** How to draw someone after a step: the way they face, and whether their legs move. */
export interface Pose {
  dx: number;
  dz: number;
  moving: boolean;
}

/** What walking needs to know of the houses (all of the map's, standing or not). */
export interface WalkHouses {
  /** The house whose floor plan holds a point, if any. */
  holding(x: number, z: number): BuiltHouse | null;
  byId(id: string): BuiltHouse | null;
  /** The floor footprints of the furniture on a storey, house-local. */
  furniture(b: BuiltHouse, level: number): { x: number; z: number; hw: number; hd: number }[];
}

/** Where a climber is after `s` metres along a flight's points, with the height of their foot there. */
export function followClimb(pts: readonly Pt3[], s: number): Pt3 & { dx: number; dz: number; done: boolean } {
  let left = Math.max(0, s);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= l || i === pts.length - 1) {
      const k = l > 0 ? Math.min(1, left / l) : 1;
      const dir = l > 0 ? { dx: (b.x - a.x) / l, dz: (b.z - a.z) / l } : { dx: 0, dz: 1 };
      return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, y: a.y + (b.y - a.y) * k, ...dir, done: left >= l && i === pts.length - 1 };
    }
    left -= l;
  }
  const p = pts[0];
  return { x: p.x, z: p.z, y: p.y, dx: 0, dz: 1, done: true };
}

const flatLength = (pts: readonly { x: number; z: number }[]): number => pts.reduce((n, p, i) => (i ? n + Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z) : n), 0);

/** Metres to walk along some legs. */
export const legsLength = (legs: readonly Leg[]): number => legs.reduce((n, l) => n + (l.kind === 'walk' ? pathLength(l.path) : flatLength(l.pts)), 0);

export class Walking {
  /** One grid for each storey above the ground of a house that has them (made when first asked). */
  private readonly upper = new Map<string, NavGrid[]>();

  constructor(readonly ground: NavGrid, private readonly size: number, private readonly houses: WalkHouses) {}

  byId(id: string): BuiltHouse | null {
    return this.houses.byId(id);
  }

  /** The house an actor is in, if any. */
  house(a: Actor): BuiltHouse | null {
    return a.house ? this.houses.byId(a.house) : null;
  }

  /** The walking grid of a storey (the ground's for storey 0 and outdoors). */
  nav(b: BuiltHouse | null, level: number): NavGrid {
    if (!b || level === 0) return this.ground;
    let list = this.upper.get(b.place.id);
    if (!list) this.upper.set(b.place.id, (list = []));
    list[level] ??= new NavGrid(this.size, [...levelWalls(b, level), ...furnitureObstacles(b, this.houses.furniture(b, level))], { radius: 0.2 });
    return list[level];
  }

  /** Bring the actor's house up to date with where they stand: through a door, they are on the ground floor of where they are. */
  settle(a: Actor): void {
    const id = this.houses.holding(a.x, a.z)?.place.id ?? null;
    if (id === a.house) return;
    a.house = id;
    a.level = 0; // (every door is on the ground floor)
    a.foot = null;
    a.stair = null;
  }

  /**
   * The stages of a walk from where someone stands (in `house` on storey `level`, or outdoors) to a point on a storey:
   * out by the stairs and the door if need be, in and up if need be. `toLevel` defaults to the storey they are on if
   * the point is in the same house, else the ground. Null if there is no way.
   */
  plan(start: { x: number; z: number; level: number; house: string | null }, x: number, z: number, toLevel?: number): Leg[] | null {
    const from = start.house ? this.houses.byId(start.house) : null;
    const target = this.houses.holding(x, z);
    const same = !!from && !!target && from.place.id === target.place.id;
    const to = Math.max(0, Math.min(toLevel ?? (same ? start.level : 0), target ? target.model.levels.length - 1 : 0));
    const legs: Leg[] = [];
    const cur = { x: start.x, z: start.z, level: from ? start.level : 0 };
    const walkOn = (b: BuiltHouse | null, lv: number, px: number, pz: number): boolean => {
      const path = findPath(this.nav(b, lv), cur, { x: px, z: pz });
      if (!path) return false;
      legs.push({ kind: 'walk', path, house: b?.place.id ?? null, level: lv });
      cur.x = path[path.length - 1].x;
      cur.z = path[path.length - 1].z;
      return true;
    };
    const climb = (b: BuiltHouse, lo: number, hi: number): boolean => {
      const up = hi > lo;
      const i = b.model.stairs.findIndex((q) => (up ? q.from === lo && q.to === hi : q.from === hi && q.to === lo));
      if (i < 0) return false;
      const s = b.model.stairs[i];
      const pts = (up ? s.path : [...s.path].reverse()).map((p) => ({ ...houseToWorld(b.place, p.x, p.z), y: p.y }));
      if (!walkOn(b, lo, pts[0].x, pts[0].z)) return false;
      legs.push({ kind: 'climb', house: b.place.id, stair: i, pts, to: hi });
      cur.x = pts[pts.length - 1].x;
      cur.z = pts[pts.length - 1].z;
      cur.level = hi;
      return true;
    };
    let ok = true;
    if (from && !same) while (ok && cur.level > 0) ok = climb(from, cur.level, cur.level - 1);
    else if (from && same) while (ok && cur.level !== to) ok = climb(from, cur.level, cur.level + Math.sign(to - cur.level));
    if (ok && target && !same) for (let l = 0; ok && l < to; l++) ok = climb(target, l, l + 1);
    if (ok) ok = walkOn(target && to > 0 ? target : null, to, x, z);
    return ok ? legs : null;
  }

  /**
   * A walk begun on a flight of stairs (stopped or steered half way): on to whichever end is the shorter way to where
   * they are going, then the rest from there. So half a flight up and back down is allowed.
   */
  private planFromStair(a: Actor, x: number, z: number, toLevel?: number): Leg[] | null {
    const st = a.stair!;
    const b = this.houses.byId(st.house);
    if (!b) return null;
    const s = b.model.stairs[st.i];
    const at = (p: Pt3): Pt3 => ({ ...houseToWorld(b.place, p.x, p.z), y: p.y });
    const here = { x: a.x, z: a.z, y: a.foot ?? s.path[1].y };
    let best: { legs: Leg[]; len: number } | null = null;
    for (const up of [false, true]) {
      const end = at(up ? s.path[3] : s.path[0]), corner = at(up ? s.path[2] : s.path[1]);
      const lv = up ? s.to : s.from;
      const rest = this.plan({ x: end.x, z: end.z, level: lv, house: st.house }, x, z, toLevel);
      if (!rest) continue;
      const pts = [here, corner, end];
      const total = flatLength(pts) + legsLength(rest);
      if (!best || total < best.len) best = { legs: [{ kind: 'climb', house: st.house, stair: st.i, pts, to: lv }, ...rest], len: total };
    }
    return best?.legs ?? null;
  }

  /** Give an actor a walk to a point (on storey `toLevel`, see `plan`). Returns the metres to walk, or null if there is no way. */
  walkTo(a: Actor, x: number, z: number, toLevel?: number): number | null {
    this.settle(a);
    const legs = a.stair ? this.planFromStair(a, x, z, toLevel) : this.plan({ x: a.x, z: a.z, level: a.house ? a.level : 0, house: a.house }, x, z, toLevel);
    if (!legs) return null;
    a.legs = legs;
    a.legI = 0;
    a.legS = 0;
    return legsLength(legs);
  }

  /** Walk on along the legs in hand for `dt` seconds at `speed` m/s. Null when there is no walk. */
  step(a: Actor, dt: number, speed: number): Pose | null {
    this.settle(a);
    if (!a.legs.length) return null;
    a.legS += dt * speed;
    const leg = a.legs[a.legI];
    let p: { x: number; z: number; dx: number; dz: number; done: boolean };
    if (leg.kind === 'walk') {
      p = followPath(leg.path, a.legS);
      a.foot = null;
    } else {
      const c = followClimb(leg.pts, a.legS);
      p = c;
      a.foot = c.y;
      const b = this.houses.byId(leg.house)!;
      const s = b.model.stairs[leg.stair], lv = b.model.levels, y0 = lv[s.from].floorY, y1 = lv[s.to].floorY;
      // Between the two floors they are on the stairs; the storey changes the moment they reach the far floor's height.
      a.stair = c.y > y0 + 0.02 && c.y < y1 - 0.02 ? { house: leg.house, i: leg.stair, t: (c.y - y0) / (y1 - y0) } : null;
      if (Math.abs(c.y - lv[leg.to].floorY) < 0.02) a.level = leg.to;
    }
    a.x = p.x;
    a.z = p.z;
    if (p.dx || p.dz) a.dir = { x: p.dx, z: p.dz };
    if (p.done && leg.kind === 'climb') {
      a.level = leg.to;
      a.foot = null;
      a.stair = null;
    }
    const last = p.done && a.legI === a.legs.length - 1;
    if (p.done) {
      if (last) a.legs = [];
      else {
        a.legI++;
        a.legS = 0;
      }
    }
    return { dx: p.dx, dz: p.dz, moving: !last };
  }

  /**
   * Steering (keys): move `step` metres along the world direction (wx, wz), stopped by walls and furniture, dropping any
   * walk in hand. At the end of a flight walking into it takes them on to the stairs, and on the stairs only the part
   * of the direction along the flight counts, up or down as far as they like. Null: they stepped on to a flight (no pose change).
   */
  steer(a: Actor, wx: number, wz: number, step: number): Pose | null {
    this.settle(a);
    a.legs = [];
    const st = a.stair;
    if (st) {
      const b = this.houses.byId(st.house)!;
      const s = b.model.stairs[st.i], pl = b.place;
      const A = s.path[1], B = s.path[2];
      const run = Math.hypot(B.x - A.x, B.z - A.z);
      // The flight's line in the world; the keys count only as far as they point along it.
      const ax = Math.cos(pl.rot) * Math.sign(B.x - A.x), az = -Math.sin(pl.rot) * Math.sign(B.x - A.x);
      const along = wx * ax + wz * az;
      const t = st.t + (along * step) / (run * 1.05);
      const lv = b.model.levels, y0 = lv[s.from].floorY, y1 = lv[s.to].floorY;
      a.dir = { x: wx, z: wz };
      if (t >= 1 || t <= 0) {
        const end = t >= 1 ? s.path[3] : s.path[0];
        const w = houseToWorld(pl, end.x, end.z);
        a.x = w.x;
        a.z = w.z;
        a.level = t >= 1 ? s.to : s.from;
        a.foot = null;
        a.stair = null;
      } else {
        const w = houseToWorld(pl, A.x + (B.x - A.x) * t, A.z + (B.z - A.z) * t);
        a.x = w.x;
        a.z = w.z;
        a.foot = y0 + (y1 - y0) * t;
        a.stair = { ...st, t };
      }
      return { dx: wx, dz: wz, moving: Math.abs(along) > 0.05 };
    }
    const b = this.house(a);
    if (b) {
      for (let i = 0; i < b.model.stairs.length; i++) {
        const s = b.model.stairs[i];
        const bottom = s.from === a.level, top = s.to === a.level;
        if (!bottom && !top) continue;
        const f = bottom ? s.path[0] : s.path[3], m = bottom ? s.path[1] : s.path[2];
        const foot = houseToWorld(b.place, f.x, f.z), mouth = houseToWorld(b.place, m.x, m.z);
        if (Math.hypot(foot.x - a.x, foot.z - a.z) < 0.8 && wx * (mouth.x - a.x) + wz * (mouth.z - a.z) > 0.1) {
          a.x = mouth.x;
          a.z = mouth.z;
          a.foot = b.model.levels[bottom ? s.from : s.to].floorY + (bottom ? 0.01 : -0.01);
          a.stair = { house: b.place.id, i, t: bottom ? 0.001 : 0.999 };
          return null;
        }
      }
    }
    const nav = this.nav(b, a.level);
    for (const [sx, sz] of [[1, 1], [1, 0], [0, 1]]) {
      const nx = a.x + wx * step * sx, nz = a.z + wz * step * sz;
      if (nav.walkable(nx, nz)) {
        a.x = nx;
        a.z = nz;
        break;
      }
    }
    a.dir = { x: wx, z: wz };
    return { dx: wx, dz: wz, moving: true };
  }

  /** What can be climbed from where an actor is: up, down, or neither. */
  stairsHint(a: Actor): { up: boolean; down: boolean } {
    const n = this.house(a)?.model.levels.length ?? 0;
    if (n < 2) return { up: false, down: false };
    if (a.stair) return { up: true, down: true };
    return { up: a.level < n - 1, down: a.level > 0 };
  }

  /** A point on the next storey up (+1) or down (-1) of the house an actor is in, to walk to; null if there is none that way. */
  climbTarget(a: Actor, dir: 1 | -1): { x: number; z: number; level: number } | null {
    const b = this.house(a);
    if (!b) return null;
    const lv = a.stair ? (dir > 0 ? b.model.stairs[a.stair.i].to : b.model.stairs[a.stair.i].from) : a.level + dir;
    if (lv < 0 || lv >= b.model.levels.length) return null;
    // (Any point on the storey: the walk finds the stairs, then the nearest floor to it.)
    const r = b.model.levels[lv].rooms[0].rect;
    return { ...houseToWorld(b.place, (r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2), level: lv };
  }
}

/** A beat: there and back along a line of world points, again and again (someone walking the road). `s` is metres walked. */
export interface Beat {
  pts: [number, number][];
  s: number;
}

/** Walk a beat on for `dt` seconds: where they are now and the way they go. Null for a beat of less than two points. */
export function stepBeat(b: Beat, dt: number, speed = 1.1): { x: number; z: number; dx: number; dz: number } | null {
  const pts = b.pts;
  if (pts.length < 2) return null;
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = lens.reduce((a, c) => a + c, 0);
  b.s = (b.s + dt * speed) % (total * 2);
  const back = b.s > total;
  let s = back ? total * 2 - b.s : b.s;
  let i = 0;
  while (i < lens.length - 1 && s > lens[i]) s -= lens[i++];
  const p = pts[i], q = pts[i + 1], k = s / lens[i];
  const sign = back ? -1 : 1;
  return { x: p[0] + (q[0] - p[0]) * k, z: p[1] + (q[1] - p[1]) * k, dx: (q[0] - p[0]) * sign, dz: (q[1] - p[1]) * sign };
}

/** A round of stops (house-local points on a storey) that someone walks again and again, pausing at each. */
export interface Rounds {
  actor: Actor;
  house: string;
  stops: { x: number; z: number; level: number }[];
  stop: number;
  /** Seconds left to wait before setting off for the next stop. */
  wait: number;
}

/**
 * A keeper's round of a house: the middle of each storey's last room, up to the top, back down and out to the door,
 * and again. They start outside the door.
 */
export function keeperRounds(b: BuiltHouse): Rounds {
  const m = b.model;
  const stops = m.levels.map((lv, level) => {
    const r = lv.rooms[lv.rooms.length - 1].rect;
    return { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2, level };
  });
  const out = { x: m.door[0] + 1.5, z: m.door[2] + 1.8, level: 0 };
  const w = houseToWorld(b.place, out.x, out.z);
  return { actor: newActor(w.x, w.z), house: b.place.id, stops: [...stops, ...stops.slice(0, -1).reverse(), out], stop: 0, wait: 1 };
}

/** Walk a round on for `dt` seconds. */
export function stepRounds(w: Walking, r: Rounds, dt: number, speed = 1.1): Pose {
  const a = r.actor;
  w.settle(a);
  if (!a.legs.length) {
    r.wait -= dt;
    if (r.wait <= 0) {
      const s = r.stops[r.stop];
      r.stop = (r.stop + 1) % r.stops.length;
      const b = w.byId(r.house);
      if (b) {
        const p = houseToWorld(b.place, s.x, s.z);
        w.walkTo(a, p.x, p.z, s.level);
      }
      r.wait = s.level === 0 && s.z > 0 ? 14 : 2.5; // (a long pause outside the door, where the hero can find them)
    }
  }
  const pose = a.legs.length ? w.step(a, dt, speed) : null;
  w.settle(a);
  return pose ?? { dx: 0, dz: 1, moving: false };
}
