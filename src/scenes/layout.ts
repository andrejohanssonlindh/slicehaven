/** Portrait, phone-first logical resolution. Scaled to fit the screen. */
export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 720;

/** 16-bit-ish palette shared by procedurally drawn graphics until real art lands. */
export const PALETTE = {
  bg: 0x1a1420,
  floorTop: 0x7a6a55,
  floorEdge: 0x4a3f33,
  floorSide: 0x2e261f,
  wallTop: 0x3b3346,
  highlight: 0xd9a441,
  hero: 0x5aa0d0,
  enemy: 0xa23a3a,
  ink: 0xf0e6d2,
  panel: 0x2b2233,
} as const;
