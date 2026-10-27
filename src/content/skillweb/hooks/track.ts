import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { LORE, READ, effortHooks, flag, say } from './helpers';

/** Track: following, or reading, what has passed. Two slots of one effort on a trail. */
const track = effortHooks('track', { layer: 2, difficulty: DIFFICULTY.tricky });

export const TRACK: HookDef[] = [
  track.forKind('trail', 'Follow the {name}',
    [say('You keep to the {name} and it does not lose you.', 'good'), flag('followed')],
    [say('You lose the {name} in the undergrowth.', 'bad')]),
  track.forKind('trail', 'Read the {name}', LORE, LORE, READ),
];
