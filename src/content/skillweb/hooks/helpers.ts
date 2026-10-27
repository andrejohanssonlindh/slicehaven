import type { Effect } from '../../../core/scene';
import type { HookDef } from '../../../core/skillweb';
import { skillsWith } from '../tags';

/**
 * Building blocks for library hooks. Every effort file (hooks/<effort>.ts) starts with
 * `const x = effortHooks('<effort>', { …what all its hooks share })` and then lists
 * `x.general(…)`, `x.forFacet(…)` and `x.forKind(…)`. See director/design/skill-map-handover.md.
 */

export const say = (text: string, tone?: 'good' | 'bad'): Effect => ({ say: text, tone });

/** A kept advantage against this person or thing, for a later try that wants this kind (an effort, or 'social' for any talk). */
export const keep = (kind: string, n: number, label: string): Effect => ({ token: { kind, n, against: '{id}', label } });

/** A flag naming the thing (`climbed:{id}`), for the scene to wait for. */
export const flag = (name: string): Effect => ({ set: `${name}:{id}` });

/** What every talking try shares: it costs one of their talks, and a kept social advantage helps it. */
export const TALK: HookSpec = { social: true, wants: ['social'] };

/** A hidden read of a thing: an answer either way (its lore, or the plausible wrong twin). Only on things that carry lore. */
export const READ = { intention: 'study', hidden: true, needs: 'lore' } as const;
export const LORE: Effect[] = [say('{lore}')];

/** How a hook is written: everything but the effort, which the file gives, and the skills, which come from the tag. */
export interface HookSpec extends Partial<Omit<HookDef, 'effort' | 'skills'>> {
  /** Narrow the effort's skills to these (each must carry the tag). Default: every skill with the tag. */
  only?: string[];
}

type Results = [label: string, success: Effect[], failure: Effect[], over?: HookSpec];

/**
 * The hooks for one kind of effort. Ids follow the intention: `ask` (general), `ask-clergy`
 * (for a facet), `climb-wall` (for a kind of thing), so they stay stable for translation keys.
 *
 * - `general`: the hook for the base kind (by default anyone humanoid).
 * - `forFacet`: the same try, answered differently by a kind of person or place (a facet). The
 *   deeper the facet the better it matches; a state beats a setting beats who they are.
 * - `forKind`: the try on a kind of thing (a wall, a lock, a trail).
 */
export function effortHooks(effort: string, base: HookSpec & { difficulty: number }) {
  const make = (spec: HookSpec & { label: string; success: Effect[]; failure: Effect[] }): HookDef => {
    const { only, ...s } = { ...base, ...spec };
    const intention = s.intention ?? effort;
    const where = spec.facet ?? (spec.kind && spec.kind !== base.kind ? spec.kind : undefined);
    return {
      layer: 1,
      kind: 'humanoid',
      ...s,
      id: s.id ?? (where ? `${intention}-${where}` : intention),
      effort,
      intention,
      skills: [...(only ?? skillsWith(effort)), ...(s.also ?? [])],
    };
  };
  return {
    general: (...[label, success, failure, over]: Results): HookDef => make({ ...over, label, success, failure }),
    forFacet: (facet: string, ...[label, success, failure, over]: Results): HookDef => make({ ...over, facet, label, success, failure }),
    forKind: (kind: string, ...[label, success, failure, over]: Results): HookDef => make({ ...over, kind, label, success, failure }),
  };
}
