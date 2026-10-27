import { type CheckDef, type Effect, type ObjectDef, type SceneDef, type SceneState, type Situation, type Token, moodLine, moodWord } from './scene';
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
 * The library is data (content/skillweb). `expandScene` copies the matching hooks
 * onto each object as ordinary checks, so everything that already reads `checks`
 * (useful skills, use-a-skill-where-you-stand, hints) works unchanged.
 */

/** One reusable skill use for a kind of thing. */
export interface HookDef {
  /** Unique in the library; the instance on an object is `<object id>/<hook id>`. */
  id: string;
  /** Kind of thing it applies to; children of that kind inherit it. */
  kind: string;
  /** 1 = standard (broad kinds), 2 = object related. Informational: precedence comes from the kind tree. */
  layer: 1 | 2;
  /** What you're trying to get done. One result per intention on a thing. */
  intention: string;
  /** Only things with this tag (e.g. 'rich', 'poor'). */
  tag?: string;
  label: string;
  /** Reasonable skills (and attr:… ids). */
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
  /** Defaults for a kind and everything below it (the most specific kind wins). */
  kindDefaults: Record<string, { patience?: number }>;
  /** The kinds that are peoples (human, dwarf…): what 'your own kind' means. */
  peoples: string[];
  /** observer kind → hero's kind → how the observer sees the hero. Missing = neutral; a more specific observer kind wins. */
  relations: Record<string, Record<string, Rel>>;
}

/** What the hero brings to a social try. */
export interface Visitor {
  /** Kind of people: 'human', 'elf', 'dwarf'… */
  kind?: string;
  /** The specific people, e.g. 'asharier'. */
  people?: string;
}

/** From the kind itself up to the root: ['dwarf', 'humanoid', 'creature', 'thing']. */
export function kindChain(kind: string | undefined, parents: Library['parents']): string[] {
  const chain: string[] = [];
  for (let k = kind; k && !chain.includes(k); k = parents[k]) chain.push(k);
  return chain;
}

/** Library hooks that apply to a thing, best match first, one per intention. */
export function hooksFor(o: Pick<ObjectDef, 'kind' | 'tags'>, lib: Library): HookDef[] {
  const chain = kindChain(o.kind, lib.parents);
  if (!chain.includes('thing')) chain.push('thing');
  const tags = o.tags ?? [];
  const scored = lib.hooks
    .filter((h) => chain.includes(h.kind) && (!h.tag || tags.includes(h.tag)))
    .map((h) => ({ h, score: (chain.length - chain.indexOf(h.kind)) * 2 + (h.tag ? 1 : 0) }));
  // Stable sort: most specific first, library order breaks ties.
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: HookDef[] = [];
  for (const { h } of scored) {
    if (seen.has(h.intention)) continue;
    seen.add(h.intention);
    out.push(h);
  }
  return out;
}

const fill = (text: string, o: ObjectDef): string => text.replaceAll('{name}', o.name.toLowerCase()).replaceAll('{Name}', o.name);

/** Texts and flags in a library effect can use {name}, {Name} and {id} for the thing. */
function fillEffect(e: Effect, o: ObjectDef): Effect {
  if ('say' in e) return { ...e, say: fill(e.say, o) };
  if ('set' in e) return { set: e.set.replaceAll('{id}', o.id) };
  if ('unset' in e) return { unset: e.unset.replaceAll('{id}', o.id) };
  if ('mood' in e) return { mood: e.mood, who: o.id, name: o.name };
  if ('token' in e) return { token: { ...e.token, label: fill(e.token.label, o), against: e.token.against === '{id}' ? o.id : e.token.against } };
  return e;
}

/** How many social tries they put up with: their own, else from the most specific kind. */
export function patienceOf(o: Pick<ObjectDef, 'kind' | 'patience'>, lib: Library): number | undefined {
  if (o.patience !== undefined) return o.patience;
  for (const k of kindChain(o.kind, lib.parents)) {
    const p = lib.kindDefaults[k]?.patience;
    if (p !== undefined) return p;
  }
  return undefined;
}

/** Social tries they'd still put up with (undefined if they don't count). */
export function talksLeftWith(o: ObjectDef, s: SceneState, lib: Library): number | undefined {
  const p = patienceOf(o, lib);
  return p === undefined ? undefined : p - (s.social[o.id]?.talks ?? 0);
}

/** Where the meeting happens: who belongs here, and who most folk are. */
export interface Setting {
  locals?: string[];
  majority?: string;
}

/**
 * How the thing sees the hero's people.
 * - The row comes from the most specific kind that has an opinion (a rural human before a human).
 * - Meeting your own kind is kin (a bonus) only when you are not the majority here:
 *   two elves in a human city are kin, two humans in a human city are just neutral.
 * - A visitor from a people that doesn't belong here is a step cooler.
 */
export function disposition(o: Pick<ObjectDef, 'kind'>, who: Visitor, lib: Library, place: Setting = {}): Rel {
  if (!who.kind) return { v: 0, why: '' };
  const chain = kindChain(o.kind, lib.parents);
  const own = chain.find((k) => lib.peoples.includes(k));
  let rel: Rel = { v: 0, why: '' };
  for (const k of chain) {
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
export function situation(s: SceneState, c: CheckDef, o: ObjectDef, who: Visitor, lib: Library, place?: Setting): Situation {
  if (!c.talk) return { shift: 0, spend: [], notes: [] };
  const mood = s.social[c.talk.who]?.mood ?? 0;
  const rel = disposition(o, who, lib, place);
  const spend: Token[] = [];
  const notes: string[] = [];
  let shift = -2 * (mood + rel.v);
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
  s: SceneState, o: ObjectDef, who: Visitor, lib: Library, place?: Setting, wants: string[] = ['social'],
): { control: number; notes: string[]; spend: Token[] } {
  const mood = s.social[o.id]?.mood ?? 0;
  const rel = disposition(o, who, lib, place);
  const notes: string[] = [];
  let control = Math.max(-MAX_RECEPTION, Math.min(MAX_RECEPTION, mood + rel.v));
  if (mood) notes.push(mood > 0 ? 'they like you' : 'they are wary of you');
  if (rel.v && rel.why) notes.push(rel.why);
  const spend = s.tokens.filter((t) => wants.includes(t.kind) && (t.against === undefined || t.against === o.id));
  for (const t of spend) {
    control += t.n;
    notes.push(`+${t.n} advantage: ${t.label}`);
  }
  return { control, notes, spend };
}

/** What sizing someone up tells you: how they feel, how they see your people, how much they will take. */
export function readPerson(o: ObjectDef, s: SceneState, who: Visitor, lib: Library, place?: Setting): string[] {
  const out: string[] = [];
  const mem = s.social[o.id];
  const patience = patienceOf(o, lib);
  out.push(moodLine(o.name, mem ?? { talks: 0, mood: 0 }, patience) ?? `${o.name} ${moodWord(0)}.`);
  const rel = disposition(o, who, lib, place);
  if (rel.v < 0 && rel.why) out.push(`It shows: ${rel.why}.`);
  else if (rel.v > 0 && rel.why) out.push(`It shows: ${rel.why}.`);
  if (patience !== undefined) {
    const left = patience - (mem?.talks ?? 0);
    if (left <= 1 && left > 0) out.push('You would not push it much further.');
  }
  return out;
}

/** A library hook as an ordinary check on this thing. */
export function instantiate(h: HookDef, o: ObjectDef, lib?: Library): CheckDef {
  const patience = lib ? patienceOf(o, lib) : o.patience;
  return {
    ...(h.social && patience !== undefined ? { talk: { who: o.id, patience } } : {}),
    ...(h.wants ? { wants: h.wants } : {}),
    id: `${o.id}/${h.id}`,
    intention: h.intention,
    label: fill(h.label, o),
    skills: [...h.skills],
    difficulty: h.difficulty,
    when: h.when,
    tries: h.tries,
    success: h.success.map((e) => fillEffect(e, o)),
    failure: h.failure.map((e) => fillEffect(e, o)),
    strong: h.strong?.map((e) => fillEffect(e, o)),
    fromLibrary: true,
  };
}

/** Own checks first (they win for their intention), then what the library adds. */
export function expandObject(o: ObjectDef, lib: Library): ObjectDef {
  const own = o.checks ?? [];
  const taken = new Set(own.map((c) => c.intention ?? c.id));
  const added = hooksFor(o, lib).filter((h) => !taken.has(h.intention)).map((h) => instantiate(h, o, lib));
  return added.length ? { ...o, checks: [...own, ...added] } : o;
}

export const expandScene = (def: SceneDef, lib: Library): SceneDef => ({ ...def, objects: def.objects.map((o) => expandObject(o, lib)) });
