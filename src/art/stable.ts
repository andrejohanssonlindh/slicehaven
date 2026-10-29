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
  const p = new Pix(26, 52);
  const g = 48; // ground
  const fur = (x: number, y: number, light: number): string => pick(coat, light + (fbm(x / 3, y / 2, seed) - 0.5) * 0.3 + (white(x, y, seed + 2) - 0.5) * 0.1, x, y);
  // Hind legs under the quarters, the far legs showing a little either side of the barrel.
  for (const x of [9, 17]) capsule(p, x, 24, x, g - 20, 1.6, 1.1, coat.slice(0, 3), seed + 1, 0.2);
  for (const x of [9.5, 16.5]) capsule(p, x, 32, x + (x < 13 ? -0.5 : 0.5), g - 3, 2.2, 1.3, coat, seed + 3, 0.2);
  for (const x of [9, 17]) for (let dx = -1; dx <= 1; dx++) for (let dy = 0; dy < 3; dy++) p.set(x + dx, g - 2 + dy, '#1c1612');
  // Neck and head going away up the picture, the mane along the crest, the ears.
  ellipse(p, 13, 9, 3.4, 6, (x, y) => fur(x, y, 0.7 - (y - 3) * 0.02));
  capsule(p, 13, 2, 13, 12, 1.3, 1.8, MANE, seed + 6, 0.4);
  polyFill(p, [[9.5, 4], [10.5, 0], [12, 4]], () => coat[1]);
  polyFill(p, [[14.5, 4], [15.5, 0], [16.5, 4]], () => coat[1]);
  // The barrel, then the quarters, lit from above.
  ellipse(p, 13, 19, 5.6, 8, (x, y) => fur(x, y, 0.85 - (y - 11) * 0.025));
  ellipse(p, 13, 29, 7, 8.5, (x, y) => fur(x, y, 0.9 - (y - 21) * 0.03 - Math.abs(x - 11) * 0.015));
  // The tail hangs down the rump.
  capsule(p, 13, 24, 13, 42, 1.8, 1.1, MANE, seed + 5, 0.4);
  if (seed % 3 === 0) for (let y = 4; y < 11; y++) p.set(13, y, '#d8d4cc');
  return finish(p, 13, g, seed, 14);
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
