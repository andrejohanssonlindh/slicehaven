import type { Roll } from '../dice';
import { modify } from '../checks';
import type { Rng } from '../rng';
import { type CheckDef, type Memory, type ObjectDef, type SceneState, type Token, apply, attempt, moodLine, openChecks } from '../scene';
import { type Library, type Setting, type Visitor, expandObject, limitOf, readPerson, situation, talksLeftWith } from '../skillweb';
import { type Doer, type Line, type Offer, bestSkill } from './actions';
import { type AskResult, type LeadDef, type LeadsState, askAbout, heldBack, openLeads, pressed } from './leads';
import { rollTest } from '../dice';
import { HAGGLE_DIFFICULTY, HAGGLE_SKILLS, type Haggle, ROOM_PRICE, buyPrice, haggleSteps, sellPrice, silverText } from './trade';

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
  /** Their own fighting style, if their map gives one (`MapPerson.fights`). */
  fights?: string;
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
  /** Haggling with each seller (plan B6): the day it was tried and how many steps it took off. */
  haggle?: Record<string, Haggle>;
}

/**
 * Trading with someone who sells (plan B6, `core/world3d/trade.ts`): what they sell, what of the hero's they'd buy
 * (prices are worked out here, from mood and haggling), the hero's silver, the day, and whether the hero has room for
 * a kind of thing (in the pack, on them, or a free hand).
 */
export interface TradeCase {
  sells: readonly { kind: string; name: string; value: number }[];
  buys: readonly { id: string; name: string; value: number }[];
  money: number;
  day: number;
  room(kind: string): boolean;
}

/** Offers for trading: the lists (the page shows `tradeAsks` under them), one thing (`buy:<kind>`, `sell:<id>`), haggling. */
export const ASK_BUY = 'talk:buy';
export const ASK_SELL = 'talk:sell';
export const BUY = 'buy:';
export const SELL = 'sell:';
export const HAGGLE = 'talk:haggle';

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
  /** What the hero holds, if it is someone's (plan B3b): borrowing it, giving it back, arguing or threatening for it. */
  holding?: HeldThing;
  /** Whether the person is afraid of the hero, or bold (B3c's `sizeUp`): a threat is easier or harder. */
  nerve?: { afraid: boolean; bold: boolean };
  /** The hero's silver (plan B6): a room at an inn is paid for. Left out: nothing is asked. */
  money?: number;
  /** Trading, if this person sells and is open now (plan B6). */
  trade?: TradeCase;
}

/** A thing the hero holds that belongs to a household, as a talk sees it. */
export interface HeldThing {
  id: string;
  /** What it is called ("stool"). */
  name: string;
  /** Its household's house. */
  house: string;
  /** Lent until this world hour, or null. */
  loan: number | null;
  /** How much it is worth to them (`worthOf`, 1 for an ordinary thing): arguing for something dear is harder. */
  worth: number;
}

/** The ways to take that go through talk (plan B3b), on a thing the hero holds that is the person's household's. */
export const BORROW = 'talk:borrow';
export const GIVE_BACK = 'talk:giveback';
export const CLAIM = 'talk:claim';
export const DEMAND = 'talk:demand';
/** How long a thing is lent for, world hours (a day). */
export const LOAN_HOURS = 24;
/** How hard arguing a thing is yours is (at an even mood, for an ordinary thing), and threatening for it. */
const CLAIM_DIFFICULTY = 14;
const DEMAND_DIFFICULTY = 12;

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

/** How many steps of 10 % haggling took off with this seller today (−1: put on; 0: not tried, or another day). */
function offToday(p: TalkPerson, c: TalkCase): number {
  const h = c.memory.haggle?.[p.id];
  return h && c.trade && h.day === c.trade.day ? h.off : 0;
}

/** Has the hero haggled with this seller today? */
const haggledToday = (p: TalkPerson, c: TalkCase): boolean => !!c.trade && c.memory.haggle?.[p.id]?.day === c.trade.day;

/** What they sell at their price for you now, or what of yours they would buy: the list under Buy… or Sell…. */
export function tradeAsks(p: TalkPerson, c: TalkCase, which: 'buy' | 'sell'): Offer[] {
  const t = c.trade;
  if (!t) return [];
  const mood = c.memory.social[p.id]?.mood ?? 0, off = offToday(p, c);
  if (which === 'buy') return t.sells.map((s) => ({ id: BUY + s.kind, label: `${cap(s.name)}: ${silverText(buyPrice(s.value, mood, off))}`, skills: [], from: 'verb' as const }));
  return t.buys.map((b) => ({ id: SELL + b.id, label: `${cap(b.name)}: ${silverText(sellPrice(b.value, mood, off))}`, skills: [], from: 'verb' as const }));
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Buying, selling or haggling (plan B6); null for any other offer. */
function aboutTrade(offer: string, p: TalkPerson, doer: Doer, c: TalkCase, rng: Rng): TalkResult | null {
  const t = c.trade;
  if (!t || !(offer.startsWith(BUY) || offer.startsWith(SELL) || offer === HAGGLE)) return null;
  const mood = c.memory.social[p.id]?.mood ?? 0, off = offToday(p, c);
  if (offer.startsWith(BUY)) {
    const s = t.sells.find((x) => x.kind === offer.slice(BUY.length));
    if (!s) return { done: false, reason: `${p.name} doesn't sell that.`, hidden: false, success: false, lines: [] };
    const price = buyPrice(s.value, mood, off);
    if (price > t.money) return { done: false, reason: `You can't pay ${silverText(price)}: you have ${silverText(t.money)}.`, hidden: false, success: false, lines: [] };
    if (!t.room(s.kind)) return { done: false, reason: `You have no room for the ${s.name}.`, hidden: false, success: false, lines: [] };
    return { done: true, hidden: false, success: true, buy: { kind: s.kind, price }, lines: [{ text: `You pay ${silverText(price)} for the ${s.name}.`, tone: 'good' }] };
  }
  if (offer.startsWith(SELL)) {
    const b = t.buys.find((x) => x.id === offer.slice(SELL.length));
    if (!b) return { done: false, reason: `${p.name} won't buy that.`, hidden: false, success: false, lines: [] };
    const price = sellPrice(b.value, mood, off);
    return { done: true, hidden: false, success: true, sell: { id: b.id, price }, lines: [{ text: `${p.name} pays you ${silverText(price)} for the ${b.name}.`, tone: 'good' }] };
  }
  // Haggling: once a day with each seller, a trading roll; done well, prices come down; badly, up.
  if (haggledToday(p, c)) return { done: false, reason: `You have already haggled with ${p.name} today.`, hidden: false, success: false, lines: [] };
  const r = socialRoll(doer, HAGGLE_SKILLS, HAGGLE_DIFFICULTY - 2 * mood, rng, 'Haggle');
  if (!r) return { done: true, hidden: false, success: false, lines: [{ text: 'You have no way to go about it.', tone: 'info' }] };
  const steps = haggleSteps(!!r.roll.success, r.roll.advantages ?? 0);
  (c.memory.haggle ??= {})[p.id] = { day: t.day, off: steps };
  const moodNote: Line[] = mood ? [{ text: `(${mood > 0 ? 'easier: they like you' : 'harder: they are wary of you'})`, tone: 'info' }] : [];
  return steps > 0
    ? { done: true, roll: r.roll, skill: r.skill, hidden: false, success: true, lines: [...r.notes, ...moodNote, { text: `"Fine, fine." ${steps * 10} % off, today.`, tone: 'good' }] }
    : { done: true, roll: r.roll, skill: r.skill, hidden: false, success: false, lines: [...r.notes, ...moodNote, { text: `"If you don't like my prices, they just went up." 10 % more, today.`, tone: 'bad' }] };
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
  // Holding something of theirs: give it back (no roll, always), ask to borrow it, argue it's yours, or threaten for it.
  const h = c.holding && p.home === c.holding.house ? c.holding : null;
  const things: Offer[] = h
    ? [
      { id: GIVE_BACK, label: `Give the ${h.name} back to ${p.name}`, skills: [], from: 'verb' },
      ...(listens && h.loan === null ? [{ id: BORROW, label: `Ask ${p.name} if you may borrow the ${h.name}`, skills: [...COAX_SKILLS], from: 'skill' as const }] : []),
      ...(listens ? [{ id: CLAIM, label: `Argue the ${h.name} is yours to keep`, skills: skillsOf(c, 'persuade'), from: 'skill' as const }] : []),
      { id: DEMAND, label: `Threaten ${p.name} into letting you keep the ${h.name}`, skills: skillsOf(c, 'threaten'), from: 'skill' },
    ]
    : [];
  // A seller, open now (B6): what they sell, what they'd buy of yours, and haggling once a day.
  const t = c.trade;
  const trade: Offer[] = t
    ? [
      ...(t.sells.length ? [{ id: ASK_BUY, label: `See what ${p.name} sells…`, skills: [], from: 'verb' as const }] : []),
      ...(t.buys.length ? [{ id: ASK_SELL, label: `Sell something to ${p.name}…`, skills: [], from: 'verb' as const }] : []),
      ...(listens && !haggledToday(p, c) ? [{ id: HAGGLE, label: `Haggle with ${p.name} over prices`, skills: [...HAGGLE_SKILLS], from: 'skill' as const }] : []),
    ]
    : [];
  return [...work, ...trade, ...things, ...leads, ...press, ...leave, ...openChecks(o, s)
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
  /** A thing lent to the hero until `LOAN_HOURS` from now; given back to its household; given to the hero to keep (plan B3b). */
  borrow?: string;
  giveBack?: string;
  given?: string;
  /** They answer it as the culture says, from where their view of you now stands (a threat that failed). */
  answer?: boolean;
  /** Bought (plan B6): a thing of this kind, for this much silver. */
  buy?: { kind: string; price: number };
  /** Sold (plan B6): the hero's thing, for this much silver. */
  sell?: { id: string; price: number };
  /** Silver the hero paid (a room at an inn). */
  pay?: number;
}

/** The fitting skills for an effort: those of the library's general hook for it (`persuade`, `threaten`). */
function skillsOf(c: TalkCase, effort: string): string[] {
  return [...(c.library.hooks.find((h) => h.id === effort)?.skills ?? [])];
}

/** One social roll with the best of some skills (else Presence at −2D6), and the notes to show with it; null with no way to try. */
function socialRoll(doer: Doer, skills: readonly string[], difficulty: number, rng: Rng, label: string): { roll: Roll; skill: string; notes: Line[] } | null {
  const best = bestSkill(doer, skills);
  const fallback = !best && doer.dice(PRESENCE).n > 0 ? { skill: PRESENCE, dice: modify(doer.dice(PRESENCE), -2) } : null;
  const use = best ?? fallback;
  if (!use) return null;
  return { roll: rollTest(use.dice, Math.max(2, difficulty), rng, label), skill: use.skill, notes: fallback ? [{ text: 'No fitting skill: Presence instead, at −2D6.', tone: 'info' }] : [] };
}

/** Borrowing, giving back, arguing or threatening for a thing the hero holds (plan B3b); null for any other offer. */
function aboutThing(offer: string, p: TalkPerson, doer: Doer, c: TalkCase, rng: Rng): TalkResult | null {
  const h = c.holding && p.home === c.holding.house ? c.holding : null;
  if (!h || ![GIVE_BACK, BORROW, CLAIM, DEMAND].includes(offer)) return null;
  const mem = (c.memory.social[p.id] ??= { talks: 0, mood: 0 });
  if (offer === GIVE_BACK) {
    return {
      done: true, hidden: false, success: true, giveBack: h.id,
      lines: [{ text: `${p.name} takes the ${h.name} back.` }, { text: h.loan !== null ? '"Thank you for bringing it back."' : '"Where did you get that? Well. Thank you."', tone: 'good' }],
    };
  }
  const left = talksLeftWith(objectOf(p, c), stateOf(c), c.library);
  if (offer !== DEMAND && left !== undefined && left <= 0) return { done: false, reason: `${p.name} has had enough of you for now.`, hidden: false, success: false, lines: [] };
  mem.talks += 1;
  // (Something dear to them is harder to get: two a step of worth past an ordinary thing.)
  const dear = Math.round(2 * Math.max(0, h.worth - 1));
  const moodNote: Line[] = mem.mood ? [{ text: `(${mem.mood > 0 ? 'easier: they like you' : 'harder: they are wary of you'})`, tone: 'info' }] : [];
  if (offer === BORROW) {
    if (h.loan !== null) return { done: false, reason: 'It is already lent to you.', hidden: false, success: false, lines: [] };
    if (mem.mood >= 1 && dear === 0) return { done: true, hidden: false, success: true, borrow: h.id, lines: [{ text: '"Of course. Bring it back by this time tomorrow."', tone: 'good' }] };
    if (mem.mood <= -2) return { done: true, hidden: false, success: false, lines: [{ text: `"Lend you our ${h.name}? No."`, tone: 'bad' }] };
    const r = socialRoll(doer, COAX_SKILLS, LEAVE_DIFFICULTY - 2 * mem.mood + dear, rng, `Borrow the ${h.name}`);
    if (!r) return { done: true, hidden: false, success: false, lines: [{ text: 'You have no way to go about it.', tone: 'info' }] };
    return r.roll.success
      ? { done: true, roll: r.roll, skill: r.skill, hidden: false, success: true, borrow: h.id, lines: [...r.notes, ...moodNote, { text: '"All right. Back by this time tomorrow, mind."', tone: 'good' }] }
      : { done: true, roll: r.roll, skill: r.skill, hidden: false, success: false, lines: [...r.notes, ...moodNote, { text: `"I'd rather keep our ${h.name} here."`, tone: 'bad' }] };
  }
  if (offer === CLAIM) {
    const r = socialRoll(doer, skillsOf(c, 'persuade'), CLAIM_DIFFICULTY - 2 * mem.mood + dear, rng, `Argue for the ${h.name}`);
    if (!r) return { done: true, hidden: false, success: false, lines: [{ text: 'You have no way to go about it.', tone: 'info' }] };
    if (r.roll.success) return { done: true, roll: r.roll, skill: r.skill, hidden: false, success: true, given: h.id, lines: [...r.notes, ...moodNote, { text: `"...Fine. Keep the ${h.name}, then."`, tone: 'good' }] };
    mem.mood = Math.max(-3, mem.mood - 1);
    return { done: true, roll: r.roll, skill: r.skill, hidden: false, success: false, lines: [...r.notes, ...moodNote, { text: `"It's ours, and you know it."`, tone: 'bad' }] };
  }
  // Threatening: the bold are harder to frighten, the afraid easier. It never makes them like you.
  const nerve = c.nerve ? (c.nerve.bold ? 4 : 0) - (c.nerve.afraid ? 4 : 0) : 0;
  const r = socialRoll(doer, skillsOf(c, 'threaten'), DEMAND_DIFFICULTY + nerve + dear, rng, `Threaten for the ${h.name}`);
  if (!r) return { done: true, hidden: false, success: false, lines: [{ text: 'You have no way to go about it.', tone: 'info' }] };
  const notes: Line[] = [...r.notes, ...(nerve > 0 ? [{ text: '(harder: they are not easily frightened)', tone: 'info' as const }] : nerve < 0 ? [{ text: '(easier: they are afraid of you)', tone: 'info' as const }] : [])];
  if (r.roll.success) {
    mem.mood = Math.max(-3, mem.mood - 1);
    return { done: true, roll: r.roll, skill: r.skill, hidden: false, success: true, given: h.id, lines: [...notes, { text: `${p.name} backs away. "Take it. Just go."`, tone: 'good' }] };
  }
  mem.mood = Math.max(-3, mem.mood - 2);
  return { done: true, roll: r.roll, skill: r.skill, hidden: false, success: false, answer: true, lines: [...notes, { text: `${p.name} is not frightened of you.`, tone: 'bad' }] };
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
    // (A room is paid for, plan B6: its price, moved by their mood and haggling, like anything they sell.)
    const room = !!p.leaveAsk;
    if (room && mem.mood >= 0) {
      const price = c.money !== undefined ? buyPrice(ROOM_PRICE, mem.mood, offToday(p, c)) : 0;
      if (c.money !== undefined && price > c.money) {
        mem.talks -= 1;
        return { done: false, reason: `A room is ${silverText(price)} a night, and you have ${silverText(c.money)}.`, hidden: false, success: false, lines: [] };
      }
      return {
        done: true, hidden: false, success: true, leave: p.home, ...(price ? { pay: price } : {}),
        lines: [{ text: `"A room's yours for the night. Up the stairs."`, tone: 'good' }, ...(price ? [{ text: `You pay ${silverText(price)}.`, tone: 'info' as const }] : [])],
      };
    }
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
  const thing = aboutThing(offer, p, doer, c, rng);
  if (thing) return thing;
  const trade = aboutTrade(offer, p, doer, c, rng);
  if (trade) return trade;
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
