import type { Dice } from './checks';

/**
 * What a hero can roll outside combat: attributes (ids "attr:Intryck") and
 * skills (ids as in the character creator, e.g. "Klättra", "E:Muta").
 * Anything missing rolls nothing.
 */
export interface Hero {
  name: string;
  /** Where the hero came from ("Default shepherd", "Character creator"). */
  from: string;
  dice: Record<string, Dice>;
  /** Kind of people ('human', 'elf', 'dwarf', 'tirak', 'missla'): how others see you. */
  kind?: string;
  /** The specific people (creator id, e.g. 'asharier'). */
  people?: string;
  /** Own facets (people library): homeland, faith, calling, people. Sharing one with someone can help. */
  tags?: string[];
}

export const NO_DICE: Dice = { n: 0, mod: 0 };

export const diceOf = (h: Hero, id: string): Dice => h.dice[id] ?? NO_DICE;

export const canRoll = (h: Hero, id: string): boolean => diceOf(h, id).n > 0;

export const isAttr = (id: string): boolean => id.startsWith('attr:');
