/**
 * Character-creation state: only the player's decisions and dice results.
 * Everything else is derived (see derive.ts). Plain JSON, versioned.
 */
import { Rng } from '../rng';
import type { Attr, TableId } from './grants';
import type { PointModel } from './tables';

export const CHAR_VERSION = 1;

export interface RollRec {
  table: TableId;
  /** All d100 results in order; the last one counts (a re-roll appends). */
  values: number[];
}

export interface CharState {
  v: number;
  id: string;
  created: string;
  updated: string;
  /** RNG state for the next roll. */
  seed: number;
  step: number;
  prep: string;

  homeland?: string;
  homelandRolls?: number[];

  bgRolls?: number[];
  background?: number;

  people?: string;
  /** Use another people's cultural traits (adoption / mixed household). */
  cultureFrom?: string;
  religion?: string;
  archetype?: string;
  environment?: string;
  occupation: string;
  living?: string;

  /** Pick groups: key → chosen option ids (may repeat when allowed). */
  picks: Record<string, string[]>;
  /** In-grant choices: key → option index (välj / A/B) or a typed name. */
  choices: Record<string, number | string>;
  /** Event slots: key → roll record. */
  rolls: Record<string, RollRec>;
  /** The one free re-roll on the event tables (slot key) — the book allows one. */
  rerollUsed?: string;
  /** Rolls on small sub-tables (e.g. a field disturbance): key → d10 results. */
  subRolls: Record<string, number[]>;

  attrModel?: PointModel;
  /** Lump index (into the model) per attribute, for focused/balanced. */
  attrLump: Partial<Record<Attr, number>>;
  /** Extra/free points per attribute. */
  attrExtra: Partial<Record<Attr, number>>;

  /** Unit spending: pool → target → units. Targets are skill ids, 'avtr:<cat>', 'sprak', 'mysterier'. */
  alloc: Record<string, Record<string, number>>;
  /** Knowledge skills chosen for base value 1 (from Wisdom). */
  wisdomBase: string[];
  /** Knowledge skills marked incompetent (from low Wisdom). */
  wisdomIncomp: string[];

  languages: { spoken: string[]; written: string[] };
  circles: Record<string, string>;
  companions: Record<string, string>;

  drives: { primary?: string; secondary?: string; extra?: string };
  details: {
    name: string;
    age: string;
    gender: string;
    home: string;
    height: string;
    weight: string;
    appearance: string;
    family: string;
    relations: string;
    story: string;
    armRoll?: number;
    arm?: 'höger' | 'vänster';
  };

  equipment: {
    /** Grant-slot key → chosen package / weapon / armour id. */
    packages: Record<string, string>;
    weapons: Record<string, string>;
    armour: Record<string, string>;
    bought: { name: string; cost: number; qty: number }[];
    notes: string;
  };
  mysteries: string[];
  mysticGear: Record<string, string>;
}

export function newChar(seed = Date.now()): CharState {
  const now = new Date().toISOString();
  return {
    v: CHAR_VERSION,
    id: `c${seed.toString(36)}`,
    created: now,
    updated: now,
    seed: seed >>> 0,
    step: 0,
    prep: '',
    occupation: '',
    picks: {},
    choices: {},
    rolls: {},
    subRolls: {},
    attrLump: {},
    attrExtra: {},
    alloc: {},
    wisdomBase: [],
    wisdomIncomp: [],
    languages: { spoken: [], written: [] },
    circles: {},
    companions: {},
    drives: {},
    details: { name: '', age: '', gender: '', home: '', height: '', weight: '', appearance: '', family: '', relations: '', story: '' },
    equipment: { packages: {}, weapons: {}, armour: {}, bought: [], notes: '' },
    mysteries: [],
    mysticGear: {},
  };
}

/** Roll one die with `sides` sides, advancing the stored seed. */
export function roll(state: CharState, sides: number): number {
  const rng = new Rng(state.seed);
  const v = 1 + rng.int(sides);
  state.seed = rng.seed;
  return v;
}

export function migrateChar(data: CharState): CharState {
  // Future: if (data.v === 1) { …; data.v = 2; }
  const fresh = newChar(data.seed);
  return { ...fresh, ...data, details: { ...fresh.details, ...data.details }, equipment: { ...fresh.equipment, ...data.equipment } };
}

const KEY = 'slicehaven.chargen';

export interface Roster {
  current?: string;
  chars: CharState[];
}

export function loadRoster(storage: Storage = localStorage): Roster {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { chars: [] };
    const r = JSON.parse(raw) as Roster;
    return { current: r.current, chars: (r.chars ?? []).map(migrateChar) };
  } catch {
    return { chars: [] };
  }
}

export function saveRoster(r: Roster, storage: Storage = localStorage): void {
  storage.setItem(KEY, JSON.stringify(r));
}

export function exportChar(c: CharState): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(c))));
}

export function importChar(code: string): CharState {
  return migrateChar(JSON.parse(decodeURIComponent(escape(atob(code.trim())))) as CharState);
}
