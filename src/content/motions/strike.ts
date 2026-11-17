import type { Motion } from '../../core/world3d/motion';

/**
 * A strike with a one-handed weapon (a sword; any weapon with no strike of its own): from the guard, up over the right
 * shoulder with the blade laid back, down through the blow as the wrist snaps it forward and the body turns in, then
 * back on guard. Only the weapon arm and the trunk are said: the other arm keeps its guard. The blow lands at `contact`.
 */
export default {
  id: 'strike',
  act: 'strike',
  seconds: 0.7,
  part: 'upper',
  keys: [
    { at: 0, base: 1, joints: {} },
    { at: 0.35, joints: { shoulderR: [-2.7, 0, -0.2], elbowR: [-0.7, 0, 0], wristR: [-0.45, 0, 0], spine: [0.02, -0.12, 0], chest: [-0.04, -0.2, 0] } },
    // The blow speeds up all the way in and stops dead (`ease: 'in'`).
    { at: 0.6, ease: 'in', joints: { shoulderR: [-0.9, 0, 0.15], elbowR: [-0.15, 0, 0], wristR: [0.55, 0, 0], spine: [0.16, 0.15, 0], chest: [0.08, 0.2, 0] } },
    { at: 1, base: 1, joints: {} },
  ],
  then: 'guard',
  marks: { contact: 0.6 },
} satisfies Motion;
