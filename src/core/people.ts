/**
 * The people library: types of people and situations, and how they change what works.
 *
 * A *facet* is one thing that can be true of a person or a place: their people (asharier), their
 * realm (asharien), their faith (samorism), their standing or calling (martial, job-soldier), the
 * setting (tavern, night) or a passing state (drunk, grieving). Facets form a tree, and a person
 * carries several at once: the facet ids go in an object's `tags` (and the scene's `tags`).
 *
 * A *leaning* binds a facet to an effort (a skill tag: threaten, ask, bribe…): "for people like
 * this, this effort is easier (+) or harder (−), and here is why". It may name the skills it is
 * about ("impress, with Baking"). Leanings are balance data, like the relations table; they shift
 * the difficulty of a single roll the same way the mood and the relations do.
 */

export type Dimension = 'people' | 'realm' | 'faith' | 'station' | 'setting' | 'state';

export interface Facet {
  id: string;
  dim: Dimension;
  label: string;
  parent?: string;
  blurb: string;
}

export interface Leaning {
  /** A facet id. Applies to it and everything below it. */
  who: string;
  /** The kind of effort (a skill tag). */
  effort: string;
  /** −2…+2 points; positive = easier for the hero. Each point moves a difficulty by 2 (like relations). */
  shift: number;
  /** Why, in a few words; it goes in the roll's log line. */
  why: string;
  /** Only when the skill used is one of these ("H:*" = any craft, "E:*" any expertise…). Missing = whatever the skill. */
  skills?: string[];
}

/**
 * Kinship: what it is worth that the hero and the other person have something in common. Sharing a
 * faith, a walk of life or a homeland makes some efforts a little easier. (Peoples are covered by the
 * relations table, so they are not here.)
 */
export interface KinRule {
  dim: Dimension;
  /** The efforts it helps. */
  efforts: string[];
  shift: number;
  /** Shown in the roll's log line. */
  why: string;
  /** Only the very same facet counts (both carry the homeland), not a shared parent (both are martial). */
  exact?: boolean;
}

export interface PeopleLibrary {
  facets: Record<string, Facet>;
  leanings: Leaning[];
  kin?: KinRule[];
}

/** The most the leanings together can move a roll, in points. */
export const MAX_LEAN = 3;

/** From a facet up to its root: ['job-baker', 'craft']. Unknown ids give just themselves. */
export function facetChain(id: string, facets: PeopleLibrary['facets']): string[] {
  const chain: string[] = [];
  for (let f: string | undefined = id; f && !chain.includes(f); f = facets[f]?.parent) chain.push(f);
  return chain;
}

/** Does a leaning's skill entry cover this skill? "H:*" covers every craft. */
export function coversSkill(entry: string, skill: string): boolean {
  return entry.endsWith(':*') ? skill.startsWith(entry.slice(0, -1)) : entry === skill;
}

/** The effort a check is about: its intention, with the old names mapped to the tags. */
export function effortOf(intention: string | undefined): string | undefined {
  if (intention === 'intimidate') return 'threaten';
  return intention;
}

/**
 * Where an effort works better or worse, for one skill: every leaning for the effort that either
 * names no skill (any skill with the tag) or names this one. `specific` marks the second kind.
 * Strongest first.
 */
export function leaningsForSkill(skill: string, effort: string, lib: Partial<PeopleLibrary>): { l: Leaning; specific: boolean }[] {
  const out: { l: Leaning; specific: boolean }[] = [];
  for (const l of lib.leanings ?? []) {
    if (l.effort !== effort) continue;
    if (!l.skills) out.push({ l, specific: false });
    else if (l.skills.some((s) => coversSkill(s, skill))) out.push({ l, specific: true });
  }
  return out.sort((a, b) => b.l.shift - a.l.shift || a.l.who.localeCompare(b.l.who));
}

/** What the hero and the other person have in common, for this effort. */
export function kinFor(
  mine: string[], theirs: string[], effort: string | undefined, lib: Partial<PeopleLibrary>,
): { v: number; notes: string[] } {
  if (!effort || !lib.kin?.length || !mine.length || !theirs.length) return { v: 0, notes: [] };
  const facets = lib.facets ?? {};
  const isRoot = (id: string) => !facets[id]?.parent;
  let v = 0;
  const notes: string[] = [];
  for (const rule of lib.kin) {
    if (!rule.efforts.includes(effort)) continue;
    const of = (ids: string[]) => new Set((rule.exact ? ids : ids.flatMap((i) => facetChain(i, facets))).filter((f) => facets[f]?.dim === rule.dim && !isRoot(f)));
    const a = of(mine);
    const shared = [...of(theirs)].some((f) => a.has(f));
    if (shared) {
      v += rule.shift;
      notes.push(rule.why);
    }
  }
  return { v, notes };
}

/**
 * Both together, kept within MAX_LEAN: what the person and the place lean, and what you share with the
 * person (the place does not count as kin).
 */
export function totalLean(
  mine: string[], person: string[], place: string[], effort: string | undefined, skill: string | undefined, lib: Partial<PeopleLibrary>,
): { v: number; notes: string[] } {
  const a = leaningFor([...person, ...place], effort, skill, lib);
  const b = kinFor(mine, person, effort, lib);
  return { v: Math.max(-MAX_LEAN, Math.min(MAX_LEAN, a.v + b.v)), notes: [...a.notes, ...b.notes] };
}

/**
 * What the facets of the people (and the place) do to this effort with this skill.
 * Several facets add up, to at most MAX_LEAN either way. Each facet counts once even if it is
 * named twice (a tag and a kind).
 */
export function leaningFor(
  have: string[], effort: string | undefined, skill: string | undefined, lib: Partial<PeopleLibrary>,
): { v: number; notes: string[] } {
  if (!effort || !lib.leanings?.length) return { v: 0, notes: [] };
  const facets = lib.facets ?? {};
  const covered = new Set<string>();
  for (const id of have) for (const f of facetChain(id, facets)) covered.add(f);
  let v = 0;
  const notes: string[] = [];
  for (const l of lib.leanings) {
    if (l.effort !== effort || !covered.has(l.who)) continue;
    if (l.skills && !(skill && l.skills.some((s) => coversSkill(s, skill)))) continue;
    v += l.shift;
    if (l.why) notes.push(l.why);
  }
  return { v: Math.max(-MAX_LEAN, Math.min(MAX_LEAN, v)), notes };
}
