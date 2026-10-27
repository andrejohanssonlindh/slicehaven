import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { effortHooks, flag, say } from './helpers';

/** Climb: getting up and over things. A rock can always be climbed, useful or not. */
const climb = effortHooks('climb', { layer: 2, difficulty: DIFFICULTY.tricky });

export const CLIMB: HookDef[] = [
  climb.forKind('rock', 'Climb {name}',
    [say('You scramble up the {name} and look around from the top.')],
    [say('You slip off the {name} and land in the grass.')]),
  climb.forKind('wall', 'Climb the {name}',
    [say('You work your way up the {name}, hand and foot, and look about from the top.', 'good'), flag('climbed')],
    [say('You slip on the {name} and slide back down.', 'bad')],
    { difficulty: DIFFICULTY.hard }),
  climb.forKind('tree', 'Climb the {name}',
    [say('You haul yourself up through the branches of the {name} and look about.', 'good'), flag('climbed')],
    [say('A branch gives way and you drop back to the ground.', 'bad')]),
];
