import type { Dice } from '../checks';
import { type Roll, rollTest } from '../dice';
import type { Rng } from '../rng';
import type { Shape } from './space';
import { type VisionSpec, coneGap, lightReach, lineOfSight } from './vision';

/**
 * Perception (plan B5): what people see and hear. Pure rules, in metres; the world asks them for the hero and for
 * everyone in the map alike.
 *
 * - **Sight is rolled** (the director, Q35): an Alertness roll against 8 at key moments (entering a map, every six
 *   hours of world time; waking, once there is sleep) sets the shape of sight until the next roll. Each advantage
 *   reaches farther and wider; a failure gives a poor half cone and short range. The shape itself is `visionOf`.
 * - **Seeing someone**: they are within the cone and its range (or the small circle round you), on your side of every
 *   wall (the same house and storey, or both outdoors), and nothing solid stands between. At night a flame they carry
 *   shows them from much farther, as torches are seen.
 * - **Hearing**: a noise has a loudness (how far an ordinary ear hears it in the open, metres) and a kind ("steps",
 *   "shout", "fire"). Alertness stretches or shortens that; a wall in between muffles it.
 * - What someone has noticed is kept on their mind (`Senses`, plain data) for the behaviours' conditions to ask:
 *   `sees`, `heard` (`content/behaviours/when/senses.ts`).
 */

/** What a sight roll is made against. */
export const SIGHT_TARGET = 8;
/** World hours between sight rolls. */
export const SIGHT_EVERY = 6;
/** How long a noise is remembered, seconds. */
export const HEARD_FOR = 30;

/** The outcome of the last sight roll: what shapes sight until the next. */
export interface SightRoll {
  success: boolean;
  advantages: number;
}

/** Sight before anyone has rolled: plain, as an ordinary success. */
export const PLAIN_SIGHT: SightRoll = { success: true, advantages: 0 };

/** Roll for sight: Alertness (`dice`) against 8. */
export function rollSight(dice: Dice, rng: Rng, label = 'Sight'): { roll: Roll; sight: SightRoll } {
  const roll = rollTest(dice, SIGHT_TARGET, rng, label);
  return { roll, sight: { success: !!roll.success, advantages: roll.advantages ?? 0 } };
}

/** Within this many metres a thing lying about is as easy to notice as its kind says; beyond, 1 harder each so many more. */
export const SPOT_NEAR = 4;

/**
 * How hard it is to notice a thing lying about (plan B8, the director: "attention makes it easier to spot them"): its
 * kind's `spot`, 1 harder for every 4 m beyond 4. An Alertness roll at the start of a fight against this; looking
 * round on purpose (a side action) rolls again with 1D6 more (`LOOK_BONUS`).
 */
export const spotDifficulty = (spot: number, metres: number): number => spot + Math.max(0, Math.floor((metres - SPOT_NEAR) / SPOT_NEAR));

/** The dice looking round on purpose adds to the Alertness roll. */
export const LOOK_BONUS = 1;

/** How a sight roll stretches sight: multipliers on its range and its width. A failure halves both. */
export function sightBoost(s: SightRoll): { range: number; fov: number } {
  if (!s.success) return { range: 0.5, fov: 0.5 };
  const a = Math.min(6, Math.max(0, s.advantages));
  return { range: 1 + 0.15 * a, fov: 1 + 0.1 * a };
}

/** A word for how sharp sight is now, for the player (on easy). */
export function sightWord(s: SightRoll): string {
  if (!s.success) return 'poor';
  return s.advantages >= 3 ? 'keen' : s.advantages >= 1 ? 'sharp' : 'clear';
}

/** Where someone is, as perception needs it. */
export interface Where {
  x: number;
  z: number;
  /** The house they are in (null outdoors) and the storey. */
  house: string | null;
  level: number;
}

/** On the same side of every wall: both outdoors, or in the same house on the same storey. */
export const sameRoom = (a: Where, b: Where): boolean => a.house === b.house && (a.house === null || a.level === b.level);

/**
 * Does the watcher (facing `facing`, with sight `spec`) see the one at `them`? `blockers` are what stops the eye round
 * the watcher (trunks, boulders, houses; the walls of the house they stand in). `lit`: they carry a flame, and `night`
 * (0..1) is how dark it is: a light is made out much farther in the dark.
 */
export function canSee(watcher: Where, facing: number, spec: VisionSpec, them: Where, blockers: readonly Shape[], night = 0, lit = false): boolean {
  if (!sameRoom(watcher, them)) return false;
  const d = Math.hypot(them.x - watcher.x, them.z - watcher.z);
  const reach = lit ? Math.max(spec.range, lightReach(spec, night)) : spec.range;
  if (d > reach) return false;
  if (d > spec.near && coneGap(watcher, facing, spec, them.x, them.z) > spec.fov / 2) return false;
  return lineOfSight(watcher, them, blockers);
}

/** A sound in the world. */
export interface Noise extends Where {
  /** How far an ordinary ear (Alertness 10) hears it in the open, metres. */
  loud: number;
  /** What it is: "steps", "shout", "fire"… (the conditions can ask for a kind). */
  kind: string;
  /** Who made it (no one hears their own noise as news). */
  by: string;
}

/** How far a noise carries for someone of this Alertness (in dice units: an average adult has about 10). */
export function hearingReach(n: Pick<Noise, 'loud'>, alertness: number): number {
  return n.loud * Math.max(0.5, Math.min(1.6, 0.6 + 0.04 * alertness));
}

/** Does a listener hear it? Through a wall it carries less than half as far; through a floor a little more. */
export function hears(listener: Where, alertness: number, n: Noise): boolean {
  let reach = hearingReach(n, alertness);
  if (listener.house !== n.house) reach *= 0.4;
  else if (listener.house !== null && listener.level !== n.level) reach *= 0.6;
  return Math.hypot(n.x - listener.x, n.z - listener.z) <= reach;
}

/** What someone heard: the kind, where it came from, who made it, and how many seconds more it is remembered. */
export interface Heard {
  kind: string;
  x: number;
  z: number;
  house: string | null;
  level: number;
  by: string;
  left: number;
}

/** What a person has noticed: their sight roll, who they see now, what they heard lately. Plain data, on their mind. */
export interface Senses {
  sight: SightRoll;
  /** World hours (day × 24 + hour) when they last rolled for sight; null before the first roll. */
  rolledAt: number | null;
  /** The people they see now, by id ("hero"). */
  sees: string[];
  /** Newest last; a few at most. */
  heard: Heard[];
}

export const newSenses = (): Senses => ({ sight: { ...PLAIN_SIGHT }, rolledAt: null, sees: [], heard: [] });

/** Is a sight roll due (the first, or six world hours since the last; a clock set back counts as due)? */
export const sightDue = (s: Pick<Senses, 'rolledAt'>, worldHours: number): boolean =>
  s.rolledAt === null || worldHours - s.rolledAt >= SIGHT_EVERY || worldHours < s.rolledAt;

/** Remember a noise heard (the same kind from the same one replaces the older). */
export function noteHeard(s: Senses, n: Noise): void {
  s.heard = s.heard.filter((h) => !(h.kind === n.kind && h.by === n.by));
  s.heard.push({ kind: n.kind, x: n.x, z: n.z, house: n.house, level: n.level, by: n.by, left: HEARD_FOR });
  if (s.heard.length > 4) s.heard.shift();
}

/** Let `dt` seconds pass: what was heard fades. */
export function fadeSenses(s: Senses, dt: number): void {
  for (const h of s.heard) h.left -= dt;
  if (s.heard.some((h) => h.left <= 0)) s.heard = s.heard.filter((h) => h.left > 0);
}

/** The latest noise of a kind ("any": of every kind; or one of a list), or null. */
export function lastHeard(s: Senses | undefined, kind: string | readonly string[]): Heard | null {
  if (!s) return null;
  const kinds = typeof kind === 'string' ? [kind] : kind;
  for (let i = s.heard.length - 1; i >= 0; i--) if (kinds.includes('any') || kinds.includes(s.heard[i].kind)) return s.heard[i];
  return null;
}
