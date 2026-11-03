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

export interface AskResult {
  lines: string[];
  /** A lead handed over by the answer (new to the hero), if any. */
  next?: string;
  flag?: string;
}

/** Ask someone about a lead: their answer is added to what you know, and may hand over the next lead and set a flag. */
export function askAbout(state: LeadsState, defs: Record<string, LeadDef>, id: string, p: LeadPerson, flags: Record<string, boolean>, hours: number): AskResult | null {
  const def = defs[id], rec = state[id];
  if (!def || !rec) return null;
  const i = answerFor(def, rec, p);
  if (i < 0) return null;
  const a = def.answers[i];
  rec.heard.push(i);
  rec.lines.push(...a.say);
  if (a.flag) flags[a.flag] = true;
  const next = a.next && giveLead(state, defs, a.next, hours) ? a.next : undefined;
  return { lines: [...a.say], ...(next ? { next } : {}), ...(a.flag ? { flag: a.flag } : {}) };
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
    });
  }
  return out;
}
