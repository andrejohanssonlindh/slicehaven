import { type Dice, type TestResult, test } from './checks';
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
  /** Lose a share of your gold (0.2 = 20%). */
  | { loseGold: number; why: string }
  | { time: SceneTime }
  /** Take a thing (or person) out of the scene. */
  | { remove: string }
  /** The hero gets in; the text closes the scene. Climbing lands on `to` (offset col,row). */
  | { enter: string; via?: 'climb' | 'gate'; to?: [number, number] };

export interface CheckDef {
  id: string;
  /** What you're trying, e.g. "Climb the ivy". */
  label: string;
  /** Reasonable skills (and attr:… ids). */
  skills: string[];
  difficulty: number;
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
  /** The other side's pools by skill id. */
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
  start: { time: SceneTime; gold: number; hero: [number, number] };
  objects: ObjectDef[];
  exits: ExitDef[];
}

export interface SceneState {
  time: SceneTime;
  gold: number;
  flags: Record<string, boolean>;
  /** Failed attempts per check id. */
  fails: Record<string, number>;
  removed: string[];
  /** Set once the scene is over: the closing text. */
  ended?: string;
}

export const newSceneState = (def: SceneDef): SceneState => ({
  time: def.start.time, gold: def.start.gold, flags: {}, fails: {}, removed: [],
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

export const checkOpen = (c: CheckDef, s: SceneState): boolean =>
  met(s, c.when) && (c.tries === undefined || (s.fails[c.id] ?? 0) < c.tries);

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

export const approachOpen = (a: SceneApproach, s: SceneState): boolean => met(s, a.when) && !s.flags[`tried:${a.id}`];

/** Roll a check and work out what happens (effects are applied by the caller). */
export function attempt(s: SceneState, c: CheckDef, dice: Dice, rng: Rng): { result: TestResult; effects: Effect[] } {
  const result = test(dice, c.difficulty, rng);
  if (result.success) return { result, effects: c.success };
  s.fails[c.id] = (s.fails[c.id] ?? 0) + 1;
  const last = c.tries !== undefined && s.fails[c.id] >= c.tries;
  return { result, effects: [...c.failure, ...(last ? c.outOfTries ?? [] : [])] };
}

/** What applying effects did, for the log and the visuals. */
export type SceneEvent =
  | { kind: 'say'; text: string; tone: Tone }
  | { kind: 'flag'; flag: string; on: boolean }
  | { kind: 'gold'; amount: number; why: string }
  | { kind: 'time'; time: SceneTime }
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
    } else if ('loseGold' in e) {
      const lost = Math.min(s.gold, Math.round(s.gold * e.loseGold));
      s.gold -= lost;
      out.push({ kind: 'gold', amount: -lost, why: e.why });
    } else if ('time' in e) {
      s.time = e.time;
      out.push({ kind: 'time', time: e.time });
    } else if ('remove' in e) {
      if (!s.removed.includes(e.remove)) s.removed.push(e.remove);
      out.push({ kind: 'remove', id: e.remove });
    } else if ('enter' in e) {
      s.ended = e.enter;
      out.push({ kind: 'enter', text: e.enter, via: e.via ?? 'gate', to: e.to });
    }
  }
  return out;
}
