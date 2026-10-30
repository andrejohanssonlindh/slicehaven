import type { Dimension, Facet } from './people';
import { Rng } from './rng';

/**
 * Kinds of person: what an innkeeper, a dwarf or a Marnakh sellsword *is*, the way `core/world3d/things.ts` says what
 * a well is. A person is a kind of several things at once, one line per dimension: their people (asharier, under
 * human), their calling (job-innkeeper, under merchant), and later their faith, their realm and whatever else grows a
 * tree. Those trees are the people library's facets (`content/people/facets.ts`, made from the character creator's
 * own data), so the creator, the skill hooks and the world never disagree about who is what.
 *
 * A *kind of person* (`PersonKindDef`, one file each in `content/people/kinds/`) either gives a body to a facet (the
 * `dwarf` file says how every dwarf looks; its place in the tree comes from the library) or is a kind of its own made
 * of others (`is: ['marnakh', 'job-soldier']`). A *person* in a map is "these kinds, this seed", plus their own changes.
 * Looks are merged down the line, parents first and left to right, so a calling's clothes go on a people's body.
 *
 * A kind has a slot for a character sheet. What goes in it (skills a kind is stronger or weaker in, and how much a
 * person varies) is not designed yet: see `director/design/people-kinds.md`.
 */

/** How a person is drawn: names of the folk art's ramps and parts (`art/folk.ts`, `folkOf`). Plain data, for the save. */
export interface Look {
  build?: string;
  skin?: string;
  hair?: string;
  style?: string;
  /** `none` takes off an inherited beard (and the same for apron, vest, cloak, head and held things). */
  beard?: string;
  garment?: string;
  top?: string;
  legs?: string;
  boots?: string;
  head?: string;
  sleeves?: string;
  apron?: string;
  vest?: string;
  cloak?: string;
  belt?: boolean;
  right?: string;
  left?: string;
}

/** A look as a kind gives it: each part one value, or a few to choose from (the person's seed chooses). */
export type LookDef = { [K in keyof Look]?: Look[K] | readonly NonNullable<Look[K]>[] };

/** The character sheet a kind of person has. Empty for now: filling sheets is its own, later piece of work. */
export type SheetSlot = Record<string, never>;

export interface PersonKindDef {
  /** A facet of the people library this gives a body to (`dwarf`, `job-innkeeper`), or a new kind's own name. */
  id: string;
  /** For a new kind only: what it is a kind of (other kinds or facets, at most one line per dimension). A facet's parent comes from the library. */
  is?: string[];
  /** One line for when they are looked at (English; through `t()` when shown). */
  about?: string;
  look?: LookDef;
  sheet?: SheetSlot;
}

/** A person as placed: what they are a kind of, the seed that picks among the choices, and their own changes. */
export interface PersonSpec {
  is: string[];
  seed?: number;
  look?: LookDef;
}

/** A person worked out: every kind and facet they are (most general first), the facet they carry in each dimension, and their look. */
export interface Resolved {
  chain: string[];
  facets: Partial<Record<Dimension, string>>;
  look: Look;
}

/** The people everyone is when nothing says otherwise. */
const DEFAULT_PEOPLE = 'human';

const LOOK_KEYS: (keyof Look)[] = ['build', 'skin', 'hair', 'style', 'beard', 'garment', 'top', 'legs', 'boots', 'head', 'sleeves', 'apron', 'vest', 'cloak', 'belt', 'right', 'left'];

export class PersonKinds {
  private readonly defs = new Map<string, PersonKindDef>();

  constructor(defs: readonly PersonKindDef[], private readonly facets: Record<string, Facet>) {
    for (const d of defs) {
      if (this.defs.has(d.id)) throw new Error(`two kinds of person are called ${d.id}`);
      const facet = facets[d.id];
      if (facet && d.is) throw new Error(`${d.id} is a ${facet.dim} in the people library: its place in the tree comes from there, so it takes no \`is\``);
      if (!facet && !d.is?.length) throw new Error(`the kind of person ${d.id} is not in the people library, so it must say what it is a kind of`);
      this.defs.set(d.id, d);
    }
    for (const d of defs) this.resolve({ is: [d.id] }); // a loop or a clash in the tree shows at once
  }

  /** A kind of person, or a facet any kind of person can be. */
  has(id: string): boolean {
    return this.defs.has(id) || id in this.facets;
  }

  get kinds(): string[] {
    return [...this.defs.keys()];
  }

  /** What is wrong with a person (an unknown kind, two peoples), or null. */
  problem(p: PersonSpec): string | null {
    try {
      this.resolve(p);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }

  /** Work a person out. Throws for a kind nobody defined, a loop, or two unrelated facets in one dimension (an elf and a dwarf). */
  resolve(p: PersonSpec): Resolved {
    let r = this.walk(p.is);
    if (!r.facets.people) r = this.walk([DEFAULT_PEOPLE, ...p.is]);
    const rng = Rng.fromSeed(p.seed ?? 1);
    const merged: LookDef = {};
    for (const id of r.chain) Object.assign(merged, this.defs.get(id)?.look);
    Object.assign(merged, p.look);
    const look: Look = {};
    for (const k of LOOK_KEYS) {
      const v = merged[k];
      // (Every part draws from the seed, chosen or not, so one kind's choices don't shift another's.)
      const roll = rng.next();
      const one = Array.isArray(v) ? v[Math.floor(roll * v.length)] : v;
      if (one !== undefined && one !== 'none') (look as Record<string, unknown>)[k] = one;
    }
    return { chain: r.chain, facets: r.facets, look };
  }

  private parents(id: string): string[] {
    const f = this.facets[id];
    if (f) return f.parent ? [f.parent] : [];
    const d = this.defs.get(id);
    if (!d) throw new Error(`no kind of person called ${id}`);
    return d.is ?? [];
  }

  /** Parents before children, left to right; and the most specific facet in each dimension. */
  private walk(is: readonly string[]): { chain: string[]; facets: Partial<Record<Dimension, string>> } {
    const chain: string[] = [];
    const on: string[] = [];
    const visit = (id: string): void => {
      if (chain.includes(id)) return;
      if (on.includes(id)) throw new Error(`the kinds of person loop: ${[...on, id].join(' > ')}`);
      on.push(id);
      for (const p of this.parents(id)) visit(p);
      on.pop();
      chain.push(id);
    };
    for (const id of is) visit(id);
    const facets: Partial<Record<Dimension, string>> = {};
    for (const id of chain) {
      const f = this.facets[id];
      if (!f) continue;
      const have = facets[f.dim];
      if (!have || this.under(id, have)) facets[f.dim] = id;
      else if (!this.under(have, id)) throw new Error(`a person can't be both ${have} and ${id} (two ${f.dim}s)`);
    }
    return { chain, facets };
  }

  /** Whether facet `a` is `b` or below it. */
  private under(a: string, b: string): boolean {
    for (let k: string | undefined = a; k; k = this.facets[k]?.parent) if (k === b) return true;
    return false;
  }
}
