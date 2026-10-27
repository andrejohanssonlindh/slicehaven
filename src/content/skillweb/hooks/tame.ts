import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { effortHooks, flag, say } from './helpers';

/** Handle animals: calming, leading and training them. */
const tame = effortHooks('tame', { layer: 2, difficulty: DIFFICULTY.tricky });

export const TAME: HookDef[] = [
  tame.forKind('animal', 'Calm the {name}',
    [say('The {name} settles, and lets you come near.', 'good'), flag('calmed')],
    [say('The {name} shies from you.', 'bad')]),
];
