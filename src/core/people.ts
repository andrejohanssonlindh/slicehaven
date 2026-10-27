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

export interface PeopleLibrary {
  facets: Record<string, Facet>;
  leanings: Leaning[];
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
