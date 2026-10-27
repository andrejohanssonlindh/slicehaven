import type { ChallengeDef } from './challenge';
import { type Dice, type TestResult, DIFFICULTY, test } from './checks';
import type { Rng } from './rng';
import type { Approach } from './social';

/**
 * Exploration scenes: a map with things in it you can look at, talk to, and use
 * skills on. Scenes are data (content/scenes); this file holds the shared rules:
 * conditions on flags, effects, which skills are useful where, and skill checks.
 *
 * "Use a skill" is always possible on anything. A thing lists the checks it
 * offers, each with the skills that are reasonable for it; any other skill just
 * gets a "that won't help here" line.
 */
export type SceneTime = 'night' | 'dawn' | 'day';

/** Shown in the log in different colours. */
export type Tone = 'say' | 'speech' | 'roll' | 'good' | 'bad' | 'info';

/** A condition on scene flags. */
export interface Cond {
  all?: string[];
  none?: string[];
}

export type Effect =
  | { say: string; tone?: Tone }
  | { set: string }
  | { unset: string }
  /** Lose a share of your silver (0.2 = 20%). */
  | { loseSilver: number; why: string }
  | { time: SceneTime }
  /** Take a thing (or person) out of the scene. */
  | { remove: string }
  /** The hero gets in; the text closes the scene. Climbing lands on `to` (offset col,row). */
  | { enter: string; via?: 'climb' | 'gate'; to?: [number, number] }
  /** Show what is worth a look within this many hexes (a thorough look around). */
  | { reveal: number }
  /** How someone feels about you (−3..+3), added to. `who` is the thing's id, `name` what to call them. */
  | { mood: number; who?: string; name?: string }
  /** Keep advantages for a later roll of this kind, optionally only against one person (see Token). */
  | { token: { kind: string; n: number; against?: string; label: string } };

/**
 * A kept advantage. One advantage is worth 5 points of difficulty: the same margin
 * that earns one on a roll. Spent (used up) by the next roll that wants its kind.
 */
export interface Token {
  kind: string;
  n: number;
  against?: string;
  label: string;
}

/** What one person in the scene remembers of you. */
export interface Memory {
  /** Social tries so far (successful or not). */
  talks: number;
  /** −3..+3; colours the next try. */
  mood: number;
  /** How the last try went. */
  last?: 'fail' | 'success' | 'strong';
}

export interface CheckDef {
  id: string;
  /** What you're trying, e.g. "Climb the ivy". */
  label: string;
  /** Reasonable skills (and attr:… ids). */
  skills: string[];
  difficulty: number;
  /** What looking around turns up about this: describe the thing, never the solution. */
  hint?: string;
  /** How well you must roll when looking around to notice the hint (default tricky). */
  spot?: number;
  /** What you're trying to get done. A check shadows library hooks with the same intention (see skillweb). */
  intention?: string;
  /** Added to `success` on a strong success (2+ advantages). */
  strong?: Effect[];
  /** Came from the skill-web library rather than the scene itself. */
  fromLibrary?: boolean;
  /** A social try with this person: costs one of their talks, and their mood colours it. */
  talk?: { who: string; patience: number };
  /** Kinds of kept advantage (Token.kind) this check can spend. */
  wants?: string[];
  /**
   * Knowledge and insight: you are not told how it went. Success gives the truth and failure a
   * plausible wrong answer, so you cannot just take the opposite, and a failure is never "nothing".
   */
  hidden?: boolean;
  when?: Cond;
  /** Failures allowed before the check closes (default: unlimited). */
  tries?: number;
  success: Effect[];
  failure: Effect[];
  /** Happens on the failure that uses up the last try. */
  outOfTries?: Effect[];
}

export interface ActionDef {
  id: string;
  label: string;
  sub?: string;
  when?: Cond;
  effects: Effect[];
}

export interface TalkOption {
  label: string;
  when?: Cond;
  effects?: Effect[];
  /** Opens the social conflict on this thing. */
  argue?: boolean;
}

export interface TalkDef {
  when?: Cond;
  line: string;
  options: TalkOption[];
}

export interface SceneApproach extends Approach {
  /** What you say to open with. */
  pitch: string;
  /** Short hint: "+2 Control: coin talks". */
  why: string;
  when?: Cond;
  /** The other side's lines, one per round. */
  retorts: string[];
  success: Effect[];
  failure: Effect[];
}

export interface SocialDef {
  /** What winning gets you, e.g. "open the gate". */
  goal: string;
  /** Control needed to buy the goal (2 = make them do something). */
  cost: number;
  /** The other side's pools by skill id: what he really has. */
  dice: Record<string, Dice>;
  approaches: SceneApproach[];
}

export type Look = string | { when?: Cond; text: string }[];

export interface ObjectDef {
  id: string;
  name: string;
  /** Art key (see art/sceneArt). People are drawn from their unit kind instead. */
  art?: string;
  /** Other art while a flag is set (e.g. the gate standing open). */
  artWhen?: { flag: string; art: string }[];
  /** Offset (col,row) hexes it covers. */
  hexes: [number, number][];
  /** What a studied thing is really like, and a plausible wrong idea of it (for hidden knowledge rolls). */
  lore?: { true: string; false: string };
  /** How many social tries they put up with (default comes from the kind). */
  patience?: number;
  /** What kind of thing it is (content/skillweb kinds); library hooks for that kind apply. */
  kind?: string;
  /** Status tags (e.g. 'rich') that tagged library hooks look for. */
  tags?: string[];
  /** People: one unit per hex, of these kinds (a guard; a group of travellers). */
  units?: string[];
  /** Blocks movement (or only until a flag is set). Default: blocks. */
  blocks?: boolean | { unless: string };
  /** Draw one sprite per hex (walls) instead of one for the whole thing. */
  perHex?: boolean;
  look: Look;
  talk?: TalkDef[];
  checks?: CheckDef[];
  actions?: ActionDef[];
  social?: SocialDef;
  /** Said when you try a skill that doesn't help. `{skill}` is replaced. */
  noUse?: string;
}

export interface ExitDef {
  hexes: [number, number][];
  when: Cond;
  effects: Effect[];
}

export interface SceneDef {
  id: string;
  title: string;
  intro: string[];
  /** Offset-coord ground map, one char per hex (see the scene's legend). */
  layout: string[];
  start: { time: SceneTime; silver: number; hero: [number, number] };
  /** Peoples that belong here; anyone else is a stranger (and humans treat strangers a little warily). */
  locals?: string[];
  /** The kind of people most folk here are (e.g. 'human' in a human city). Meeting your own kind only counts as kin when you are not the majority. */
  majority?: string;
  objects: ObjectDef[];
  exits: ExitDef[];
  /** Efforts against the place itself (survey it, find your way…): three rolls against a difficulty. */
  challenges?: ChallengeDef[];
}

export interface SceneState {
  time: SceneTime;
  silver: number;
  flags: Record<string, boolean>;
  /** Failed attempts per check id. */
  fails: Record<string, number>;
  removed: string[];
  /** What each person remembers of you, by object id. */
  social: Record<string, Memory>;
  /** Advantages you're holding for later. */
  tokens: Token[];
  /** Spots (col,row) where you've already looked around. */
  looked: string[];
  /** Set once the scene is over: the closing text. */
  ended?: string;
}

export const newSceneState = (def: SceneDef): SceneState => ({
  time: def.start.time, silver: def.start.silver, flags: {}, fails: {}, removed: [], looked: [], social: {}, tokens: [],
});

export function met(s: SceneState, c?: Cond): boolean {
  if (!c) return true;
  return (c.all ?? []).every((f) => s.flags[f]) && !(c.none ?? []).some((f) => s.flags[f]);
}

export function lookText(o: ObjectDef, s: SceneState): string {
  if (typeof o.look === 'string') return o.look;
  return o.look.find((l) => met(s, l.when))?.text ?? '';
}

export const artOf = (o: ObjectDef, s: SceneState): string | undefined => o.artWhen?.find((a) => s.flags[a.flag])?.art ?? o.art;

export function blocks(o: ObjectDef, s: SceneState): boolean {
  if (o.blocks === undefined || o.blocks === true) return true;
  if (o.blocks === false) return false;
  return !s.flags[o.blocks.unless];
}

export const talkFor = (o: ObjectDef, s: SceneState): TalkDef | undefined => o.talk?.find((t) => met(s, t.when));

export const talksLeft = (s: SceneState, who: string, patience: number): number => patience - (s.social[who]?.talks ?? 0);

export const checkOpen = (c: CheckDef, s: SceneState): boolean =>
  met(s, c.when) && !(c.hidden && s.flags[`tried:${c.id}`]) && (c.tries === undefined || (s.fails[c.id] ?? 0) < c.tries) && (!c.talk || talksLeft(s, c.talk.who, c.talk.patience) > 0);

/** Checks you can try on this thing right now. */
export const openChecks = (o: ObjectDef, s: SceneState): CheckDef[] => (o.checks ?? []).filter((c) => checkOpen(c, s));

/** Skills that would do something here (in check order, no repeats). */
export function usefulSkills(o: ObjectDef, s: SceneState): string[] {
  const out: string[] = [];
  for (const c of openChecks(o, s)) for (const k of c.skills) if (!out.includes(k)) out.push(k);
  return out;
}

/** The check a skill would attempt here, if any. */
export const checkFor = (o: ObjectDef, s: SceneState, skill: string): CheckDef | undefined =>
  openChecks(o, s).find((c) => c.skills.includes(skill));

/**
 * Using a skill where you stand: every open check, on the things next to you,
 * that this skill would attempt. (Several means: ask which.)
 */
export function checksHere(objects: ObjectDef[], s: SceneState, skill: string, isNext: (o: ObjectDef) => boolean): { o: ObjectDef; c: CheckDef }[] {
  const out: { o: ObjectDef; c: CheckDef }[] = [];
  for (const o of objects) {
    if (s.removed.includes(o.id) || !isNext(o)) continue;
    const c = checkFor(o, s, skill);
    if (c) out.push({ o, c });
  }
  return out;
}

/** What a look around turns up: hints from open checks on things within reach, nearest first. */
export function hintsNear(objects: ObjectDef[], s: SceneState, distance: (o: ObjectDef) => number, range: number): { o: ObjectDef; hint: string; d: number }[] {
  const out: { o: ObjectDef; hint: string; d: number }[] = [];
  for (const o of objects) {
    if (s.removed.includes(o.id)) continue;
    const d = distance(o);
    if (d > range) continue;
    for (const c of openChecks(o, s)) if (c.hint) out.push({ o, hint: c.hint, d });
  }
  return out.sort((a, b) => a.d - b.d);
}

/** Looking around: can a hint be noticed with this total, from this far away? Far things are harder. */
export const spotted = (total: number, spot: number | undefined, distance: number): boolean =>
  total >= (spot ?? DIFFICULTY.tricky) + Math.max(0, distance - 2);

/**
 * Look around from a spot: a Search (or Alertness) roll, not a free list.
 * You only learn about what the roll is good enough to notice, and only the thing,
 * not what to do with it. Each spot can be looked over once; move to look again.
 */
export function lookAround(
  objects: ObjectDef[], s: SceneState, spotKey: string, distance: (o: ObjectDef) => number, range: number, dice: Dice, rng: Rng,
): { again: true } | { again: false; result: TestResult; found: { o: ObjectDef; hint: string; d: number }[] } {
  if (s.looked.includes(spotKey)) return { again: true };
  s.looked.push(spotKey);
  const roll = test(dice, 0, rng);
  const found = hintsNear(objects, s, distance, range).filter((h) => {
    const c = openChecks(h.o, s).find((x) => x.hint === h.hint);
    return spotted(roll.roll.total, c?.spot, h.d);
  });
  return { again: false, result: roll, found };
}

export const approachOpen =(a: SceneApproach, s: SceneState): boolean => met(s, a.when) && !s.flags[`tried:${a.id}`];

/** Strong success: this many advantages over the difficulty. */
export const STRONG_AT = 2;

/** How someone seems to feel about you, for the log and for clicking on them. */
export function moodWord(mood: number): string {
  if (mood <= -3) return 'is furious with you';
  if (mood === -2) return 'seems irritated';
  if (mood === -1) return 'seems wary';
  if (mood === 1) return 'seems warmer toward you';
  if (mood === 2) return 'seems friendly';
  if (mood >= 3) return 'is clearly taken with you';
  return 'seems neutral';
}

/** What one person's memory of you looks like from outside (nothing if you haven't met). */
export function moodLine(name: string, mem: Memory | undefined, patience?: number): string | undefined {
  if (!mem || (!mem.talks && !mem.mood)) return undefined;
  const out = patience !== undefined && mem.talks >= patience ? 'has had enough of you' : patience !== undefined && mem.talks === patience - 1 ? `${moodWord(mem.mood)}, and is getting impatient` : moodWord(mem.mood);
  return `${name} ${out}.`;
}

/** What the situation does to one single roll (worked out by skillweb.situation): it changes the difficulty. */
export interface Situation {
  /** Added to the difficulty (negative = easier). */
  shift: number;
  /** Tokens this roll uses up. */
  spend: Token[];
  /** Why, for the roll's log line. */
  notes: string[];
}

export const NO_SITUATION: Situation = { shift: 0, spend: [], notes: [] };

/** Roll a check and work out what happens (effects are applied by the caller). */
export function attempt(
  s: SceneState, c: CheckDef, dice: Dice, rng: Rng, sit: Situation = NO_SITUATION,
): { result: TestResult; effects: Effect[]; difficulty: number } {
  const difficulty = Math.max(2, c.difficulty + sit.shift);
  const result = test(dice, difficulty, rng);
  for (const tk of sit.spend) s.tokens.splice(s.tokens.indexOf(tk), 1);
  const mem = c.talk ? (s.social[c.talk.who] ??= { talks: 0, mood: 0 }) : undefined;
  if (mem) mem.talks++;
  // You cannot tell how a hidden roll went, so you cannot roll it again to compare.
  if (c.hidden) s.flags[`tried:${c.id}`] = true;
  if (!result.success) {
    s.fails[c.id] = (s.fails[c.id] ?? 0) + 1;
    if (mem) mem.last = 'fail';
    const last = c.tries !== undefined && s.fails[c.id] >= c.tries;
    return { result, difficulty, effects: [...c.failure, ...(last ? c.outOfTries ?? [] : [])] };
  }
  const strong = result.advantages >= STRONG_AT && !!c.strong;
  if (mem) mem.last = strong ? 'strong' : 'success';
  return { result, difficulty, effects: strong ? [...c.success, ...c.strong!] : c.success };
}

/** What applying effects did, for the log and the visuals. */
export type SceneEvent =
  | { kind: 'say'; text: string; tone: Tone }
  | { kind: 'flag'; flag: string; on: boolean }
  | { kind: 'silver'; amount: number; why: string }
  | { kind: 'time'; time: SceneTime }
  | { kind: 'reveal'; range: number }
  | { kind: 'remove'; id: string }
  | { kind: 'enter'; text: string; via: 'climb' | 'gate'; to?: [number, number] };

export function apply(s: SceneState, effects: Effect[]): SceneEvent[] {
  const out: SceneEvent[] = [];
  for (const e of effects) {
    if ('say' in e) out.push({ kind: 'say', text: e.say, tone: e.tone ?? 'say' });
    else if ('set' in e) {
      s.flags[e.set] = true;
      out.push({ kind: 'flag', flag: e.set, on: true });
    } else if ('unset' in e) {
      delete s.flags[e.unset];
      out.push({ kind: 'flag', flag: e.unset, on: false });
    } else if ('loseSilver' in e) {
      const lost = Math.min(s.silver, Math.round(s.silver * e.loseSilver));
      s.silver -= lost;
      out.push({ kind: 'silver', amount: -lost, why: e.why });
    } else if ('time' in e) {
      s.time = e.time;
      out.push({ kind: 'time', time: e.time });
    } else if ('remove' in e) {
      if (!s.removed.includes(e.remove)) s.removed.push(e.remove);
      out.push({ kind: 'remove', id: e.remove });
    } else if ('reveal' in e) {
      out.push({ kind: 'reveal', range: e.reveal });
    } else if ('mood' in e) {
      const who = e.who ?? '';
      const mem = (s.social[who] ??= { talks: 0, mood: 0 });
      const before = mem.mood;
      mem.mood = Math.max(-3, Math.min(3, mem.mood + e.mood));
      if (mem.mood !== before) out.push({ kind: 'say', tone: 'info', text: `${e.name ?? 'They'} ${moodWord(mem.mood)}.` });
    } else if ('token' in e) {
      s.tokens.push({ ...e.token });
      out.push({ kind: 'say', tone: 'info', text: `You keep +${e.token.n} advantage for later (${e.token.label}).` });
    } else if ('enter' in e) {
      s.ended = e.enter;
      out.push({ kind: 'enter', text: e.enter, via: e.via ?? 'gate', to: e.to });
    }
  }
  return out;
}
