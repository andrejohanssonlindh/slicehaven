import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { LORE, READ, effortHooks, flag, say } from './helpers';

/** Pick locks: opening locks and catches without the key, quietly. Reading a lock is the same knowledge. */
const pick = effortHooks('pick', { layer: 2, difficulty: DIFFICULTY.hard });

export const PICK: HookDef[] = [
  pick.forKind('lock', 'Pick the {name}',
    [say('The {name} gives with a small, clean click.', 'good'), flag('opened')],
    [say('The pick slips, and the {name} stays shut.', 'bad')], { tries: 3 }),
  pick.forKind('lock', 'Look closely at the {name}', LORE, LORE, { ...READ, difficulty: DIFFICULTY.tricky }),
];
