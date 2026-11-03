import type { ActKind, CultureDef } from './standing';

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
}

/** What the hero has taken and where things lie. */
export interface CarryState {
  /** What the hero holds (a thing's id in `loose`), or null. */
  held: string | null;
  /** Held out of sight (slipped away unseen): not drawn, not slowing, never recognised. */
  hidden: boolean;
  /** Every thing that has been moved, by its id. */
  loose: Record<string, Loose>;
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
