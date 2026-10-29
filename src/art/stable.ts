import { box, ellipse } from './furniture';
import { type Prop, capsule, fbm, pick, polyFill, white, wobble } from './grit';
import { GW, STRAW, finish } from './humble';
import { Pix } from './pix';

/**
 * What a stable holds: a horse, hay. Same slanted 3/4 look and rough hand as the rest of the
 * village's things; the horse is a plain side view (it stands along the house's front).
 */

/** Coat colours, dark to light: bay, chestnut, dun, grey, black. */
const COATS: string[][] = [
  ['#1a100c', '#3a2216', '#5e3a22', '#7e5430'],
  ['#2a140c', '#552a14', '#7e4020', '#a05a2c'],
  ['#3a2c1c', '#665032', '#8e7248', '#b09462'],
  ['#34343c', '#5c5c66', '#8a8a94', '#b8b8c0'],
  ['#0c0c10', '#1c1c24', '#2c2c36', '#403f4c'],
];
const MANE = ['#0e0a08', '#1e1610', '#33261a'];

/**
 * A work horse standing in its stall with its head toward the back wall, seen from behind and above: the broad
 * quarters, the tail hanging, the barrel and neck going away, ears at the top. About 0.9 m across. The coat follows the seed.
 */
export function makeHorse(seed = 1): Prop {
  const coat = COATS[((seed % COATS.length) + COATS.length) % COATS.length];
  const p = new Pix(36, 54);
  const g = 50; // ground
  const fur = (x: number, y: number, light: number): string => pick(coat, light + (fbm(x / 3, y / 2, seed) - 0.5) * 0.3 + (white(x, y, seed + 2) - 0.5) * 0.1, x, y);
  // Far (front) legs peek out either side of the barrel; hind legs under the quarters.
  for (const x of [11, 25]) capsule(p, x, 22, x, g - 22, 2.2, 1.5, coat.slice(0, 3), seed + 1, 0.2);
  for (const x of [11, 25]) capsule(p, x, 34, x + (x < 18 ? -1 : 1), g - 3, 3, 1.6, coat, seed + 3, 0.2);
  for (const x of [10, 26]) for (let dx = -2; dx <= 2; dx++) for (let dy = 0; dy < 3; dy++) p.set(x + dx, g - 2 + dy, '#1c1612');
  // Neck and head, going away up the picture, with the mane along the crest and the ears.
  ellipse(p, 18, 9, 4.6, 6.5, (x, y) => fur(x, y, 0.7 - (y - 3) * 0.02));
  capsule(p, 18, 2, 18, 12, 1.7, 2.4, MANE, seed + 6, 0.4);
  polyFill(p, [[13, 4], [14, 0], [16.5, 4]], () => coat[1]);
  polyFill(p, [[20, 4], [22, 0], [23.5, 4]], () => coat[1]);
  // The barrel, then the quarters, broad and rounded, lit from the top.
  ellipse(p, 18, 19, 9, 9, (x, y) => fur(x, y, 0.85 - (y - 10) * 0.025));
  ellipse(p, 18, 30, 11.5, 10, (x, y) => fur(x, y, 0.9 - (y - 20) * 0.03 - Math.abs(x - 15) * 0.012));
  // The tail hangs down the middle of the rump.
  capsule(p, 18, 24, 18, 44, 2.6, 1.5, MANE, seed + 5, 0.4);
  if (seed % 3 === 0) for (let y = 4; y < 12; y++) p.set(18, y, '#d8d4cc');
  return finish(p, 18, g, seed, 18);
}

/** A bale of hay, bound with twine, and loose hay beside it. */
export function makeHayBale(seed = 1): Prop {
  const p = new Pix(46, 34);
  const straw = (shade: number) => (x: number, y: number): string => pick(STRAW, shade + (fbm(x * 1.3, y / 2, seed) - 0.5) * 0.5 + (white(x, y, seed + 1) - 0.5) * 0.2, x, y);
  box(p, 4, 28, 30, 14, 14, straw(0.8), straw(0.55), straw(0.35), null);
  box(p, 12, 16, 26, 12, 12, straw(0.85), straw(0.58), straw(0.38), null);
  // Twine.
  for (const x of [11, 22]) for (let y = 15; y < 28; y++) p.set(x, y, GW[2]);
  for (let i = 0; i < 20; i++) {
    const x = 30 + Math.round(white(i, 0, seed) * 12), y = 27 + Math.round(white(i, 1, seed) * 5);
    p.set(x, y, STRAW[1 + (i % 3)]);
    p.set(x + 1, y, STRAW[2]);
  }
  // Loose stalks poking out.
  for (let i = 0; i < 12; i++) {
    const x = 6 + Math.round(white(i, 2, seed) * 30), y = 14 + Math.round(white(i, 3, seed) * 4);
    p.set(x, y, STRAW[3]); p.set(x + 1, y - 1, STRAW[2]);
  }
  return finish(p, 18, 30, seed, 14, {});
}

/** A hay rack and water bucket, for a stall's wall: a slatted rack with hay in it. */
export function makeHayRack(seed = 1): Prop {
  const p = new Pix(44, 34);
  polyFill(p, wobble([[4, 8], [38, 8], [36, 26], [6, 26]], seed, 0.8, 2), (x, y) => pick(STRAW, 0.5 + (fbm(x * 1.3, y / 2, seed) - 0.5) * 0.7, x, y));
  for (let x = 4; x <= 38; x += 5) for (let y = 6; y < 30; y++) p.set(x, y, GW[3 - (y % 2)]);
  for (const y of [6, 18, 29]) for (let x = 3; x < 40; x++) p.set(x, y, GW[2]);
  return finish(p, 22, 29, seed, 0);
}
