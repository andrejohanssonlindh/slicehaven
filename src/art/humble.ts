import { Rng } from '../core/rng';
import { IRON, STONE, drawBarrel, stoneWall } from './buildings';
import { OBX, OBY, box, ellipse, fire, stoneP } from './furniture';
import { type Light, type Prop, capsule, chew, fbm, grime, pick, polyFill, selOutline, still, white, wobble } from './grit';
import type { RoomItem } from './interior';
import { Pix } from './pix';
import { FRAMES } from './props';

/**
 * What a village house holds: poor, patched, dirty, and small. A chest is a
 * foot wide, the table is a board on trestles, the bed is straw on boards.
 * Everything is a bit crooked and nothing is clean. (The big, handsome set
 * lives in furniture.ts, for manors and castles.)
 */

export const GW = ['#1c1612', '#3a3026', '#584a3a', '#7a6850', '#9a8668', '#b8a484'];
export const SACK = ['#2a2218', '#4a3e2a', '#6e5e42', '#8e7c58', '#ac9a70'];
export const WOOL = ['#2a2420', '#4a4038', '#6a5e52', '#8a7c6c'];
export const CLAY = ['#2a1a12', '#4a3022', '#6e4a34', '#92684a'];
export const STRAW = ['#5a4824', '#8a7438', '#b09a4c', '#d0ba68'];

export const woodR = (seed: number, shade: number, vertical = false) => (x: number, y: number): string => {
  const seam = (vertical ? x : y) % 5 === 0 ? -0.26 : 0;
  return pick(GW, shade + seam + (fbm(vertical ? x * 1.6 : x / 5, vertical ? y / 5 : y * 1.6, seed) - 0.5) * 0.5 + (white(x, y, seed + 1) - 0.5) * 0.14, x, y);
};

export function finish(p: Pix, ax: number, ay: number, seed: number, shadow = 12, extra: Partial<Prop> = {}): Prop {
  grime(p, seed, 0.75, ay);
  chew(p, seed + 1, 0.12);
  return still(selOutline(p), ax + 1, ay + 1, shadow, extra);
}

/** Straw on boards, a patched grey blanket, a sack for a pillow. */
export function makePallet(seed = 1): Prop {
  const p = new Pix(60, 34);
  const g = 30;
  box(p, 4, 24, 38, 5, 20, woodR(seed, 0.6), woodR(seed + 1, 0.4), woodR(seed + 2, 0.28), null);
  const ox = 20 * OBX, oy = 20 * OBY;
  const top: [number, number][] = [[4, 19], [42, 19], [42 + ox, 19 + oy], [4 + ox, 19 + oy]];
  polyFill(p, wobble(top, seed, 1.1, 3), (x, y) => {
    const t = (19 - y) / -oy;
    const u = x - 4 - t * ox;
    if (u > 12 && u < 34 && t < 0.92) {
      // Blanket: old wool, patches in other cloth, a stitched seam.
      const patch = Math.floor(u / 9) + Math.floor(t * 3) * 3;
      const pal = white(patch, 0, seed + 4) < 0.3 ? ['#2e2a38', '#4a4458', '#6a647a'] : white(patch, 1, seed + 4) < 0.4 ? ['#3a2a22', '#5e4434', '#7e6248'] : WOOL;
      return pick(pal, 0.55 + (fbm(x / 3, y / 3, seed) - 0.5) * 0.4 + (u % 9 === 0 ? -0.2 : 0), x, y);
    }
    return pick(STRAW, 0.45 + (fbm(x / 1.5, y / 3, seed + 3) - 0.5) * 0.9, x, y);
  });
  // Straw poking out from under the edge, and a sack pillow.
  for (let i = 0; i < 14; i++) {
    const x = 4 + Math.round(white(i, 0, seed + 5) * 38), y = 19 + Math.round(white(i, 1, seed + 5) * 6);
    p.set(x, y, STRAW[2]); p.set(x + 1, y + 1, STRAW[1]);
  }
  ellipse(p, 14 + ox * 0.5, 19 + oy * 0.5, 5, 2.6, (x, y) => pick(SACK, 0.6 - (x - 12) * 0.04 + (white(x, y, seed) - 0.5) * 0.3, x, y));
  return finish(p, 26, g, seed, 18);
}

/** A foot-wide strongbox. One strap, a rope handle, a split corner. */
export function makeFootlocker(seed = 2): Prop {
  const p = new Pix(24, 18);
  box(p, 3, 14, 12, 7, 8, woodR(seed, 0.62), woodR(seed + 1, 0.44), woodR(seed + 2, 0.3), GW[5]);
  for (let y = 7; y < 14; y++) { p.set(8, y, IRON[2]); p.set(9, y, IRON[1]); }
  p.set(15, 9, '#8a7448'); p.set(16, 10, '#8a7448'); p.set(16, 11, '#6a5a38');
  return finish(p, 10, 14, seed, 10);
}

/** A board on two trestles, low, stained, with a heel of bread and a candle stub. */
export function makeTrestleTable(seed = 3): Prop {
  const p = new Pix(54, 36);
  const g = 32;
  for (const x of [9, 30]) {
    capsule(p, x + 1, 19, x - 3, g, 1.2, 1.4, GW, seed + x, 0.3);
    capsule(p, x + 1, 19, x + 5, g, 1.2, 1.4, GW, seed + x + 1, 0.3);
  }
  box(p, 4, 20, 30, 2, 14, woodR(seed, 0.66), woodR(seed + 1, 0.46), woodR(seed + 2, 0.3), null);
  // Stains and knife cuts.
  for (let i = 0; i < 6; i++) p.set(8 + Math.round(white(i, 0, seed) * 26), 12 + Math.round(white(i, 1, seed) * 6), GW[1]);
  ellipse(p, 20, 15, 4, 1.8, (x, y) => pick(['#3a2a1a', '#5e4a2e', '#8a6a3e'], 0.5 - (y - 14) * 0.2, x, y));
  ellipse(p, 20, 14, 3, 1.1, () => '#2a2018');
  ellipse(p, 11, 17, 3.2, 1.4, (x, y) => pick(['#3a2810', '#6a4a22', '#a07a3c'], 0.7 - (y - 16) * 0.3, x, y));
  for (let x = 26; x < 30; x++) p.set(x, 15, IRON[3]);
  p.set(30, 16, GW[4]); p.set(31, 16, GW[4]);
  for (let y = 12; y < 16; y++) p.set(15, y, '#d8c8a0');
  p.set(15, 11, '#ffd060'); p.set(15, 10, '#fff2b0');
  return finish(p, 27, g, seed, 20, { lights: [{ dx: -12, dy: -22, r: 20, color: [1, 0.74, 0.36], flicker: 0.9 }] as Light[] });
}

/** Three legs, a rough round seat, never quite level. */
export function makeStool3(seed = 4): Prop {
  const p = new Pix(18, 18);
  for (const [x, dx] of [[5, -2], [11, 2], [8, 0]] as const) capsule(p, x, 9, x + dx, 16, 1.1, 1.3, GW, seed + x, 0.3);
  ellipse(p, 8.5, 8, 5.5, 2.4, (x, y) => pick(GW, 0.62 - (x - 3) * 0.04 + (y > 8 ? -0.15 : 0.05) + (white(x, y, seed) - 0.5) * 0.3, x, y));
  return finish(p, 8, 16, seed, 8);
}

/** A bucket and a broom, leaning. */
export function makeBucketBroom(seed = 5): Prop {
  const p = new Pix(30, 36);
  capsule(p, 20, 31, 24, 3, 0.8, 0.8, GW, seed, 0.2);
  for (let k = 0; k < 6; k++) { p.set(18 + k, 31 - (k & 1), STRAW[1 + (k % 3)]); p.set(18 + k, 32, STRAW[0]); p.set(19 + k, 33, STRAW[0]); }
  polyFill(p, [[2, 20], [14, 20], [13, 32], [3, 32]], (x, y) => pick(GW, 0.62 - (x - 2) * 0.04 + (Math.floor(x / 2) % 2 ? 0.08 : -0.06) + (white(x, y, seed) - 0.5) * 0.2, x, y));
  for (const y of [22, 29]) for (let x = 2; x < 14; x++) p.set(x, y, IRON[1 + (x & 1)]);
  for (let x = 4; x < 12; x++) p.set(x, 20, '#2c3e52');
  for (let k = 0; k < 8; k++) p.set(3 + Math.round(Math.sin(k / 7 * Math.PI) * 5) + 3, 19 - Math.round(Math.sin(k / 7 * Math.PI) * 4) + 3, '#8a7448');
  return finish(p, 14, 33, seed, 10);
}

export function makeKeg(seed = 6): Prop {
  const p = new Pix(28, 28);
  drawBarrel(p, 14, 24, 6.5, 13, seed, seed % 2 ? 'closed' : 'water', GW);
  return finish(p, 14, 24, seed, 14);
}

/** Slumped sacks: one patched, one split with grain on the floor. */
export function makeSacks(seed = 7): Prop {
  const p = new Pix(40, 32);
  const sack = (cx: number, cy: number, w: number, h: number, s: number, patched: boolean): void => {
    polyFill(p, wobble([[cx - w, cy], [cx - w * 0.8, cy - h * 0.7], [cx - w * 0.3, cy - h], [cx + w * 0.4, cy - h * 0.95], [cx + w * 0.9, cy - h * 0.6], [cx + w, cy]], s, 1.0, 2), (x, y) => {
      const u = (x - cx) / w;
      if (patched && u > 0.1 && u < 0.6 && y > cy - h * 0.6 && y < cy - h * 0.25) return pick(['#2a2a32', '#44444e', '#66666e'], 0.5 + (white(x, y, s) - 0.5) * 0.2, x, y);
      return pick(SACK, 0.7 - u * 0.4 + (fbm(x / 3, y / 2, s) - 0.5) * 0.4 + (white(x, y, s + 1) - 0.5) * 0.14, x, y);
    });
    for (let x = cx - 3; x < cx + 3; x++) p.set(x, Math.round(cy - h * 0.92), SACK[0]);
  };
  sack(11, 28, 9, 17, seed, false);
  sack(26, 29, 10, 13, seed + 1, true);
  sack(20, 18, 8, 12, seed + 2, false);
  for (let i = 0; i < 12; i++) p.set(28 + Math.round(white(i, 0, seed) * 8), 29 + Math.round(white(i, 1, seed) * 2), STRAW[3]);
  return finish(p, 20, 30, seed, 22);
}

export function makeBasket(seed = 8): Prop {
  const p = new Pix(26, 22);
  for (const [x, y, c] of [[9, 8, '#c8c0d0'], [14, 7, '#d8d0e0'], [11, 6, '#c0b8c8']] as const) ellipse(p, x, y, 3.2, 3, (xx, yy) => pick(['#5a3a58', '#8a6a88', c], 0.7 - (yy - y) * 0.1, xx, yy));
  for (let x = 4; x < 21; x++) for (let k = 0; k < 4; k++) p.set(x, 7 + k, '#4a6a30');
  polyFill(p, [[4, 10], [21, 10], [19, 19], [6, 19]], (x, y) => pick(STRAW, 0.36 + ((x + y) % 3 === 0 ? -0.2 : 0.06) + (white(x, y, seed) - 0.5) * 0.3, x, y));
  for (let x = 4; x < 21; x++) p.set(x, 10, STRAW[3]);
  return finish(p, 12, 19, seed, 12);
}

export function makeKindling(seed = 9): Prop {
  const p = new Pix(34, 22);
  for (let row = 0; row < 3; row++) for (let x = 3 + row; x < 30 - row; x += 4) {
    const r = 2 + (white(x, row, seed) < 0.3 ? 1 : 0);
    ellipse(p, x, 18 - row * 4, r, r, (xx, yy) => (Math.hypot(xx - x, yy - (18 - row * 4)) < r - 0.8 ? pick(['#6a5238', '#8a6e4c', '#a88e68'], 0.5 + (white(xx, yy, seed) - 0.5) * 0.4, xx, yy) : pick(GW, 0.4 + (xx < x ? 0.15 : 0), xx, yy)));
  }
  for (let i = 0; i < 5; i++) capsule(p, 8 + i * 4, 19, 12 + i * 4 + (i % 2) * 3, 6 + (i % 3), 0.6, 0.5, GW, seed + i, 0.3);
  return finish(p, 17, 20, seed, 16);
}

/** A wall peg-rail with a ragged cloak and a felt hat. */
export function makeCloakPegs(seed = 10): Prop {
  const p = new Pix(44, 46);
  for (let x = 3; x < 41; x++) for (let y = 2; y < 5; y++) p.set(x, y + Math.round(Math.sin(x * 0.2) * 0.5), woodR(seed, 0.6)(x, y));
  for (const x of [8, 20, 33]) for (let y = 5; y < 8; y++) p.set(x, y, GW[4]);
  polyFill(p, wobble([[6, 5], [19, 5], [21, 30], [17, 43], [11, 38], [8, 44], [4, 32]], seed, 1.2, 2), (x, y) => {
    const fold = Math.sin(x * 0.9 + y * 0.05) * 0.14;
    return pick(['#1e1a16', '#3a3028', '#584a3c', '#7a6a58'], 0.5 + fold - (x - 4) * 0.01 - (y > 36 ? 0.1 : 0) + (white(x, y, seed) - 0.5) * 0.2, x, y);
  });
  polyFill(p, wobble([[26, 5], [34, 5], [36, 13], [24, 13]], seed + 3, 0.6, 2), (x, y) => pick(['#2a2a2e', '#46464c', '#686870'], 0.5 + (white(x, y, seed) - 0.5) * 0.3, x, y));
  for (let x = 22; x < 38; x++) p.set(x, 14, '#3a3a40');
  return finish(p, 22, 45, seed, 0);
}

/** Onions, herbs and a dried fish strung from the rafters. */
export function makeHanging(seed = 11): Prop {
  const p = new Pix(40, 44);
  for (let x = 2; x < 38; x++) p.set(x, 2, GW[3]);
  const hang = (x: number, len: number, kind: 'onion' | 'herb' | 'fish' | 'garlic'): void => {
    for (let y = 3; y < 3 + len; y++) p.set(x, y, '#8a7448');
    const y0 = 3 + len;
    if (kind === 'onion' || kind === 'garlic') {
      for (let k = 0; k < 3; k++) ellipse(p, x + (k % 2 ? 1 : -1), y0 - 6 + k * 5, 2.4, 2.4, (xx, yy) => pick(kind === 'onion' ? ['#5a3a14', '#8a5a1c', '#b8842c', '#dcb050'] : ['#8a8478', '#b8b2a4', '#e0dccc'], 0.7 - (xx - x) * 0.14, xx, yy));
    } else if (kind === 'herb') {
      for (let k = -3; k <= 3; k++) for (let y = y0; y < y0 + 10 - Math.abs(k); y++) p.set(x + k, y, pick(['#2a3a22', '#4a6038', '#7a9058'], 0.5 + (white(x + k, y, seed) - 0.5) * 0.5, k, y));
    } else {
      polyFill(p, [[x - 3, y0], [x + 3, y0], [x + 2, y0 + 12], [x, y0 + 15], [x - 2, y0 + 12]], (xx, yy) => pick(['#4a4a50', '#7a7a82', '#a8a8ae'], 0.55 - (xx - x) * 0.05 + (white(xx, yy, seed) - 0.5) * 0.3, xx, yy));
      p.set(x, y0 + 2, '#101010');
    }
  };
  hang(6, 6, 'onion'); hang(14, 4, 'herb'); hang(22, 8, 'fish'); hang(30, 5, 'garlic'); hang(36, 9, 'herb');
  return finish(p, 20, 43, seed, 0);
}

/**
 * An open hearth, öppen spis: about 55 cm across. A low stone slab, a sooty
 * chimney breast with a beam over a small arched opening, a crooked pot on a
 * chain, a fire of a few sticks. Animated. Small: the opening is 14 px wide.
 */
export function makeCookhearth(seed = 12): Prop {
  const W = 46, H = 54;
  const g = 50;
  const base = new Pix(W, H);
  const bx0 = 12, bx1 = 34, faceY = g - 19; // the breast stands on the back of the slab
  // Chimney breast: daub and plaster, soot-black round the opening and up the middle.
  polyFill(base, wobble([[bx0, faceY], [bx1, faceY], [bx1 - 3, 2], [bx0 + 3, 2]], seed, 0.9, 3), (x, y) => {
    const soot = Math.max(0, 1 - Math.abs(x - 23) / 9) * (1 - (y - 2) / (faceY - 2) * 0.35);
    return pick(['#14100c', '#3a2e22', '#6e5c44', '#a08c68'], 0.82 - soot * 0.62 + (fbm(x / 2.5, y / 3, seed) - 0.5) * 0.4 + (white(x, y, seed) - 0.5) * 0.1, x, y);
  });
  // Stone jambs and the dark opening.
  const ox0 = 16, ox1 = 30, oy0 = faceY - 12;
  for (let y = oy0; y <= faceY; y++) for (const [a, b] of [[bx0, ox0], [ox1, bx1]] as const) for (let x = a; x < b; x++) base.set(x, y, pick(STONE, 0.5 + (white(x >> 1, y >> 1, seed + 2) - 0.5) * 0.5 - (x > 25 ? 0.15 : 0), x, y));
  for (let y = oy0; y <= faceY; y++) for (let x = ox0; x < ox1; x++) {
    const arch = y < oy0 + 3 && Math.abs(x - 23) > 7 - (oy0 + 3 - y) * 0.9;
    base.set(x, y, arch ? STONE[2] : pick(['#050403', '#100b08', '#1e1410'], 0.3 + (faceY - y) * 0.02 + (white(x, y, seed) - 0.5) * 0.3, x, y));
  }
  // A black oak beam over the opening.
  for (let x = bx0 - 1; x <= bx1 + 1; x++) for (let k = 0; k < 3; k++) base.set(x, oy0 - 3 + k, pick(['#0e0a08', '#241a12', '#3e2e20'], 0.5 - k * 0.2 + (white(x, k, seed) - 0.5) * 0.2, x, k));
  // The slab: a low hearthstone, cracked, worn in front.
  box(base, 6, g, 28, 8, 14, stoneP(seed + 1, 0.42), stoneP(seed + 2, 0.4), stoneP(seed + 3, 0.26), STONE[4]);
  stoneWall(base, 6, g - 8, 33, g, seed + 4, STONE, 1);
  const ox = 14 * OBX, oy = 14 * OBY;
  polyFill(base, [[8, g - 8], [32, g - 8], [32 + ox - 2, g - 8 + oy + 2], [8 + ox + 2, g - 8 + oy + 2]], (x, y) => pick(['#1c1612', '#34302c', '#504a44', '#6c665c'], 0.42 + (fbm(x / 2, y / 2, seed + 5) - 0.5) * 0.7, x, y));
  // Ash and half-burnt ends on the slab, a scorch mark.
  for (let i = 0; i < 18; i++) base.set(14 + Math.round(white(i, 0, seed) * 14), g - 8 + Math.round(white(i, 1, seed) * -9), white(i, 2, seed) < 0.5 ? '#2a2622' : '#6a645c');
  // Chain, pot, and the poker leaning on the jamb.
  for (let y = oy0 - 1; y < oy0 + 5; y++) base.set(21, y, y % 2 ? IRON[3] : IRON[1]);
  ellipse(base, 21, oy0 + 7, 4.2, 3.2, (x, y) => pick(IRON, 0.5 - (x - 17) * 0.06 + (y < oy0 + 6 ? 0.2 : 0), x, y));
  for (let x = 17; x < 26; x++) base.set(x, oy0 + 4, IRON[3]);
  capsule(base, 31, faceY, 34, oy0 + 1, 0.5, 0.5, IRON, seed, 0.1);
  // Logs: a few sticks laid across, charred, glowing along their undersides.
  capsule(base, 17, faceY - 1, 29, faceY - 2, 1.3, 1.3, ['#0c0806', '#1e1410', '#34261a', '#4a3828'], seed + 8, 0.3);
  capsule(base, 19, faceY - 4, 28, faceY - 1, 1.1, 1.1, ['#0c0806', '#1e1410', '#34261a', '#4a3828'], seed + 9, 0.3);
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const fr = base.scaled(1);
    fire(fr, 17, 29, faceY - 2, 10, f, seed, (x, y) => y > oy0 + 1 && x >= ox0 && x < ox1);
    // Glow on the stone around the opening and a warm lick up the breast.
    for (let y = oy0 - 4; y <= faceY; y++) for (let x = bx0; x < bx1; x++) {
      if (!fr.alpha(x, y)) continue;
      const c = fr.get(x, y);
      if (c[0] > 190 && c[2] < 150) continue;
      const d = Math.hypot((x - 23) / 13, (y - (faceY - 5)) / 11);
      if (d < 1) { const k = (1 - d) * (0.34 + 0.06 * Math.sin(f)); fr.set(x, y, [c[0] + (255 - c[0]) * k, c[1] + (130 - c[1]) * k * 0.6, c[2] * (1 - k * 0.3), 255]); }
    }
    frames.push(selOutline(fr));
  }
  return { frames, ax: 20, ay: g + 2, shadow: 14, lights: [{ dx: 4, dy: -12, r: 36, color: [1, 0.5, 0.2], flicker: 1 }] as Light[] };
}

/** One warped plank on pegs with a few pots on it. */
export function makeRoughShelf(seed = 13): Prop {
  const p = new Pix(46, 26);
  const pot = (x: number, h: number, w: number): void => {
    for (let y = 18 - h; y < 18; y++) for (let k = 0; k < w; k++) p.set(x + k, y, pick(CLAY, 0.75 - k * (0.9 / w) + (white(x + k, y, seed) - 0.5) * 0.25, x + k, y));
    for (let k = 1; k < w - 1; k++) p.set(x + k, 18 - h - 1, CLAY[1]);
  };
  pot(5, 9, 6); pot(14, 6, 8); pot(26, 11, 5);
  for (let x = 33; x < 42; x++) for (let y = 13; y < 18; y++) if (y - 13 >= Math.abs(x - 37.5) * 0.4) p.set(x, y, pick(GW, 0.6 + (x - 33) * 0.02, x, y));
  capsule(p, 40, 12, 42, 8, 0.5, 0.5, GW, seed, 0.2);
  for (let x = 2; x < 44; x++) { const y = 18 + Math.round(Math.sin(x * 0.12) * 0.8); for (let k = 0; k < 3; k++) p.set(x, y + k, woodR(seed, 0.6)(x, y + k)); }
  for (const x of [8, 38]) for (let y = 21; y < 25; y++) p.set(x, y, GW[2]);
  return finish(p, 23, 25, seed, 0);
}

/** A few small things on the floor: a jug, a bowl and spoon, one boot. */
export function makeClutter(seed = 14): Prop {
  const p = new Pix(44, 18);
  for (let y = 4; y < 14; y++) for (let x = 5; x < 12; x++) {
    const belly = 3.5 + Math.sin(((y - 4) / 10) * Math.PI) * 1.2 - (y < 7 ? 1 : 0);
    if (Math.abs(x - 8.5) < belly) p.set(x, y, pick(CLAY, 0.8 - (x - 5) * 0.12, x, y));
  }
  p.set(13, 7, CLAY[2]); p.set(13, 8, CLAY[2]);
  ellipse(p, 24, 12, 5, 2.4, (x, y) => pick(GW, 0.66 + (y > 12 ? -0.2 : 0.1), x, y));
  ellipse(p, 24, 11, 3.6, 1.4, () => '#2a1c12');
  capsule(p, 27, 11, 33, 8, 0.6, 0.6, GW, seed, 0.2);
  polyFill(p, [[34, 8], [38, 8], [38, 12], [42, 13], [42, 15], [34, 15]], (x, y) => pick(['#1a120e', '#33261c', '#52402e'], 0.5 + (y < 10 ? 0.1 : 0) + (white(x, y, seed) - 0.5) * 0.3, x, y));
  return { ...finish(p, 22, 16, seed, 10), flat: true };
}

/** Straw trodden into the floor. Flat, no outline. */
export function makeStrawBits(seed = 15): Prop {
  const p = new Pix(44, 16);
  const rng = Rng.fromSeed(seed);
  for (let i = 0; i < 26; i++) {
    const x = 3 + rng.int(36), y = 3 + rng.int(10), len = 2 + rng.int(4), dy = rng.int(3) - 1;
    for (let k = 0; k < len; k++) p.set(x + k, y + Math.round((k * dy) / 3), STRAW[1 + rng.int(3)]);
  }
  return still(p, 22, 8, 0, { flat: true });
}

/** A rag rug of whatever strips there were. */
export function makeRagRug(seed = 16): Prop {
  const p = new Pix(46, 26);
  const w = 26, d = 12, ox = d * OBX, oy = d * OBY;
  const x0 = 6, y0 = 22;
  polyFill(p, wobble([[x0, y0], [x0 + w, y0], [x0 + w + ox, y0 + oy], [x0 + ox, y0 + oy]], seed, 0.9, 3), (x, y) => {
    const t = (y0 - y) / -oy;
    const u = x - x0 - t * ox;
    const band = Math.floor(u / 3);
    const pal = [['#3a2a22', '#6a4a3a'], ['#2e3a4a', '#4a5e78'], ['#4a3a2a', '#8a7448'], ['#3a2832', '#6a4a5a']][Math.floor(white(band, 1, seed) * 4)];
    return pick(pal, 0.5 + (white(x, y, seed) - 0.5) * 0.4, x, y);
  });
  grime(p, seed, 0.5, y0);
  return still(p, 20, 18, 0, { flat: true });
}

/** The village furnishing of a one-room house. Small, crowded, nothing matching. */
export function humbleItems(): RoomItem[] {
  return [
    { prop: makeRagRug(), u: 0.5, d: 0.38 },
    { prop: makeStrawBits(), u: 0.3, d: 0.62 },
    { prop: makePallet(), u: 0.18, d: 0.92 },
    { prop: makeCookhearth(), u: 0.82, d: 0.97 },
    { prop: makeRoughShelf(), u: 0.46, d: 0.99, lift: 22 },
    { prop: makeCloakPegs(), u: 0.64, d: 0.99, lift: 4 },
    { prop: makeHanging(), u: 0.26, d: 0.99, lift: 14 },
    { prop: makeBucketBroom(), u: 0.04, d: 0.78 },
    { prop: makeFootlocker(), u: 0.06, d: 0.5 },
    { prop: makeBasket(), u: 0.2, d: 0.2 },
    { prop: makeTrestleTable(), u: 0.5, d: 0.5 },
    { prop: makeStool3(), u: 0.34, d: 0.32 },
    { prop: makeStool3(7), u: 0.66, d: 0.4 },
    { prop: makeClutter(), u: 0.5, d: 0.12 },
    { prop: makeKeg(), u: 0.93, d: 0.5 },
    { prop: makeSacks(), u: 0.9, d: 0.16 },
  ];
}
