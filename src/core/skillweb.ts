import type { CheckDef, Effect, ObjectDef, SceneDef } from './scene';

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
}

export interface Library {
  /** kind → its parent kind (the root has none). */
  parents: Record<string, string | undefined>;
  hooks: HookDef[];
}

/** From the kind itself up to the root: ['dwarf', 'humanoid', 'creature', 'thing']. */
export function kindChain(kind: string | undefined, parents: Library['parents']): string[] {
  const chain: string[] = [];
  for (let k = kind; k && !chain.includes(k); k = parents[k]) chain.push(k);
  return chain;
}

/** Strong success: this many advantages over the difficulty. */
export const STRONG_AT = 2;

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
  return e;
}

/** A library hook as an ordinary check on this thing. */
export function instantiate(h: HookDef, o: ObjectDef): CheckDef {
  return {
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
  const added = hooksFor(o, lib).filter((h) => !taken.has(h.intention)).map((h) => instantiate(h, o));
  return added.length ? { ...o, checks: [...own, ...added] } : o;
}

export const expandScene = (def: SceneDef, lib: Library): SceneDef => ({ ...def, objects: def.objects.map((o) => expandObject(o, lib)) });
