import type { Motion } from '../../core/world3d/motion';
import { SPEAR_THRUST } from './strikes';

/**
 * A blow with the point (the director, 2026-11-17: "attack with the pointy end as well as cut"): played when the
 * attacker chose to thrust (`Choice.strikeWith`). The weapon is drawn back level, the wrist turning it straight on
 * along the forearm (about +1.4), then driven out along its own line as the body goes in behind it. Each is for one
 * way of moving; a weapon with none (a staff, a fist) thrusts as it strikes. Each lands at `contact`.
 */
export default [
  {
    // A sword's lunge: the hilt back by the hip, the point level at the foe, then the arm shot straight.
    id: 'thrust', act: 'thrust', way: 'blade', seconds: 0.6, part: 'upper', then: 'guard', marks: { contact: 0.5 },
    keys: [
      { at: 0, base: 1, joints: {} },
      { at: 0.3, joints: { shoulderR: [0.4, 0, -0.12], elbowR: [-1.75, 0, 0], wristR: [1.05, 0.05, 0], spine: [0.06, -0.2, 0], chest: [0, -0.22, 0] } },
      { at: 0.5, ease: 'in', joints: { shoulderR: [-1.35, 0, 0.06], elbowR: [-0.12, 0, 0], wristR: [1.42, 0, 0], spine: [0.28, 0.15, 0], chest: [0.1, 0.26, 0] } },
      { at: 0.7, joints: { shoulderR: [-1.3, 0, 0.06], elbowR: [-0.18, 0, 0], wristR: [1.42, 0, 0], spine: [0.25, 0.13, 0], chest: [0.09, 0.22, 0] } },
      { at: 1, base: 1, joints: {} },
    ],
  },
  {
    // An axe's or a hammer's spike, a mace's head jabbed: short and heavy, from the shoulder.
    id: 'thrust-axe-mace', act: 'thrust', way: 'axe-mace', seconds: 0.7, part: 'upper', then: 'guard', marks: { contact: 0.52 },
    keys: [
      { at: 0, base: 1, joints: {} },
      { at: 0.32, joints: { shoulderR: [0.3, 0, -0.15], elbowR: [-1.9, 0, 0], wristR: [1.2, 0, 0], spine: [0.06, -0.2, 0], chest: [0, -0.2, 0] } },
      { at: 0.52, ease: 'in', joints: { shoulderR: [-1.2, 0, 0.05], elbowR: [-0.3, 0, 0], wristR: [1.4, 0, 0], spine: [0.26, 0.14, 0], chest: [0.1, 0.22, 0] } },
      { at: 0.72, joints: { shoulderR: [-1.15, 0, 0.05], elbowR: [-0.35, 0, 0], wristR: [1.4, 0, 0], spine: [0.24, 0.12, 0], chest: [0.09, 0.2, 0] } },
      { at: 1, base: 1, joints: {} },
    ],
  },
  {
    // A long blade in both hands: pulled back to the hip, then run forward with the weight behind it.
    id: 'thrust-two-hander', act: 'thrust', way: 'two-hander', seconds: 0.85, part: 'upper', then: 'guard', marks: { contact: 0.55 },
    keys: [
      { at: 0, base: 1, joints: {} },
      { at: 0.35, joints: { shoulderR: [0.45, 0.25, 0.05], elbowR: [-1.6, 0, 0], wristR: [1.05, 0.2, 0], spine: [0.06, -0.22, 0], chest: [0, -0.2, 0] } },
      { at: 0.55, ease: 'in', joints: { shoulderR: [-1.1, 0.25, 0.15], elbowR: [-0.25, 0, 0], wristR: [1.35, 0.1, 0], spine: [0.3, 0.14, 0], chest: [0.12, 0.2, 0] } },
      { at: 0.75, joints: { shoulderR: [-1.05, 0.25, 0.15], elbowR: [-0.3, 0, 0], wristR: [1.35, 0.1, 0], spine: [0.27, 0.12, 0], chest: [0.1, 0.18, 0] } },
      { at: 1, base: 1, joints: {} },
    ],
  },
  // A spear's thrust is its strike.
  { id: 'thrust-spear', act: 'thrust', way: 'spear', seconds: 0.7, part: 'upper', then: 'guard', marks: { contact: 0.5 }, keys: SPEAR_THRUST },
] satisfies Motion[];
