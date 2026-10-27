import { type Dice, attrDice, skillDice } from '../../core/chargen/tables';

/**
 * Generic people: a sheet each, so what they roll in a conflict is what they actually have
 * (never "whatever fits yours"). Attributes are creator values (12 is an average human);
 * skills are levels. Lots more of these will follow; this is the first.
 */
export interface NpcSheet {
  name: string;
  dice: Record<string, Dice>;
}

function sheet(name: string, attrs: Record<string, number>, skills: Record<string, number>): NpcSheet {
  const dice: Record<string, Dice> = {};
  for (const [a, v] of Object.entries(attrs)) dice[`attr:${a}`] = attrDice(v);
  for (const [s, v] of Object.entries(skills)) dice[s] = skillDice(v);
  return { name, dice };
}

/** A village gate guard: a watchful, steady man with a spear, some law and no head for trade. */
export const GENERIC_GUARD: NpcSheet = sheet(
  'Generic guard',
  { Förflyttning: 11, Intryck: 9, Kroppsbyggnad: 13, Livskraft: 12, Reaktion: 11, Självkontroll: 12, Vaksamhet: 13, Visdom: 9 },
  { Spjut: 3, Slagsmål: 2, Genomskåda: 2, 'Injaga fruktan': 2, Handel: 1, Lagkunskap: 2, Ledarskap: 1, Speja: 2 },
);
