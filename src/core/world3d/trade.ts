/**
 * Money and trade (plan B6, design: director/design/money.md). Pure rules.
 *
 * - **Silver.** Prices and money are counted in silver (s), as in the creator and the ruleset's price list; each
 *   realm's own coins are worth so much silver (later: the map's culture names them). Money is coins in a **purse**, a
 *   real thing in a pocket (`Loose.coins`): drop it or have it taken, and the silver goes with it.
 * - **Prices.** A kind's `value` is its price in silver (the ruleset's list where it has one). A seller's price moves
 *   with how they feel about you, and with haggling: once a day each, a trading roll (`HAGGLE_SKILLS`); done well,
 *   10 % off a step (more for advantages), up to 30 %; done badly, 10 % more.
 * - **Who sells.** A shop's room kind says what it `sells` (kinds of thing); its household sell them in its open hours,
 *   and buy the same kinds from you at half price (`SELL_SHARE`), never what is theirs already.
 */

/** What a shop sells (`sells` on a room kind): kinds of thing, at their `value`. */
export interface SellsDef {
  kinds: readonly string[];
}

/** What they pay for what you sell them, as a share of its price. */
export const SELL_SHARE = 0.5;
/** A night's room at an inn, in silver (our own figure: the ruleset prices rooms by the month). */
export const ROOM_PRICE = 1;
/** The skills for haggling (the library's bribe-and-barter tag, `Handel` first). */
export const HAGGLE_SKILLS = ['Handel', 'E:Kränga', 'Skumraskaffärer', 'Argumentera', 'E:Lova', 'Dupera'];
/** How hard haggling is at an even mood (two easier a step of liking you). */
export const HAGGLE_DIFFICULTY = 10;
/** The most haggling takes off, in steps of 10 %. */
const MAX_OFF = 3;

/** What a seller remembers of haggling with the hero: the day it was tried, and how many steps of 10 % it took off (−1: on). */
export interface Haggle {
  day: number;
  off: number;
}

/** Steps off from a haggle: 1 for a success, one more for each advantage, up to 3; a failure puts one on. */
export function haggleSteps(success: boolean, advantages: number): number {
  return success ? Math.min(MAX_OFF, 1 + Math.max(0, advantages)) : -1;
}

/** Silver to the tenth (a styver is a sixth of a silver; a tenth is near enough to show and pay). */
export const roundSilver = (s: number): number => Math.round(s * 10) / 10;

/** Silver in a line: "8 s", "0.5 s". */
export const silverText = (s: number): string => `${roundSilver(s)} s`;

/** How a seller's mood moves a price: 5 % off a step they like you (to 15 %), 15 % on a step they don't. */
function moodShare(mood: number): number {
  return mood >= 0 ? -0.05 * Math.min(3, mood) : 0.15 * Math.min(3, -mood);
}

/** What a seller asks for a thing worth `value`, given their mood and the haggle (steps off). At least a tenth. */
export function buyPrice(value: number, mood: number, off = 0): number {
  return Math.max(0.1, roundSilver(value * (1 + moodShare(mood) - 0.1 * off)));
}

/** What a seller pays for a thing worth `value`: half, moved the other way by their mood and the haggle. */
export function sellPrice(value: number, mood: number, off = 0): number {
  return roundSilver(Math.max(0, value * SELL_SHARE * (1 - moodShare(mood) + 0.1 * off)));
}

/**
 * Pay a price out of purses (in order), as many as it takes: the coins left in each, or null if they don't hold enough
 * between them.
 */
export function payFrom(purses: readonly { id: string; coins: number }[], price: number): Record<string, number> | null {
  const total = purses.reduce((n, p) => n + p.coins, 0);
  if (roundSilver(total) < roundSilver(price)) return null;
  let due = price;
  const out: Record<string, number> = {};
  for (const p of purses) {
    const take = Math.min(p.coins, due);
    out[p.id] = roundSilver(p.coins - take);
    due = roundSilver(due - take);
  }
  return out;
}
