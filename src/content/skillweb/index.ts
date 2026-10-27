import type { Library } from '../../core/skillweb';
import { PEOPLE_LIBRARY } from '../people';
import { HOOKS } from './hooks';
import { DEFAULTS, KIND_PARENTS, PEOPLES } from './kinds';
import { RELATIONS } from './relations';

export { KIND_PARENTS, PEOPLES, DEFAULTS } from './kinds';
export { HOOKS, PLANNED } from './hooks';

/**
 * The skill-web library (design: director/design/skill-web.md, how to add to it:
 * director/design/skill-map-handover.md).
 * - kinds.ts: what things are (the kind tree), and patience by facet or kind;
 * - tags.ts + examples.ts (+ the per-skill files): which skills fit which kind of effort;
 * - hooks/<effort>.ts: what each effort does to people and things;
 * - relations.ts: how peoples see each other; content/people: facets, leanings and kinship.
 */
export const LIBRARY: Library = {
  parents: KIND_PARENTS,
  hooks: HOOKS,
  defaults: DEFAULTS,
  peoples: PEOPLES,
  relations: RELATIONS,
  people: PEOPLE_LIBRARY,
};
