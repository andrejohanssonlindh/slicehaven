import { type CheckDef, type Effect, type ObjectDef, type SceneDef, type SceneState, type Situation, type Token, moodLine, moodWord } from './scene';
import { type PeopleLibrary, facetChain, totalLean } from './people';
import { MAX_RECEPTION } from './social';

/**
 * The skill web: how skills meet the things in the world (design: director/design/skill-web.md).
 *
 * A skill use on a thing is looked up in layers, most specific first:
 *   3. hook     – a check written by hand on the thing itself (quest or story beats)
 *   2. object   – a library hook for a kind of feature (a rock can be climbed or studied)
 *   1. standard – a library hook for a broad kind (every humanoid can be sized up)
 * Within the library, a hook for a more specific kind beats one for its parent,
 * and a hook that needs a tag the thing has beats one that doesn't.
 * For each *intention* (what you're trying to get done) the first match wins,
 * so a thing's own check shadows a library hook with the same intention.
 *
 * The library is data (content/skillweb/hooks, one file per effort). `expandScene` copies the
 * matching hooks onto each object as ordinary checks, so everything that already reads `checks`
 * (useful skills, use-a-skill-where-you-stand, hints) works unchanged.
 *
 * Two trees say what something is. *Kinds* (content/skillweb/kinds) are what a thing is made as:
 * humanoid, human, elf, animal, door, water. *Facets* (content/people) are everything social:
 * calling, homeland, faith, state, setting. Peoples are in both (an Asharian is a kind of human and a
 * facet). A hook names a `kind` for what it can be done to, and a `facet` for whom it answers differently.
 */

/** One reusable skill use for a kind of thing. */
export interface HookDef {
  /** Unique in the library; the instance on an object is `<object id>/<hook id>`. */
  id: string;
  /** Kind of thing it applies to; children of that kind inherit it. */
  kind: string;
  /** 1 = standard (broad kinds), 2 = object related. Informational: precedence comes from the kind tree. */
  layer: 1 | 2;
  /**
   * The kind of effort: a skill tag (content/skillweb/tags). It decides which skills fit (the skills
   * carrying the tag) and which leanings of the people library apply.
   */
  effort: string;
  /**
   * The slot on a thing: one result per intention. Usually the effort itself; different when one thing
   * offers two tries of the same effort (follow a trail, read a trail), or when the engine knows the
   * slot by name ('size-up', 'study').
   */
  intention: string;
  /** Skills that fit this thing but do not carry the effort's tag. Visible exceptions; a test checks the rest carry it. */
  also?: string[];
  /** Only things with this tag (e.g. 'rich', 'poor'). */
  tag?: string;
  /**
   * Only people (or places) with this facet or one below it (people library): 'martial' also fits a
   * soldier, 'tavern' any scene tagged so. The deeper the facet, the better the match.
   */
  facet?: string;
  label: string;
  /** Reasonable skills (and attr:… ids): the effort's tagged skills (or some of them), plus `also`. */
  skills: string[];
  difficulty: number;
  when?: CheckDef['when'];
  tries?: number;
  success: Effect[];
  failure: Effect[];
  /** Added to `success` when you beat the difficulty by 2+ advantages. */
  strong?: Effect[];
  /** A social try: costs one of their talks; their mood and how they see your people colour the roll. */
  social?: boolean;
  /** Kept advantages (Token.kind) this hook can spend. */
  wants?: string[];
  /** Knowledge/insight: the result is hidden, and failure gives a plausible wrong answer (see CheckDef.hidden). */
  hidden?: boolean;
  /** Only things that carry this much to read: 'lore' = the thing has `lore` texts (a hidden read has to say something). */
  needs?: 'lore';
}

/** How one people sees another: −3 (hostile) … +3 (kin). */
export interface Rel {
  v: number;
  why: string;
}

export interface Library {
  /** kind → its parent kind (the root has none). */
  parents: Record<string, string | undefined>;
  hooks: HookDef[];
  /** Defaults for a facet or kind and everything below it (see whoChain: facets first, then kinds). */
  defaults: Record<string, { patience?: number }>;
  /** The kinds that are peoples (human, dwarf…): what 'your own kind' means. */
  peoples: string[];
  /** observer (facet or kind) → hero's kind → how the observer sees the hero. Missing = neutral; first in whoChain wins. */
  relations: Record<string, Record<string, Rel>>;
  /** The people library: facets of people and places, and what they lean (see core/people). */
  people?: PeopleLibrary;
}

/** What the hero brings to a social try. */
export interface Visitor {
  /** Kind of people: 'human', 'elf', 'dwarf'… */
  kind?: string;
  /** The specific people, e.g. 'asharier'. */
  people?: string;
  /** The hero's own facets (people library): their homeland, faith and calling. What they share with someone helps. */
  tags?: string[];
}

/** From the kind itself up to the root: ['dwarf', 'humanoid', 'creature', 'thing']. */
export function kindChain(kind: string | undefined, parents: Library['parents']): string[] {
  const chain: string[] = [];
  for (let k = kind; k && !chain.includes(k); k = parents[k]) chain.push(k);
  return chain;
}

/**
 * Everything someone is, most particular first: each of their facets with the ones above it, then
 * their kinds. Defaults and relations take the first entry that has something to say.
 */
export function whoChain(o: Pick<ObjectDef, 'kind' | 'tags'>, lib: Library): string[] {
  const facets = lib.people?.facets ?? {};
  const out = [...(o.tags ?? []).flatMap((t) => facetChain(t, facets)), ...kindChain(o.kind, lib.parents)];
  return [...new Set(out)];
}

/**
 * How particular a facet is as a reason to pick a hook: between 0.5 and 1.5, so always under 2,
 * so a kind (2 a step) outranks it however deep the facet tree grows.
 * What is happening right now (a state) beats where it happens (a setting), which beats who they are;
 * among who they are, a calling beats its group.
 */
export function facetScore(id: string, facets: PeopleLibrary['facets']): number {
  const dim = facets[id]?.dim;
  const bonus = dim === 'state' ? 0.6 : dim === 'setting' ? 0.4 : 0;
  return 0.5 + bonus + Math.min(facetChain(id, facets).length, 4) / 10;
}

/** Library hooks that apply to a thing, best match first, one per intention. */
export function hooksFor(o: Pick<ObjectDef, 'kind' | 'tags' | 'lore'>, lib: Library, place?: Setting): HookDef[] {
  const chain = kindChain(o.kind, lib.parents);
  if (!chain.includes('thing')) chain.push('thing');
  const tags = o.tags ?? [];
  const facets = lib.people?.facets ?? {};
  // Every facet that is true here, with the ones above it (a soldier is also martial).
  const have = new Set([...personFacets(o, lib), ...(place?.tags ?? [])].flatMap((f) => facetChain(f, facets)));
  const scored = lib.hooks
    .filter((h) => chain.includes(h.kind) && (!h.tag || tags.includes(h.tag)) && (!h.facet || have.has(h.facet)) && (h.needs !== 'lore' || o.lore))
    .map((h) => ({
      h,
      // The kind decides first, then a tag, then a facet (the deeper the facet, the more particular).
      score: (chain.length - chain.indexOf(h.kind)) * 2 + (h.tag ? 1 : 0) + (h.facet ? facetScore(h.facet, facets) : 0),
    }));
  // Stable sort: most specific first, library order breaks ties.
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: HookDef[] = [];
  for (const { h } of scored) {
    if (seen.has(h.intention)) continue;
    seen.add(h.intention);
    out.push(h);
  }
  // The match decides which hook answers an intention; the library's own order of intentions decides
  // the order of the list, so a particular hook does not push the general ones around.
  const rank = new Map<string, number>();
  lib.hooks.forEach((h, i) => rank.set(h.intention, Math.min(rank.get(h.intention) ?? i, i)));
  return out.sort((a, b) => (rank.get(a.intention) ?? 0) - (rank.get(b.intention) ?? 0));
}

const fill = (text: string, o: ObjectDef): string => text.replaceAll('{name}', o.name.toLowerCase()).replaceAll('{Name}', o.name);

/** Texts and flags in a library effect can use {name}, {Name} and {id} for the thing. */
function fillEffect(e: Effect, o: ObjectDef, truth = true): Effect {
  if ('say' in e) return { ...e, say: fill(e.say, o).replaceAll('{lore}', o.lore?.[truth ? 'true' : 'false'] ?? 'You cannot make much of it.') };
  if ('set' in e) return { set: e.set.replaceAll('{id}', o.id) };
  if ('unset' in e) return { unset: e.unset.replaceAll('{id}', o.id) };
  if ('mood' in e) return { mood: e.mood, who: o.id, name: o.name };
  if ('token' in e) return { token: { ...e.token, label: fill(e.token.label, o), against: e.token.against === '{id}' ? o.id : e.token.against } };
  return e;
}

/** How many social tries they put up with: their own, else from their facets, else from their kind. */
export function patienceOf(o: Pick<ObjectDef, 'kind' | 'tags' | 'patience'>, lib: Library): number | undefined {
  if (o.patience !== undefined) return o.patience;
  for (const k of whoChain(o, lib)) {
    const p = lib.defaults[k]?.patience;
    if (p !== undefined) return p;
  }
  return undefined;
}

/** Their limit right now: their patience, and for someone with a social challenge also what the game's difficulty allows outside it. */
export function limitOf(o: ObjectDef, s: SceneState, lib: Library): number | undefined {
  const p = patienceOf(o, lib);
  return p === undefined ? undefined : o.social ? Math.min(p, s.sideTalks) : p;
}

/** Social tries they'd still put up with (undefined if they don't count). */
export function talksLeftWith(o: ObjectDef, s: SceneState, lib: Library): number | undefined {
  const p = limitOf(o, s, lib);
  return p === undefined ? undefined : p - (s.social[o.id]?.talks ?? 0);
}

/** Where the meeting happens: who belongs here, and who most folk are. */
export interface Setting {
  locals?: string[];
  majority?: string;
  /** Facets of the place and the hour (people library). */
  tags?: string[];
}

/** Everything that is true of this person, as facet ids: their tags and their kinds. */
export function personFacets(o: Pick<ObjectDef, 'kind' | 'tags'>, lib: Library): string[] {
  return [...(o.tags ?? []), ...kindChain(o.kind, lib.parents)];
}

/**
 * What the people library does to an effort with a skill: what this person and this place lean, and
 * what you share with the person (people library). Positive = easier for you.
 */
export function leanOf(
  o: Pick<ObjectDef, 'kind' | 'tags'>, who: Visitor, lib: Library, place: Setting | undefined, effort: string | undefined, skill?: string,
): { v: number; notes: string[] } {
  return totalLean(who.tags ?? [], personFacets(o, lib), place?.tags ?? [], effort, skill, lib.people ?? {});
}

/**
 * How the thing sees the hero's people.
 * - The row comes from the first of their facets or kinds that has an opinion (country folk before humans).
 * - Meeting your own kind is kin (a bonus) only when you are not the majority here:
 *   two elves in a human city are kin, two humans in a human city are just neutral.
 * - A visitor from a people that doesn't belong here is a step cooler.
 */
export function disposition(o: Pick<ObjectDef, 'kind' | 'tags'>, who: Visitor, lib: Library, place: Setting = {}): Rel {
  if (!who.kind) return { v: 0, why: '' };
  const own = kindChain(o.kind, lib.parents).find((k) => lib.peoples.includes(k));
  let rel: Rel = { v: 0, why: '' };
  for (const k of whoChain(o, lib)) {
    const r = lib.relations[k]?.[who.kind];
    if (r) {
      rel = r;
      break;
    }
  }
  if (own === who.kind) {
    if (place.majority === who.kind) rel = { v: 0, why: '' };
    if (place.locals && who.people && !place.locals.includes(who.people)) return { v: rel.v - 1, why: 'you are a stranger here' };
  }
  return rel;
}

/** What the situation does to one single roll: mood, how their people see yours, and advantages you kept. They change the difficulty. */
export function situation(s: SceneState, c: CheckDef, o: ObjectDef, who: Visitor, lib: Library, place?: Setting, skill?: string): Situation {
  // What kind of person this is and where, for this kind of effort and this skill (people library).
  const lean = leanOf(o, who, lib, place, c.effort ?? c.intention, skill);
  if (!c.talk) return { shift: 0 - 2 * lean.v, spend: [], notes: lean.notes };
  const mood = s.social[c.talk.who]?.mood ?? 0;
  const rel = disposition(o, who, lib, place);
  const spend: Token[] = [];
  const notes: string[] = [...lean.notes];
  let shift = 0 - 2 * (mood + rel.v + lean.v);
  if (mood) notes.push(mood > 0 ? 'they like you' : 'they are wary of you');
  if (rel.v && rel.why) notes.push(rel.why);
  for (const t of s.tokens) {
    if (!(c.wants ?? []).includes(t.kind) || (t.against !== undefined && t.against !== c.talk.who)) continue;
    spend.push(t);
    shift -= 5 * t.n;
    notes.push(`+${t.n} advantage: ${t.label}`);
  }
  return { shift, spend, notes };
}

/**
 * The same things in a conflict, where the currency is Control (not difficulty):
 * how they feel about you and your people moves the situation by one Control a point
 * (never more than MAX_RECEPTION either way), and each kept advantage is +1 Control.
 */
export function conflictBonus(
  s: SceneState, o: ObjectDef, who: Visitor, lib: Library, place?: Setting, wants: string[] = ['social'], effort?: string,
): { control: number; notes: string[]; spend: Token[] } {
  const mood = s.social[o.id]?.mood ?? 0;
  const rel = disposition(o, who, lib, place);
  const notes: string[] = [];
  let control = Math.max(-MAX_RECEPTION, Math.min(MAX_RECEPTION, mood + rel.v));
  if (mood) notes.push(mood > 0 ? 'they like you' : 'they are wary of you');
  if (rel.v && rel.why) notes.push(rel.why);
  // The people library, for the approach's kind of effort (leanings that name particular skills need a roll, so they wait for the single rolls).
  const lean = leanOf(o, who, lib, place, effort);
  control += lean.v;
  notes.push(...lean.notes);
  const spend = s.tokens.filter((t) => wants.includes(t.kind) && (t.against === undefined || t.against === o.id));
  for (const t of spend) {
    control += t.n;
    notes.push(`+${t.n} advantage: ${t.label}`);
  }
  return { control, notes, spend };
}

/** What sizing someone up tells you: how they feel, how they see your people, how much they will take. */
export function readPerson(o: ObjectDef, s: SceneState, who: Visitor, lib: Library, place?: Setting, truthful = true): string[] {
  const out: string[] = [];
  const mem = s.social[o.id] ?? { talks: 0, mood: 0 };
  const patience = limitOf(o, s, lib);
  const rel = disposition(o, who, lib, place);
  const left = patience === undefined ? undefined : patience - mem.talks;
  if (truthful) {
    out.push(moodLine(o.name, mem, patience) ?? `${o.name} ${moodWord(0)}.`);
    if (rel.v !== 0 && rel.why) out.push(`It shows: ${rel.why}.`);
    if (left !== undefined && left > 0 && left <= 1) out.push('You would not push it much further.');
    return out;
  }
  // A misreading: a plausible picture that is wrong in every part, so nothing marks it as wrong.
  const fake = mem.mood > 0 ? -1 : mem.mood < 0 ? 1 : (s.social[o.id]?.talks ?? 0) % 2 === 0 ? 1 : -1;
  out.push(`${o.name} ${moodWord(fake)}.`);
  if (rel.v < 0) out.push('They seem quite at ease with your sort.');
  else if (rel.v > 0) out.push('It shows: they are not sure about your sort.');
  if (left !== undefined) out.push(left > 0 && left <= 1 ? 'They look as if they could talk all night.' : 'You would not push it much further.');
  return out;
}

/** A library hook as an ordinary check on this thing. */
export function instantiate(h: HookDef, o: ObjectDef, lib?: Library): CheckDef {
  const patience = lib ? patienceOf(o, lib) : o.patience;
  return {
    ...(h.social && patience !== undefined ? { talk: { who: o.id, patience, ...(o.social ? { side: true } : {}) } } : {}),
    ...(h.wants ? { wants: h.wants } : {}),
    id: `${o.id}/${h.id}`,
    intention: h.intention,
    effort: h.effort,
    label: fill(h.label, o),
    skills: [...h.skills],
    difficulty: h.difficulty,
    when: h.when,
    tries: h.tries,
    success: h.success.map((e) => fillEffect(e, o, true)),
    failure: h.failure.map((e) => fillEffect(e, o, false)),
    strong: h.strong?.map((e) => fillEffect(e, o, true)),
    ...(h.hidden ? { hidden: true } : {}),
    fromLibrary: true,
  };
}

/** Own checks first (they win for their intention), then what the library adds. */
export function expandObject(o: ObjectDef, lib: Library, place?: Setting): ObjectDef {
  const own = o.checks ?? [];
  const taken = new Set(own.map((c) => c.intention ?? c.id));
  const added = hooksFor(o, lib, place).filter((h) => !taken.has(h.intention)).map((h) => instantiate(h, o, lib));
  return added.length ? { ...o, checks: [...own, ...added] } : o;
}

export const expandScene = (def: SceneDef, lib: Library): SceneDef => ({ ...def, objects: def.objects.map((o) => expandObject(o, lib, def)) });
