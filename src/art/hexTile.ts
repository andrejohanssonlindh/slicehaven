/**
 * Pixel hex geometry. Pointy-top hex with 2:1 pixel slopes, slightly squashed
 * vertically so the board reads as tilted toward the camera (mobs stand on it).
 *
 *   width  W = 32 px, top cap 8 rows, straight sides 12 rows, bottom cap 7 rows
 *   tiles tessellate with column step 32 and row step 20 (odd rows shifted 16)
 *   each tile also has a DEPTH px "earth" side face below its bottom edges.
 */
export const TILE_W = 32;
export const TILE_CAP = TILE_W / 4;
export const TILE_MID = 12;
export const TILE_STEP_X = TILE_W;
export const TILE_STEP_Y = TILE_CAP + TILE_MID;
export const TILE_DEPTH = 6;

function halfWidth(y: number): number {
  if (y < 0) return -1;
  if (y < TILE_CAP) return 2 * (y + 1);
  if (y < TILE_CAP + TILE_MID) return TILE_W / 2;
  return TILE_W / 2 - 2 - 2 * (y - TILE_CAP - TILE_MID);
}

export const TILE_H = (() => {
  let y = 0;
  while (halfWidth(y) > 0) y++;
  return y;
})();

/** Centre of the top face, where tokens stand. */
export const TILE_CENTER = { x: TILE_W / 2, y: Math.floor(TILE_H / 2) + 1 };

export function inHex(x: number, y: number): boolean {
  return Math.abs(x + 0.5 - TILE_W / 2) <= halfWidth(y);
}

/** Distance (in px, 4-neighbour) from each hex pixel to the outside. 0 = outside. */
export const EDGE: number[][] = (() => {
  const d: number[][] = Array.from({ length: TILE_H }, (_, y) =>
    Array.from({ length: TILE_W }, (_, x) => (inHex(x, y) ? Infinity : 0)),
  );
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= TILE_W || y >= TILE_H ? 0 : d[y][x]);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < TILE_H; y++) {
      for (let x = 0; x < TILE_W; x++) {
        if (d[y][x] === 0) continue;
        d[y][x] = Math.min(d[y][x], at(x - 1, y) + 1, at(x, y - 1) + 1);
      }
    }
    for (let y = TILE_H - 1; y >= 0; y--) {
      for (let x = TILE_W - 1; x >= 0; x--) {
        if (d[y][x] === 0) continue;
        d[y][x] = Math.min(d[y][x], at(x + 1, y) + 1, at(x, y + 1) + 1);
      }
    }
  }
  return d;
})();

/** Bottom-most top-face row per column (for drawing the side face). */
export const BOTTOM: number[] = Array.from({ length: TILE_W }, (_, x) => {
  for (let y = TILE_H - 1; y >= 0; y--) if (inHex(x, y)) return y;
  return -1;
});

/**
 * Edge midpoints, indexed like core/hex.ts DIRECTIONS:
 * 0 E, 1 NE, 2 NW, 3 W, 4 SW, 5 SE.
 */
export const EDGE_MID: readonly { x: number; y: number }[] = [
  { x: TILE_W, y: TILE_CAP + TILE_MID / 2 },
  { x: TILE_W * 0.75, y: TILE_CAP / 2 },
  { x: TILE_W * 0.25, y: TILE_CAP / 2 },
  { x: 0, y: TILE_CAP + TILE_MID / 2 },
  { x: TILE_W * 0.25, y: TILE_H - TILE_CAP / 2 + 0.5 },
  { x: TILE_W * 0.75, y: TILE_H - TILE_CAP / 2 + 0.5 },
];

/** Offset ("odd-r") grid position -> pixel position of the tile's top-left. */
export function tileOrigin(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE_STEP_X + (row & 1 ? TILE_W / 2 : 0), y: row * TILE_STEP_Y };
}
