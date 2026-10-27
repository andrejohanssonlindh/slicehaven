import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { effortHooks, flag, say } from './helpers';

/** Jump: clearing gaps and obstacles. */
const jump = effortHooks('jump', { layer: 2, difficulty: DIFFICULTY.hard });

export const JUMP: HookDef[] = [
  jump.forKind('gap', 'Jump the {name}',
    [say('You clear the {name} and land running.', 'good'), flag('crossed')],
    [say('You come up short and land hard.', 'bad')]),
];
