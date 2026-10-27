import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { effortHooks, flag, say } from './helpers';

/** Forage: finding food, water and shelter in the wild. Success sets `foraged:{id}` (or `snared:{id}`). */
const forage = effortHooks('forage', { layer: 2, difficulty: DIFFICULTY.tricky });

export const FORAGE: HookDef[] = [
  forage.forKind('plant', 'Gather what you can from the {name}',
    [say('You gather what is good, and leave the rest to grow.', 'good'), flag('foraged')],
    [say('You find little worth taking, and cannot be sure you passed nothing.')]),
  forage.forKind('animal', 'Set a snare for the {name}',
    [say('A good snare, set where it runs. You will know by morning.', 'good'), flag('snared')],
    [say('You set it, but not well; the {name} is unlikely to oblige.')], { difficulty: DIFFICULTY.hard }),
  forage.forKind('water', 'Fish in the {name}',
    [say('A fair catch from the {name}.', 'good'), flag('foraged')], [say('The {name} gives you nothing.')]),
];
