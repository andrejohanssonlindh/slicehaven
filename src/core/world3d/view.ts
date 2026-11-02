import type { WallSide } from './house';

/**
 * How the world is looked at. The camera turns freely about the vertical round the hero (plan item A1); its turn
 * (`yaw`, radians) is the engine's view state. Yaw 0 looks from +z toward -z; the camera sits toward
 * (sin yaw, cos yaw) from what it looks at. `VIEW_YAW` is where the view starts.
 */
export const VIEW_YAW = 0.42;

/** How far (as the cosine of the angle) a house may turn from facing the view before front-painted cards read wrong: 60°. */
export const FACING_MIN = 0.5;

/** A wall faces the camera (and is cut away) when it is turned toward it by more than this (the cosine; about 63°). */
export const FACES_CAMERA = 0.45;

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
