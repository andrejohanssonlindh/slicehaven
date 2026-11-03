import type { Memory } from '../scene';
import type { DoEntry } from './behave';

/**
 * Owners, the scale and consequences (plan B3c; design: director/design/actions.md, "Owners and the scale"). Pure
 * rules: no DOM, no names of people or places.
 *
 * - **Owners.** Whatever stands in a house is its household's (the people whose home it is); whatever stands among the
 *   houses outdoors is the town's; the wild is no one's. A room can welcome some acts at some hours (an inn's
 *   taproom: come in, sit down; its guest rooms: no one without a room), the town lets anyone do some things to its
 *   things (sit on a bench, light a torch), and a household can give leave (for the rest of the day). Anything else is
 *   a **wrong**, being where you are not welcome included: never blocked, only answered by whoever sees it.
 * - **The scale (Q38).** Each person's view of the hero is one number, about −100 to +100, held by them alone. The
 *   talk rules' mood (−3..+3) is a band of it. A wrong moves it by its weight: the kind of act, as the place's culture
 *   weighs it, more for the owner than for a bystander. Advantages won on a roll scale what a roll does to it. It
 *   **fades** back toward nothing over weeks, at the culture's pace (Q44).
 * - **Word spreads** when people meet: each hears the other's view, at half strength, and takes it in only where it
 *   is stronger than their own. So word travels by who meets whom, good or bad, not all at once.
 * - **Consequences start at points on the scale** (`AnswerStep`, from the culture: grumble, scold, fetch the guard,
 *   fight…). **Who you are** moves those points: how their people see yours (the relations table), your rank, and
 *   whether they are afraid of you. **Fight or fetch:** someone bold (their temper) deals with you themselves where
 *   others fetch help; someone afraid of you (how dangerous you look against their own nerve) fetches help or keeps
 *   their distance where others would square up.
 *
 * Still to come (the plan): the thing's value against the owner's wealth and its importance, and weapons you show
 * (with items, B3b/B6).
 */

/** Kinds of act a wrong can be, in rising weight. Moving, taking and stealing come with the ways to take (B3b). */
export type ActKind = 'enter' | 'sit' | 'use' | 'meddle' | 'move' | 'take' | 'steal' | 'harm';
export const ACT_KINDS: readonly ActKind[] = ['enter', 'sit', 'use', 'meddle', 'move', 'take', 'steal', 'harm'];

/** Whose something is. */
export type Owner = { house: string } | { town: true };

/** A wrong, as a gate reports it: what kind of act, and whose. */
export interface Wrong {
  act: ActKind;
  owner: Owner;
}

/** The lowest and highest the scale goes. */
export const REGARD_MIN = -100;
export const REGARD_MAX = 100;
/** Points of the scale per step of mood (the talk rules' −3..+3). */
export const MOOD_STEP = 20;

/** One consequence: from this point on the scale down, they answer a wrong with this behaviour, for a while. */
export interface AnswerStep {
  /** Its name ("grumble"): what the `answering` condition asks. */
  id: string;
  /** Where on the scale it starts (they answer with the deepest step at or above their view, once lowered by a wrong). */
  at: number;
  /** The behaviour they answer with (`content/behaviours/does/`), and what else its line says (`for`: seconds). */
  do: string;
  for: number;
  /** What they say as they start (one, drawn), if anything. */
  says?: string[];
  /** Whom they fetch: a person of a calling (`job-guard`); no one of it about, the nearest neighbour comes. Only for `fetch`. */
  fetches?: string;
  /** What someone bold does instead (another step's id): deal with you themselves rather than fetch help. */
  bold?: string;
  /** What someone afraid of you does instead (another step's id): fetch help, or keep their distance. */
  afraid?: string;
}

/**
 * How a place weighs what is done in it (`content/cultures/`, one file each; a map names its own). Balance data.
 */
export interface CultureDef {
  id: string;
  about: string;
  /** How far a wrong of each kind moves the view of whoever sees it (points, before who sees it). */
  acts: Record<ActKind, number>;
  /** How much of that the owner feels, and anyone else who sees it (a neighbour minds less). The town's things: everyone `town`. */
  owner: number;
  others: number;
  town: number;
  /** What anyone may do to the town's things (and on its streets) without it being a wrong. */
  townMay: ActKind[];
  /** The consequences, from the mildest. */
  answers: AnswerStep[];
  /** What someone fetched does when they come (the guard). */
  fetched: AnswerStep;
  /** Points each step of how their people see yours moves where the answers start (a tirak meets them sooner). */
  perRelation: number;
  /** Points a day a view fades back toward nothing: a bad one, a good one (Q44: weeks, not days). */
  fade: { bad: number; good: number };
  /** Facets of the hero (`nobility`) that move where the answers start, by points: rank gets off lightly. */
  rank: Record<string, number>;
  /** Fear: afraid once how dangerous you look is `gap` past their nerve; an afraid one's answers start `later` points lower. */
  fear: { gap: number; later: number };
  /** Bold from this temper up (`content/people/temper.ts`): they deal with you themselves. */
  boldAt: number;
}

/** What the people of a map think of the hero, and the leave they gave. Plain data, saved with the map. */
export interface Standing {
  /** Each person's view of the hero, by id. Missing: 0, no view yet. */
  regard: Record<string, number>;
  /** Leave to be in a house, by house id: until this world hour (day × 24 + hour). */
  leave: Record<string, number>;
  /** The last world day the views faded on (null before the first). */
  fadedDay?: number | null;
}

export const newStanding = (): Standing => ({ regard: {}, leave: {}, fadedDay: null });

const clamp = (v: number): number => Math.max(REGARD_MIN, Math.min(REGARD_MAX, Math.round(v)));

/** Someone's view of the hero (0 if they have none). */
export const regardOf = (s: Standing, id: string): number => s.regard[id] ?? 0;

/** Move someone's view by `by` points (kept within the scale); returns where it is now. */
export function shiftRegard(s: Standing, id: string, by: number): number {
  const v = clamp(regardOf(s, id) + by);
  if (v === 0) delete s.regard[id];
  else s.regard[id] = v;
  return v;
}

/** The talk rules' mood (−3..+3) for a view: a step every 20 points, toward nothing. */
export const moodFor = (regard: number): number => Math.max(-3, Math.min(3, Math.trunc(regard / MOOD_STEP))) || 0;

/** What a roll's advantages make of an effect on the scale: each a third more (nine of them: four times; Q38). */
export const scaled = (base: number, advantages = 0): number => base * (1 + Math.max(0, advantages) / 3);

/**
 * Time passes: every view fades toward nothing by the culture's points a day, for each day since the last fading.
 * The first call only notes the day. Returns how many days faded.
 */
export function fadeStanding(s: Standing, day: number, c: CultureDef): number {
  if (s.fadedDay === undefined || s.fadedDay === null || day < s.fadedDay) {
    s.fadedDay = day;
    return 0;
  }
  const days = day - s.fadedDay;
  if (days <= 0) return 0;
  s.fadedDay = day;
  for (const [id, v] of Object.entries(s.regard)) {
    const step = (v < 0 ? c.fade.bad : c.fade.good) * days;
    shiftRegard(s, id, v < 0 ? Math.min(step, -v) : -Math.min(step, v));
  }
  return days;
}

/**
 * Before a talk: every remembered mood set from the scale, so the talk rules (mood, patience, how hard a roll is)
 * read the view each person holds. Their count of tries is kept.
 */
export function moodsFromScale(social: Record<string, Memory>, s: Standing): void {
  for (const [id, m] of Object.entries(social)) m.mood = moodFor(regardOf(s, id));
  for (const id of Object.keys(s.regard)) if (!social[id] && moodFor(s.regard[id]) !== 0) social[id] = { talks: 0, mood: moodFor(s.regard[id]) };
}

/**
 * After a talk: what it did to their mood goes onto the scale, a step's worth per step moved, scaled by the roll's
 * advantages. (A mood already at the end of its range still moves the scale by a step's worth on a success.)
 */
export function talkOntoScale(s: Standing, id: string, moodBefore: number, moodAfter: number, advantages = 0): number {
  const moved = moodAfter - moodBefore;
  if (moved === 0) return regardOf(s, id);
  const v = shiftRegard(s, id, scaled(moved * MOOD_STEP, moved > 0 ? advantages : 0));
  // (At least as far as the mood the talk left them in: a step up from a grumble still reads as liking you.)
  if (moved > 0 ? moodFor(v) < moodAfter : moodFor(v) > moodAfter) return shiftRegard(s, id, moodAfter * MOOD_STEP - v);
  return v;
}

/** Is the house's leave given to the hero now? */
export const hasLeave = (s: Standing, house: string, worldHours: number): boolean => (s.leave[house] ?? -1) > worldHours;

/** Leave in a house until the end of the day (midnight). */
export function giveLeave(s: Standing, house: string, worldHours: number): void {
  s.leave[house] = (Math.floor(worldHours / 24) + 1) * 24;
}

/** What a kind of room welcomes without asking: these acts, in these hours; and how leave is asked for there. */
export interface Welcome {
  acts: ActKind[];
  hours: [number, number];
  /** How the talk offer asking leave reads, where the house's main room is this kind ("Ask {name} for a room for the night"). */
  ask?: string;
}

export const withinHours = (h: number, [a, b]: [number, number]): boolean => (a <= b ? h >= a && h < b : h >= a || h < b);

/** Whose a spot is: a house's household, the town's (among the houses), or no one's. */
export const ownerOf = (house: string | null, inSettlement: boolean): Owner | null => (house ? { house } : inSettlement ? { town: true } : null);

/** What may be done without it being a wrong. */
export interface MayCase {
  owner: Owner;
  act: ActKind;
  /** Whether the doer belongs to the house (its household), and has leave there. */
  member: boolean;
  leave: boolean;
  /** What the room it is done in welcomes. */
  welcome: Welcome | null;
  hour: number;
  culture: CultureDef;
}

/** May it be done? True for a member, with leave, what the room welcomes in its hours, what the town lets anyone do. */
export function mayDo(c: MayCase): boolean {
  if ('town' in c.owner) return c.culture.townMay.includes(c.act);
  if (c.member || c.leave) return true;
  return !!c.welcome && c.welcome.acts.includes(c.act) && withinHours(c.hour, c.welcome.hours);
}

/** How far a wrong moves the view of someone who saw it: the act's weight, as owner, bystander, or one of the town. */
export function weightOf(w: Wrong, culture: CultureDef, isOwner: boolean): number {
  const base = culture.acts[w.act];
  return base * ('town' in w.owner ? culture.town : isOwner ? culture.owner : culture.others);
}

/** How the hero looks to people, for fear: their physique (attribute units), fearsome marks (scars…), weapons shown. */
export interface HeroLook {
  physique: number;
  marks: number;
  weapons: number;
  /** The hero's facets (rank: `nobility`). */
  tags: readonly string[];
}

/** How dangerous someone looks: their physique, four a fearsome mark, three a weapon shown. */
export const dangerOf = (h: Pick<HeroLook, 'physique' | 'marks' | 'weapons'>): number => h.physique + 4 * h.marks + 3 * h.weapons;

/** Who the hero is to one person: how their people see yours, rank, fear, boldness. */
export interface WhoToThem {
  relation: number;
  /** Points later the answers start (rank). */
  rank: number;
  afraid: boolean;
  bold: boolean;
}

/** One person sizes the hero up: their physique and temper against how the hero looks, in this culture. */
export function sizeUp(hero: HeroLook, them: { physique: number; temper: number }, relation: number, c: CultureDef): WhoToThem {
  const afraid = dangerOf(hero) - (them.physique + 3 * them.temper) >= c.fear.gap;
  const rank = hero.tags.reduce((n, t) => n + (c.rank[t] ?? 0), 0);
  return { relation, rank, afraid, bold: !afraid && them.temper >= c.boldAt };
}

/**
 * How they answer, now that a wrong has brought their view to `regard`: the deepest consequence whose point is at or
 * above it. The points move by who you are to them: a cold people meets them sooner, rank and fear later. Then the
 * bold deal with you themselves and the afraid keep their distance (the step's `bold` and `afraid`). Null: they let it go.
 */
export function answerFor(regard: number, culture: CultureDef, who: Partial<WhoToThem> = {}): AnswerStep | null {
  const shift = -(who.relation ?? 0) * culture.perRelation - (who.rank ?? 0) - (who.afraid ? culture.fear.later : 0);
  let out: AnswerStep | null = null;
  for (const a of culture.answers) if (regard <= a.at + shift && (!out || a.at < out.at)) out = a;
  const alt = out && (who.afraid ? out.afraid : who.bold ? out.bold : undefined);
  return (alt && culture.answers.find((a) => a.id === alt)) || out;
}

/** What someone who hears another's view of the hero comes to think: half the other's, where it is stronger than their own. */
export function hearsay(listener: number, speaker: number): number {
  const told = speaker / 2;
  if (Math.abs(told) < 5) return listener;
  if (Math.abs(told) > Math.abs(listener)) return clamp(listener + (told - listener) / 2);
  return listener;
}

/** Two people meet and talk of the hero: each hears the other (what each said, before either changed). */
export function meet(s: Standing, a: string, b: string): boolean {
  const va = regardOf(s, a), vb = regardOf(s, b);
  const na = hearsay(va, vb), nb = hearsay(vb, va);
  if (na === va && nb === vb) return false;
  shiftRegard(s, a, na - va);
  shiftRegard(s, b, nb - vb);
  return true;
}

/**
 * The lines a culture puts at the top of everyone's day: while answering, they do the answer's behaviour. Maps need
 * not write them (`content/behaviours/when/answering.ts`).
 */
export function answerLines(c: CultureDef): DoEntry[] {
  return [...c.answers, c.fetched].map((a) => ({ when: { answering: a.id }, do: a.do, ...(a.fetches ? { of: a.fetches } : {}) }));
}

/** What is wrong in a culture: no answers, answers out of order, a fetch with no one to fetch, an alternative that isn't there. */
export function cultureProblems(c: CultureDef): string[] {
  const out: string[] = [];
  if (!c.answers.length) out.push(`culture ${c.id}: no answers`);
  for (let i = 1; i < c.answers.length; i++) if (c.answers[i].at >= c.answers[i - 1].at) out.push(`culture ${c.id}: answer ${c.answers[i].id} must start lower than ${c.answers[i - 1].id}`);
  for (const a of c.answers) {
    if (a.do === 'fetch' && !a.fetches) out.push(`culture ${c.id}: answer ${a.id} fetches no one (say whom: "fetches")`);
    for (const alt of [a.bold, a.afraid]) if (alt && !c.answers.some((x) => x.id === alt)) out.push(`culture ${c.id}: answer ${a.id} names ${alt}, which is not one of its answers`);
  }
  if (new Set([...c.answers, c.fetched].map((a) => a.id)).size !== c.answers.length + 1) out.push(`culture ${c.id}: two answers with one name`);
  for (const k of ACT_KINDS) if (typeof c.acts[k] !== 'number') out.push(`culture ${c.id}: no weight for ${k}`);
  return out;
}
