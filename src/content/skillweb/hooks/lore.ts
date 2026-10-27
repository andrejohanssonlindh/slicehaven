import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { LORE, READ, effortHooks, say } from './helpers';

/**
 * Recall lore, on things of nature: what you know about this rock, plant, animal or water. Hidden reads
 * (see helpers READ): only on things that carry lore, and you cannot tell if the answer is right.
 * `only` keeps the book-learned lore skills that know nature; `also` adds the practical people who
 * know it from work. (A wall is read with craft, a lock with pick, a trail with track: their own files.)
 */
const lore = effortHooks('lore', { ...READ, layer: 2, difficulty: DIFFICULTY.tricky });

export const LORE_HOOKS: HookDef[] = [
  lore.forKind('rock', 'Study {name}',
    [say('You study the {name} with a trained eye. {lore}')], [say('You study the {name} with a trained eye. {lore}')],
    { only: ['Naturlära', 'E:Bergskunskap'] }),
  lore.forKind('plant', 'Study the {name}', LORE, LORE, {
    only: ['Naturlära'],
    also: ['Vildmarksvana', 'E:Huskurer', 'Gifter & droger', 'H:Trädgårdsmästare', 'H:Florist', 'H:Jordbrukare'],
  }),
  lore.forKind('animal', 'Watch the {name}', LORE, LORE, {
    only: ['Naturlära', 'E:Monsterkunskap'],
    also: ['Jakt & fiske', 'Spåra', 'E:Djurträning', 'H:Herde', 'H:Avlare'],
  }),
  lore.forKind('water', 'Look at the {name}', LORE, LORE, {
    only: ['Naturlära'],
    also: ['Vildmarksvana', 'Sjömannaskap', 'Simma', 'Jakt & fiske', 'E:Navigation'],
  }),
];
