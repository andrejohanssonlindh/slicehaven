import { ATTR_EN, type Derived } from '../core/chargen/derive';
import { attrDice, skillDice } from '../core/chargen/tables';
import type { Hero } from '../core/hero';
import { SKILL_BY_ID } from './chargen/skills';

/**
 * Skill sets: which skills are reasonable for a kind of task. Scenes build
 * their checks and conversations from these, so "what counts as climbing"
 * is decided once. Ids are the character creator's (attributes as "attr:…").
 */
export const SKILL_SETS = {
  climb: ['Klättra', 'E:Akrobatik', 'K:Apfotad', 'K:Starka nypor'],
  search: ['Genomsöka', 'attr:Vaksamhet'],
  readPeople: ['Genomskåda', 'attr:Vaksamhet'],
  /** Smooth words, charm and a good story. */
  sweetTalk: [
    'attr:Intryck', 'Charm', 'Berättarkonst', 'Argumentera', 'Sång & musik',
    'E:Flörta', 'E:Lova', 'K:Charmerande leende', 'K:Smort munläder', 'K:Hederligt intryck',
  ],
  /** Fear, size and a hard voice. */
  threaten: [
    'attr:Kroppsbyggnad', 'Injaga fruktan', 'Slagsmål', 'Ledarskap', 'Dupera',
    'K:Hotfull stämma', 'K:Stark stämma',
  ],
  /** Coin, haggling and knowing how these things are done. */
  bribe: ['Handel', 'E:Muta', 'Skumraskaffärer', 'Argumentera', 'Dupera', 'E:Lova'],
} as const satisfies Record<string, readonly string[]>;

/** English name of a skill or attribute id. */
export function rollableName(id: string): string {
  if (id.startsWith('attr:')) return ATTR_EN[id.slice(5) as keyof typeof ATTR_EN] ?? id.slice(5);
  return SKILL_BY_ID.get(id)?.en ?? id;
}

/** Does this id name a real skill or attribute? (Checked by a test for every scene.) */
export const isRollable = (id: string): boolean =>
  id.startsWith('attr:') ? id.slice(5) in ATTR_EN : SKILL_BY_ID.has(id);

/** A simple shepherd for when no character has been made yet. Values are skill levels. */
const SHEPHERD_ATTRS: Record<string, number> = {
  Förflyttning: 12, Intryck: 10, Kroppsbyggnad: 11, Livskraft: 11,
  Reaktion: 11, Självkontroll: 10, Vaksamhet: 12, Visdom: 9,
};
const SHEPHERD_SKILLS: Record<string, number> = {
  Klättra: 3, Genomsöka: 2, Smyga: 2, Gömma: 2, Hoppa: 2, Undvika: 2, Marsch: 3,
  Charm: 2, 'Sång & musik': 3, Berättarkonst: 2, Argumentera: 1, Handel: 1, Dupera: 1,
  Genomskåda: 2, 'Injaga fruktan': 1, Ledarskap: 1, 'Spel & dobbel': 1,
  Naturlära: 3, Vildmarksvana: 3, Spåra: 2, Speja: 2, Orientering: 2, 'Jakt & fiske': 1,
  Slagsmål: 2, Stav: 3, Kastvapen: 3,
};

export function defaultHero(): Hero {
  const dice: Hero['dice'] = {};
  for (const [a, v] of Object.entries(SHEPHERD_ATTRS)) dice[`attr:${a}`] = attrDice(v);
  for (const [s, v] of Object.entries(SHEPHERD_SKILLS)) dice[s] = skillDice(v);
  return { name: 'Shepherd', from: 'Default shepherd', dice };
}

/** A character from the creator, as something the scene can roll. */
export function heroFromChar(name: string, d: Derived): Hero {
  const dice: Hero['dice'] = {};
  for (const a of d.attrs) dice[`attr:${a.attr}`] = a.dice;
  for (const s of d.skills) if (s.dice.n > 0) dice[s.id] = s.dice;
  return { name: name || 'Unnamed hero', from: 'Character creator', dice };
}
