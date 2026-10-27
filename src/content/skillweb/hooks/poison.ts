import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { LORE, READ, effortHooks } from './helpers';

/** Poisons & drugs: brewing, spotting and countering what harms or dulls. */
const poison = effortHooks('poison', { layer: 2, difficulty: DIFFICULTY.tricky });

export const POISON: HookDef[] = [
  poison.forKind('food', 'Check the {name} for poison', LORE, LORE, READ),
];
