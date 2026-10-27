import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { effortHooks } from './helpers';

/**
 * Read people: seeing what someone is really like. The slot is called 'size-up' because the engine
 * knows it by that name: the reading itself comes from readPerson (core/skillweb), true on success and
 * a plausible wrong one on failure. Observation costs no talk and does not make them like you less.
 */
const read = effortHooks('read-people', { intention: 'size-up', difficulty: DIFFICULTY.hard, hidden: true });

export const READ_PEOPLE: HookDef[] = [
  // Nothing here may tell success from failure.
  read.general('Size up {name}', [{ set: 'read:{id}' }], [{ set: 'read:{id}' }]),
];
