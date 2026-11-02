import type { WallSide } from './house';

/**
 * How the world is looked at. The camera turns freely about the vertical round the hero (plan item A1); its turn
 * (`yaw`, radians) is the engine's view state. Yaw 0 looks from +z toward -z; the camera sits toward
 * (sin yaw, cos yaw) from what it looks at. `VIEW_YAW` is where the view starts.
 */
export const VIEW_YAW = 0.42;

/**
 * A wall faces the camera (and is cut away) when it is turned toward it at all, beyond a sliver: the cosine of 85°.
 * So two walls are down from almost every angle, and only one when you look within 5° of square onto a wall
 * (the director, 2026-11-02).
 */
export const FACES_CAMERA = Math.sin((5 * Math.PI) / 180);

/** How much a side of a house turned by `rot` faces a camera at `yaw`: 1 straight at it, -1 straight away. */
export function sideToward(side: WallSide, rot: number, yaw: number): number {
  const d = yaw - rot;
  switch (side) {
    case 'front': return Math.cos(d);
    case 'back': return -Math.cos(d);
    case 'right': return Math.sin(d);
    case 'left': return -Math.sin(d);
  }
}

/** Does this side of a house face the camera enough that it must be cut away to see in? */
export const facesCamera = (side: WallSide, rot: number, yaw: number): boolean => sideToward(side, rot, yaw) > FACES_CAMERA;

/** An angle brought into (-π, π]. */
export function wrapAngle(a: number): number {
  const t = Math.PI * 2;
  a = ((a % t) + t) % t;
  return a > Math.PI ? a - t : a;
}
