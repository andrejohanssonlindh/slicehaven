import type { Motion } from '../../core/world3d/motion';

/**
 * On guard: nothing of its own. The body's stance (`READY`) and the guard of whatever it holds (`WEAPON_HOLDS` in
 * `content/people/poses.ts`: a spear couched, a sword up, fists) are the pose; this only says "in a fight, between
 * motions". Every other motion starts and ends on `base: 1`, which is that pose. Held until something else plays.
 */
export default {
  id: 'guard',
  act: 'guard',
  seconds: 0,
  part: 'upper',
  keys: [{ at: 0, base: 1, joints: {} }],
  then: 'hold',
} satisfies Motion;
