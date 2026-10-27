import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { effortHooks, flag, keep, say } from './helpers';

/** Heal: tending wounds and illness. Not a social try (it costs no talk), but it lifts their mood and is remembered. */
const heal = effortHooks('heal', { layer: 2, difficulty: DIFFICULTY.tricky });

export const HEAL: HookDef[] = [
  heal.forFacet('ill', 'Tend {name}',
    [say('{Name} breathes easier under your hands.', 'good'), { mood: 2 }, flag('tended'), keep('social', 1, 'you tended {name}')],
    [say('{Name} winces, and you stop.'), { mood: -1 }]),
];
