import { OBX, OBY, box, ellipse } from './furniture';
import { type Prop, capsule, fbm, pick, polyFill, white, wobble } from './grit';
import { GW, SACK, STRAW, finish, woodR } from './humble';
import { Pix } from './pix';

/**
 * A guest's bed at the inn: a plank frame with a headboard, a straw tick, a wool blanket over the
 * foot and a sack for a pillow. Headboard at the left; about 1.9 m long. The blanket follows the seed.
 */
const BLANKETS: string[][] = [
  ['#2a1a1c', '#4a2a2c', '#6e3c3c', '#8e5050'],
  ['#1a2230', '#2c3a52', '#44587a', '#627aa0'],
  ['#1e2a1c', '#32482e', '#4c6a44', '#6c8c60'],
  ['#2a2420', '#4a4038', '#6a5e52', '#8a7c6c'],
  ['#2c2218', '#503a22', '#7a5a34', '#9c7a4c'],
];

export function makeGuestBed(seed = 1): Prop {
  const cloth = BLANKETS[((seed % BLANKETS.length) + BLANKETS.length) % BLANKETS.length];
  const p = new Pix(66, 46);
  const g = 41;
  const d = 18, ox = d * OBX, oy = d * OBY;
  for (const x of [6, 39]) capsule(p, x, 33, x, g, 1.4, 1.6, GW, seed + x, 0.25);
  // The frame, and the head and foot boards.
  box(p, 4, 34, 38, 8, d, woodR(seed, 0.6), woodR(seed + 1, 0.42), woodR(seed + 2, 0.3), null);
  box(p, 3, 34, 3, 17, d, woodR(seed, 0.68), woodR(seed + 3, 0.5, true), woodR(seed + 2, 0.3, true), null);
  // The mattress: straw tick at the head, the blanket over the rest.
  const x0 = 7, yTop = 26; // front edge of the tick's top face
  polyFill(p, wobble([[x0, yTop], [43, yTop], [43 + ox, yTop + oy], [x0 + ox, yTop + oy]], seed, 0.5, 3), (x, y) => {
    const t = (yTop - y) / -oy;
    const u = x - x0 - t * ox;
    if (u > 11) {
      const fold = Math.sin(u * 0.7 + t * 2) * 0.1;
      return pick(cloth, 0.55 + fold - t * 0.08 + (fbm(x / 3, y / 3, seed) - 0.5) * 0.3 + (u > 33 ? -0.1 : 0), x, y);
    }
    return pick(STRAW, 0.5 + (fbm(x / 2, y / 2, seed + 3) - 0.5) * 0.7, x, y);
  });
  // The blanket's hanging edge on the front.
  polyFill(p, [[x0 + 11, yTop], [43, yTop], [43, yTop + 5], [x0 + 11, yTop + 5]], (x, y) => pick(cloth, 0.3 + (((x + y) & 3) === 0 ? 0.1 : 0) + (white(x, y, seed) - 0.5) * 0.2, x, y));
  // A sack for a pillow.
  ellipse(p, 11 + ox * 0.5, yTop + oy * 0.5, 4.8, 2.4, (x, y) => pick(SACK, 0.65 - (x - 8) * 0.03 + (white(x, y, seed) - 0.5) * 0.3, x, y));
  // Straw poking out from under the frame.
  for (let i = 0; i < 8; i++) {
    const x = 6 + Math.round(white(i, 0, seed + 5) * 36), y = 41 + Math.round(white(i, 1, seed + 5) * 2);
    p.set(x, y, STRAW[2]);
  }
  return finish(p, 24, g, seed, 20);
}
