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
    { at: 0.35, joints: { shoulderL: GUARD_ARMS.shoulderL, elbowL: GUARD_ARMS.elbowL, shoulderR: [-2.7, 0, -0.2], elbowR: [-0.7, 0, 0], wristR: [-0.45, 0, 0], spine: [-0.04, -0.15, 0], chest: [-0.04, -0.2, 0] } },
    // The blow speeds up all the way in and stops dead (`ease: 'in'`), the wrist snapping the blade through.
    { at: 0.6, ease: 'in', joints: { shoulderL: GUARD_ARMS.shoulderL, elbowL: GUARD_ARMS.elbowL, shoulderR: [-0.9, 0, 0.15], elbowR: [-0.15, 0, 0], wristR: [0.5, 0, 0], spine: [0.1, 0.15, 0], chest: [0.06, 0.2, 0] } },
    { at: 1, joints: GUARD_ARMS },
  ],
  then: 'guard',
  marks: { contact: 0.6 },
} satisfies Motion;
