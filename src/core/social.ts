import { type Dice, type OpenRoll, modify, rollOpen } from './checks';
import type { Rng } from './rng';

/**
 * Social conflicts, after the tabletop rules for challenges & conflicts:
 * - Three rounds, and the lead alternates: in rounds 1 and 3 you pick a skill and he
 *   answers with a fitting one; in round 2 he picks a skill and you answer.
 *   What he picks and answers with is drawn at random from the few skills that fit
 *   (so you never know exactly what he will do); `responses` ties his answers to your skill.
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
  /** How the other side answers when you lead, unless `responses` has something for your skill. */
  answers: string[];
  /** What the other side leads with in his round (defaults to `answers`). */
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

/** Is this skill allowed this round? Reasonable for the approach, and the locked roll is forced last. */
export function allowed(c: Conflict, a: Approach, skill: string): boolean {
  if (!a.skills.includes(skill)) return false;
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

/** A random pick, preferring options not used yet (repeats cost dice). */
function pick(options: string[], used: string[], rng: Rng): string {
  const fresh = options.filter((o) => !used.includes(o));
  const from = fresh.length ? fresh : options;
  return from[rng.int(from.length)];
}

/** His skill for his round: random among what fits, avoiding what he has used. */
export function theirMove(c: Conflict, a: Approach, rng: Rng): string {
  return pick(a.moves?.length ? a.moves : a.answers, c.rounds.map((r) => r.answer), rng);
}

/** His answer when you lead with `mySkill`: random among the skills that fit it. */
export function replyTo(c: Conflict, a: Approach, mySkill: string, rng: Rng, responses?: Record<string, string[]>): string {
  return pick(responses?.[mySkill]?.length ? responses[mySkill] : a.answers, c.rounds.map((r) => r.answer), rng);
}

/**
 * Play one round. When you lead, `skill` is yours and he answers (chosen here);
 * when he leads, `theirSkill` is his pick (from `theirMove`) and `skill` is your answer.
 * `mineDice`/`theirDice` give the base pool for a skill id.
 */
export function playRound(
  c: Conflict, a: Approach, skill: string,
  mineDice: (id: string) => Dice, theirDice: (id: string) => Dice, rng: Rng,
  responses?: Record<string, string[]>, theirSkill?: string,
): Round {
  if (conflictOver(c)) throw new Error('conflict is over');
  if (!allowed(c, a, skill)) throw new Error(`${skill} is not allowed now`);
  const lead = leadOf(c.rounds.length);
  const dice = pooled(c, skill, mineDice(skill));
  const answer = lead === 'me' ? replyTo(c, a, skill, rng, responses) : theirSkill ?? theirMove(c, a, rng);
  const answerDice = modify(theirDice(answer), -2 * c.rounds.filter((r) => r.answer === answer).length);
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
  const left = Math.max(0, Math.max(0, mine + situation) - theirs);
  return { mine, theirs, situation, left, success: left >= goalCost };
}
