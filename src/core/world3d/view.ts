/**
 * How the world is looked at: the camera's turn about the vertical (radians). The renderer sets the camera by it, and
 * the map compiler checks houses against it (a room painted as seen from its front must face roughly this way).
 */
export const VIEW_YAW = 0.42;

/** How far (as the cosine of the angle) a house may turn from facing the view before front-painted cards read wrong: 60°. */
export const FACING_MIN = 0.5;
