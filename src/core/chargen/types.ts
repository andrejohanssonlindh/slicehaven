/**
 * Content types for the character creator. Content lives in src/content/chargen.
 * `sv` is the source term (kept so data can be checked against the book's tables),
 * `en` is what the UI shows. `g` is a grant line (see grants.ts).
 */
import type { TableId } from './grants';

export interface Named {
  id: string;
  sv: string;
  en: string;
}

/** One selectable or fixed bundle of grants. */
export interface Opt extends Named {
  g: string;
  /** Quick-pick suggestion (the book's star). */
  star?: boolean;
  /** Short explanation in our own words. */
  note?: string;
}

/** "Choose N of these." */
export interface PickGroup extends Named {
  pick: number;
  options: Opt[];
  /** Same option may be taken more than once (archetype extras). */
  repeat?: boolean;
  /** Taking it at all is optional (pick up to `pick`). */
  optional?: boolean;
  /** Options are chosen by rolling: `times` × d`sides`, then pick among the rolled. */
  roll?: { sides: number; times: number; must?: boolean };
  note?: string;
}

export interface Homeland extends Named {
  lo: number;
  hi: number;
  /** Majority language(s); '/' separates alternatives. */
  language: string;
  peoples: string;
  religions: string;
  blurb: string;
  places?: string;
}

export interface Background {
  n: number;
  sv: string;
  en: string;
  /** The event table this background rolls once on. */
  table: TableId;
  /** Three grant options; the player takes two. Options marked * attune. */
  opts: [string, string, string];
  blurb: string;
}

export type Family = 'manniska' | 'alv' | 'dvarg' | 'tirak' | 'missla';

export interface People extends Named {
  family: Family;
  /** Marvellous human peoples ignore the common human attributes and traits. */
  marvel?: boolean;
  /** Attributes in ATTRS order; missing → the family default. */
  attrs?: number[];
  innate: Opt[];
  culture: Opt[];
  picks: PickGroup[];
  /** Spoken language; '/' separates alternatives. */
  language: string;
  blurb: string;
  build?: string;
  /** Roll range on the family's table. */
  lo?: number;
  hi?: number;
}

export interface FamilyDef extends Named {
  attrs?: number[];
  innate: Opt[];
  culture: Opt[];
  picks: PickGroup[];
  blurb: string;
}

export interface Religion extends Named {
  /** Three doctrines with two options each; the player picks two (doctrine, option) pairs. */
  doctrines: { sv: string; en: string; note?: string; options: Opt[] }[];
  blurb: string;
  /** For cults: the parent religion's id. */
  parent?: string;
  /** Religions only for some peoples (ethnic religions). */
  ethnic?: string;
}

export interface Archetype extends Named {
  /** Fixed grants: event rolls, the 24 units, gear and resources. */
  g: string;
  extras: PickGroup;
  mystic?: boolean;
  occupations: Record<string, string>;
  blurb: string;
  /** Extra text for fixed resources that need explaining. */
  notes?: string[];
}

export interface Environment extends Named {
  g: string;
  extras: PickGroup;
  blurb: string;
}

export interface EventEntry {
  lo: number;
  hi: number;
  sv: string;
  en: string;
  g: string;
  /** Our own one-line summary. */
  note?: string;
  /** "Roll this slot again" (e.g. an eventful life). */
  again?: boolean;
}

export interface EventTable {
  id: TableId;
  sv: string;
  en: string;
  entries: EventEntry[];
}
