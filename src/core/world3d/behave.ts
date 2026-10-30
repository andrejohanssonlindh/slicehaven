import { Rng } from '../rng';
import { type Actor, type Pose, type Walking, newActor } from './actors';
import { houseToWorld } from './layout';
import type { Area } from './mapgen';
import type { XZ } from './terrain';

/**
 * What people do: a person has a schedule, a list of "when this holds, do that" (`DoEntry`), and the first entry whose
 * `when` holds is what they do now. What can be done is a library of behaviours (`Behaviour`, one file each in
 * `content/behaviours/does/`: stand, walk a beat, patrol, wander a square, attend an event, go home...), and what can
 * be asked is a library of conditions (`Condition`, in `content/behaviours/when/`: the hours, an event running...). A
 * new behaviour or condition is a new file; maps only name them.
 *
 * A person's mind (`Mind`) is plain data, so it can be saved: the actor (where they are, the walk in hand), which entry
 * they are on, that behaviour's own state, and their own seeded generator. Every behaviour walks with `Walking`, so
 * people go round walls and up stairs like the hero. The renderer only places their cards.
 */

/** A place a map names (`MapSpec.places`), worked out by the compiler. */
export type Place =
  | { kind: 'spot'; x: number; z: number; face?: number }
  | { kind: 'area'; area: Area }
  | { kind: 'path'; pts: XZ[]; loop: boolean };

/** What time it is and what is going on, as people see it. */
export interface Clock {
  hour: number;
  /** The events running now (by name). */
  events: ReadonlySet<string>;
}

/** One line of a schedule: when it holds (every condition in `when`), do `do` with the rest of what is said. */
export type DoEntry = { do: string; when?: Record<string, unknown> } & Record<string, unknown>;

export interface Mind {
  id: string;
  actor: Actor;
  /** The schedule line being followed (-1 before the first step) and its behaviour's own state (plain data). */
  entry: number;
  state: unknown;
  /** The person's own generator, as its state (so it saves as a number). */
  rng: number;
  /** Their home, if they have one (a house id). */
  home?: string;
  /** Their number among those sharing a schedule: spreads a crowd round what it attends. */
  slot: number;
}

export const newMind = (id: string, x: number, z: number, seed: number, slot = 0, home?: string): Mind => ({
  id, actor: newActor(x, z), entry: -1, state: null, rng: Rng.fromSeed(`${id}:${seed}`).seed, slot, ...(home ? { home } : {}),
});

/** What a behaviour may use while it runs. */
export interface BehaveContext {
  walking: Walking;
  places: Record<string, Place>;
  clock: Clock;
  /** The mind's own generator for this step (its state is written back after). */
  rng: Rng;
}

export interface Behaviour {
  id: string;
  /** One line on what it does, for whoever writes maps. */
  about: string;
  /** The keys a schedule line using it may have (besides `do` and `when`). */
  keys: string[];
  /** Which of those keys name a place, and which a house (the compiler checks they exist); and which must be given. */
  places?: string[];
  houses?: string[];
  needs?: string[];
  /** Begin: the behaviour's own state (plain data). Called when its line becomes the one followed. */
  start(use: DoEntry, mind: Mind, ctx: BehaveContext): unknown;
  /** Go on for `dt` seconds: move the actor (by `ctx.walking`), and say how to draw them. */
  step(use: DoEntry, mind: Mind, ctx: BehaveContext, dt: number): Pose;
}

export interface Condition {
  id: string;
  about: string;
  /** What is wrong with the value a map gave it, or null. */
  check?(value: unknown): string | null;
  holds(value: unknown, clock: Clock, mind: Mind): boolean;
}

export interface BehaviourLibrary {
  does: Record<string, Behaviour>;
  when: Record<string, Condition>;
}

/** Whether a schedule line's conditions hold now (a line with none always does). */
export function holds(entry: DoEntry, lib: BehaviourLibrary, clock: Clock, mind: Mind): boolean {
  for (const [k, v] of Object.entries(entry.when ?? {})) if (!lib.when[k]?.holds(v, clock, mind)) return false;
  return true;
}

/** Go on with a person for `dt` seconds: pick the line that holds now (starting its behaviour if it is new), and step it. */
export function stepMind(mind: Mind, does: readonly DoEntry[], lib: BehaviourLibrary, ctx: Omit<BehaveContext, 'rng'>, dt: number): Pose {
  const rng = new Rng(mind.rng);
  const c: BehaveContext = { ...ctx, rng };
  const i = does.findIndex((e) => holds(e, lib, ctx.clock, mind));
  if (i !== mind.entry) {
    mind.entry = i;
    mind.state = i >= 0 ? lib.does[does[i].do]?.start(does[i], mind, c) ?? null : null;
  }
  const b = i >= 0 ? lib.does[does[i].do] : undefined;
  const pose = b ? b.step(does[i], mind, c, dt) : idle(mind, ctx.walking, dt);
  mind.rng = rng.seed;
  return pose;
}

/** What a schedule says wrong (an unknown behaviour or condition, a key it does not take, a place or house that is not there). */
export function scheduleProblems(does: readonly DoEntry[], lib: BehaviourLibrary, places: Record<string, unknown>, houses: ReadonlySet<string>): string[] {
  const out: string[] = [];
  does.forEach((e, n) => {
    const where = `line ${n + 1} (${e.do})`;
    const b = lib.does[e.do];
    if (!b) return void out.push(`line ${n + 1}: no behaviour called ${e.do}`);
    for (const k of Object.keys(e)) if (k !== 'do' && k !== 'when' && !b.keys.includes(k)) out.push(`${where}: unknown key "${k}"`);
    for (const k of b.needs ?? []) if (e[k] === undefined) out.push(`${where}: needs "${k}"`);
    for (const k of b.places ?? []) if (e[k] !== undefined && !(String(e[k]) in places)) out.push(`${where}: no place called ${String(e[k])}`);
    for (const k of b.houses ?? []) if (e[k] !== undefined && e[k] !== 'home' && !houses.has(String(e[k]))) out.push(`${where}: no house ${String(e[k])}`);
    for (const [k, v] of Object.entries(e.when ?? {})) {
      const c = lib.when[k];
      if (!c) out.push(`${where}: no condition called ${k}`);
      else {
        const bad = c.check?.(v);
        if (bad) out.push(`${where}: ${k}: ${bad}`);
      }
    }
  });
  return out;
}

// --- helpers the behaviours share -----------------------------------------------

/** Standing still: finish any walk in hand, and face the way they last went. */
export function idle(mind: Mind, walking: Walking, dt: number, speed = 1.1): Pose {
  const a = mind.actor;
  const p = a.legs.length ? walking.step(a, dt, speed) : null;
  walking.settle(a);
  return p ?? { dx: a.dir.x, dz: a.dir.z, moving: false };
}

/** Walk on if there is a walk in hand; true while walking. */
export function walkOn(mind: Mind, walking: Walking, dt: number, speed = 1.1): Pose | null {
  const a = mind.actor;
  if (!a.legs.length) return null;
  const p = walking.step(a, dt, speed);
  walking.settle(a);
  return p;
}

/** A free spot in an area, drawn from the generator (null after a few tries on nothing walkable). */
export function spotIn(area: Area, rng: Rng, walking: Walking, near?: { x: number; z: number }): { x: number; z: number } | null {
  for (let k = 0; k < 12; k++) {
    let x: number, z: number;
    if ('circle' in area) {
      const r = area.circle[2] * Math.sqrt(rng.next()), t = rng.next() * Math.PI * 2;
      x = area.circle[0] + Math.cos(t) * r;
      z = area.circle[1] + Math.sin(t) * r;
    } else if ('rect' in area) {
      x = area.rect[0] + rng.next() * (area.rect[2] - area.rect[0]);
      z = area.rect[1] + rng.next() * (area.rect[3] - area.rect[1]);
    } else if ('ring' in area) {
      const [cx, cz, r0, r1] = area.ring;
      const r = Math.sqrt(r0 * r0 + rng.next() * (r1 * r1 - r0 * r0)), t = rng.next() * Math.PI * 2;
      x = cx + Math.cos(t) * r;
      z = cz + Math.sin(t) * r;
    } else {
      // (The whole map: somewhere within 30 m of where they are.)
      const c = near ?? { x: 0, z: 0 };
      x = c.x + (rng.next() * 2 - 1) * 30;
      z = c.z + (rng.next() * 2 - 1) * 30;
    }
    if (walking.ground.walkable(x, z)) return { x, z };
  }
  return null;
}

/** The middle of a place (a spot, the centre of an area, the first point of a path). */
export function placeCentre(p: Place): { x: number; z: number } {
  if (p.kind === 'spot') return { x: p.x, z: p.z };
  if (p.kind === 'path') return { x: p.pts[0][0], z: p.pts[0][1] };
  const a = p.area;
  if ('circle' in a) return { x: a.circle[0], z: a.circle[1] };
  if ('ring' in a) return { x: a.ring[0], z: a.ring[1] };
  if ('rect' in a) return { x: (a.rect[0] + a.rect[2]) / 2, z: (a.rect[1] + a.rect[3]) / 2 };
  return { x: 0, z: 0 };
}

/** A point just inside a house (its door, a step in), and a spot in its last room on the ground floor. */
export function insideHouse(walking: Walking, id: string): { door: { x: number; z: number }; room: { x: number; z: number } } | null {
  const b = walking.byId(id);
  if (!b) return null;
  const m = b.model, r = m.levels[0].rooms[m.levels[0].rooms.length - 1].rect;
  return { door: houseToWorld(b.place, m.door[0], m.door[2] - 0.9), room: houseToWorld(b.place, (r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2) };
}
