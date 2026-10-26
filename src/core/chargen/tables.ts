/** Conversion tables for the character creator (pure functions, no data files). */

export interface Dice {
  n: number;
  mod: number;
}

export function diceText(d: Dice): string {
  if (d.n <= 0 && d.mod <= 0) return '0';
  const base = d.n > 0 ? `${d.n}D6` : '';
  if (!d.mod) return base;
  return `${base}${base ? '+' : ''}${d.mod}`;
}

/** Attribute value → dice: 4 = 1D6, each +1 adds +1, every fourth step another D6 (8 = 2D6, 12 = 3D6 …). */
export function attrDice(v: number): Dice {
  if (v < 4) return { n: 0, mod: 0 };
  return { n: 1 + Math.floor((v - 4) / 4), mod: (v - 4) % 4 };
}

/** Base armour from Physique: 0 up to 8, then +1 for every two points. */
export function baseArmour(physique: number): number {
  return physique <= 8 ? 0 : Math.floor((physique - 7) / 2);
}

/** Base damage from Physique: 4–5 = 1D6+2, 6–7 = 1D6+3, 8–9 = 2D6, … */
export function baseDamage(physique: number): Dice {
  const step = Math.max(0, Math.floor(Math.max(4, physique) / 2) - 2) + 6;
  return { n: Math.floor(step / 4), mod: step % 4 };
}

const SKILL_DICE: Dice[] = [
  { n: 0, mod: 0 },
  { n: 2, mod: 0 },
  { n: 3, mod: 0 },
  { n: 3, mod: 2 },
  { n: 4, mod: 0 },
  { n: 4, mod: 1 },
  { n: 4, mod: 2 },
  { n: 4, mod: 3 },
  { n: 5, mod: 0 },
];
export const SKILL_MAX = 8;

/** Skill value → dice. Above 8 (possible in play) continues the pattern. */
export function skillDice(v: number): Dice {
  if (v <= 8) return SKILL_DICE[Math.max(0, v)];
  return attrDice(v + 12);
}

export interface WisdomRow {
  /** Number of knowledge skills that must be marked incompetent ('all' at 4). */
  incompetent: number | 'all';
  /** Number of knowledge skills that get base value 1 ('all' from 18). */
  base1: number | 'all';
  /** Extra free knowledge units. */
  extraUnits: number;
  /** Extra expertise units. */
  expertise: number;
  /** Experience cost to learn new knowledge in play. */
  newKnowledgeXp: number;
}

export function wisdomRow(w: number): WisdomRow {
  const v = Math.max(4, w);
  const incompetent: WisdomRow['incompetent'] = v <= 4 ? 'all' : ({ 5: 10, 6: 9, 7: 6, 8: 5, 9: 3, 10: 2 } as Record<number, number>)[v] ?? 0;
  const base1: WisdomRow['base1'] = v >= 18 ? 'all' : ({ 9: 1, 10: 2, 11: 3, 12: 4, 13: 6, 14: 8, 15: 9, 16: 10, 17: 11 } as Record<number, number>)[v] ?? 0;
  const extraUnits = v >= 19 ? (v === 19 ? 1 : v - 19) : 0;
  const expertise = v >= 15 ? (v <= 16 ? 2 : v <= 18 ? 4 : 6 + (v - 19) * 2) : 0;
  const newKnowledgeXp = v <= 5 ? 10 : v <= 7 ? 8 : v <= 9 ? 6 : v <= 11 ? 5 : v <= 15 ? 4 : v <= 19 ? 3 : 2;
  return { incompetent, base1, extraUnits, expertise, newKnowledgeXp };
}

/** Attribute point models. */
export const POINT_MODELS = {
  fokuserad: [10, 10, 8, 8, 4, 0, 0, 0],
  balanserad: [10, 6, 6, 6, 4, 4, 2, 2],
} as const;
export type PointModel = keyof typeof POINT_MODELS | 'fria';
export const MAX_POINTS_PER_ATTR = 10;
export const MIN_ATTR = 4;

export const ENCUMBRANCE = [
  { max: 8, penalty: '–', baseFatigue: 0 },
  { max: 16, penalty: '–', baseFatigue: 1 },
  { max: 24, penalty: '−1D6', baseFatigue: 2 },
  { max: 32, penalty: '−2D6', baseFatigue: 4 },
  { max: 40, penalty: '−2D6', baseFatigue: 6 },
];
