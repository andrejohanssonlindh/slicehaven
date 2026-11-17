import type { Motion } from '../../core/world3d/motion';

/**
 * Strikes for the ways of moving that need their own (plan B8g, F1; re-keyed 2026-11-17 for wrists and two hands). The
 * plain `strike` (strike.ts) is any one-handed blow, so a blade uses it; these are the rest. Each starts and ends on
 * the weapon's own guard (`base: 1`), and says only the weapon arm and the trunk: for weapons held in both hands the
 * left hand follows the weapon by itself. The wrist's turn about x tips the weapon: negative laid back, about +1.4
 * straight on along the forearm (a thrust). The right arm's z is out when negative and across the body when positive.
 * Each blow lands at `contact`.
 */
export default [
  {
    // Both hands high over the head, the blade laid back, then chopped down with the whole body behind it.
    id: 'strike-two-hander', act: 'strike', way: 'two-hander', seconds: 1, part: 'upper', then: 'guard', marks: { contact: 0.58 },
    keys: [
      { at: 0, base: 1, joints: {} },
      { at: 0.4, joints: { shoulderR: [-2.5, 0.25, 0.1], elbowR: [-0.9, 0, 0], wristR: [1.0, 0.1, 0], spine: [-0.06, -0.1, 0], chest: [-0.12, -0.15, 0] } },
      { at: 0.58, ease: 'in', joints: { shoulderR: [-1.0, 0.25, 0.15], elbowR: [-0.35, 0, 0], wristR: [1.35, 0.1, 0], spine: [0.34, 0.1, 0], chest: [0.16, 0.15, 0] } },
      { at: 0.75, joints: { shoulderR: [-0.95, 0.25, 0.15], elbowR: [-0.4, 0, 0], wristR: [1.4, 0.1, 0], spine: [0.3, 0.1, 0], chest: [0.14, 0.12, 0] } },
      { at: 1, base: 1, joints: {} },
    ],
  },
  {
    // Wound back over the right shoulder with the body turned away, then swept round and down, the far end leading.
    id: 'strike-staff', act: 'strike', way: 'staff', seconds: 0.8, part: 'upper', then: 'guard', marks: { contact: 0.55 },
    keys: [
      { at: 0, base: 1, joints: {} },
      { at: 0.35, joints: { shoulderR: [-0.75, 0, -0.6], elbowR: [-1.7, 0, 0], wristR: [-0.25, 0.2, 0], spine: [0.08, -0.3, 0], chest: [0, -0.3, 0] } },
      { at: 0.55, ease: 'in', joints: { shoulderR: [-0.9, 0, 0.3], elbowR: [-0.4, 0, 0], wristR: [1.4, 0.5, 0], spine: [0.2, 0.25, 0], chest: [0.08, 0.3, 0] } },
      { at: 0.75, joints: { shoulderR: [-0.85, 0, 0.32], elbowR: [-0.45, 0, 0], wristR: [1.45, 0.5, 0], spine: [0.18, 0.22, 0], chest: [0.07, 0.26, 0] } },
      { at: 1, base: 1, joints: {} },
    ],
  },
  {
    // A thrust: the spear drawn back level past the hip, then driven straight out along its own line, the point
    // leading and the body going in behind it; the shaft runs through the forward hand.
    id: 'strike-spear', act: 'strike', way: 'spear', seconds: 0.7, part: 'upper', then: 'guard', marks: { contact: 0.5 },
    keys: [
      { at: 0, base: 1, joints: {} },
      { at: 0.3, joints: { shoulderR: [0.7, 0, -0.1], elbowR: [-1.5, 0, 0], wristR: [0.7, 0.45, 0], spine: [0.06, -0.2, 0], chest: [0, -0.22, 0] } },
      { at: 0.5, ease: 'in', joints: { shoulderR: [-1.05, 0, 0.1], elbowR: [-0.3, 0, 0], wristR: [1.32, 0.2, 0], spine: [0.26, 0.15, 0], chest: [0.1, 0.25, 0] } },
      { at: 0.68, joints: { shoulderR: [-1.0, 0, 0.1], elbowR: [-0.35, 0, 0], wristR: [1.32, 0.2, 0], spine: [0.24, 0.13, 0], chest: [0.09, 0.22, 0] } },
      { at: 1, base: 1, joints: {} },
    ],
  },
  {
    // Slower and heavier than a blade: leaning back to lift it, the head hanging behind, then the whole weight dropped on the blow.
    id: 'strike-axe-mace', act: 'strike', way: 'axe-mace', seconds: 0.9, part: 'upper', then: 'guard', marks: { contact: 0.62 },
    keys: [
      { at: 0, base: 1, joints: {} },
      { at: 0.4, joints: { shoulderR: [-2.8, 0, -0.2], elbowR: [-0.7, 0, 0], wristR: [0, 0, 0], spine: [-0.1, -0.2, 0], chest: [-0.1, -0.2, 0] } },
      { at: 0.62, ease: 'in', joints: { shoulderR: [-0.8, 0, 0.1], elbowR: [-0.1, 0, 0], wristR: [0.6, 0, 0], spine: [0.38, 0.2, 0], chest: [0.12, 0.2, 0] } },
      { at: 0.78, joints: { shoulderR: [-0.8, 0, 0.1], elbowR: [-0.12, 0, 0], wristR: [0.55, 0, 0], spine: [0.34, 0.18, 0], chest: [0.1, 0.18, 0] } },
      { at: 1, base: 1, joints: {} },
    ],
  },
  {
    // A punch: the fist drawn in by the shoulder, then straight out as the body turns into it.
    id: 'strike-hands', act: 'strike', way: 'hands', seconds: 0.4, part: 'upper', then: 'guard', marks: { contact: 0.5 },
    keys: [
      { at: 0, base: 1, joints: {} },
      { at: 0.25, joints: { shoulderR: [-0.45, 0, -0.1], elbowR: [-2.1, 0, 0], spine: [0.08, -0.2, 0], chest: [0, -0.22, 0] } },
      { at: 0.5, ease: 'in', joints: { shoulderR: [-1.5, 0, -0.05], elbowR: [-0.05, 0, 0], spine: [0.16, 0.2, 0], chest: [0.04, 0.25, 0] } },
      { at: 0.7, joints: { shoulderR: [-1.4, 0, -0.05], elbowR: [-0.15, 0, 0], spine: [0.14, 0.16, 0], chest: [0.04, 0.2, 0] } },
      { at: 1, base: 1, joints: {} },
    ],
  },
] satisfies Motion[];
