import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { effortHooks, flag, say } from './helpers';

/** Swim: staying afloat and getting across water. */
const swim = effortHooks('swim', { layer: 2, difficulty: DIFFICULTY.tricky });

export const SWIM: HookDef[] = [
  swim.forKind('water', 'Swim the {name}',
    [say('You cross the {name}, cold and wet but whole.', 'good'), flag('crossed')],
    [say('The current takes you downstream, and you come ashore wet, cold and some way off.', 'bad')]),
];
