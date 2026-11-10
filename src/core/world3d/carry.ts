import type { ActKind, CultureDef } from './standing';
import type { PackSpot, Side } from './inventory';

/**
 * Taking and carrying (plan B3b, first slice; design: director/design/actions.md, "The ways to take"). Pure rules.
 *
 * - **Size.** Every kind that can be taken says how big it is (`size` on the kind): *pocket*, *bag*, *strapped*, *in
 *   the hands* (a stool, a keg: both hands, slower), or *heavy* (a table, an anvil: not alone). A kind with no size is
 *   part of where it stands (a hearth, a shelf, a stair) and can't be taken at all. Until pockets and the bag come
 *   (B6), whatever is taken is held in the hands, one thing at a time; something slipped away unseen is held out of
 *   sight.
 * - **Loose things.** A thing once picked up is loose: where it lies now (or that it is held) is kept, saved, and drawn
 *   there; its first spot is its **home**, and its owner stays the household of that home. Taken things never come back
 *   by themselves.
 * - **How far it has gone** (`stageOf`) makes the wrong: moved within its room, nothing; to another room of the house,
 *   *move*; out of the house, *take*. Whoever sees it cross answers; after that the household **recognise** it, carried
 *   openly, wherever they see it (their stool down the street). Something held out of sight is never recognised.
 * - **Worth** (`worthOf`): a wrong to a thing weighs more the more it is worth to its owner, its value against their
 *   wealth (a lord won't miss a hen), and more again for its importance (a guard's sword, an heirloom).
 */

export type Size = 'pocket' | 'bag' | 'strapped' | 'hands' | 'heavy';
export const SIZES: readonly Size[] = ['pocket', 'bag', 'strapped', 'hands', 'heavy'];

/** Can one person carry it? (Heavy things need two, or a beast.) */
export const carriable = (s: Size | undefined): s is Exclude<Size, 'heavy'> => s !== undefined && s !== 'heavy';

/** Small enough to slip away unseen (under a cloak, into a sleeve)? */
export const hideable = (s: Size | undefined): boolean => s === 'pocket' || s === 'bag';

/**
 * How much someone carries without trouble, in kilograms (plan B6; the director's rule, 2026-11-04): 5 kg for each
 * die of Physique and 1 for each pip (3D6+2 carries 17 kg); the expertise *Slita & släpa* (toil and haul) adds half
 * as much again for its own dice (4D6 adds 10 kg); and a build that takes load points off (a dwarf's −8, the grant
 * `belastning`) adds a kilogram for each, since one kilogram over is one load point. Until fatigue comes nothing over
 * it can be carried; after that, every kilogram over is a load point on the ruleset's scale, the same scale armour,
 * heat and mounts use (penalties to movement, base fatigue).
 */
export const KG_PER_DIE = 5;
export const kgOfDice = (d: { n: number; mod: number }): number => d.n * KG_PER_DIE + d.mod;
export const HAUL_SKILL = 'E:Slita & släpa';

export function carryCapacity(physique: { n: number; mod: number }, haul: { n: number; mod: number }, load = 0): number {
  return kgOfDice(physique) + kgOfDice(haul) / 2 + Math.max(0, -load);
}

/** Kilograms in a line: "17 kg", "0.5 kg", "10.5 kg". */
export const kgText = (kg: number): string => `${Math.round(kg * 10) / 10} kg`;

/** Where a loose thing is: a spot on the ground or on a storey of a house, and which way it faces. */
export interface LooseSpot {
  x: number;
  z: number;
  level: number;
  house: string | null;
  rot: number;
}

/** A thing once picked up: what it is, how it is drawn, where it belongs, where it is now. Plain data, saved. */
export interface Loose {
  kind: string;
  /** How its model is drawn (the piece's own seed and variant). */
  seed: number;
  variant?: string;
  /** Where it stood before anyone moved it, and the room there (its number in the house), if in a house. */
  home: LooseSpot & { room: number | null };
  /** Where it lies now; null while it is held. */
  at: LooseSpot | null;
  /** Lent to the hero until this world hour (day × 24 + hour); not home by then, it counts as taken. */
  loan?: number;
  /** Given to the hero to keep (argued for, or threatened out of them): no longer a wrong to carry. */
  mine?: boolean;
  /** One of the map's people carrying it home (found lying about), by id. */
  by?: string;
  /** One of the map's people holding it as their weapon (plan B8a), by id: their own, drawn for a fight, or picked up in one. */
  wield?: string;
  /** Held in the left hand by one of the map's people (`wield`): a shield. Left out: the right. */
  hand?: 'left';
  /** Carried on the hero, not in hand (at the belt, on the back): their own gear, drawn when wanted. Not in the world. */
  stowed?: boolean;
  /** In the hero's pockets or pack (plan B6): which grid, the cell and the turn (`core/world3d/inventory.ts`). Out of sight. */
  in?: PackSpot;
  /** The pack the hero wears on their back (plan B6): its grid holds what is `in` the pack. */
  worn?: boolean;
  /** An add-on fitted on this side of the pack the hero wears (plan B6): its grid holds what is `in` that side. */
  fitted?: Side;
}

/** Is a loose thing on the hero (held, stowed, packed, worn, fitted), rather than lying somewhere or with someone else? */
export const onHero = (l: Loose): boolean => !l.at && !l.by && !l.wield;

/**
 * What giving a thing back does to its owner's view of you: a loan returned, a little goodwill; something taken and
 * brought back, half of what they thought less of you for it, up to ten; nothing else (giving back can't be farmed).
 */
export function returnedRegard(regard: number, onLoan: boolean): number {
  if (onLoan) return 3;
  return regard < 0 ? Math.min(10, Math.round(-regard / 2)) : 0;
}

/** Is a thing out of place (not in its home room, nor held, nor yours)? What someone tidy brings home. */
export const stray = (l: Loose, where: Whereabouts): boolean => !!l.at && !l.mine && !l.by && l.home.house !== null && stageOf(l.home, where) !== 'home';

/** What the hero has taken and where things lie. */
export interface CarryState {
  /** What the hero holds in the right hand, or in both arms (a thing's id in `loose`), or null. */
  held: string | null;
  /** On the left forearm: a shield (plan B8a), beside a one-handed weapon or nothing. */
  left?: string | null;
  /** Held out of sight (slipped away unseen): not drawn, not slowing, never recognised. */
  hidden: boolean;
  /** Every thing that has been moved, by its id. */
  loose: Record<string, Loose>;
  /** Whose gear the hero was given (`SpikeWorld.outfit`): a new hero, or other gear, gives it again. */
  outfit?: string;
}

export const newCarry = (): CarryState => ({ held: null, hidden: false, loose: {} });

/** Where something is now, as `stageOf` asks: the house, the room (its number), or outdoors. */
export interface Whereabouts {
  house: string | null;
  room: number | null;
}

/** How far a thing has gone from home: in its room (or anywhere, if it was the wild's), another room of its house, out of it. */
export type Stage = 'home' | 'room' | 'out';

export function stageOf(home: Loose['home'], now: Whereabouts): Stage {
  if (home.house === null) return 'home';
  if (now.house !== home.house) return 'out';
  return now.room === home.room ? 'home' : 'room';
}

/** The half sizes, along x and z, of a box `w` along its front and `d` deep turned by `rot`: what it covers on a floor grid. */
export function turnedHalf(w: number, d: number, rot: number): { hw: number; hd: number } {
  const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
  return { hw: (c * w + s * d) / 2, hd: (s * w + c * d) / 2 };
}

/** The kind of act a stage is, done without leave. */
export const actOfStage = (s: Stage): ActKind | null => (s === 'out' ? 'take' : s === 'room' ? 'move' : null);

/** How well off a household is (from its people's facets: `rich`, `poor`). */
export type Wealth = 'poor' | 'common' | 'rich';
export const wealthOf = (tags: readonly string[]): Wealth => (tags.includes('rich') ? 'rich' : tags.includes('poor') ? 'poor' : 'common');

/** Acts whose weight grows with what the thing is worth. */
const WORTH_ACTS: readonly ActKind[] = ['move', 'take', 'steal', 'harm'];

/**
 * How much more (or less) a wrong to a thing weighs for what it is worth to its owner: the square root of its value
 * against what their wealth calls a real loss (the culture's `wealth`), kept within the culture's bounds, then half as
 * much again for each step of importance. 1 for acts that aren't about the thing itself (sitting, entering).
 */
export function worthOf(act: ActKind, value: number, importance: number, wealth: Wealth, c: CultureDef): number {
  if (!WORTH_ACTS.includes(act)) return 1;
  const [lo, hi] = c.worth;
  const w = Math.max(lo, Math.min(hi, Math.sqrt(Math.max(0, value) / c.wealth[wealth])));
  return w * (1 + 0.5 * Math.max(0, importance));
}

/** What `handFor` needs of a kind: one hand or two (left out: both arms), and whether it is a shield. */
export type HandsOf = { hands?: 1 | 2; shield?: string };

/**
 * Which hand a thing goes in (plan B8a), given what is held: a shield on the left forearm, if it is free and the right
 * holds nothing or something one-handed; anything else in the right, if it is free and, with a shield on, it takes
 * one hand (a two-handed weapon or something carried in both arms needs the shield off first). Null: no hand for it.
 */
export function handFor(kind: HandsOf, right: HandsOf | null, left: HandsOf | null): 'right' | 'left' | null {
  if (kind.shield) return !left && (!right || right.hands === 1) ? 'left' : null;
  return !right && (!left || kind.hands === 1) ? 'right' : null;
}

/** Is some hand free (for drawing or taking something, before knowing what): the right, or the left beside a one-handed thing. */
export const aHandFree = (right: HandsOf | null, left: HandsOf | null): boolean => !right || (!left && right.hands === 1);
