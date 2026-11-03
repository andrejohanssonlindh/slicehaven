/**
 * Leads (plan B11; design: director/design/talk-openings.md, agreed Q41–Q42): what the hero knows that gives a reason
 * to act. A lead is a data file (`content/leads/<id>.ts`, a `LeadDef`); nothing about a particular lead is code. What
 * the hero has of each is a `LeadRecord`, plain data in the world's save.
 *
 * - **Ways in** (first slice): **found**, looking at a placed thing that carries the lead (`lead` on a map's prop), or
 *   any action outcome `{ lead: id }`; **told**, an answer that hands over the next lead. Overheard, carried, your past
 *   and quests come later, each added once.
 * - **Who cares**: one person, or anyone who is a kind or facet (`is`: "job-innkeeper", "dwarf"). Talking to someone
 *   who cares puts *ask about it* on the table by itself (an opening); with no one else it isn't offered.
 * - **Answers**: what they say (lines added to what you know), and maybe a next lead or a flag.
 * - **Ends**: solved (a flag is set), spent (every answer heard), or cold (later: a time passed).
 */

/** Who might care about a lead: one person by id, or anyone who is this kind or facet. */
export interface Cares {
  person?: string;
  is?: string;
}

/** What someone who cares says when asked. */
export interface LeadAnswer {
  who: Cares;
  /** Lines they say; each is added to what you know. */
  say: string[];
  /** A lead this hands over (told). */
  next?: string;
  /** A flag set by hearing it. */
  flag?: string;
  /**
   * They know but hold back: the first ask gets `reluctant`, and then they can be pressed (a social roll against
   * `difficulty`, eased or hardened by their mood: persuading or sweet-talking skills). A failure sours them a little.
   */
  coax?: { difficulty: number; reluctant: string };
}

/**
 * What a skill can tell about the thing that carries the lead (the director, 2026-11-03): a knowledge roll on the thing.
 * A hidden read (decision 2026-10-27): one try, and you're not told how it went; a success gives `know` (and maybe the
 * next lead), a failure the plausible `wrong`. Either is added to what you know.
 */
export interface LeadStudy {
  /** The offer on the thing ("Study the statue"). */
  label: string;
  /** The knowledge skills that can read it. Without one of them it isn't offered: there is no attribute to fall back on (Wisdom is never rolled). */
  skills: string[];
  difficulty: number;
  know: string[];
  wrong: string[];
  next?: string;
  /** World minutes (default 10). */
  takes?: number;
}

export interface LeadDef {
  id: string;
  /** What the journal calls it. */
  title: string;
  /** What you know when you get it. */
  know: string;
  /** How a talk offers it: "Ask {name} about the statue". */
  ask: string;
  /** Who might care (shown in the journal on easy). */
  cares: Cares[];
  answers: LeadAnswer[];
  /** A knowledge roll on the thing that carries it. */
  study?: LeadStudy;
  /** When it is solved. */
  ends?: { flag?: string };
  /** For whoever writes leads: a line on how you come by it. */
  from?: string;
}

/** What the hero has of a lead. */
export interface LeadRecord {
  /** What they know: the first line, then what they were told. */
  lines: string[];
  /** Which answers have been heard (indexes into `answers`). */
  heard: number[];
  /** Answers someone held back (`coax`): they can be pressed now. */
  held?: number[];
  /** The thing was studied (one try). */
  studied?: boolean;
  /** World hours when they got it (newest first in the journal). */
  at: number;
}

export type LeadsState = Record<string, LeadRecord>;

export type LeadStatus = 'open' | 'solved' | 'spent';

/** Someone as the lead rules see them: their id and everything they are (their kinds' chain). */
export interface LeadPerson {
  id: string;
  tags: readonly string[];
}

export const caresMatch = (c: Cares, p: LeadPerson): boolean => (c.person ? c.person === p.id : !!c.is && p.tags.includes(c.is));

/** Where a lead stands: solved by its flag, spent once every answer is heard, else open. */
export function leadStatus(def: LeadDef, rec: LeadRecord, flags: Record<string, boolean>): LeadStatus {
  if (def.ends?.flag && flags[def.ends.flag]) return 'solved';
  return def.answers.length > 0 && def.answers.every((_, i) => rec.heard.includes(i)) ? 'spent' : 'open';
}

/** Give the hero a lead; false if they had it already (or there is no such lead). */
export function giveLead(state: LeadsState, defs: Record<string, LeadDef>, id: string, hours: number): boolean {
  const def = defs[id];
  if (!def || state[id]) return false;
  state[id] = { lines: [def.know], heard: [], at: hours };
  return true;
}

/** The answer this person would give about a lead that they haven't given yet, as its index; -1 if none. */
export function answerFor(def: LeadDef, rec: LeadRecord, p: LeadPerson): number {
  return def.answers.findIndex((a, i) => !rec.heard.includes(i) && caresMatch(a.who, p));
}

/** The leads this person can be asked about now: open, and they have an answer not yet heard. */
export function leadsToAsk(state: LeadsState, defs: Record<string, LeadDef>, flags: Record<string, boolean>, p: LeadPerson): LeadDef[] {
  return Object.keys(state)
    .map((id) => defs[id])
    .filter((d): d is LeadDef => !!d && leadStatus(d, state[d.id], flags) === 'open' && answerFor(d, state[d.id], p) >= 0);
}

/** The leads that can be asked about with anyone: every open one (most people just don't know). */
export function openLeads(state: LeadsState, defs: Record<string, LeadDef>, flags: Record<string, boolean>): LeadDef[] {
  return Object.entries(state)
    .filter(([id, r]) => defs[id] && leadStatus(defs[id], r, flags) === 'open')
    .sort((a, b) => b[1].at - a[1].at)
    .map(([id]) => defs[id]);
}

export interface AskResult {
  /** told: they said what they know; held: they know but hold back (press them); unknown: they don't know; done: they told you already. */
  kind: 'told' | 'held' | 'unknown' | 'done';
  lines: string[];
  /** A lead handed over by the answer (new to the hero), if any. */
  next?: string;
  flag?: string;
}

/** What someone who doesn't know says (picked by who they are, so the same person says the same). */
const DONT_KNOW = [
  '"Can\'t help you there, sorry."',
  '"No idea. Never paid it much mind."',
  '"Couldn\'t say. You might ask someone who\'s been here longer."',
  '"Hm? No. I don\'t know anything about that."',
];

const hashOf = (s: string): number => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function tell(state: LeadsState, defs: Record<string, LeadDef>, def: LeadDef, rec: LeadRecord, i: number, flags: Record<string, boolean>, hours: number): AskResult {
  const a = def.answers[i];
  rec.heard.push(i);
  if (rec.held) rec.held = rec.held.filter((h) => h !== i);
  rec.lines.push(...a.say);
  if (a.flag) flags[a.flag] = true;
  const next = a.next && giveLead(state, defs, a.next, hours) ? a.next : undefined;
  return { kind: 'told', lines: [...a.say], ...(next ? { next } : {}), ...(a.flag ? { flag: a.flag } : {}) };
}

/**
 * Ask someone about a lead. Anyone can be asked: those who care tell you (their answer is added to what you know,
 * and may hand over the next lead and set a flag), or hold back if they need coaxing; the rest don't know.
 */
export function askAbout(state: LeadsState, defs: Record<string, LeadDef>, id: string, p: LeadPerson, flags: Record<string, boolean>, hours: number): AskResult | null {
  const def = defs[id], rec = state[id];
  if (!def || !rec) return null;
  const i = answerFor(def, rec, p);
  if (i < 0) {
    const told = def.answers.some((a, k) => rec.heard.includes(k) && caresMatch(a.who, p));
    return told ? { kind: 'done', lines: ['"I\'ve told you what I know."'] } : { kind: 'unknown', lines: [DONT_KNOW[hashOf(p.id + id) % DONT_KNOW.length]] };
  }
  const a = def.answers[i];
  if (a.coax) {
    rec.held = [...new Set([...(rec.held ?? []), i])];
    return { kind: 'held', lines: [a.coax.reluctant] };
  }
  return tell(state, defs, def, rec, i, flags, hours);
}

/** The leads this person is holding back on (they can be pressed), with how hard it is. */
export function heldBack(state: LeadsState, defs: Record<string, LeadDef>, p: LeadPerson): { def: LeadDef; difficulty: number }[] {
  const out: { def: LeadDef; difficulty: number }[] = [];
  for (const [id, rec] of Object.entries(state)) {
    const def = defs[id];
    if (!def) continue;
    const i = answerFor(def, rec, p);
    const c = i >= 0 ? def.answers[i].coax : undefined;
    if (c && rec.held?.includes(i)) out.push({ def, difficulty: c.difficulty });
  }
  return out;
}

/** After pressing someone (the roll is the talk's): on a success they tell; on a failure, nothing more for now. */
export function pressed(state: LeadsState, defs: Record<string, LeadDef>, id: string, p: LeadPerson, success: boolean, flags: Record<string, boolean>, hours: number): AskResult | null {
  const def = defs[id], rec = state[id];
  if (!def || !rec) return null;
  const i = answerFor(def, rec, p);
  if (i < 0 || !rec.held?.includes(i)) return null;
  return success ? tell(state, defs, def, rec, i, flags, hours) : { kind: 'held', lines: [] };
}

/** Study the thing that carries a lead (one try): what is learned is added to what you know; a new lead if the read was true. */
export function studied(state: LeadsState, defs: Record<string, LeadDef>, id: string, success: boolean, hours: number): AskResult | null {
  const def = defs[id], rec = state[id];
  if (!def?.study || !rec || rec.studied) return null;
  rec.studied = true;
  const lines = success ? def.study.know : def.study.wrong;
  rec.lines.push(...lines);
  const next = success && def.study.next && giveLead(state, defs, def.study.next, hours) ? def.study.next : undefined;
  return { kind: 'told', lines: [...lines], ...(next ? { next } : {}) };
}

/** What is wrong with the leads (unknown next leads, answers to no one); the tests require none. */
export function leadProblems(defs: Record<string, LeadDef>): string[] {
  const out: string[] = [];
  for (const d of Object.values(defs)) {
    if (!d.title || !d.know || !d.ask) out.push(`lead ${d.id}: needs a title, what you know, and how it is asked`);
    if (!d.ask.includes('{name}')) out.push(`lead ${d.id}: the ask should name the person ({name})`);
    d.answers.forEach((a, i) => {
      if (!a.who.person && !a.who.is) out.push(`lead ${d.id}: answer ${i + 1} says nobody`);
      if (a.next && !defs[a.next]) out.push(`lead ${d.id}: answer ${i + 1} hands over ${a.next}, which is not a lead`);
      if (!a.say.length) out.push(`lead ${d.id}: answer ${i + 1} says nothing`);
      if (a.coax && !a.coax.reluctant) out.push(`lead ${d.id}: answer ${i + 1} holds back but says nothing while it does`);
    });
    if (d.study) {
      if (d.study.skills.some((s) => s.startsWith('attr:'))) out.push(`lead ${d.id}: a study rolls knowledge skills, not attributes (Wisdom is never rolled)`);
      if (!d.study.skills.length || !d.study.know.length || !d.study.wrong.length) out.push(`lead ${d.id}: a study needs skills, what is known, and a plausible wrong read`);
      if (d.study.next && !defs[d.study.next]) out.push(`lead ${d.id}: the study hands over ${d.study.next}, which is not a lead`);
    }
  }
  return out;
}
