import { ATTRS, type Token, parseGrants } from '../../core/chargen/grants';
import type { Family, Opt } from '../../core/chargen/types';
import { SHEET_ATTRS, type SheetAttr, type SheetDef } from '../../core/npcsheet';
import { BACKGROUNDS } from '../chargen/backgrounds';
import { FAMILIES, PEOPLES } from '../chargen/peoples';
import { FAMILY_KIND, backgroundFacet, peopleFacet } from './facets';

/**
 * The sheets every kind of person starts from, made from data we already have, so all hundred callings and every
 * people have one before anyone writes a line by hand:
 * - **the eight archetypes** (the book's opponent templates: attribute baselines, the skills to pick secondaries
 *   from, the gear) on the fifteen groups of callings;
 * - **each calling's skills** from the character creator's background options (each skill named there is a main skill);
 * - **each people's build and gifts** from the creator: attributes as a shift from a human's, innate and cultural
 *   skills as side skills.
 * Hand-written kinds (`kinds/`) stack on top: a `guard-bow` is a guard who is good with a bow. Numbers are dice units
 * (4 to a die, so 12 is 3D6); see `core/npcsheet.ts`.
 */

type A = Partial<Record<SheetAttr, number>>;
const attrs = (f: number, i: number, k: number, r: number, s: number, v: number, l: number): A =>
  ({ Förflyttning: f, Intryck: i, Kroppsbyggnad: k, Reaktion: r, Självkontroll: s, Vaksamhet: v, Livskraft: l });

/** The book's eight opponent archetypes: attributes, the skills to pick a few side skills from, and what they carry. */
export const ARCHETYPE_SHEETS: Record<string, SheetDef & { en: string }> = {
  toiler: {
    en: 'Toiler', attrs: attrs(12, 12, 12, 12, 12, 14, 12), knackCount: 2,
    knacks: ['Charm', 'Fingerfärdighet', 'Genomskåda', 'Gömma', 'E:Kränga', 'E:Lappa & laga', 'Smyga', 'E:Tjänsteliv'],
    skills: { Slagsmål: 'side' },
    gear: { weapon: ['Kniv', 'Påk', 'Tillhygge'] },
  },
  warrior: {
    en: 'Warrior', attrs: attrs(14, 10, 16, 14, 12, 12, 16), knackCount: 3,
    knacks: ['Genomsöka', 'Injaga fruktan', 'Krigföring', 'Ledarskap', 'Marsch', 'Rida', 'E:Soldatliv', 'Speja', 'E:Vapenkata', 'K:Ärr'],
    gear: { weapon: ['Stridssvärd', 'Handyxa', 'Jaktspjut', 'Stridsklubba'], armour: ['Ringbrynja', 'Förstärkt läder', 'Fjällpansar'] },
  },
  merchant: {
    en: 'Merchant', attrs: attrs(10, 16, 12, 12, 14, 14, 14), knackCount: 3,
    knacks: ['Gömma', 'Kulturkännedom', 'E:Köra vagn', 'E:Kränga', 'Lagkunskap', 'E:Muta', 'Sjömannaskap', 'K:Smort munläder'],
    skills: { Dolk: 'side' },
    gear: { weapon: ['Dolk', 'Kniv'] },
  },
  leader: {
    en: 'Leader', attrs: attrs(12, 20, 12, 12, 16, 14, 14), knackCount: 3,
    knacks: ['K:Förnäm uppsyn', 'Gömma', 'E:Heraldik', 'Krigföring', 'Lagkunskap', 'Rida', 'Sjömannaskap', 'K:Stolt hållning', 'Teologi'],
    skills: { Svärd: 'side' },
    gear: { weapon: ['Stridssvärd', 'Värja', 'Dolk'] },
  },
  scholar: {
    en: 'Scholar', attrs: attrs(10, 14, 10, 12, 16, 12, 12), knackCount: 3,
    knacks: ['Argumentera', 'H:Bokbindare', 'Genomsöka', 'Naturlära', 'K:Obegriplig handstil', 'H:Optiker', 'H:Skrivare', 'K:Strukturerat sinne'],
    gear: { weapon: ['Kniv', 'Dolk'] },
  },
  mystic: {
    en: 'Mystic', attrs: attrs(10, 14, 10, 12, 20, 16, 12), knackCount: 3,
    knacks: ['Argumentera', 'E:Astrologi', 'Dupera', 'E:Meditera', 'K:Monoton stämma', 'Ockultism', 'Teologi', 'Teoretisk magi', 'Undervisa'],
    skills: { Stav: 'side' },
    gear: { weapon: ['Kniv', 'Dolk'] },
  },
  shadow: {
    en: 'Shadow', attrs: attrs(16, 12, 12, 18, 12, 18, 14), knackCount: 3,
    knacks: ['Dupera', 'H:Förfalskare', 'E:Förklädnad', 'Genomskåda', 'Genomsöka', 'Gifter & droger', 'Injaga fruktan', 'E:Låsdyrkning', 'Skumraskaffärer'],
    skills: { Dolk: 'side' },
    gear: { weapon: ['Dolk', 'Stilett', 'Kastkniv'], armour: ['Mjukt läder'] },
  },
  entertainer: {
    en: 'Entertainer', attrs: attrs(14, 18, 12, 14, 10, 14, 12), knackCount: 2,
    knacks: ['E:Akrobatik', 'K:Böjlig', 'Dansa', 'Fingerfärdighet', 'E:Flörta', 'E:Gyckla', 'Kulturkännedom', 'Naturlära', 'E:Skådespel'],
    skills: { Dolk: 'side' },
    gear: { weapon: ['Kniv', 'Dolk'] },
  },
};

/** Which archetype each group of callings is (the people library's station groups). */
export const GROUP_ARCHETYPE: Record<string, string> = {
  nobility: 'leader', officialdom: 'scholar', clergy: 'mystic', learned: 'scholar', arcane: 'mystic', martial: 'warrior',
  merchant: 'merchant', craft: 'toiler', landworker: 'toiler', seafaring: 'toiler', performer: 'entertainer',
  underworld: 'shadow', servile: 'toiler', wanderer: 'toiler', outsider: 'toiler',
};

/** The skills a grant string names (a background's or a people's), leaving out choices and groups. */
const skillsIn = (g: string): string[] =>
  parseGrants(g).flatMap((item) => (item.k === 'token' ? namedSkills(item.token) : []));
const namedSkills = (t: Token): string[] => (t.k === 'skill' || t.k === 'talang' ? [t.skill[0]] : []);

const side = (opts: Opt[]): Record<string, 'side'> => Object.fromEntries(opts.flatMap((o) => skillsIn(o.g)).map((s) => [s, 'side' as const]));

/** A people's attributes as a shift from another set (the creator's order, `ATTRS`); zeros left out. */
const shiftFrom = (to: number[] | undefined, from: number[]): A => {
  if (!to) return {};
  const out: A = {};
  for (const a of SHEET_ATTRS) {
    const i = ATTRS.indexOf(a);
    if (to[i] !== from[i]) out[a] = to[i] - from[i];
  }
  return out;
};

const HUMAN = FAMILIES.manniska.attrs!;

/** A family's attributes; the tirak have none of their own (each house has its own by size), so the first house's middle size speaks for them. */
const familyAttrs = (fam: Family): number[] =>
  FAMILIES[fam].attrs ?? (PEOPLES.find((p) => p.family === fam && p.id.endsWith('-tiraker')) ?? PEOPLES.find((p) => p.family === fam))?.attrs ?? HUMAN;

function build(): Record<string, SheetDef> {
  const out: Record<string, SheetDef> = {};
  for (const [group, arch] of Object.entries(GROUP_ARCHETYPE)) {
    const { en: _en, ...sheet } = ARCHETYPE_SHEETS[arch];
    out[group] = sheet;
  }
  for (const b of BACKGROUNDS) {
    const skills = Object.fromEntries(b.opts.flatMap(skillsIn).map((s) => [s, 'main' as const]));
    out[backgroundFacet(b.en)] = { skills };
  }
  for (const [fam, def] of Object.entries(FAMILIES)) {
    const kind = FAMILY_KIND[fam];
    out[kind] = { attrShift: shiftFrom(familyAttrs(fam as Family), HUMAN), skills: side([...def.innate, ...def.culture]) };
  }
  for (const p of PEOPLES) {
    const id = peopleFacet(p.id);
    // The tirak are split by size, one facet a house: the middle size speaks for it.
    if (out[id] && !p.id.endsWith('-tiraker')) continue;
    const fam = familyAttrs(p.family);
    // Its own build as a shift from its family's (which `FAMILY_KIND` already has from a human's).
    out[id] = { attrShift: shiftFrom(p.attrs, fam), skills: side([...p.innate, ...p.culture]) };
  }
  return out;
}

/** The sheet each facet starts with, by facet id (a station group, a calling, a family or a people). */
export const BASE_SHEETS: Record<string, SheetDef> = build();
