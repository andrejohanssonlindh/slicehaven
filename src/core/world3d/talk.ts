import type { Roll } from '../dice';
import { modify } from '../checks';
import type { Rng } from '../rng';
import { type CheckDef, type Memory, type ObjectDef, type SceneState, type Token, apply, attempt, moodLine, openChecks } from '../scene';
import { type Library, type Setting, type Visitor, expandObject, limitOf, readPerson, situation, talksLeftWith } from '../skillweb';
import { type Doer, type Line, type Offer, bestSkill } from './actions';
import { type AskResult, type LeadDef, type LeadsState, askAbout, heldBack, openLeads, pressed } from './leads';
import { rollTest } from '../dice';

/**
 * Talking to someone in the 3D world (plan B3d): the action frame's social resolve. What can be tried on a person is
 * the skill library's hooks on who they are (their people, their calling, every facet: `core/skillweb.ts`): size them
 * up, ask, persuade, threaten, sweet-talk… Each is one roll with the doer's best fitting skill (else Presence at
 * −2D6, the rules' fallback), made easier or harder by the situation: how they feel about you, how their people see
 * yours, what their kind leans toward, advantages you kept. They put up with only so many tries (patience).
 *
 * The rules are the 2D skill map's (`core/scene.ts`: `attempt`, `apply`), unchanged; this only gives them a person
 * and a memory. What each person remembers of you (`TalkMemory`) is plain data, kept in the world's save. (How they
 * see you grows into a scale of its own, held by each person and spreading when people meet: plan B3c, Q38.)
 */

/** Someone to talk to, as the rules see them. */
export interface TalkPerson {
  id: string;
  name: string;
  /** Their people as a kind in the skill library's tree (`asharier`, `dwarf`): how they see you, and which hooks fit. */
  kind: string;
  /** Every facet they are (calling, its group, their people…): which hooks answer differently, and what they lean. */
  tags: string[];
  /** Their work, if they have one: what they're called ("farmer") and a line about it. Asking about it needs no roll. */
  work?: { calling: string; about?: string };
  /** Their home (a house id): they can give leave to be in it (plan B3c). */
  home?: string;
  /**
   * How asking leave reads with them, if their house says ("Ask {name} for a room for the night": the inn); else asking
   * if you may make yourself at home. A room is paid for once there is money: for now it is given as leave.
   */
  leaveAsk?: string;
}

/** The offer that asks leave to make yourself at home in their house, for the rest of the day (plan B3c). */
export const ASK_LEAVE = 'talk:leave';
/** How hard asking leave is at an even mood (two easier a step of liking you). */
const LEAVE_DIFFICULTY = 10;

/** The offer that asks about their work: no roll, no patience spent (Q40). */
export const ASK_WORK = 'talk:work';

/** What the people of a map remember of the hero: by person id, their mood and tries; advantages kept; failed tries. */
export interface TalkMemory {
  social: Record<string, Memory>;
  tokens: Token[];
  fails: Record<string, number>;
}

export const newTalkMemory = (): TalkMemory => ({ social: {}, tokens: [], fails: {} });

/** What a talk is about besides the person: the hero, the place, the world's flags, the library. */
export interface TalkCase {
  hero: Visitor;
  place?: Setting;
  flags: Record<string, boolean>;
  memory: TalkMemory;
  library: Library;
  /** The hero's leads, the lead files, and the world's hours (plan B11): a lead opens asking about it. */
  leads?: { state: LeadsState; defs: Record<string, LeadDef>; hours: number };
  /** Has the hero leave in this house now (plan B3c)? Left out, leave isn't asked for. */
  hasLeave?: (house: string) => boolean;
}

/** An offer that asks about a lead: `lead:<id>`. No roll and no patience spent; anyone can be asked (most don't know). */
export const LEAD_ASK = 'lead:';
/** The offer that opens the list of leads to ask about (the page shows `leadAsks` under it). */
export const ASK_LEADS = 'talk:leads';
/** An offer that presses someone who holds back about a lead: `leadpress:<id>`, a social roll. */
export const LEAD_PRESS = 'leadpress:';
/** What presses someone: making a case or charming it out of them (persuade and sweet-talk); else Presence at −2D6. */
const COAX_SKILLS = ['Argumentera', 'Charm', 'Berättarkonst', 'E:Vädja', 'E:Diplomati', 'E:Behaga', 'E:Lova', 'K:Charmerande leende', 'K:Smort munläder'];

/** The leads the hero can ask this person about (every open one), for the list under "Ask about something you know". */
export function leadAsks(p: TalkPerson, c: TalkCase): Offer[] {
  if (!c.leads) return [];
  return openLeads(c.leads.state, c.leads.defs, c.flags).map((d) => ({ id: LEAD_ASK + d.id, label: d.ask.replaceAll('{name}', p.name), skills: [], from: 'verb' as const }));
}

/** The fitting attribute for any social try, for someone with no fitting skill (at −2D6). */
const PRESENCE = 'attr:Intryck';

/** The memory and flags as the 2D rules' state (shared, so what they change is kept). */
function stateOf(c: TalkCase): SceneState {
  return { time: 'day', silver: 0, flags: c.flags, fails: c.memory.fails, removed: [], sideTalks: 99, social: c.memory.social, tokens: c.memory.tokens, looked: [] };
}

/** The person as an object of the 2D rules, with every hook the library has for who they are. */
function objectOf(p: TalkPerson, c: TalkCase): ObjectDef {
  return expandObject({ id: p.id, name: p.name, kind: p.kind, tags: p.tags, hexes: [], look: '' }, c.library, c.place);
}

/** The 2D rules write a thing's name in lower case ("the gate"); a person's name keeps its capital. */
const named = (text: string, p: TalkPerson): string => text.replaceAll(p.name.toLowerCase(), p.name);

/** What they're like with you now, in a line ("Wenna seems to like you."), if anything shows. */
export function moodOf(p: TalkPerson, c: TalkCase): string | null {
  const o = objectOf(p, c);
  return moodLine(p.name, c.memory.social[p.id], limitOf(o, stateOf(c), c.library)) ?? null;
}

/** How many more tries they'll put up with (null: they don't count). */
export function patienceLeft(p: TalkPerson, c: TalkCase): number | null {
  return talksLeftWith(objectOf(p, c), stateOf(c), c.library) ?? null;
}

/**
 * Is a try on the table in a talk? Only if one of its openings holds (design: director/design/talk-openings.md). For
 * now that is `always` (Q40: size up, ask, distract, threaten); states, situations and leads come with what makes them.
 */
function opensNow(k: CheckDef, p: TalkPerson, c: TalkCase): boolean {
  const id = k.id.slice(p.id.length + 1);
  const h = c.library.hooks.find((x) => x.id === id);
  return !!h?.opens?.includes('always');
}

/** What can be tried with them: asking about their work, then the tries that are open; talking ones only while they'll still listen. */
export function talkOffers(p: TalkPerson, c: TalkCase): Offer[] {
  const s = stateOf(c), o = objectOf(p, c);
  const left = talksLeftWith(o, s, c.library);
  const work: Offer[] = p.work ? [{ id: ASK_WORK, label: `Ask ${p.name} about their work`, skills: [], from: 'verb' }] : [];
  const listens = left === undefined || left > 0;
  const leads: Offer[] = c.leads && listens && leadAsks(p, c).length ? [{ id: ASK_LEADS, label: 'Ask about something you know…', skills: [], from: 'verb' }] : [];
  const press: Offer[] = c.leads && listens
    ? heldBack(c.leads.state, c.leads.defs, p).map(({ def }) => ({ id: LEAD_PRESS + def.id, label: `Press ${p.name} about ${def.ask.replace(/^Ask \{name\} about /, '')}`, skills: [...COAX_SKILLS], from: 'skill' as const }))
    : [];
  const leave: Offer[] = p.home && c.hasLeave && !c.hasLeave(p.home) && listens
    ? [{ id: ASK_LEAVE, label: (p.leaveAsk ?? 'Ask {name} if you may make yourself at home').replaceAll('{name}', p.name), skills: [...COAX_SKILLS], from: 'skill' }]
    : [];
  return [...work, ...leads, ...press, ...leave, ...openChecks(o, s)
    .filter((k) => opensNow(k, p, c) && (!k.talk || left === undefined || left > 0))
    .map((k) => ({ id: k.id, label: named(k.label, p), skills: [...k.skills], from: 'skill' as const }))];
}

export interface TalkResult {
  done: boolean;
  reason?: string;
  roll?: Roll;
  skill?: string;
  /** A hidden read: you are not told how it went (don't show the dice), and a failure reads true. */
  hidden: boolean;
  success: boolean;
  lines: Line[];
  /** A lead it handed over (plan B11). */
  lead?: string;
  /** Leave given to be in this house, for the rest of the day (plan B3c). */
  leave?: string;
}

/** What a lead's answer looks like in the talk: the lines, and "Lead added" if it handed one over. */
function leadReply(r: AskResult, c: TalkCase, before: Line[]): TalkResult {
  const lines: Line[] = [...before, ...r.lines.map((text) => ({ text }))];
  if (r.next) lines.push({ text: `Lead added: ${c.leads!.defs[r.next].title}.`, tone: 'good' });
  return { done: true, hidden: false, success: r.kind === 'told', lines, ...(r.next ? { lead: r.next } : {}) };
}

/** Try one of the offers on them, as `doer`. Their memory of you changes; flags may be set. */
export function talk(offer: string, p: TalkPerson, doer: Doer, c: TalkCase, rng: Rng): TalkResult {
  const s = stateOf(c), o = objectOf(p, c);
  if (offer === ASK_WORK && p.work) {
    const a = /^[aeiou]/i.test(p.work.calling) ? 'an' : 'a';
    return { done: true, hidden: false, success: true, lines: [{ text: `${p.name} works as ${a} ${p.work.calling.toLowerCase()}.` }, ...(p.work.about ? [{ text: p.work.about }] : [])] };
  }
  if (offer === ASK_LEAVE && p.home && c.hasLeave) {
    if (c.hasLeave(p.home)) return { done: false, reason: 'You already have leave.', hidden: false, success: false, lines: [] };
    const left = talksLeftWith(o, s, c.library);
    if (left !== undefined && left <= 0) return { done: false, reason: `${p.name} has had enough of you for now.`, hidden: false, success: false, lines: [] };
    const mem = (c.memory.social[p.id] ??= { talks: 0, mood: 0 });
    mem.talks += 1;
    // Someone who likes you says yes; someone cross with you says no; anyone else needs asking well. A room at an inn
    // is the keeper's trade: yes unless they're wary of you (paid for once there is money).
    const room = !!p.leaveAsk;
    if (room && mem.mood >= 0) return { done: true, hidden: false, success: true, leave: p.home, lines: [{ text: `"A room's yours for the night. Up the stairs."`, tone: 'good' }, { text: '(No coin changes hands yet: paying comes with money.)', tone: 'info' }] };
    if (mem.mood >= 1) return { done: true, hidden: false, success: true, leave: p.home, lines: [{ text: `"Of course. Make yourself at home, today."`, tone: 'good' }] };
    if (mem.mood <= -2) return { done: true, hidden: false, success: false, lines: [{ text: `"After what you did? No."`, tone: 'bad' }] };
    const best = bestSkill(doer, COAX_SKILLS);
    const fallback = !best && doer.dice(PRESENCE).n > 0 ? { skill: PRESENCE, dice: modify(doer.dice(PRESENCE), -2) } : null;
    const use = best ?? fallback;
    if (!use) return { done: true, hidden: false, success: false, lines: [{ text: 'You have no way to go about it.', tone: 'info' }] };
    const roll = rollTest(use.dice, Math.max(2, LEAVE_DIFFICULTY - 2 * mem.mood), rng, 'Ask leave');
    const notes: Line[] = fallback ? [{ text: 'No fitting skill: Presence instead, at −2D6.', tone: 'info' }] : [];
    if (mem.mood) notes.push({ text: `(${mem.mood > 0 ? 'easier: they like you' : 'harder: they are wary of you'})`, tone: 'info' });
    return roll.success
      ? { done: true, roll, skill: use.skill, hidden: false, success: true, leave: p.home, lines: [...notes, { text: `"Go on, then. For today."`, tone: 'good' }] }
      : { done: true, roll, skill: use.skill, hidden: false, success: false, lines: [...notes, { text: `"I'd rather you didn't."`, tone: 'bad' }] };
  }
  if (offer.startsWith(LEAD_ASK) && c.leads) {
    const r = askAbout(c.leads.state, c.leads.defs, offer.slice(LEAD_ASK.length), p, c.flags, c.leads.hours);
    if (!r) return { done: false, reason: 'You know nothing of that to ask about.', hidden: false, success: false, lines: [] };
    return leadReply(r, c, r.kind === 'held' ? [{ text: `${p.name} knows something, but would need pressing.`, tone: 'info' }] : []);
  }
  if (offer.startsWith(LEAD_PRESS) && c.leads) {
    const id = offer.slice(LEAD_PRESS.length);
    const held = heldBack(c.leads.state, c.leads.defs, p).find((h) => h.def.id === id);
    if (!held) return { done: false, reason: `${p.name} has nothing held back about that.`, hidden: false, success: false, lines: [] };
    const left = talksLeftWith(o, s, c.library);
    if (left !== undefined && left <= 0) return { done: false, reason: `${p.name} has had enough of you for now.`, hidden: false, success: false, lines: [] };
    const mem = (c.memory.social[p.id] ??= { talks: 0, mood: 0 });
    // A friendlier mood makes it easier: two a step.
    const difficulty = Math.max(2, held.difficulty - 2 * mem.mood);
    const best = bestSkill(doer, COAX_SKILLS);
    const fallback = !best && doer.dice(PRESENCE).n > 0 ? { skill: PRESENCE, dice: modify(doer.dice(PRESENCE), -2) } : null;
    const use = best ?? fallback;
    if (!use) return { done: true, hidden: false, success: false, lines: [{ text: 'You have no way to go about it.', tone: 'info' }] };
    const roll = rollTest(use.dice, difficulty, rng, `Press ${p.name}`);
    mem.talks += 1;
    const notes: Line[] = [];
    if (fallback) notes.push({ text: 'No fitting skill: Presence instead, at −2D6.', tone: 'info' });
    if (mem.mood) notes.push({ text: `(${mem.mood > 0 ? 'easier: they like you' : 'harder: they are cross with you'})`, tone: 'info' });
    if (!roll.success) {
      mem.mood = Math.max(-3, mem.mood - 1);
      pressed(c.leads.state, c.leads.defs, id, p, false, c.flags, c.leads.hours);
      return { done: true, roll, skill: use.skill, hidden: false, success: false, lines: [...notes, { text: `${p.name} shakes their head and won't be drawn.`, tone: 'bad' }] };
    }
    const r = pressed(c.leads.state, c.leads.defs, id, p, true, c.flags, c.leads.hours)!;
    return { ...leadReply(r, c, [...notes, { text: `${p.name} gives in.`, tone: 'good' }]), roll, skill: use.skill };
  }
  const check: CheckDef | undefined = openChecks(o, s).find((k) => k.id === offer && opensNow(k, p, c));
  if (!check) return { done: false, reason: 'That is not something to try with them now.', hidden: false, success: false, lines: [] };
  const left = talksLeftWith(o, s, c.library);
  if (check.talk && left !== undefined && left <= 0) return { done: false, reason: `${p.name} has had enough of you for now.`, hidden: false, success: false, lines: [] };
  const best = bestSkill(doer, check.skills);
  const fallback = !best && doer.dice(PRESENCE).n > 0 ? { skill: PRESENCE, dice: modify(doer.dice(PRESENCE), -2) } : null;
  const use = best ?? fallback;
  if (!use) return { done: true, hidden: !!check.hidden, success: false, lines: [{ text: 'You have no way to go about it.', tone: 'info' }] };
  const sit = situation(s, check, o, c.hero, c.library, c.place, use.skill);
  const { result, effects } = attempt(s, check, use.dice, rng, sit);
  const lines: Line[] = [];
  if (fallback) lines.push({ text: 'No fitting skill: Presence instead, at −2D6.', tone: 'info' });
  if (sit.notes.length && !check.hidden) lines.push({ text: `(${sit.notes.join('; ')})`, tone: 'info' });
  // Sizing someone up reads them: the truth on a success, a plausible wrong picture on a failure.
  if (check.intention === 'size-up') for (const text of readPerson(o, s, c.hero, c.library, c.place, result.success)) lines.push({ text });
  for (const e of apply(s, effects)) {
    if (e.kind === 'say') lines.push({ text: named(e.text, p), ...(e.tone === 'good' || e.tone === 'bad' || e.tone === 'info' ? { tone: e.tone } : {}) });
  }
  return { done: true, roll: { ...result.roll, label: named(check.label, p) }, skill: use.skill, hidden: !!check.hidden, success: result.success, lines };
}
