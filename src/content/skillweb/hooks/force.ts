import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { effortHooks, flag, say } from './helpers';

/** Force: breaking, bending and forcing things open by strength. It works, and it is loud (`noisy:{id}`). */
const force = effortHooks('force', { layer: 2, difficulty: DIFFICULTY.hard });

export const FORCE: HookDef[] = [
  force.forKind('door', 'Force the {name}',
    [say('The {name} gives with a crack.', 'good'), flag('forced')],
    [say('The {name} holds, and the noise carries.', 'bad')], { tries: 3 }),
  force.forKind('lock', 'Break the {name}',
    [say('The {name} breaks, loudly.', 'good'), flag('opened'), flag('noisy')],
    [say('The {name} holds, and you have made a great deal of noise.', 'bad')], { difficulty: DIFFICULTY.veryHard, tries: 2 }),
  force.forKind('container', 'Break open the {name}',
    [say('The {name} splits open, and it will not close again.', 'good'), flag('opened'), flag('noisy')],
    [say('The {name} holds.', 'bad')]),
];
