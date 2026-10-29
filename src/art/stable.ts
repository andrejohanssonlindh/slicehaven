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

/** A work horse standing, seen from the side, facing right. About 2.1 m nose to tail. The coat follows the seed. */
export function makeHorse(seed = 1): Prop {
  const coat = COATS[((seed % COATS.length) + COATS.length) % COATS.length];
  const p = new Pix(58, 48);
  const g = 44; // ground
  const fur = (x: number, y: number, light: number): string => pick(coat, light + (fbm(x / 3, y / 2, seed) - 0.5) * 0.3 + (white(x, y, seed + 2) - 0.5) * 0.1, x, y);
  // Far legs first (darker), then the body over them.
  for (const [x0, x1] of [[37, 38], [19, 19]]) capsule(p, x0, 28, x1, g - 3, 2.1, 1.3, coat.slice(0, 3), seed + 1, 0.2);
  // Hind leg bends at the hock.
  capsule(p, 14, 26, 11, 36, 3.2, 2, coat, seed + 2, 0.2);
  capsule(p, 11, 36, 13, g - 3, 1.8, 1.3, coat, seed + 3, 0.2);
  capsule(p, 34, 28, 34, g - 3, 2.4, 1.4, coat, seed + 4, 0.2);
  // Hooves.
  for (const x of [13, 19, 34, 38]) for (let dx = -1; dx <= 1; dx++) for (let dy = 0; dy < 3; dy++) p.set(x + dx, g - 2 + dy, '#1c1612');
  // Tail: a few strands hanging from the croup.
  capsule(p, 9, 18, 5, 36, 2.2, 1.2, MANE, seed + 5, 0.4);
  // Body and the swell of the quarters and chest.
  ellipse(p, 24, 23, 15.5, 8, (x, y) => fur(x, y, 0.9 - (y - 15) * 0.045));
  ellipse(p, 13, 22, 6.5, 7.5, (x, y) => fur(x, y, 0.82 - (y - 15) * 0.04));
  ellipse(p, 35, 22, 6, 7.5, (x, y) => fur(x, y, 0.85 - (y - 15) * 0.04));
  // Neck and head.
  capsule(p, 36, 19, 45, 9, 5.4, 3.6, coat, seed + 6, 0.2);
  polyFill(p, wobble([[43, 5], [52, 9], [56, 16], [54, 19], [49, 15], [44, 13]], seed, 0.4, 2), (x, y) => fur(x, y, 0.8 - (y - 5) * 0.03));
  polyFill(p, [[43, 6], [44, 1.5], [46, 6]], () => coat[1]);
  p.set(48, 9, '#0c0a0a'); // eye
  p.set(55, 17, '#1a1210'); p.set(54, 18, '#1a1210'); // nostril and muzzle
  // Mane along the crest.
  for (let i = 0; i < 9; i++) {
    const t = i / 8, x = 36 + t * 9, y = 14 - t * 7;
    capsule(p, x, y, x - 2.6, y + 3, 1.1, 0.7, MANE, seed + 7 + i, 0.4);
  }
  // A forelock and a pale blaze on some.
  if (seed % 3 === 0) for (let y = 7; y < 15; y++) p.set(49 + Math.round((y - 7) * 0.5), y, '#d8d4cc');
  return finish(p, 28, g, seed, 20);
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
