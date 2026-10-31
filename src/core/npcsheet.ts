import type { Attr } from './chargen/grants';
import { type Dice, baseArmour, baseDamage } from './chargen/tables';
import { Rng } from './rng';

/**
 * Character sheets for kinds of person (the director, 2026-10-31). A kind says which skills are its **main** ones and
 * which **side** ones; a person has one **level**: main skills sit at that level, side skills a step below, the rest
 * untrained. Kinds stack down a person's chain (a human guard takes some from human, some from guard), so stacking
 * types gives the side skills. Values are rolled inside the level's span, so two capable guards are alike but not
 * the same, and each person also picks a few side skills of their own from their kinds' pools (`knacks`).
 *
 * Everything here is in **dice units**: 4 to a die, so 8 is 2D6, 13 is 3D6+1 and 24 is 6D6 (the creator's attribute
 * scale; `attrDice` turns it into dice). Attributes follow the level too, but less: the book's numbers in the middle,
 * a little lower for a novice and higher for a master. Rules only; the data is `content/people`.
 */

/** How good someone is at a skill. A person's own level is one of these, but never `untrained`. */
export const LEVELS = ['untrained', 'novice', 'capable', 'skilled', 'master'] as const;
export type Level = (typeof LEVELS)[number];
export type PersonLevel = Exclude<Level, 'untrained'>;
export const PERSON_LEVELS: readonly PersonLevel[] = ['novice', 'capable', 'skilled', 'master'];

/** The span of each level, in dice units: novice 2D6–3D6, capable 3D6+1–4D6+1, skilled 4D6+2–5D6, master 5D6+1–6D6. */
export const LEVEL_SPAN: Record<Level, readonly [lo: number, hi: number]> = {
  untrained: [0, 0],
  novice: [8, 12],
  capable: [13, 17],
  skilled: [18, 20],
  master: [21, 24],
};

/** How much a person's level moves their attributes, in dice units (half a die down for a novice, up for a master). */
export const LEVEL_ATTR_SHIFT: Record<PersonLevel, number> = { novice: -2, capable: 0, skilled: 0, master: 2 };

/** The attributes a sheet has (the dice-less Wisdom is the player's alone). */
export const SHEET_ATTRS = ['Förflyttning', 'Intryck', 'Kroppsbyggnad', 'Livskraft', 'Reaktion', 'Självkontroll', 'Vaksamhet'] as const satisfies readonly Attr[];
export type SheetAttr = (typeof SHEET_ATTRS)[number];

/** How a kind leans on a skill. */
export type Lean = 'main' | 'side';

/** What a kind of person says about the sheets of everyone of its kind. Every part is optional; they stack down a chain. */
export interface SheetDef {
  /** Attributes in dice units: an archetype's baseline (the book's template). The most specific kind that gives one wins, per attribute. */
  attrs?: Partial<Record<SheetAttr, number>>;
  /** Added to the attributes (a people's build: a tirak's body, a missla's small frame). These add up down the chain. */
  attrShift?: Partial<Record<SheetAttr, number>>;
  /** Skills this kind is good at. Down a chain the stronger lean wins (main over side). */
  skills?: Record<string, Lean>;
  /** Skills a person of this kind may have a knack for: each person picks `knackCount` of them (pooled down the chain) as side skills. */
  knacks?: string[];
  /** How many knacks a person picks (the most specific kind that says wins; default 2). */
  knackCount?: number;
  /** What they carry, by slot (weapon, shield, armour, item...): each person gets one from each slot's choices. The most specific kind wins per slot; an empty list takes a slot away. */
  gear?: Record<string, string[]>;
}

/** A kind's sheet worked out down a chain: what every person of the kind shares. */
export interface MergedSheet {
  attrs: Record<SheetAttr, number>;
  skills: Record<string, Lean>;
  knacks: string[];
  knackCount: number;
  gear: Record<string, string[]>;
}

/** Where nothing says otherwise: an ordinary person (3D6 everywhere, the book's toiler). */
const PLAIN_ATTR = 12;

/** Merge the sheets of a chain (most general first). */
export function mergeSheets(layers: readonly (SheetDef | undefined)[]): MergedSheet {
  const attrs = Object.fromEntries(SHEET_ATTRS.map((a) => [a, PLAIN_ATTR])) as Record<SheetAttr, number>;
  const shift: Partial<Record<SheetAttr, number>> = {};
  const skills: Record<string, Lean> = {};
  const knacks: string[] = [];
  let knackCount = 2;
  const gear: Record<string, string[]> = {};
  for (const s of layers) {
    if (!s) continue;
    Object.assign(attrs, s.attrs);
    for (const [a, v] of Object.entries(s.attrShift ?? {})) shift[a as SheetAttr] = (shift[a as SheetAttr] ?? 0) + v;
    for (const [k, lean] of Object.entries(s.skills ?? {})) if (skills[k] !== 'main') skills[k] = lean;
    for (const k of s.knacks ?? []) if (!knacks.includes(k)) knacks.push(k);
    if (s.knackCount !== undefined) knackCount = s.knackCount;
    Object.assign(gear, s.gear);
  }
  for (const a of SHEET_ATTRS) attrs[a] += shift[a] ?? 0;
  for (const slot of Object.keys(gear)) if (!gear[slot].length) delete gear[slot];
  return { attrs, skills, knacks: knacks.filter((k) => !skills[k]), knackCount, gear };
}

/** The level a lean puts a skill at, for a person of a level: main at it, side a step below (never under novice). */
export function skillLevel(lean: Lean, level: PersonLevel): PersonLevel {
  if (lean === 'main') return level;
  return PERSON_LEVELS[Math.max(0, PERSON_LEVELS.indexOf(level) - 1)];
}

/** What every person of a kind and level falls within: attribute and skill spans, in dice units. */
export interface SheetSpan {
  level: PersonLevel;
  attrs: Record<SheetAttr, readonly [lo: number, hi: number]>;
  /** Skills by name: their lean, level and span. Knacks are listed apart: each person has only some of them. */
  skills: { id: string; lean: Lean; level: PersonLevel; span: readonly [number, number] }[];
  knacks: { ids: string[]; count: number; level: PersonLevel; span: readonly [number, number] };
  gear: Record<string, string[]>;
}

/** How far a person's attribute strays from their kind's, either way, in dice units. */
export const ATTR_SPREAD = 1;

export function sheetSpan(m: MergedSheet, level: PersonLevel): SheetSpan {
  const attrs = Object.fromEntries(SHEET_ATTRS.map((a) => {
    const v = Math.max(4, m.attrs[a] + LEVEL_ATTR_SHIFT[level]);
    return [a, [Math.max(4, v - ATTR_SPREAD), v + ATTR_SPREAD] as const];
  })) as SheetSpan['attrs'];
  const skills = Object.entries(m.skills)
    .map(([id, lean]) => ({ id, lean, level: skillLevel(lean, level), span: LEVEL_SPAN[skillLevel(lean, level)] }))
    .sort((a, b) => (a.lean === b.lean ? a.id.localeCompare(b.id) : a.lean === 'main' ? -1 : 1));
  const kl = skillLevel('side', level);
  return { level, attrs, skills, knacks: { ids: m.knacks, count: Math.min(m.knackCount, m.knacks.length), level: kl, span: LEVEL_SPAN[kl] }, gear: m.gear };
}

/** One person's sheet: plain JSON, for the save. */
export interface RolledSheet {
  level: PersonLevel;
  /** Dice units. */
  attrs: Record<SheetAttr, number>;
  /** Dice units, by skill id. */
  skills: Record<string, number>;
  /** Which of the skills are this person's own knacks. */
  knacks: string[];
  /** One thing per slot. */
  gear: Record<string, string>;
}

/** A value inside a span, leaning to its middle (the mean of two draws). */
const within = (rng: Rng, [lo, hi]: readonly [number, number]): number => lo + Math.round(((rng.next() + rng.next()) / 2) * (hi - lo));

/** Roll one person inside a kind's spans. The same seed gives the same person. */
export function rollSheet(span: SheetSpan, seed: number | string): RolledSheet {
  const rng = Rng.fromSeed(seed);
  const attrs = Object.fromEntries(SHEET_ATTRS.map((a) => [a, within(rng, span.attrs[a])])) as Record<SheetAttr, number>;
  const skills: Record<string, number> = {};
  for (const s of span.skills) skills[s.id] = within(rng, s.span);
  const pool = [...span.knacks.ids];
  const knacks: string[] = [];
  for (let i = 0; i < span.knacks.count; i++) {
    const k = pool.splice(rng.int(pool.length), 1)[0];
    knacks.push(k);
    skills[k] = within(rng, span.knacks.span);
  }
  const gear = Object.fromEntries(Object.entries(span.gear).map(([slot, choices]) => [slot, rng.pick(choices)]));
  return { level: span.level, attrs, skills, knacks, gear };
}

/** Units to dice (4 to a die): 13 is 3D6+1. */
export function unitsDice(u: number): Dice {
  return u < 4 ? { n: 0, mod: Math.max(0, u) } : { n: Math.floor(u / 4), mod: u % 4 };
}

/** What follows from the body: base damage and base armour, from Physique (the creator's tables). */
export function derived(attrs: Record<SheetAttr, number>): { damage: Dice; armour: number } {
  return { damage: baseDamage(attrs.Kroppsbyggnad), armour: baseArmour(attrs.Kroppsbyggnad) };
}
