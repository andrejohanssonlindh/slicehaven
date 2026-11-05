import type { Motion, MotionKey } from '../../core/world3d/motion';
import { GUARD_ARMS } from './guard';

/**
 * Meeting a blow (plan B8g, F1): parry (a weapon or the arm turns it aside), block (a shield takes it) and dodge (the
 * body is simply not there). Each has a `contact` where the blow arrives. A parry is one for any one-handed weapon, with
 * their own for the weapons held in two hands and for bare hands.
 */

// Held across the body in both hands, a staff, spear or two-hander meets the blow flat and crossways.
const twoHandedMeet: MotionKey[] = [
  { at: 0, joints: GUARD_ARMS },
  { at: 0.3, joints: { shoulderR: [-1.15, 0, 0.3], elbowR: [-0.8, 0, 0], shoulderL: [-1.1, 0, -0.1], elbowL: [-0.7, 0, 0], spine: [0, 0.12, 0] } },
  { at: 0.5, joints: { shoulderR: [-1.1, 0, 0.3], elbowR: [-0.8, 0, 0], shoulderL: [-1.05, 0, -0.1], elbowL: [-0.7, 0, 0], spine: [-0.03, 0.1, 0] } },
  { at: 1, joints: GUARD_ARMS },
];

const twoHanded = (id: string, way: 'staff' | 'spear' | 'two-hander'): Motion =>
  ({ id, act: 'parry', way, seconds: 0.55, part: 'upper', then: 'guard', marks: { contact: 0.3 }, keys: twoHandedMeet });

export default [
  {
    // The weapon arm sweeps across the body to meet the blow, a small jolt as it lands.
    id: 'parry', act: 'parry', seconds: 0.5, part: 'upper', then: 'guard', marks: { contact: 0.3 },
    keys: [
      { at: 0, joints: GUARD_ARMS },
      { at: 0.3, joints: { shoulderL: GUARD_ARMS.shoulderL, elbowL: GUARD_ARMS.elbowL, shoulderR: [-1.0, 0, 0.45], elbowR: [-0.9, 0, 0], spine: [0, 0.18, 0] } },
      { at: 0.45, joints: { shoulderL: GUARD_ARMS.shoulderL, elbowL: GUARD_ARMS.elbowL, shoulderR: [-1.0, 0, 0.4], elbowR: [-0.95, 0, 0], spine: [-0.03, 0.14, 0] } },
      { at: 1, joints: GUARD_ARMS },
    ],
  },
  twoHanded('parry-staff', 'staff'),
  twoHanded('parry-spear', 'spear'),
  twoHanded('parry-two-hander', 'two-hander'),
  {
    // No weapon: the forearm turns the blow aside.
    id: 'parry-hands', act: 'parry', way: 'hands', seconds: 0.4, part: 'upper', then: 'guard', marks: { contact: 0.3 },
    keys: [
      { at: 0, joints: GUARD_ARMS },
      { at: 0.3, joints: { shoulderR: [-0.6, 0, 0.35], elbowR: [-1.5, 0, 0], shoulderL: [-0.3, 0, 0.25], elbowL: [-0.9, 0, 0], spine: [0, 0.2, 0] } },
      { at: 1, joints: GUARD_ARMS },
    ],
  },
  {
    // The shield (on the left forearm) is thrust up and forward to take the blow, the body braced behind it.
    id: 'block', act: 'block', seconds: 0.55, part: 'upper', then: 'guard', marks: { contact: 0.28 },
    keys: [
      { at: 0, joints: GUARD_ARMS },
      { at: 0.28, joints: { shoulderR: GUARD_ARMS.shoulderR, elbowR: GUARD_ARMS.elbowR, shoulderL: [-1.15, 0, 0.05], elbowL: [-1.4, 0, 0], spine: [0.1, -0.1, 0] } },
      { at: 0.4, joints: { shoulderR: GUARD_ARMS.shoulderR, elbowR: GUARD_ARMS.elbowR, shoulderL: [-1.1, 0, 0.05], elbowL: [-1.45, 0, 0], spine: [0.04, -0.08, 0] } },
      { at: 1, joints: GUARD_ARMS },
    ],
  },
  {
    // Out of the way: the body slips aside and back, leaning off the line of the blow, then comes back to its feet.
    id: 'dodge', act: 'dodge', seconds: 0.6, part: 'whole', then: 'guard', marks: { contact: 0.3 },
    keys: [
      { at: 0, joints: GUARD_ARMS, root: {} },
      {
        at: 0.3,
        joints: { hipL: [-0.5, 0, 0], kneeL: [0.7, 0, 0], hipR: [0.2, 0, 0], kneeR: [0.2, 0, 0], spine: [-0.15, 0.2, 0], ...GUARD_ARMS, shoulderR: [-0.7, 0, -0.5] },
        root: { back: 0.25, side: 0.2, tilt: -0.22, up: -0.03 },
      },
      {
        at: 0.55,
        joints: { hipL: [-0.2, 0, 0], kneeL: [0.35, 0, 0], spine: [-0.06, 0.08, 0], ...GUARD_ARMS },
        root: { back: 0.1, side: 0.08, tilt: -0.08 },
      },
      { at: 1, joints: GUARD_ARMS, root: {} },
    ],
  },
] satisfies Motion[];
