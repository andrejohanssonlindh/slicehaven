import { type Dice, type OpenRoll, advantages, modify, rollOpen } from './checks';
import type { Cond, Effect, SceneState, SceneTime } from './scene';
import { met } from './scene';
import type { Rng } from './rng';

/**
 * Challenges: you against the world, after the tabletop rules (the other kind of
 * contest next to conflicts, which are against someone who answers back).
 * - Three rolls against one difficulty. A roll that reaches it gives 1 Control,
 *   +1 per Advantage (every full 5 over).
 * - Locked rolls (usually an attribute) must each be used once; you choose when.
 * - Any other roll can be any reasonable skill, expertise, mark or ability.
 *   Using the same skill again costs −2D6 each time.
 * - The situation can be an upper hand (+2 Control) or a weak position (−2).
 * - 'Everyday' challenges give 1 to 3 Control whatever you roll; 'important' ones
 *   give what you earn.
 * - The total Control is looked up in the challenge's own result list.
 *
 * A challenge is data. The hooks into it are the skills that are reasonable (some only
 * at certain times, like darkvision at night) and the edges abilities give.
 */
export const CHALLENGE_ROLLS = 3;

export interface ChallengeSkill {
  id: string;
  /** Only reasonable at these times (darkvision at night). */
  time?: SceneTime[];
}

/** An ability or skill that puts you in an upper hand (or weak position) here. */
export interface Edge {
  skill: string;
  time?: SceneTime[];
  /** +2 for an upper hand. */
  control: number;
  note: string;
}

export interface ChallengeResult {
  /** The least Control this result needs. */
  atLeast: number;
  text: string;
  effects: Effect[];
}

export interface ChallengeDef {
  id: string;
  label: string;
  /** What succeeding gets you, in a few words. */
  goal: string;
  intro: string;
  /** One difficulty, or one per time of day. */
  difficulty: number | Record<SceneTime, number>;
  level?: 'everyday' | 'important';
  /** Rolls you must use once (usually an attribute). */
  locked: string[];
  skills: ChallengeSkill[];
  edges?: Edge[];
  when?: Cond;
  /** Results, any order: the highest `atLeast` you reach is the one you get. */
  results: ChallengeResult[];
}

export interface ChallengeRoll {
  skill: string;
  dice: Dice;
  roll: OpenRoll;
  difficulty: number;
  /** 0 if it fell short, else 1 + Advantages. */
  control: number;
}

export interface Challenge {
  id: string;
  rolls: ChallengeRoll[];
}

export const newChallenge = (id: string): Challenge => ({ id, rolls: [] });
export const challengeOver = (c: Challenge): boolean => c.rolls.length >= CHALLENGE_ROLLS;

export const difficultyAt = (d: ChallengeDef, time: SceneTime): number => (typeof d.difficulty === 'number' ? d.difficulty : d.difficulty[time]);

export const challengeOpen = (d: ChallengeDef, s: SceneState): boolean => met(s, d.when) && !s.flags[`done:${d.id}`];

/** Is this skill reasonable now? Locked rolls always are. */
export function reasonable(d: ChallengeDef, skill: string, time: SceneTime): boolean {
  if (d.locked.includes(skill) || skill.startsWith('attr:')) return true; // your own nature is always possible
  const s = d.skills.find((x) => x.id === skill);
  return !!s && (!s.time || s.time.includes(time));
}

/** Skills listed for this challenge right now (locked first). */
export const challengeSkills = (d: ChallengeDef, time: SceneTime): string[] => [
  ...d.locked,
  ...d.skills.filter((s) => !s.time || s.time.includes(time)).map((s) => s.id).filter((id) => !d.locked.includes(id)),
];

export const timesRolled = (c: Challenge, skill: string): number => c.rolls.filter((r) => r.skill === skill).length;

/** The pool after the repeat penalty. */
export const challengePool = (c: Challenge, skill: string, base: Dice): Dice => modify(base, -2 * timesRolled(c, skill));

/** Must the next roll be a locked one that hasn't been used? */
export function mustLock(d: ChallengeDef, c: Challenge): string[] {
  const left = d.locked.filter((id) => !c.rolls.some((r) => r.skill === id));
  return left.length >= CHALLENGE_ROLLS - c.rolls.length ? left : [];
}

/** May this skill be rolled next? (Reasonable, and the locked rolls still fit in the rolls that remain.) */
export function challengeAllowed(d: ChallengeDef, c: Challenge, skill: string, time: SceneTime): boolean {
  if (challengeOver(c) || !reasonable(d, skill, time)) return false;
  const must = mustLock(d, c);
  return must.length === 0 || must.includes(skill);
}

/** Control from edges: the abilities you have that fit the time of day. */
export function edgeControl(d: ChallengeDef, time: SceneTime, has: (skill: string) => boolean): { control: number; notes: string[] } {
  let control = 0;
  const notes: string[] = [];
  for (const e of d.edges ?? []) {
    if (e.time && !e.time.includes(time)) continue;
    if (!has(e.skill)) continue;
    control += e.control;
    notes.push(e.note);
  }
  return { control: Math.max(-2, Math.min(2, control)), notes };
}

export function rollChallenge(d: ChallengeDef, c: Challenge, skill: string, base: Dice, time: SceneTime, rng: Rng): ChallengeRoll {
  if (!challengeAllowed(d, c, skill, time)) throw new Error(`${skill} is not allowed now`);
  const dice = challengePool(c, skill, base);
  const difficulty = difficultyAt(d, time);
  const roll = rollOpen(dice, rng);
  const hit = dice.n > 0 && roll.total >= difficulty;
  const r: ChallengeRoll = { skill, dice, roll, difficulty, control: hit ? 1 + advantages(roll.total - difficulty) : 0 };
  c.rolls.push(r);
  return r;
}

export interface ChallengeOutcome {
  /** Control from the rolls. */
  earned: number;
  /** Upper hand or weak position. */
  situation: number;
  /** Total after the level's limits. */
  control: number;
  result: ChallengeResult;
}

export function challengeOutcome(d: ChallengeDef, c: Challenge, situation: number): ChallengeOutcome {
  const earned = c.rolls.reduce((n, r) => n + r.control, 0);
  let control = Math.max(0, earned + situation);
  if (d.level === 'everyday') control = Math.max(1, Math.min(3, control));
  const sorted = [...d.results].sort((a, b) => b.atLeast - a.atLeast);
  const result = sorted.find((r) => control >= r.atLeast) ?? sorted[sorted.length - 1];
  return { earned, situation, control, result };
}
