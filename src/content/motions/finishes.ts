import type { Motion, MotionKey } from '../../core/world3d/motion';

/**
 * The killing stroke (the act `finish`): given to someone lying senseless at the striker's feet, so every one of them
 * goes **down**, with a held breath before it and the whole body bent over the blow (the knees give by themselves as
 * the body drops: `lift`). One for each way a weapon moves (the director, 2026-11-17), each starting and ending on the
 * weapon's own guard:
 *  - a sword is turned point down, raised, and driven straight down;
 *  - an axe, a mace, a great weapon is swung up from behind and brought down on them;
 *  - a spear or a staff is lifted upright in both hands, point down, and thrust down;
 *  - with bare hands, a fist brought down from over the shoulder.
 * Where a weapon points is the sum of the turns about x down the trunk and arm (spine, chest, shoulder, elbow, wrist):
 * about −1.6 is straight up, 0 level ahead, +1.57 straight down. The wrist takes whatever turn is left, so its
 * numbers are large when the arm is high. The blow lands at `contact`.
 */

/** Lifted upright in both hands, the point down over them, then driven down with the body's weight. */
const stabDown: MotionKey[] = [
  { at: 0, base: 1, joints: {} },
  { at: 0.3, joints: { shoulderR: [-1.9, 0, 0], elbowR: [-1.3, 0, 0], wristR: [4.55, 0.2, 0], spine: [-0.02, -0.1, 0], chest: [-0.03, -0.05, 0] }, lift: 0.01 },
  { at: 0.48, joints: { shoulderR: [-2.0, 0, 0], elbowR: [-1.3, 0, 0], wristR: [4.7, 0.2, 0], spine: [-0.05, -0.1, 0], chest: [-0.05, -0.05, 0] }, lift: 0.015 },
  { at: 0.7, ease: 'in', joints: { shoulderR: [-0.6, 0, 0.05], elbowR: [-1.1, 0, 0], wristR: [2.5, 0.1, 0], spine: [0.45, 0.05, 0], chest: [0.15, 0.05, 0] }, lift: -0.06 },
  { at: 0.86, joints: { shoulderR: [-0.6, 0, 0.05], elbowR: [-1.1, 0, 0], wristR: [2.5, 0.1, 0], spine: [0.45, 0.05, 0], chest: [0.15, 0.05, 0] }, lift: -0.06 },
  { at: 1, base: 1, joints: {} },
];

export default [
  {
    // A sword (and anything with no finish of its own): the point turned down, raised high, a breath, then plunged.
    id: 'finish', act: 'finish', seconds: 1.4, part: 'upper', then: 'guard', marks: { contact: 0.7 },
    keys: [
      { at: 0, base: 1, joints: {} },
      { at: 0.3, joints: { shoulderR: [-2.4, 0, -0.05], elbowR: [-1.2, 0, 0], wristR: [4.9, 0, 0], spine: [-0.06, -0.15, 0], chest: [-0.04, -0.1, 0] }, lift: 0.01 },
      { at: 0.48, joints: { shoulderR: [-2.5, 0, -0.05], elbowR: [-1.2, 0, 0], wristR: [5.05, 0, 0], spine: [-0.1, -0.15, 0], chest: [-0.05, -0.1, 0] }, lift: 0.015 },
      { at: 0.7, ease: 'in', joints: { shoulderR: [-0.7, 0, 0.1], elbowR: [-0.6, 0, 0], wristR: [1.95, 0, 0], spine: [0.55, 0.1, 0], chest: [0.15, 0.1, 0] }, lift: -0.06 },
      { at: 0.86, joints: { shoulderR: [-0.7, 0, 0.1], elbowR: [-0.6, 0, 0], wristR: [1.95, 0, 0], spine: [0.55, 0.1, 0], chest: [0.15, 0.1, 0] }, lift: -0.06 },
      { at: 1, base: 1, joints: {} },
    ],
  },
  {
    // An axe, a mace: swung up from behind the shoulder and brought down on them with everything.
    id: 'finish-axe-mace', act: 'finish', way: 'axe-mace', seconds: 1.4, part: 'upper', then: 'guard', marks: { contact: 0.7 },
    keys: [
      { at: 0, base: 1, joints: {} },
      { at: 0.3, joints: { shoulderR: [-2.8, 0, -0.2], elbowR: [-0.7, 0, 0], wristR: [0.3, 0, 0], spine: [-0.2, -0.25, 0], chest: [-0.1, -0.15, 0] }, lift: 0.01 },
      { at: 0.48, joints: { shoulderR: [-2.9, 0, -0.2], elbowR: [-0.7, 0, 0], wristR: [0.2, 0, 0], spine: [-0.24, -0.27, 0], chest: [-0.1, -0.15, 0] }, lift: 0.015 },
      { at: 0.7, ease: 'in', joints: { shoulderR: [-0.6, 0, 0.1], elbowR: [-0.1, 0, 0], wristR: [1.0, 0, 0], spine: [0.6, 0.2, 0], chest: [0.15, 0.15, 0] }, lift: -0.07 },
      { at: 0.86, joints: { shoulderR: [-0.6, 0, 0.1], elbowR: [-0.1, 0, 0], wristR: [1.0, 0, 0], spine: [0.6, 0.2, 0], chest: [0.15, 0.15, 0] }, lift: -0.07 },
      { at: 1, base: 1, joints: {} },
    ],
  },
  {
    // A greatsword, a great axe, a long hammer: both hands back over the head, then the whole weight down.
    id: 'finish-two-hander', act: 'finish', way: 'two-hander', seconds: 1.6, part: 'upper', then: 'guard', marks: { contact: 0.68 },
    keys: [
      { at: 0, base: 1, joints: {} },
      { at: 0.32, joints: { shoulderR: [-2.5, 0.25, 0.1], elbowR: [-0.9, 0, 0], wristR: [0.6, 0.1, 0], spine: [-0.12, -0.1, 0], chest: [-0.08, -0.1, 0] }, lift: 0.01 },
      { at: 0.5, joints: { shoulderR: [-2.6, 0.25, 0.1], elbowR: [-0.9, 0, 0], wristR: [0.5, 0.1, 0], spine: [-0.16, -0.1, 0], chest: [-0.1, -0.1, 0] }, lift: 0.02 },
      { at: 0.68, ease: 'in', joints: { shoulderR: [-0.8, 0.25, 0.15], elbowR: [-0.3, 0, 0], wristR: [1.45, 0.1, 0], spine: [0.6, 0.1, 0], chest: [0.15, 0.1, 0] }, lift: -0.08 },
      { at: 0.86, joints: { shoulderR: [-0.8, 0.25, 0.15], elbowR: [-0.3, 0, 0], wristR: [1.45, 0.1, 0], spine: [0.6, 0.1, 0], chest: [0.15, 0.1, 0] }, lift: -0.08 },
      { at: 1, base: 1, joints: {} },
    ],
  },
  { id: 'finish-spear', act: 'finish', way: 'spear', seconds: 1.4, part: 'upper', then: 'guard', marks: { contact: 0.7 }, keys: stabDown },
  { id: 'finish-staff', act: 'finish', way: 'staff', seconds: 1.4, part: 'upper', then: 'guard', marks: { contact: 0.7 }, keys: stabDown },
  {
    // Bare hands: the fist drawn up by the ear, then dropped on them, the body going down with it.
    id: 'finish-hands', act: 'finish', way: 'hands', seconds: 1.1, part: 'upper', then: 'guard', marks: { contact: 0.65 },
    keys: [
      { at: 0, base: 1, joints: {} },
      { at: 0.35, joints: { shoulderR: [-0.9, 0, -0.3], elbowR: [-2.3, 0, 0], spine: [-0.05, -0.25, 0], chest: [-0.05, -0.2, 0] }, lift: 0.01 },
      { at: 0.65, ease: 'in', joints: { shoulderR: [-0.7, 0, 0.1], elbowR: [-0.25, 0, 0], spine: [0.75, 0.2, 0], chest: [0.2, 0.2, 0] }, lift: -0.1 },
      { at: 0.82, joints: { shoulderR: [-0.7, 0, 0.1], elbowR: [-0.25, 0, 0], spine: [0.75, 0.2, 0], chest: [0.2, 0.2, 0] }, lift: -0.1 },
      { at: 1, base: 1, joints: {} },
    ],
  },
] satisfies Motion[];
