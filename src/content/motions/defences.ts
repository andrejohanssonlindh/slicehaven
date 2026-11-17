import type { Motion, MotionKey } from '../../core/world3d/motion';

/**
 * Meeting a blow (plan B8g, F1; re-keyed 2026-11-17): parry (a weapon or the arm turns it aside), block (a shield
 * takes it) and dodge (the body is simply not there). Each has a `contact` where the blow arrives, and starts and ends
 * on the body's own guard (`base: 1`), whatever it holds. A parry is one for any one-handed weapon, with their own for
 * the weapons held in two hands and for bare hands.
 */

// Held in both hands, a staff, spear or two-hander is thrown up crossways (the wrist turns it flat across the body)
// to meet the blow on the shaft; the left hand follows it.
const twoHandedMeet: MotionKey[] = [
  { at: 0, base: 1, joints: {} },
  { at: 0.3, ease: 'out', joints: { shoulderR: [-1.25, 0, -0.3], elbowR: [-0.95, 0, 0], wristR: [0.1, 1.25, 0], spine: [0.04, 0.08, 0], chest: [-0.06, 0.1, 0] } },
  { at: 0.5, joints: { shoulderR: [-1.15, 0, -0.3], elbowR: [-1.05, 0, 0], wristR: [0.1, 1.25, 0], spine: [0, 0.06, 0], chest: [-0.1, 0.08, 0] } },
  { at: 1, base: 1, joints: {} },
];

const twoHanded = (id: string, way: 'staff' | 'spear' | 'two-hander'): Motion =>
  ({ id, act: 'parry', way, seconds: 0.55, part: 'upper', then: 'guard', marks: { contact: 0.3 }, keys: twoHandedMeet });

export default [
  {
    // The weapon arm sweeps across the body, the wrist turning the blade to meet the blow; a small jolt as it lands.
    id: 'parry', act: 'parry', seconds: 0.5, part: 'upper', then: 'guard', marks: { contact: 0.3 },
    keys: [
      { at: 0, base: 1, joints: {} },
      { at: 0.3, ease: 'out', joints: { shoulderR: [-1.0, 0, 0.45], elbowR: [-0.9, 0, 0], wristR: [0.15, 0.55, 0], chest: [0.04, 0.18, 0] } },
      { at: 0.45, joints: { shoulderR: [-0.95, 0, 0.4], elbowR: [-1.0, 0, 0], wristR: [0.1, 0.55, 0], chest: [0, 0.14, 0] } },
      { at: 1, base: 1, joints: {} },
    ],
  },
  twoHanded('parry-staff', 'staff'),
  twoHanded('parry-spear', 'spear'),
  twoHanded('parry-two-hander', 'two-hander'),
  {
    // No weapon: the forearm turns the blow aside.
    id: 'parry-hands', act: 'parry', way: 'hands', seconds: 0.4, part: 'upper', then: 'guard', marks: { contact: 0.3 },
    keys: [
      { at: 0, base: 1, joints: {} },
      { at: 0.3, ease: 'out', joints: { shoulderR: [-0.7, 0, 0.4], elbowR: [-1.5, 0, 0], chest: [0, 0.2, 0] } },
      { at: 1, base: 1, joints: {} },
    ],
  },
  {
    // The shield (on the left forearm) is thrust up and forward to take the blow, the body braced behind it.
    id: 'block', act: 'block', seconds: 0.55, part: 'upper', then: 'guard', marks: { contact: 0.28 },
    keys: [
      { at: 0, base: 1, joints: {} },
      { at: 0.28, ease: 'out', joints: { shoulderL: [-1.2, 0.35, 0.05], elbowL: [-1.35, 0, 0], spine: [0.2, -0.1, 0], chest: [0.08, -0.12, 0] } },
      { at: 0.4, joints: { shoulderL: [-1.1, 0.35, 0.05], elbowL: [-1.45, 0, 0], spine: [0.14, -0.08, 0], chest: [0.04, -0.1, 0] } },
      { at: 1, base: 1, joints: {} },
    ],
  },
  {
    // Out of the way: the body slips aside and back, leaning off the line of the blow, then comes back. Added to the
    // stance and guard, so it is the same slip whatever is held.
    id: 'dodge', act: 'dodge', seconds: 0.6, part: 'whole', add: true, then: 'guard', marks: { contact: 0.3 },
    keys: [
      { at: 0, joints: {}, root: {} },
      {
        at: 0.3, ease: 'out',
        joints: { hipL: [-0.15, 0, 0], kneeL: [0.3, 0, 0], hipR: [0.1, 0, 0], kneeR: [0.2, 0, 0], spine: [-0.22, 0.15, 0], chest: [-0.06, 0.1, 0], shoulderR: [0, 0, -0.3] },
        root: { back: 0.25, side: 0.2, tilt: -0.2, up: -0.03 },
      },
      {
        at: 0.55,
        joints: { hipL: [-0.06, 0, 0], kneeL: [0.12, 0, 0], spine: [-0.08, 0.06, 0], chest: [-0.02, 0.04, 0] },
        root: { back: 0.1, side: 0.08, tilt: -0.08 },
      },
      { at: 1, joints: {}, root: {} },
    ],
  },
] satisfies Motion[];
