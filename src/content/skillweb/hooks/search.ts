import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { effortHooks, flag, say } from './helpers';

/**
 * Search: finding what is hidden or out of place. A general search finds "nothing out of place",
 * because a thing that hides something has a search check of its own, which wins (a test checks).
 */
const search = effortHooks('search', { layer: 2, difficulty: DIFFICULTY.tricky });

const nothing = (kind: string, label: string): HookDef => search.forKind(kind, label,
  [say('You go over the {name} carefully and find nothing out of place.'), flag('searched')],
  [say('You look the {name} over, and find nothing. You cannot be sure you have missed nothing.')]);

export const SEARCH: HookDef[] = [
  nothing('wall', 'Look the {name} over for loose stones and gaps'),
  nothing('door', 'Look the {name} over for a hidden catch'),
  nothing('container', 'Search the {name}'),
];
