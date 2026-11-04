import type { Dice } from '../chargen/tables';
import { modify } from '../checks';
import { type Roll, rollTest } from '../dice';
import type { Rng } from '../rng';
import type { Effect } from '../scene';
import { type HookDef, type Library, hooksFor, instantiate } from '../skillweb';
import type { StateValue, ThingStates } from './state';
import type { Thing, ThingDef, Things } from './things';
import type { LeadStudy } from './leads';
import type { CultureDef, Welcome, Wrong } from './standing';
import type { Wealth } from './carry';

/**
 * Actions on things (plan item B3, the frame: B3a). Whatever is tried, a hearth, a stool, later the smith's furnace or
 * a guard, goes through the same five steps (design: director/design/actions.md):
 *
 * 1. **Offer**: what can be tried on this? Plain verbs (light, put out, sit: `content/actions/verbs/`, one file each,
 *    each saying which kinds it is for) and the skill library's hooks on the kind's chain (`core/skillweb.ts`).
 * 2. **Gates**: may it be done, here, now, by you? Small condition files (`content/actions/gates/`): a thing's state, the
 *    place, the owner. A *requirement* that fails blocks (with its reason, or hides the offer: you can't light what
 *    burns); a *permission* that fails never blocks, it marks the act a transgression (owners come with B3c).
 * 3. **Resolve**: no roll, or one roll with the doer's best fitting skill (the one roll system, `core/dice.ts`), made
 *    harder by what is true where it is done (rain on an outdoor fire: `content/actions/facts.ts`).
 * 4. **Outcome**: what changes: a state set, a flag, a line said, minutes passing, a new thing made, the doer seated.
 *    States and flags are changed here; what needs the world (the clock, building a thing, seating a body) comes
 *    back as events for whoever runs the world.
 *
 * Pure rules: no DOM, no three.js, all randomness through the `Rng` given. Anyone can be the doer: the hero by a tap,
 * a villager by a behaviour (`content/behaviours/does/tendfire.ts`), through the same steps.
 */

/** Where something is: a spot on the ground, or on a storey of a house. */
export interface Spot {
  x: number;
  z: number;
  /** The storey (0 outdoors and on the ground floor). */
  level: number;
  /** The house it is in (its map id), or null outdoors. */
  house: string | null;
}

/** A placed thing to act on: its id (`placedId`, `pieceId`), its kind, and where it is. */
export interface ActTarget extends Spot {
  id: string;
  kind: string;
  /** Which way it faces (radians about y, world): a seat is sat on facing this way. */
  rot?: number;
}

/** Who acts: the hero, or someone in the map. */
export interface Doer {
  id: string;
  /** The pool they roll for a skill or attribute (`attr:…`); none is `{ n: 0 }`. */
  dice(skill: string): Dice;
  /** Load points their build adds (negative takes off: a dwarf's −8, the grant `belastning`); none is 0. */
  load?: number;
}

/** What the world looks like to the rules, for the facts gates and harder rolls ask (`content/actions/facts.ts`). */
export interface WorldView {
  /** How hard it rains, 0..1. */
  rain: number;
  /** World time, 0..24. */
  hour: number;
  /** How many houses stand within `r` metres of a point. */
  housesNear(x: number, z: number, r: number): number;
  /** How many of the map's people see the hero now (stealing under their eyes is harder; plan B3b). */
  watchers?: number;
}

/** Everything an action may read and change. */
export interface ActWorld {
  things: Things;
  states: ThingStates;
  /** Flags the world remembers (quests later): plain data, saved. */
  flags: Record<string, boolean>;
  view: WorldView;
  rng: Rng;
  /** The skill library, for the hooks a kind offers (left out: only the verbs are offered). */
  library?: Library;
  /** The leads the hero has, by id (plan B11): the `lead` gate asks it. */
  leads?: Readonly<Record<string, unknown>>;
  /** A study a lead offers on this thing, if the hero has the lead and hasn't studied it yet. */
  leadStudy?: (t: ActTarget) => { lead: string; study: LeadStudy } | null;
  /** Who owns what, and who may (plan B3c; `core/world3d/standing.ts`). Left out, the owner gate lets everything through. */
  owners?: OwnerView;
  /** What a doer holds now (its kind), or null: hands full can't take another or sit (plan B3b). Left out: hands are free. */
  holding?: (doer: string) => string | null;
  /** Which hand a thing of this kind would go in for the doer now (a shield the left, beside a one-handed weapon), or null. Left out: only empty hands take anything. */
  handFor?: (doer: string, kind: string) => 'right' | 'left' | null;
  /** Has the doer some hand free (`aHandFree`)? Left out: only when they hold nothing. */
  aHandFree?: (doer: string) => boolean;
  /** What a doer carries on them, not in hand (their own gear, by kind; plan B8a). Left out: nothing. */
  stowed?: (doer: string) => string[];
  /** Is what the doer holds their own (it can be put away on them)? */
  holdsOwn?: (doer: string) => boolean;
}

/** What the owner gate asks of the world (plan B3c). */
export interface OwnerView {
  /** How the place weighs what is done in it. */
  culture: CultureDef;
  /** The household of a house: the people whose home it is. */
  members(house: string): readonly string[];
  /** What the room at a spot welcomes without asking (its kind's `welcome`: an inn's taproom, not its guest rooms), or null. */
  welcome(at: Spot): Welcome | null;
  /** Has the doer leave to be in this house now? */
  leave(doer: string, house: string): boolean;
  /** How well off a household is (what a thing taken from them is worth to them, B3b). Left out: common. */
  wealth?(house: string): Wealth;
}

/** A fact about a spot: true or false there (indoors, raining, among houses). One entry in `content/actions/facts.ts`. */
export interface FactDef {
  id: string;
  about: string;
  /** `target` is the thing acted on, if any (embers in a hearth are a fact about the hearth). */
  holds(at: Spot, view: WorldView, target?: ActTarget | null, world?: Pick<ActWorld, 'states' | 'things'>): boolean;
  /** Said when a gate needs it false and it is true ("You are among the houses."), and the other way round. */
  whenTrue: string;
  whenFalse: string;
}

/** A gate as a verb uses it: the gate's id and what the verb says to it. */
export type GateUse = { gate: string } & Record<string, unknown>;

/** What a gate is asked about. */
export interface GateCase {
  use: GateUse;
  target: ActTarget | null;
  /** Where it is done: the thing's spot, or the doer's for an action on the spot itself. */
  at: Spot;
  doer: Doer;
  world: ActWorld;
  facts: Record<string, FactDef>;
}

/** One condition an action can need (`content/actions/gates/`, one file each). */
export interface GateDef {
  id: string;
  about: string;
  /** A requirement blocks when it fails; a permission never does: it marks the act a transgression (B3c). */
  kind: 'requirement' | 'permission';
  /** When it fails the action is not offered at all (lighting a fire that burns), rather than offered and refused. */
  hides?: boolean;
  /** What is wrong with what a verb says to it, or null (checked by the tests for every verb). */
  problem?(use: GateUse, facts: Record<string, FactDef>): string | null;
  /** Null if it lets the action through; otherwise why not (English, may use {name}). */
  check(c: GateCase): string | null;
  /** A permission that failed: what wrong the act is (whose, what kind), for whoever sees it to answer (B3c). */
  wrong?(c: GateCase): Wrong | null;
}

/** What an action does when it is done. */
export type Outcome =
  | { say: string; tone?: 'good' | 'bad' }
  /** Set a state of the thing acted on (it must be one its kind has). */
  | { state: string; value: StateValue }
  | { flag: string }
  | { unflag: string }
  /** Make a new thing of this kind where the doer stands (a campfire). */
  | { make: string }
  /** The doer sits on the thing. */
  | { sit: true }
  /** Gives the hero a lead (`content/leads/`, plan B11): studying an inscription, searching a coat. */
  | { lead: string }
  /** What a study of the thing taught about a lead: its true read, or the plausible wrong one (the lead's file has both). */
  | { learn: string; truth: boolean }
  /** The doer picks the thing up and holds it: openly, or out of sight (slipped away unseen). Plan B3b. */
  | { carry: 'open' | 'hidden' }
  /** The doer puts down what they hold, where they stand. */
  | { putDown: true }
  /** The doer picks one of what the thing offers (its `stock` or the levels of whom it `calls`); the page asks which. */
  | { choose: 'stock' | 'calls' | 'gear' }
  /** The doer puts what they hold away on them (their own gear: at the belt, on the back). */
  | { stow: true };

/** A roll to resolve an action: the doer's best of these skills, against a difficulty. */
export interface ActRoll {
  skills: string[];
  difficulty: number;
  /** Harder where a fact holds (rain on an outdoor fire), or easier with a negative `add` (indoors, embers still in it). */
  harder?: { fact: string; add: number; note: string }[];
  /**
   * The attribute that fits (`attr:Förflyttning`), for someone with none of the skills: the rules let anyone use an
   * attribute then, at −2D6 (`core/attributes.ts`). Without one, no skill means no roll and no success.
   */
  attr?: string;
}

/** A plain verb (`content/actions/verbs/`, one file each). */
export interface VerbDef {
  id: string;
  /** What the button says (may use {name}). */
  label: string;
  /**
   * What it is done to: things whose kind is (or is a kind of) `kind`, or whose kind says `has`; or `here`, the spot
   * the doer stands on (make a fire).
   */
  on: { kind?: string; has?: keyof ThingDef } | 'here';
  gates?: GateUse[];
  /** No roll: it just happens (sit, put out). */
  roll?: ActRoll;
  /** World minutes it takes, done or not (lighting a fire: 10). */
  takes?: number;
  /** A hidden read (knowledge, insight): the doer isn't shown the dice or told how it went. */
  hidden?: boolean;
  /** The sound it makes, done or not (plan B5): how far an ordinary ear hears it in the open, metres, and what it is ("fire", "shout"). */
  noise?: { loud: number; kind: string };
  /** Done well, no one notices (stealing unseen): a wrong it is goes unanswered; done badly, whoever sees it answers. */
  unseen?: boolean;
  success: Outcome[];
  failure?: Outcome[];
}

/** One thing that can be tried, as offered. */
export interface Offer {
  /** `verb:light` or `hook:climb-wall`: what `perform` is given back. */
  id: string;
  label: string;
  /** The skills it rolls (empty: no roll). */
  skills: string[];
  /** Plain verbs first, then skill uses. */
  from: 'verb' | 'skill';
}

/** A line said, with what to fill in. */
export interface Line {
  text: string;
  tone?: 'good' | 'bad' | 'info';
}

/** What doing it did, for whoever runs the world: what to show and what to change outside the rules. */
export type ActEvent =
  | { kind: 'say'; line: Line }
  | { kind: 'state'; id: string; key: string; value: StateValue }
  | { kind: 'flag'; flag: string; on: boolean }
  | { kind: 'time'; minutes: number }
  | { kind: 'make'; thing: string; at: Spot }
  | { kind: 'sit'; target: ActTarget }
  | { kind: 'noise'; at: Spot; loud: number; sound: string }
  | { kind: 'lead'; lead: string }
  | { kind: 'learn'; lead: string; truth: boolean }
  /** The doer picked up the thing (held openly, or out of sight); they put down what they held, here. */
  | { kind: 'carry'; target: ActTarget; hidden: boolean }
  | { kind: 'putdown'; at: Spot }
  /** Something to pick from the thing: which of its stock to take, or how good a fighter to call (the page asks). */
  | { kind: 'choose'; what: 'stock' | 'calls' | 'gear'; target: ActTarget | null }
  | { kind: 'stow' }
  /** Who saw a wrong the hero did, and how far it moved their view of them (B3c; the page shows it on easy). */
  | { kind: 'seen'; by: { id: string; name: string; by: number }[] };

export interface ActResult {
  /** It was tried (false: a requirement said no, and `reason` says why). */
  done: boolean;
  reason?: string;
  roll?: Roll;
  /** The skill rolled. */
  skill?: string;
  success?: boolean;
  events: ActEvent[];
  /** Permission gates that failed: the act was a transgression of these. */
  transgressions: string[];
  /** What wrongs it was (the owner gate's: whose, and what kind of act), for whoever saw it to answer (B3c). */
  wrongs?: Wrong[];
  /** A hidden read: don't show the dice (the page), and the lines read the same either way. */
  hidden?: boolean;
}

/** The verbs, gates and facts the frame runs on (`content/actions/`). */
export interface ActionLibrary {
  verbs: Record<string, VerbDef>;
  gates: Record<string, GateDef>;
  facts: Record<string, FactDef>;
}

/** How a thing is called in lines: its kind's `name`, else its id with spaces ("torchpost" stays one word). */
export const thingName = (t: Pick<Thing, 'id' | 'name'>): string => t.name ?? t.id.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

const fill = (text: string, name: string): string => text.replaceAll('{name}', name).replaceAll('{Name}', name.charAt(0).toUpperCase() + name.slice(1));

/** Does a verb apply to this kind of thing? */
function verbFits(v: VerbDef, t: Thing): boolean {
  if (v.on === 'here') return false;
  if (v.on.kind && !t.chain.includes(v.on.kind)) return false;
  if (v.on.has && t[v.on.has] === undefined) return false;
  return !!(v.on.kind || v.on.has);
}

/** The hooks of the skill library this kind of thing answers to (only those whose effects the 3D world can carry out). */
function hooksOf(t: Thing, lib: Library | undefined): HookDef[] {
  if (!lib) return [];
  // Hooks for people (social tries) and hidden reads need people and lore, which things in 3D don't have yet (B3d).
  return hooksFor({ kind: t.id, tags: t.tags }, lib).filter((h) => !h.social && !h.hidden);
}

/** Every gate of a verb, run: the first failed requirement (and whether it hides the offer), and the failed permissions. */
function runGates(v: VerbDef, target: ActTarget | null, at: Spot, doer: Doer, world: ActWorld, lib: ActionLibrary): { blocked: string | null; hidden: boolean; broken: string[]; wrongs: Wrong[] } {
  const broken: string[] = [], wrongs: Wrong[] = [];
  for (const use of v.gates ?? []) {
    const g = lib.gates[use.gate];
    if (!g) throw new Error(`verb ${v.id}: no gate called ${use.gate}`);
    const c: GateCase = { use, target, at, doer, world, facts: lib.facts };
    const why = g.check(c);
    if (why === null) continue;
    if (g.kind === 'permission') {
      broken.push(g.id);
      const w = g.wrong?.(c);
      if (w) wrongs.push(w);
    } else return { blocked: why, hidden: !!g.hides, broken, wrongs };
  }
  return { blocked: null, hidden: false, broken, wrongs };
}

/** What can be tried on a thing (a target) or, with `target` null, on the spot where the doer stands. Verbs first. */
export function offers(target: ActTarget | null, at: Spot, doer: Doer, world: ActWorld, lib: ActionLibrary): Offer[] {
  const t = target ? world.things.get(target.kind) : null;
  const out: Offer[] = [];
  const name = nameFor(t, doer, world);
  for (const v of Object.values(lib.verbs)) {
    if (t ? !verbFits(v, t) : v.on !== 'here') continue;
    if (runGates(v, target, at, doer, world, lib).hidden) continue;
    out.push({ id: `verb:${v.id}`, label: fill(v.label, name), skills: v.roll?.skills ?? [], from: 'verb' });
  }
  if (t) for (const h of hooksOf(t, world.library)) out.push({ id: `hook:${h.id}`, label: fill(h.label, name), skills: [...h.skills], from: 'skill' });
  // What a lead says a skill can tell about this very thing (plan B11): a knowledge roll, one try.
  // (Only with a skill that can read it: a hidden read with no skill would hand you the wrong answer as if you'd tried.)
  const s = target ? world.leadStudy?.(target) : null;
  if (s && bestSkill(doer, s.study.skills)) out.push({ id: `study:${s.lead}`, label: fill(s.study.label, name), skills: [...s.study.skills], from: 'skill' });
  return out;
}

/** A lead's study as a verb: a hidden read with the doer's best knowledge skill; its outcome is what the lead says. */
function studyVerb(lead: string, s: LeadStudy, kind: string): VerbDef {
  return {
    id: `study-${lead}`, label: s.label, on: { kind }, hidden: true, takes: s.takes ?? 10,
    roll: { skills: s.skills, difficulty: s.difficulty },
    success: [{ learn: lead, truth: true }], failure: [{ learn: lead, truth: false }],
  };
}

/** The doer's best pool among some skills (most dice, then the bigger bonus), and which skill it is; null if they have none. */
export function bestSkill(doer: Doer, skills: readonly string[]): { skill: string; dice: Dice } | null {
  let best: { skill: string; dice: Dice } | null = null;
  for (const s of skills) {
    const d = doer.dice(s);
    if (d.n <= 0) continue;
    if (!best || d.n > best.dice.n || (d.n === best.dice.n && d.mod > best.dice.mod)) best = { skill: s, dice: d };
  }
  return best;
}

/** A hook's effect as an outcome the 3D world can carry out (others, a mood or a kept advantage, need people: B3d). */
function fromEffect(e: Effect): Outcome | null {
  if ('say' in e) return { say: e.say, ...(e.tone === 'good' || e.tone === 'bad' ? { tone: e.tone } : {}) };
  if ('set' in e) return { flag: e.set };
  if ('unset' in e) return { unflag: e.unset };
  return null;
}

/** A library hook as a verb for this thing: one roll, its effects as outcomes. */
function hookVerb(h: HookDef, target: ActTarget, t: Thing, lib: Library): VerbDef {
  const c = instantiate(h, { id: target.id, name: thingName(t), kind: t.id, tags: t.tags } as never, lib);
  const outs = (es: Effect[]): Outcome[] => es.map(fromEffect).filter((o): o is Outcome => o !== null);
  return { id: h.id, label: c.label, on: { kind: t.id }, roll: { skills: c.skills, difficulty: c.difficulty }, success: outs(c.success), failure: outs(c.failure) };
}

/** Carry out outcomes: states and flags change now; the rest goes back as events. */
function apply(outs: readonly Outcome[], target: ActTarget | null, at: Spot, name: string, world: ActWorld, events: ActEvent[]): void {
  for (const o of outs) {
    if ('say' in o) events.push({ kind: 'say', line: { text: fill(o.say, name), ...(o.tone ? { tone: o.tone } : {}) } });
    else if ('state' in o) {
      if (!target) throw new Error(`a state can only be set on a thing (${o.state})`);
      if (world.states.set(target.id, target.kind, o.state, o.value)) events.push({ kind: 'state', id: target.id, key: o.state, value: o.value });
    } else if ('flag' in o) {
      world.flags[o.flag] = true;
      events.push({ kind: 'flag', flag: o.flag, on: true });
    } else if ('unflag' in o) {
      delete world.flags[o.unflag];
      events.push({ kind: 'flag', flag: o.unflag, on: false });
    } else if ('make' in o) events.push({ kind: 'make', thing: o.make, at });
    else if ('sit' in o) {
      if (!target) throw new Error('sitting needs a thing to sit on');
      events.push({ kind: 'sit', target });
    } else if ('lead' in o) events.push({ kind: 'lead', lead: o.lead });
    else if ('learn' in o) events.push({ kind: 'learn', lead: o.learn, truth: o.truth });
    else if ('carry' in o) {
      if (!target) throw new Error('carrying needs a thing to pick up');
      events.push({ kind: 'carry', target, hidden: o.carry === 'hidden' });
    } else if ('putDown' in o) events.push({ kind: 'putdown', at });
    else if ('choose' in o) {
      if (!target && o.choose !== 'gear') throw new Error('choosing needs a thing to choose from');
      events.push({ kind: 'choose', what: o.choose, target });
    } else if ('stow' in o) events.push({ kind: 'stow' });
  }
}

/** What a line calls the thing: the one acted on, or (on the spot where the doer stands) what they hold. */
function nameFor(t: Thing | null, doer: Doer, world: ActWorld): string {
  if (t) return thingName(t);
  const held = world.holding?.(doer.id);
  return held && world.things.has(held) ? thingName(world.things.get(held)) : '';
}

/**
 * Try an offer (`Offer.id`) on a thing, or on the doer's spot with `target` null: the gates, the roll, the outcome. A
 * failed requirement leaves the world as it was (`done: false`, and why); anything tried takes its minutes.
 */
export function perform(offer: string, target: ActTarget | null, at: Spot, doer: Doer, world: ActWorld, lib: ActionLibrary): ActResult {
  const [from, id] = offer.split(':') as ['verb' | 'hook' | 'study', string];
  const t = target ? world.things.get(target.kind) : null;
  const name = nameFor(t, doer, world);
  let v: VerbDef | undefined;
  if (from === 'verb') v = lib.verbs[id];
  else if (from === 'study') {
    const s = target ? world.leadStudy?.(target) : null;
    if (s && s.lead === id && target && bestSkill(doer, s.study.skills)) v = studyVerb(s.lead, s.study, target.kind);
  } else if (t && world.library) {
    const h = hooksOf(t, world.library).find((x) => x.id === id);
    if (h) v = hookVerb(h, target!, t, world.library);
  }
  if (!v || (t ? !(from === 'hook' || from === 'study' || verbFits(v, t)) : v.on !== 'here')) return { done: false, reason: 'That cannot be done here.', events: [], transgressions: [] };
  const g = runGates(v, target, at, doer, world, lib);
  if (g.blocked !== null) return { done: false, reason: fill(g.blocked, name), events: [], transgressions: [] };
  const events: ActEvent[] = [];
  let roll: Roll | undefined, skill: string | undefined, success = true;
  if (v.roll) {
    const best = bestSkill(doer, v.roll.skills);
    let difficulty = v.roll.difficulty;
    const harder: string[] = [], easier: string[] = [];
    for (const h of v.roll.harder ?? []) {
      const f = lib.facts[h.fact];
      if (!f) throw new Error(`verb ${v.id}: no fact called ${h.fact}`);
      if (f.holds(at, world.view, target, world)) {
        difficulty += h.add;
        (h.add > 0 ? harder : easier).push(h.note);
      }
    }
    // (Never below 2, the easiest a roll gets in the rules.)
    difficulty = Math.max(2, difficulty);
    // No fitting skill: the fitting attribute, two dice down (the rules' fallback).
    const fallback = !best && v.roll.attr && doer.dice(v.roll.attr).n > 0 ? { skill: v.roll.attr, dice: modify(doer.dice(v.roll.attr), -2) } : null;
    const use = best ?? fallback;
    if (use) {
      skill = use.skill;
      roll = rollTest(use.dice, difficulty, world.rng);
      success = !!roll.success;
      if (fallback) events.push({ kind: 'say', line: { text: 'No fitting skill: an attribute instead, at −2D6.', tone: 'info' } });
      if (easier.length) events.push({ kind: 'say', line: { text: `Easier: ${easier.join(', ')}.`, tone: 'info' } });
      if (harder.length) events.push({ kind: 'say', line: { text: `Harder: ${harder.join(', ')}.`, tone: 'info' } });
    } else {
      success = false;
      events.push({ kind: 'say', line: { text: 'You have no skill for this.', tone: 'info' } });
    }
  }
  apply(success ? v.success : v.failure ?? [], target, at, name, world, events);
  if (v.takes) events.push({ kind: 'time', minutes: v.takes });
  if (v.noise) events.push({ kind: 'noise', at, loud: v.noise.loud, sound: v.noise.kind });
  // (Done unseen: still a wrong, but no one noticed it to answer.)
  const wrongs = v.unseen && success ? [] : g.wrongs;
  return { done: true, ...(roll ? { roll } : {}), ...(skill ? { skill } : {}), success, events, transgressions: g.broken, ...(wrongs.length ? { wrongs } : {}), ...(v.hidden ? { hidden: true } : {}) };
}

/** What is wrong in an action library: verbs naming gates or facts that aren't there, or saying something a gate can't take. */
export function libraryProblems(lib: ActionLibrary, things: Things): string[] {
  const out: string[] = [];
  for (const v of Object.values(lib.verbs)) {
    if (v.on !== 'here' && v.on.kind && !things.has(v.on.kind)) out.push(`verb ${v.id}: no kind of thing called ${v.on.kind}`);
    if (v.on !== 'here' && !v.on.kind && !v.on.has) out.push(`verb ${v.id}: say what it is for (a kind, or a property the kind has)`);
    for (const use of v.gates ?? []) {
      const g = lib.gates[use.gate];
      if (!g) out.push(`verb ${v.id}: no gate called ${use.gate}`);
      else {
        const bad = g.problem?.(use, lib.facts);
        if (bad) out.push(`verb ${v.id}: gate ${use.gate}: ${bad}`);
      }
    }
    for (const h of v.roll?.harder ?? []) if (!lib.facts[h.fact]) out.push(`verb ${v.id}: no fact called ${h.fact}`);
    if ([v.roll?.attr, ...(v.roll?.skills ?? [])].includes('attr:Visdom')) out.push(`verb ${v.id}: Wisdom is never rolled`);
    const states = v.on !== 'here' && v.on.kind && things.has(v.on.kind) ? things.get(v.on.kind).states ?? {} : null;
    for (const o of [...v.success, ...(v.failure ?? [])]) {
      if ('state' in o && states && !(o.state in states)) out.push(`verb ${v.id}: a ${v.on !== 'here' ? v.on.kind : ''} has no state ${o.state}`);
      if ('make' in o && !things.has(o.make)) out.push(`verb ${v.id}: no kind of thing called ${o.make} to make`);
    }
  }
  return out;
}
