import { ATTR_EN, type Derived } from '../core/chargen/derive';
import { attrDice, skillDice } from '../core/chargen/tables';
import type { Hero } from '../core/hero';
import { GROUP_EN, SKILL_BY_ID } from './chargen/skills';
import { backgroundFacet, peopleFacet } from './people';
import { skillsWith } from './skillweb/tags';

/**
 * Skill sets: which skills are reasonable for a kind of task. Scenes build
 * their checks and conversations from these, so "what counts as climbing"
 * is decided once, in content/skillweb/tags (one tag per kind of effort).
 * Ids are the character creator's (attributes as "attr:…").
 */
export const SKILL_SETS = {
  climb: skillsWith('climb'),
  search: skillsWith('search'),
  readPeople: skillsWith('read-people'),
  /** Smooth words, charm and a good story. */
  sweetTalk: skillsWith('sweet-talk'),
  /** Fear, size and a hard voice. */
  threaten: skillsWith('threaten'),
  /** Coin, haggling and knowing how these things are done. */
  bribe: skillsWith('bribe'),
  /** Making a case: reasoning, standing, a plain good argument. */
  argue: skillsWith('persuade'),
  /** Winning someone over. */
  impress: skillsWith('impress'),
  /** Holding attention while something else happens. */
  distract: skillsWith('distract'),
  /** Getting someone to tell you things. */
  ask: skillsWith('ask'),
  /** Manners, rank and who bows to whom. */
  etiquette: skillsWith('etiquette'),
  /** Knowing how the street works. */
  streetwise: skillsWith('streetwise'),
} satisfies Record<string, readonly string[]>;

/** English name of a skill or attribute id. */
export function rollableName(id: string): string {
  if (id.startsWith('attr:')) return ATTR_EN[id.slice(5) as keyof typeof ATTR_EN] ?? id.slice(5);
  return SKILL_BY_ID.get(id)?.en ?? id;
}

/** Skill groups in the order lists show them: attributes, the six groups, then expertise, marks, crafts, abilities. */
const GROUP_ORDER: { key: string; label: string }[] = [
  { key: 'attr', label: 'Attributes' },
  ...(['rorelse', 'social', 'vildmark', 'kunskap', 'strid', 'mystik'] as const).map((k) => ({ key: k, label: GROUP_EN[k] })),
  { key: 'E', label: 'Expertise' },
  { key: 'K', label: 'Marks' },
  { key: 'H', label: 'Crafts' },
  { key: 'F', label: 'Abilities' },
];

export const groupOf = (id: string): string => (id.startsWith('attr:') ? 'attr' : SKILL_BY_ID.get(id)?.group ?? 'F');

/** Ids sorted into their skill groups (empty groups left out), names A–Z within a group. */
export function byGroup(ids: string[]): { key: string; label: string; ids: string[] }[] {
  return GROUP_ORDER
    .map((g) => ({ ...g, ids: ids.filter((id) => groupOf(id) === g.key).sort((a, b) => rollableName(a).localeCompare(rollableName(b))) }))
    .filter((g) => g.ids.length > 0);
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
  return { name: 'Shepherd', from: 'Default shepherd', dice, kind: 'human', people: 'asharier', tags: ['asharier', 'asharien', 'job-herder'] };
}

/** The creator's families as skill-web kinds. */
const FAMILY_KIND: Record<string, string> = { manniska: 'human', alv: 'elf', dvarg: 'dwarf', tirak: 'tirak', missla: 'missla' };

/** A character from the creator, as something the scene can roll. */
export function heroFromChar(name: string, d: Derived): Hero {
  const dice: Hero['dice'] = {};
  for (const a of d.attrs) dice[`attr:${a.attr}`] = a.dice;
  for (const s of d.skills) if (s.dice.n > 0) dice[s.id] = s.dice;
  const tags = [
    d.people && peopleFacet(d.people.id), d.homeland?.id, d.religion?.id, d.background && backgroundFacet(d.background.en),
  ].filter((t): t is string => !!t && t !== 'ovriga');
  return { name: name || 'Unnamed hero', from: 'Character creator', dice, kind: d.people ? FAMILY_KIND[d.people.family] : undefined, people: d.people?.id, tags };
}
