/**
 * The mark a lightning bolt leaves on the ground: a blackened disc of fused earth with a ring of ash round it and
 * a branching, fern-like scar (the paths the current took through the soil) running outward. Drawn as pixels
 * (RGBA, alpha 0 or 255, so it can be alpha-tested and stays crisp) from a random source, so the same seed gives
 * the same mark. Pure; the renderer lays it flat on the ground.
 */

/** Pixels a metre across (the world's art is about 21). */
export const SCORCH_PPM = 21;
/** Side of the picture, metres. */
export const SCORCH_SIZE = 5;

export interface ScorchImage {
  /** Pixels along a side. */
  size: number;
  /** RGBA, `size × size`. */
  data: Uint8ClampedArray;
}

type RGB = [number, number, number];
const CORE: RGB = [18, 14, 13];
const CHAR: RGB = [40, 31, 26];
const ASH: RGB = [92, 84, 74];
const SCAR: RGB = [28, 22, 19];
const GLASS: RGB = [214, 226, 240];

export function scorchImage(rnd: () => number): ScorchImage {
  const size = Math.round(SCORCH_SIZE * SCORCH_PPM);
  const data = new Uint8ClampedArray(size * size * 4);
  const mid = size / 2;
  const put = (x: number, y: number, c: RGB): void => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
  };
  const coreR = 0.55 * SCORCH_PPM, charR = 0.95 * SCORCH_PPM, ashR = 1.45 * SCORCH_PPM;
  // The disc, with a ragged edge: the radius wobbles with the angle.
  const lobes = Array.from({ length: 5 }, () => ({ k: 2 + Math.floor(rnd() * 5), p: rnd() * Math.PI * 2, a: 0.08 + rnd() * 0.14 }));
  const wobble = (ang: number): number => 1 + lobes.reduce((s, l) => s + l.a * Math.sin(l.k * ang + l.p), 0) * 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - mid, dy = y + 0.5 - mid, d = Math.hypot(dx, dy) / wobble(Math.atan2(dy, dx));
      if (d <= coreR) put(x, y, CORE);
      else if (d <= charR) put(x, y, rnd() < 0.8 ? CHAR : CORE);
      else if (d <= ashR) {
        // Ash thins out toward the edge: fewer and fewer pixels are drawn.
        const keep = 1 - (d - charR) / (ashR - charR);
        if (rnd() < 0.15 + keep * 0.75) put(x, y, rnd() < 0.7 ? ASH : CHAR);
      }
    }
  }
  // The scar: branches that wander outward from the edge of the core and fork, thinning as they go.
  const branch = (x: number, y: number, ang: number, life: number, depth: number): void => {
    for (let s = 0; s < life; s++) {
      ang += (rnd() - 0.5) * 0.9;
      x += Math.cos(ang);
      y += Math.sin(ang);
      put(Math.round(x), Math.round(y), SCAR);
      if (depth < 3 && rnd() < 0.07) branch(x, y, ang + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.6), life * (0.35 + rnd() * 0.25), depth + 1);
    }
  };
  const arms = 6 + Math.floor(rnd() * 5);
  for (let k = 0; k < arms; k++) {
    const a = (k / arms) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
    branch(mid + Math.cos(a) * charR * 0.7, mid + Math.sin(a) * charR * 0.7, a, (SCORCH_SIZE / 2 - 0.4) * SCORCH_PPM * (0.7 + rnd() * 0.3), 0);
  }
  // Fused glass: a few bright specks in the core.
  for (let k = 0; k < 7; k++) {
    const a = rnd() * Math.PI * 2, r = rnd() * coreR * 0.8;
    put(Math.round(mid + Math.cos(a) * r), Math.round(mid + Math.sin(a) * r), GLASS);
  }
  return { size, data };
}
