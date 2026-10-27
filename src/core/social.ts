import { type AttributeUse, attributeUse } from './attributes';
import { type Dice, type OpenRoll, modify, rollOpen } from './checks';
import type { Rng } from './rng';

/**
 * Social conflicts, after the tabletop rules for challenges & conflicts:
 * - Three rounds, and the lead alternates: in rounds 1 and 3 you pick a skill and he
 *   answers with a fitting one; in round 2 he picks a skill and you answer.
 *   He only uses what he actually has: of the skills that fit the situation (the approach's
 *   lists) he picks one he has at random, preferring one he hasn't used. If none fit he
 *   falls back on an attribute, which is always possible. Every character has their own
 *   skills (NPC sheets), so nobody answers "with the same skill as yours".
 * - Attributes (Presence and so on) are always allowed for anyone, but using one again
 *   costs −2D6 like any other skill.
 * - The winner of a round gains 1 Control, +1 per full 5 they won by. A tie gives both 1.
 * - The approach has a locked roll that must be used once; if it hasn't been used
 *   by the last round, the last round must use it. Lacking it entirely rolls 0.
 * - Using the same skill again costs −2D6 per earlier use (repetitive arguments).
 * - Situation: an upper hand gives +2 Control, a weak position −2.
 * - At the end the opponent spends all their Control lowering yours. What's left
 *   buys the goal if it's at least the goal's cost (2 for "make them do something").
 *
 * The approach is the direction you take the conversation (bribe, threaten,
 * sweet-talk…). It decides which skills are reasonable, the locked roll, the
 * situation and how the other side answers.
 */
export interface Approach {
  id: string;
  label: string;
  /** Skills (and attr:… ids) that make sense for this approach. */
  skills: string[];
  /** Must be rolled once during the conflict. */
  locked: string;
  /** Upper hand (+2), even (0) or weak position (−2). */
  situation: number;
  /** A show of force: Physique is a natural roll here. */
  aggressive?: boolean;
  /** Skills that fit as an answer here (he uses those he has). */
  answers: string[];
  /** Skills that fit when he leads (defaults to `answers`). */
  moves?: string[];
}

export const ROUNDS = 3;

export interface Round {
  /** Who picked the skill: you (rounds 1, 3) or he (round 2). */
  lead: 'me' | 'them';
  /** Your skill: what you led with, or answered with. */
  skill: string;
  dice: Dice;
  roll: OpenRoll;
  answer: string;
  answerDice: Dice;
  answerRoll: OpenRoll;
  /** Control gained this round by each side. */
  mine: number;
  theirs: number;
}

export interface Conflict {
  approach: string;
  rounds: Round[];
  /** How they already feel about you and your people, and advantages you brought: extra situation Control. */
  bonus?: { control: number; notes: string[] };
}

/** The most Control that mood, reception and kept advantages can add or take away together. */
export const MAX_RECEPTION = 4;

export const newConflict = (approach: string): Conflict => ({ approach, rounds: [] });

export const conflictOver = (c: Conflict): boolean => c.rounds.length >= ROUNDS;

/** Times a skill has already been used in this conflict. */
export const timesUsed = (c: Conflict, skill: string): number => c.rounds.filter((r) => r.skill === skill).length;

/** The pool after the repeat penalty. */
export const pooled = (c: Conflict, skill: string, base: Dice): Dice => modify(base, -2 * timesUsed(c, skill));

/** Presence is always a natural roll, and Physique when the approach is a show of force. */
export const naturalAttrs = (a: Approach): string[] => ['attr:Intryck', ...(a.aggressive ? ['attr:Kroppsbyggnad'] : [])];

/** Whether your attribute roll is possible (and what it costs), given the game's attribute budget. */
export function attrUseIn(c: Conflict, a: Approach, skill: string, hasOther: boolean, budget: number): AttributeUse {
  const lockedUsed = c.rounds.some((r) => r.skill === a.locked) ? [a.locked] : [];
  const attrRolls = c.rounds.filter((r) => r.skill.startsWith('attr:')).length;
  const extrasUsed = Math.max(0, attrRolls - (a.locked.startsWith('attr:') && lockedUsed.length ? 1 : 0));
  return attributeUse({ skill, locked: [a.locked], lockedUsed, natural: naturalAttrs(a), extrasUsed, budget, hasOther });
}

/** Do you have any skill (not attribute) that fits this approach? */
export const hasOtherChoice = (a: Approach, mine: (id: string) => Dice): boolean => a.skills.some((id) => !id.startsWith('attr:') && mine(id).n > 0);

/** Is this skill allowed this round? Reasonable for the approach, and the locked roll is forced last. */
export function allowed(c: Conflict, a: Approach, skill: string, ctx: { budget: number; hasOther: boolean } = { budget: 1, hasOther: true }): boolean {
  if (skill.startsWith('attr:')) {
    if (!attrUseIn(c, a, skill, ctx.hasOther, ctx.budget).ok) return false;
  } else if (!a.skills.includes(skill)) return false;
  const last = c.rounds.length === ROUNDS - 1;
  const lockedUsed = c.rounds.some((r) => r.skill === a.locked);
  return !last || lockedUsed || skill === a.locked;
}

/** Must the next round be the locked roll? */
export const mustUseLocked = (c: Conflict, a: Approach): boolean =>
  c.rounds.length === ROUNDS - 1 && !c.rounds.some((r) => r.skill === a.locked);

/** Control for the winner of one exchange of rolls. */
export function exchange(mine: number, theirs: number): { mine: number; theirs: number } {
  if (mine === theirs) return { mine: 1, theirs: 1 };
  const d = Math.abs(mine - theirs);
  const won = 1 + Math.floor(d / 5);
  return mine > theirs ? { mine: won, theirs: 0 } : { mine: 0, theirs: won };
}

/** Who leads round n (0-based): you, then him, then you again. */
export const leadOf = (round: number): 'me' | 'them' => (round % 2 === 0 ? 'me' : 'them');

/** One side of a conflict: what they can roll. */
export interface Side {
  dice: (id: string) => Dice;
  /** Everything they have a pool for (to find their attributes). */
  ids: string[];
}

/** A random pick among the least used options. */
function pick(options: string[], used: string[], rng: Rng): string {
  const count = (o: string) => used.filter((u) => u === o).length;
  const least = Math.min(...options.map(count));
  const from = options.filter((o) => count(o) === least);
  return from[rng.int(from.length)];
}

/** What a side uses: a skill that fits and that they have, else one of their attributes (worse each time it's reused). */
export function choose(fits: string[], side: Side, used: string[], rng: Rng): string {
  const has = fits.filter((id) => side.dice(id).n > 0);
  if (has.length) return pick(has, used, rng);
  const stats = side.ids.filter((id) => id.startsWith('attr:') && side.dice(id).n > 0);
  if (stats.length) return pick(stats, used, rng);
  return fits[0]; // nothing at all: rolls 0
}

const usedBy = (c: Conflict): string[] => c.rounds.map((r) => r.answer);

/** His skill for his round. */
export const theirMove = (c: Conflict, a: Approach, side: Side, rng: Rng): string => choose(a.moves?.length ? a.moves : a.answers, side, usedBy(c), rng);

/** His answer when you lead. */
export const replyTo = (c: Conflict, a: Approach, side: Side, rng: Rng): string => choose(a.answers, side, usedBy(c), rng);

/**
 * Play one round. When you lead, `skill` is yours and he answers (chosen here);
 * when he leads, `theirSkill` is his pick (from `theirMove`) and `skill` is your answer.
 */
export function playRound(
  c: Conflict, a: Approach, skill: string,
  mineDice: (id: string) => Dice, their: Side, rng: Rng, opts: { theirSkill?: string; attrBudget?: number } = {},
): Round {
  if (conflictOver(c)) throw new Error('conflict is over');
  const ctx = { budget: opts.attrBudget ?? 1, hasOther: hasOtherChoice(a, mineDice) };
  if (!allowed(c, a, skill, ctx)) throw new Error(`${skill} is not allowed now`);
  const theirSkill = opts.theirSkill;
  const lead = leadOf(c.rounds.length);
  // Using an attribute because nothing else fits costs 2D6.
  const dice = modify(pooled(c, skill, mineDice(skill)), -attrUseIn(c, a, skill, ctx.hasOther, ctx.budget).penalty);
  const answer = lead === 'me' ? replyTo(c, a, their, rng) : theirSkill ?? theirMove(c, a, their, rng);
  const answerDice = modify(their.dice(answer), -2 * c.rounds.filter((r) => r.answer === answer).length);
  const roll = rollOpen(dice, rng);
  const answerRoll = rollOpen(answerDice, rng);
  const ctl = exchange(roll.total, answerRoll.total);
  const round: Round = { lead, skill, dice, roll, answer, answerDice, answerRoll, mine: ctl.mine, theirs: ctl.theirs };
  c.rounds.push(round);
  return round;
}

export interface Outcome {
  /** Control won in the rounds. */
  mine: number;
  theirs: number;
  /** Situation modifier applied to my side. */
  situation: number;
  /** What I have left after they spend theirs lowering mine. */
  left: number;
  success: boolean;
}

export function outcome(c: Conflict, a: Approach, goalCost: number): Outcome {
  const mine = c.rounds.reduce((s, r) => s + r.mine, 0);
  const theirs = c.rounds.reduce((s, r) => s + r.theirs, 0);
  const situation = a.situation + (c.bonus?.control ?? 0);
  // Can go below zero: the balance after he has spent his Control (and what your situation did to yours).
  const left = mine + situation - theirs;
  return { mine, theirs, situation, left, success: left >= goalCost };
}
