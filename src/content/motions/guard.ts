import type { Motion } from '../../core/world3d/motion';
import { WIELD_ARM } from '../people/poses';

/**
 * On guard, for any weapon: the weapon arm held up in front, the left arm forward and bent. Laid over what the legs do,
 * so a fighter walks on guard. Held until something else plays.
 */
export const GUARD_ARMS = { ...WIELD_ARM, shoulderL: [-0.3, 0, 0.25], elbowL: [-0.9, 0, 0] } as const;

export default {
  id: 'guard',
  act: 'guard',
  seconds: 0,
  part: 'upper',
  keys: [{ at: 0, joints: GUARD_ARMS }],
  then: 'hold',
} satisfies Motion;
