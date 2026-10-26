import { type Dice, type OpenRoll, modify, rollOpen } from './checks';
import type { Rng } from './rng';

/**
 * Social conflicts, after the tabletop rules for challenges & conflicts:
 * - Three rounds. Each round both sides roll a skill against each other.
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
  /** How the other side answers, one per round in this order (repeats skipped if possible). */
  answers: string[];
}

export const ROUNDS = 3;

export interface Round {
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
}

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

/** The other side's skill for the next round: the next unused answer, else the first again. */
export function nextAnswer(c: Conflict, a: Approach): string {
  const used = new Set(c.rounds.map((r) => r.answer));
  return a.answers.find((s) => !used.has(s)) ?? a.answers[c.rounds.length % a.answers.length];
}

/** Play one round. `mineDice`/`theirDice` give the base pool for a skill id. */
export function playRound(
  c: Conflict, a: Approach, skill: string,
  mineDice: (id: string) => Dice, theirDice: (id: string) => Dice, rng: Rng,
): Round {
  if (conflictOver(c)) throw new Error('conflict is over');
  if (!allowed(c, a, skill)) throw new Error(`${skill} is not allowed now`);
  const dice = pooled(c, skill, mineDice(skill));
  const answer = nextAnswer(c, a);
  const answerDice = modify(theirDice(answer), -2 * c.rounds.filter((r) => r.answer === answer).length);
  const roll = rollOpen(dice, rng);
  const answerRoll = rollOpen(answerDice, rng);
  const ctl = exchange(roll.total, answerRoll.total);
  const round: Round = { skill, dice, roll, answer, answerDice, answerRoll, mine: ctl.mine, theirs: ctl.theirs };
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
  const left = Math.max(0, Math.max(0, mine + a.situation) - theirs);
  return { mine, theirs, situation: a.situation, left, success: left >= goalCost };
}
