import type { Motion } from '../../core/world3d/motion';
import { GUARD_ARMS } from './guard';

/**
 * A strike, for any weapon (the first one, from B8a): up over the right shoulder for the first third, down through the
 * blow, then back on guard. The blow lands at `contact`.
 */
export default {
  id: 'strike',
  act: 'strike',
  seconds: 0.7,
  part: 'upper',
  keys: [
    { at: 0, joints: GUARD_ARMS },
    { at: 0.35, joints: { shoulderL: GUARD_ARMS.shoulderL, elbowL: GUARD_ARMS.elbowL, shoulderR: [-2.7, 0, -0.2], elbowR: [-0.7, 0, 0], spine: [0, -0.25, 0] } },
    { at: 0.6, joints: { shoulderL: GUARD_ARMS.shoulderL, elbowL: GUARD_ARMS.elbowL, shoulderR: [-0.9, 0, 0.15], elbowR: [-0.15, 0, 0], spine: [0.12, 0.3, 0] } },
    { at: 1, joints: GUARD_ARMS },
  ],
  then: 'guard',
  marks: { contact: 0.6 },
} satisfies Motion;
