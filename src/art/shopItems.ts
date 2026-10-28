import { IRON, STONE, drawBarrel } from './buildings';
import { OBX, OBY, box, ellipse, fire } from './furniture';
import { type Light, type Prop, capsule, fbm, polyFill, pick, selOutline, white, wobble } from './grit';
import { CLAY, GW, SACK, STRAW, WOOL, finish, woodR } from './humble';
import { Pix } from './pix';
import { FRAMES } from './props';

/**
 * What a village trade needs: counters with their goods, a bread oven, drying
 * racks, a loom, a herbalist's bench, an inn's long table and ale kegs, nets and
 * a boat. Same hand as humble.ts: small, worn, patched, and each a little crooked.
 * Interior pieces are 3/4 view like the furniture; the boat, the washing line and
 * the net frame are for outside.
 */

const BREAD = ['#3a2410', '#6a4220', '#9a6430', '#c48c46', '#e0b468'];
const PEW = ['#2a2c32', '#4a4e58', '#7a808c', '#a8aeb8', '#d0d4dc'];
const FISH = ['#252a34', '#445060', '#74869a', '#a6b8c8', '#d6e2ea'];
const DRIED = ['#3a2e20', '#6a5638', '#9a8258', '#c0a878'];
const LEAF = ['#1c2c1a', '#33502a', '#58803c', '#88aa58'];
const MESH = ['#2a2418', '#5a4c30', '#8a7648', '#b09c64'];
const FLOUR = '#e8e2d2';

// --- little goods ----------------------------------------------------------

function loaf(p: Pix, x: number, yb: number, w: number, h: number, seed: number): void {
  ellipse(p, x, yb - h / 2, w / 2, h / 2, (xx, yy) => pick(BREAD, 0.8 - (yy - (yb - h)) * 0.07 - (xx - (x - w / 2)) * 0.012 + (white(xx, yy, seed) - 0.5) * 0.24, xx, yy));
  for (let k = -1; k <= 1; k++) p.set(x + k * Math.max(1, Math.round(w / 4)), Math.round(yb - h * 0.7), BREAD[1]);
  p.set(x - 1, Math.round(yb - h * 0.9), FLOUR);
}

function jar(p: Pix, x: number, yb: number, w: number, h: number, pal: readonly string[], seed: number, lid = '#8a7448'): void {
  for (let y = yb - h; y < yb; y++) {
    for (let k = 0; k < w; k++) {
      const edge = k === 0 ? 0.28 : k === w - 1 ? -0.3 : 0;
      p.set(x + k, y, pick(pal, 0.58 + edge + (white(x + k, y, seed) - 0.5) * 0.18 - (y - (yb - h)) * 0.012, x + k, y));
    }
  }
  for (let k = 1; k < w - 1; k++) p.set(x + k, yb - h - 1, lid);
  p.set(x + 1, yb - h + 2, '#ffffff50');
  if (h > 6) for (let k = 1; k < w - 1; k++) p.set(x + k, yb - Math.round(h * 0.45), '#d8cfae');
}

function tankard(p: Pix, x: number, yb: number, pal: readonly string[] = PEW): void {
  for (let y = yb - 5; y < yb; y++) for (let k = 0; k < 4; k++) p.set(x + k, y, pick(pal, 0.55 + (k === 0 ? 0.25 : k === 3 ? -0.25 : 0) + (y === yb - 5 ? 0.15 : 0), x + k, y));
  for (let k = 0; k < 4; k++) p.set(x + k, yb - 6, '#ece4c8');
  p.set(x + 4, yb - 4, pal[2]); p.set(x + 5, yb - 3, pal[2]); p.set(x + 4, yb - 2, pal[2]);
}

/** A fish lying on its side, head to the left. */
function fishLying(p: Pix, x: number, y: number, len: number, seed: number, pal: readonly string[] = FISH): void {
  for (let k = 0; k < len; k++) {
    const t = k / len;
    const half = t < 0.78 ? 0.7 + Math.sin((t / 0.78) * Math.PI * 0.9) * 1.7 : 0.5 + (1 - t) * 2.6;
    for (let dy = -Math.floor(half); dy <= Math.floor(half); dy++) {
      const belly = dy > half * 0.3 ? 0.18 : dy < -half * 0.5 ? -0.12 : 0;
      p.set(x + k, y + dy, pick(pal, 0.5 - belly + (belly > 0 ? 0.3 : 0) + (white(x + k, y + dy, seed) - 0.5) * 0.2 + (k % 3 === 0 ? 0.06 : 0), x + k, y + dy));
    }
  }
  p.set(x + 1, y - 1, '#0c0c10');
}

/** A split fish hung by the tail, drying. */
function fishHung(p: Pix, x: number, y: number, len: number, seed: number): void {
  for (let k = 0; k < len; k++) {
    const t = k / len;
    const half = t < 0.18 ? 0.8 + t * 6 : 1.9 - (t - 0.18) * 2.0;
    for (let dx = -Math.floor(half); dx <= Math.floor(half); dx++) {
      p.set(x + dx, y + k, pick(DRIED, 0.45 + (dx < 0 ? 0.18 : -0.1) + (k % 4 === 0 ? 0.12 : 0) + (white(x + dx, y + k, seed) - 0.5) * 0.26, x + dx, y + k));
    }
  }
  p.set(x, y + len, '#7a8088'); p.set(x - 1, y + len + 1, '#7a8088'); p.set(x + 1, y + len + 1, '#7a8088');
  p.set(x, y - 1, GW[3]);
}

function scale(p: Pix, x: number, y: number, seed: number): void {
  // A little balance: post, beam, two pans on strings.
  for (let k = 0; k < 9; k++) p.set(x, y - k, IRON[2 + (k & 1)]);
  for (let k = -7; k <= 7; k++) p.set(x + k, y - 9 + (Math.abs(k) > 5 ? 1 : 0), IRON[3]);
  for (const s of [-7, 7]) {
    for (let k = 0; k < 4; k++) p.set(x + s + Math.round(-s / 7 * k * 0.3), y - 8 + k, '#8a8a8e');
    for (let k = -2; k <= 2; k++) p.set(x + s + k, y - 4, IRON[3]);
  }
  p.set(x - 7, y - 5, '#c8a040'); p.set(x + 7, y - 6, '#a8a8b0'); p.set(x, y + 1, GW[1]);
  void seed;
}

// --- counters --------------------------------------------------------------

export type CounterKind = 'bread' | 'general' | 'fish' | 'herbs' | 'cloth' | 'ale';

/** A shop counter, seen from the customer's side, with what the shop sells piled on it. */
export function makeCounter(kind: CounterKind, seed = 20): Prop {
  const p = new Pix(100, 58);
  const g = 54;
  const top = woodR(seed, 0.66), front = woodR(seed + 1, 0.46, true), side = woodR(seed + 2, 0.3);
  box(p, 6, g, 68, 19, 14, top, front, side, GW[5]);
  // Plank joints on the front, a worn foot rail, a repair patch.
  for (let x = 6 + 11; x < 74; x += 11) for (let y = g - 18; y < g; y++) p.set(x, y, GW[0]);
  for (let x = 6; x < 74; x++) { p.set(x, g - 2, GW[1]); p.set(x, g - 3, GW[3]); }
  for (let y = g - 14; y < g - 6; y++) for (let x = 40; x < 49; x++) p.set(x, y, pick(GW, 0.4 + (white(x, y, seed + 7) - 0.5) * 0.3, x, y));
  const y0 = g - 19 - 1; // front edge of the top, goods stand a little behind it
  const gy = y0 - 4;
  switch (kind) {
    case 'bread':
      loaf(p, 18, gy + 2, 14, 7, seed); loaf(p, 33, gy, 15, 8, seed + 1); loaf(p, 48, gy + 1, 13, 6, seed + 2);
      for (const [x, y] of [[58, gy - 2], [62, gy], [66, gy - 2], [60, gy - 5], [64, gy - 4]] as const) ellipse(p, x, y, 2.4, 2, (xx, yy) => pick(BREAD, 0.72 - (yy - y) * 0.1, xx, yy));
      ellipse(p, 80, gy + 3, 4, 1.8, () => FLOUR); // spilled flour
      break;
    case 'general':
      scale(p, 22, gy + 3, seed);
      jar(p, 36, gy + 3, 5, 8, CLAY, seed + 1); jar(p, 43, gy + 3, 5, 6, ['#14201a', '#2a4a38', '#4a7a58'], seed + 2);
      ellipse(p, 60, gy + 2, 6, 2.6, (x, y) => pick(['#2a2218', '#4a3a24', '#6e5836', '#8a7448'], 0.55 + (y < gy + 2 ? 0.2 : -0.1), x, y));
      ellipse(p, 60, gy + 1, 4.4, 1.5, () => '#241a10'); // a coil of rope
      for (let k = 0; k < 4; k++) p.set(54 + k * 3, gy + 1 + (k & 1), '#c8a040');
      break;
    case 'fish':
      ellipse(p, 28, gy + 2, 17, 4, (x, y) => pick(GW, 0.28 + (y > gy + 3 ? 0.14 : 0) + (white(x, y, seed) - 0.5) * 0.12, x, y));
      fishLying(p, 15, gy + 1, 11, seed); fishLying(p, 22, gy + 3, 12, seed + 1); fishLying(p, 29, gy, 11, seed + 2); fishLying(p, 33, gy + 3, 10, seed + 3);
      for (let k = 0; k < 5; k++) p.set(14 + k * 6, gy + 5, '#e8f0f4');
      scale(p, 60, gy + 3, seed + 4);
      for (let x = 70; x < 77; x++) p.set(x, gy + 3, IRON[3]); // knife
      for (let x = 77; x < 81; x++) p.set(x, gy + 3, GW[2]);
      break;
    case 'herbs':
      jar(p, 14, gy + 3, 5, 9, ['#2a1a30', '#5a3a68', '#8a60a0'], seed); jar(p, 21, gy + 3, 5, 7, LEAF, seed + 1); jar(p, 28, gy + 3, 5, 10, ['#3a2a10', '#7a5a1c', '#c89a34'], seed + 2);
      jar(p, 35, gy + 3, 5, 6, CLAY, seed + 3);
      for (let k = 0; k < 4; k++) capsule(p, 52 + k * 2, gy + 4, 56 + k * 3, gy - 2 - (k & 1), 0.8, 0.8, LEAF, seed + k, 0.3);
      ellipse(p, 68, gy + 2, 4.4, 2.4, (x, y) => pick(STONE, 0.5 - (x - 64) * 0.04 + (y > gy + 2 ? -0.2 : 0.12), x, y));
      ellipse(p, 68, gy + 1, 2.8, 1.2, () => '#1c1a16');
      capsule(p, 68, gy + 2, 72, gy - 5, 0.8, 1.2, STONE, seed, 0.1);
      break;
    case 'cloth': {
      const bolts: [number, number, string[]][] = [[14, 5, ['#1c2a44', '#2e4a78', '#4a6ea4']], [24, 8, ['#4a1c20', '#7a2c34', '#a84a50']], [34, 4, ['#2a3a22', '#4a6a38', '#7a9a58']]];
      for (const [x, h, pal] of bolts) for (let y = gy + 3 - h; y < gy + 3; y++) for (let k = 0; k < 9; k++) p.set(x + k, y, pick(pal, 0.5 + (k < 2 ? 0.2 : 0) + ((y - gy) % 2 ? 0.06 : -0.08) + (white(x + k, y, seed) - 0.5) * 0.1, x + k, y));
      for (let k = 0; k < 40; k++) p.set(46 + k, gy + 3 + Math.round(Math.sin(k / 9) * 0.5), '#c8a458'); // measuring rod
      for (let k = 0; k < 40; k += 5) p.set(46 + k, gy + 4, '#3a2a14');
      capsule(p, 56, gy - 1, 62, gy + 3, 0.6, 0.6, IRON, seed, 0.1); capsule(p, 62, gy - 1, 56, gy + 3, 0.6, 0.6, IRON, seed + 1, 0.1);
      break;
    }
    case 'ale':
      for (const [x, y] of [[14, gy + 3], [22, gy + 2], [30, gy + 3], [38, gy + 2]] as const) tankard(p, x, y);
      jar(p, 48, gy + 3, 6, 10, CLAY, seed, '#6a5a38');
      p.set(54, gy - 2, CLAY[2]); p.set(55, gy - 1, CLAY[2]); p.set(54, gy + 1, CLAY[2]);
      ellipse(p, 70, gy + 3, 4, 1.6, () => '#e8e0c8'); ellipse(p, 70, gy + 3, 3, 1, () => '#7a5a22'); // a spilled pool
      break;
  }
  return finish(p, 40, g, seed, 26);
}

// --- bakery ----------------------------------------------------------------

const OVEN = ['#2a1a12', '#4a3022', '#6e4a34', '#92684a', '#b8845e'];

/** A domed clay oven with a sooty mouth, a fire in it, a peel leaning on the iron door. */
export function makeBakeOven(seed = 21): Prop {
  const W = 66, H = 62, g = 58;
  const base = new Pix(W, H);
  box(base, 6, g, 44, 12, 18, (x, y) => pick(STONE, 0.48 + (fbm(x / 3, y / 3, seed) - 0.5) * 0.5, x, y), (x, y) => pick(STONE, 0.4 + (white(x >> 1, y >> 2, seed) - 0.5) * 0.4, x, y), (x, y) => pick(STONE, 0.28 + (white(x >> 1, y >> 1, seed) - 0.5) * 0.3, x, y), STONE[4]);
  const cx = 28, cy = g - 12, rx = 24, ry = 24;
  for (let y = cy - ry; y <= cy; y++) {
    const w = rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
    for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) {
      const u = (x + 0.5 - cx) / rx;
      const row = Math.floor((y - cy + ry) / 4);
      const brick = (x + (row % 2) * 4) % 8 === 0 || (y - cy + ry) % 4 === 0;
      base.set(x, y, pick(OVEN, 0.7 - u * 0.4 + (brick ? -0.2 : 0) + (fbm(x / 3, y / 3, seed) - 0.5) * 0.3 + (white(x, y, seed + 1) - 0.5) * 0.1, x, y));
    }
  }
  const mx0 = 18, mx1 = 36, my0 = g - 30;
  for (let y = my0; y <= g - 12; y++) for (let x = mx0; x <= mx1; x++) {
    const arch = y < my0 + 5 && Math.abs(x - 27) > 8 - (my0 + 5 - y) * 0.9;
    if (arch) continue;
    base.set(x, y, pick(['#050403', '#100b08', '#1c120c'], 0.25 + (g - 12 - y) * 0.02 + (white(x, y, seed) - 0.5) * 0.3, x, y));
  }
  for (let x = mx0 - 1; x <= mx1 + 1; x++) { base.set(x, my0 - 1, '#16100c'); base.set(x, my0 - 2, '#2a1e16'); }
  for (let y = my0 + 4; y <= g - 11; y++) { base.set(mx0 - 1, y, '#16100c'); base.set(mx1 + 1, y, '#16100c'); }
  // A stub of stovepipe on top and the soot above the mouth.
  for (let y = 2; y < 9; y++) for (let x = 25; x < 31; x++) base.set(x, y, pick(IRON, 0.5 - (x - 25) * 0.1 + (white(x, y, seed) - 0.5) * 0.2, x, y));
  for (let x = 24; x < 32; x++) base.set(x, 2, IRON[4]);
  // Iron door leaning against the platform, and the long peel.
  polyFill(base, [[52, g - 1], [60, g - 1], [60, g - 22], [52, g - 22]], (x, y) => pick(IRON, 0.5 - (x - 52) * 0.05 + (white(x, y, seed) - 0.5) * 0.2, x, y));
  ellipse(base, 56, g - 12, 1.4, 1.4, () => '#101216');
  capsule(base, 49, g - 2, 46, 6, 0.9, 0.9, GW, seed, 0.2);
  polyFill(base, [[43, 4], [49, 4], [49, 12], [43, 12]], (x, y) => pick(GW, 0.55 + (white(x, y, seed) - 0.5) * 0.3, x, y));
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const fr = base.scaled(1);
    fire(fr, mx0 + 2, mx1 - 2, g - 13, 9, f, seed, (_x, y) => y > my0 + 2);
    for (let y = my0 - 3; y < g - 8; y++) for (let x = 12; x < 44; x++) {
      if (!fr.alpha(x, y)) continue;
      const c = fr.get(x, y);
      if (c[0] > 190 && c[2] < 150) continue;
      const d = Math.hypot((x - 27) / 14, (y - (g - 18)) / 12);
      if (d < 1) { const k = (1 - d) * (0.3 + 0.05 * Math.sin(f)); fr.set(x, y, [c[0] + (255 - c[0]) * k, c[1] + (130 - c[1]) * k * 0.6, c[2] * (1 - k * 0.3), 255]); }
    }
    frames.push(selOutline(fr));
  }
  return { frames, ax: 28, ay: g + 2, shadow: 22, lights: [{ dx: 0, dy: -20, r: 42, color: [1, 0.52, 0.2], flicker: 1 }] as Light[] };
}

/** A long kneading trough on four legs, dough rising in it, flour all over. */
export function makeKneadTrough(seed = 22): Prop {
  const p = new Pix(80, 44);
  const g = 40;
  for (const x of [10, 52]) { capsule(p, x, 22, x - 1, g, 1.4, 1.6, GW, seed + x, 0.25); capsule(p, x + 9, 20, x + 10, g - 5, 1.2, 1.4, GW, seed + x + 3, 0.25); }
  box(p, 6, 22, 56, 10, 18, woodR(seed, 0.5), woodR(seed + 1, 0.46, true), woodR(seed + 2, 0.3), GW[5]);
  const ox = 18 * OBX, oy = 18 * OBY;
  polyFill(p, [[9, 14], [59, 14], [59 + ox - 3, 14 + oy + 3], [9 + ox + 3, 14 + oy + 3]], (x, y) => pick(GW, 0.2 + (y - 8) * 0.03 + (white(x, y, seed) - 0.5) * 0.14, x, y));
  ellipse(p, 28, 11, 15, 3.6, (x, y) => pick(['#8a7e64', '#b8ac8c', '#dcd2b2', '#efe8d0'], 0.7 - (y - 9) * 0.1 + (fbm(x / 3, y / 2, seed) - 0.5) * 0.4, x, y));
  for (let k = 0; k < 14; k++) p.set(12 + Math.round(white(k, 0, seed) * 40), 8 + Math.round(white(k, 1, seed) * 8), FLOUR);
  capsule(p, 58, 18, 69, 22, 1.4, 1.4, ['#4a3622', '#7a5a38', '#a07c50', '#c0a070'], seed, 0.2);
  ellipse(p, 72, 36, 5, 1.8, () => FLOUR);
  return finish(p, 36, g, seed, 28);
}

// --- walls -----------------------------------------------------------------

export type ShelfKind = 'loaves' | 'jars' | 'bolts' | 'tankards' | 'wares' | 'bottles';

/** Two planks on pegs, with the shop's goods on them. Hangs on the back wall. */
export function makeWallShelves(kind: ShelfKind, seed = 23): Prop {
  const p = new Pix(76, 44);
  const planks = [20, 40];
  for (const yb of planks) {
    for (let x = 2; x < 74; x++) { const y = yb + Math.round(Math.sin(x * 0.1 + seed) * 0.7); for (let k = 0; k < 3; k++) p.set(x, y + k, woodR(seed, 0.6)(x, y + k)); }
    for (const x of [10, 64]) for (let y = yb + 3; y < yb + 7; y++) p.set(x, y, GW[2]);
  }
  const [t1, t2] = planks;
  switch (kind) {
    case 'loaves':
      for (let x = 8; x < 66; x += 14) loaf(p, x + 6, t1, 12, 7 + (x % 3), seed + x);
      for (let x = 10; x < 62; x += 9) ellipse(p, x + 4, t2 - 3, 3.6, 3, (xx, yy) => pick(BREAD, 0.7 - (yy - (t2 - 6)) * 0.12 + (white(x, 0, seed) - 0.5) * 0.3, xx, yy));
      break;
    case 'jars':
      for (let x = 7, i = 0; x < 66; x += 8, i++) jar(p, x, t1, 5, 6 + (i % 3) * 2, [CLAY, LEAF, ['#2a1a30', '#5a3a68', '#8a60a0'], ['#3a2a10', '#7a5a1c', '#c89a34']][i % 4], seed + i);
      for (let x = 7, i = 0; x < 66; x += 7, i++) jar(p, x, t2, 5, 9 - (i % 3) * 2, [['#3a2a10', '#7a5a1c', '#c89a34'], CLAY, LEAF, ['#2a1a30', '#5a3a68', '#8a60a0']][i % 4], seed + 20 + i);
      break;
    case 'bolts': {
      const cols = [['#1c2a44', '#2e4a78', '#4a6ea4'], ['#4a1c20', '#7a2c34', '#a84a50'], ['#2a3a22', '#4a6a38', '#7a9a58'], ['#4a3a14', '#8a7028', '#c0a448'], ['#34283e', '#5e4a74', '#8a74a4']];
      for (let x = 7, i = 0; x < 66; x += 12, i++) for (let y = t1 - 11; y < t1; y++) for (let k = 0; k < 10; k++) p.set(x + k, y, pick(cols[i % 5], 0.5 + (k < 2 ? 0.22 : k > 7 ? -0.2 : 0) + (y % 2 ? 0.05 : -0.05) + (white(x + k, y, seed) - 0.5) * 0.08, x + k, y));
      for (let x = 9, i = 2; x < 66; x += 15, i++) for (let y = t2 - 8; y < t2; y++) for (let k = 0; k < 13; k++) p.set(x + k, y, pick(cols[i % 5], 0.46 + (k < 2 ? 0.2 : 0) + (y % 2 ? 0.05 : -0.06), x + k, y));
      break;
    }
    case 'tankards':
      for (let x = 8; x < 66; x += 7) tankard(p, x, t1);
      for (let x = 8, i = 0; x < 66; x += 12, i++) jar(p, x, t2, 6, 8 + (i & 1) * 2, CLAY, seed + i, '#6a5a38');
      break;
    case 'bottles':
      for (let x = 8, i = 0; x < 66; x += 6, i++) { jar(p, x, t1, 3, 7 + (i % 3), [['#14301c', '#2a6038', '#58a068'], ['#2a1a10', '#5a3418', '#8a5428'], ['#142a38', '#2c5a78', '#5a98b8']][i % 3], seed + i, '#c8b890'); }
      for (let x = 7, i = 0; x < 66; x += 9, i++) jar(p, x, t2, 6, 6, CLAY, seed + i);
      break;
    case 'wares':
      for (let x = 8; x < 40; x += 10) ellipse(p, x + 4, t1 - 4, 4.4, 4, (xx, yy) => pick(CLAY, 0.7 - (xx - x) * 0.07 + (yy < t1 - 6 ? 0.1 : -0.1), xx, yy)); // bowls and pots
      for (let x = 44; x < 68; x += 8) jar(p, x, t1, 5, 7, ['#3a2a10', '#7a5a1c', '#c89a34'], seed + x);
      for (let x = 8; x < 66; x += 13) { for (let y = t2 - 8; y < t2; y++) for (let k = 0; k < 9; k++) p.set(x + k, y, pick(WOOL, 0.5 + (k < 2 ? 0.2 : 0) + (y % 3 ? 0 : -0.15), x + k, y)); }
      break;
  }
  return finish(p, 38, 43, seed, 0);
}

/** Hooks on a board: a pan, a rope coil, a lantern, a straw hat, a sickle, boots. */
export function makeHooks(seed = 24): Prop {
  const p = new Pix(76, 56);
  for (let x = 3; x < 73; x++) for (let y = 3; y < 7; y++) p.set(x, y, woodR(seed, 0.58)(x, y));
  for (let x = 4; x < 72; x += 5) { p.set(x, 7, GW[1]); }
  const hook = (x: number): void => { for (let k = 0; k < 3; k++) p.set(x, 7 + k, IRON[3]); p.set(x + 1, 9, IRON[3]); };
  for (const x of [10, 22, 34, 46, 58, 68]) hook(x);
  ellipse(p, 10, 22, 6.5, 6, (x, y) => pick(IRON, 0.5 - (x - 4) * 0.04 + (Math.hypot(x - 10, y - 22) > 4.4 ? 0.1 : -0.2), x, y)); // pan
  for (let k = 0; k < 8; k++) p.set(10, 9 + k, IRON[2]);
  capsule(p, 10, 28, 10, 36, 0.8, 0.8, GW, seed, 0.2);
  ellipse(p, 22, 22, 6, 7, (x, y) => (Math.hypot((x - 22) / 6, (y - 22) / 7) > 0.5 ? pick(['#2a2218', '#4a3a24', '#7a6238', '#a08848'], 0.7 - (x - 16) * 0.05 + (white(x, y, seed) - 0.5) * 0.25, x, y) : '#201810')); // rope coil
  for (let y = 9; y < 14; y++) p.set(22, y, '#8a7448');
  polyFill(p, [[31, 16], [38, 16], [39, 30], [30, 30]], (x, y) => (y > 18 && y < 28 && x > 31 && x < 38 ? pick(['#a07018', '#e8a830', '#ffe08a'], 0.7 - Math.abs(x - 34.5) * 0.12, x, y) : pick(IRON, 0.4 - (x - 30) * 0.03, x, y))); // lantern
  for (let x = 32; x < 38; x++) p.set(x, 15, IRON[3]);
  ellipse(p, 46, 27, 8, 2.6, (x, y) => pick(STRAW, 0.7 - (y - 25) * 0.1 + (white(x, y, seed) - 0.5) * 0.3, x, y));
  ellipse(p, 46, 22, 4.6, 4.6, (x, y) => pick(STRAW, 0.7 - (x - 41) * 0.05 + (white(x, y, seed + 1) - 0.5) * 0.3, x, y));
  for (let y = 9; y < 18; y++) p.set(46, y, '#8a7448');
  for (let k = 0; k < 14; k++) { const a = -0.4 + k * 0.1; p.set(Math.round(58 + Math.cos(a) * 9 - 2), Math.round(18 + Math.sin(a) * 9 + 4 - k * 0.6), IRON[4 - (k > 8 ? 1 : 0)]); }
  capsule(p, 56, 26, 55, 33, 0.9, 0.9, GW, seed + 3, 0.2);
  for (const [x, y] of [[66, 12], [71, 14]] as const) polyFill(p, [[x - 2, y], [x + 2, y], [x + 2, y + 10], [x + 5, y + 14], [x - 2, y + 14]], (xx, yy) => pick(['#1a120e', '#33261c', '#52402e'], 0.55 - (xx - x) * 0.06 + (white(xx, yy, seed) - 0.5) * 0.2, xx, yy));
  return finish(p, 38, 55, seed, 0, { lights: [{ dx: -4, dy: -24, r: 16, color: [1, 0.8, 0.4], flicker: 0.6 }] as Light[] });
}

// --- fish --------------------------------------------------------------------

/** A drying rack: two posts, three poles, rows of split fish hung by the tails. */
export function makeFishRack(seed = 25): Prop {
  const p = new Pix(76, 70);
  const g = 66;
  const bars = [14, 29, 44];
  for (const x of [6, 66]) { capsule(p, x, g, x + 1, 6, 1.5, 1.4, GW, seed + x, 0.25); capsule(p, x - 4, g + 1, x + 3, g - 14, 0.8, 0.8, GW, seed + x + 2, 0.2); }
  bars.forEach((y, i) => {
    capsule(p, 4, y, 70, y + (i % 2), 1, 1, GW, seed + i, 0.25);
    for (let x = 12 + (i % 2) * 3; x < 62; x += 7) fishHung(p, x, y + 1, 10 + Math.round(white(x, i, seed) * 3), seed + x + i);
  });
  return finish(p, 38, g, seed, 24);
}

/** Two tubs of the morning's catch, silver and slimy, with a scoop. */
export function makeFishTubs(seed = 26): Prop {
  const p = new Pix(64, 40);
  for (const [cx, rx, h, s] of [[18, 11, 15, seed], [44, 10, 12, seed + 3]] as const) {
    drawBarrel(p, cx, 36, rx, h, s, 'open', GW);
    const ry = Math.max(2, Math.round(rx * 0.42));
    const topCy = 36 - ry - h;
    ellipse(p, cx, topCy, rx - 2, ry - 0.5, (x, y) => pick(['#14202a', '#2a4050', '#4a6a7e'], 0.4 + (y - topCy) * 0.1, x, y));
    for (let k = 0; k < 6; k++) fishLying(p, cx - rx + 3 + Math.round(white(k, 0, s) * (rx - 2)), topCy - 1 + Math.round(white(k, 1, s) * 2), 6 + (k % 2), s + k);
  }
  capsule(p, 58, 36, 54, 24, 0.7, 0.7, GW, seed, 0.2);
  ellipse(p, 53, 22, 3.4, 2.4, (x, y) => pick(GW, 0.5 + (y > 22 ? -0.2 : 0.1), x, y));
  for (let k = 0; k < 6; k++) p.set(30 + k * 2, 37, '#9ab4c4');
  return finish(p, 32, 37, seed, 24);
}

/** A heap of net with cork floats and a fraying rope end. */
export function makeNetHeap(seed = 27): Prop {
  const p = new Pix(60, 36);
  polyFill(p, wobble([[3, 32], [8, 17], [20, 7], [36, 6], [50, 14], [57, 32]], seed, 1.4, 3), (x, y) => {
    const cell = ((x >> 1) + (y >> 1)) % 3 === 0;
    const hole = ((x + y * 2) % 5 === 0) && white(x, y, seed) < 0.5;
    if (hole) return null;
    return pick(MESH, 0.55 - (y - 6) * 0.012 + (cell ? 0.18 : -0.12) + (fbm(x / 4, y / 4, seed) - 0.5) * 0.4, x, y);
  });
  for (const [x, y] of [[14, 20], [28, 12], [40, 18], [24, 26], [46, 27]] as const) ellipse(p, x, y, 2.4, 2, (xx, yy) => pick(['#4a3418', '#8a6a38', '#c4a468'], 0.7 - (xx - x) * 0.15 + (yy - y) * 0.1, xx, yy));
  capsule(p, 46, 31, 56, 33, 1, 1, ['#2a2218', '#5a4a2c', '#8a7448'], seed, 0.3);
  return finish(p, 30, 33, seed, 22);
}

/** A net spread on the wall: a pole, a sagging mesh, a row of floats along the top. */
export function makeHungNet(seed = 28): Prop {
  const p = new Pix(60, 56);
  capsule(p, 2, 4, 58, 4, 1.2, 1.2, GW, seed, 0.3);
  polyFill(p, wobble([[4, 5], [56, 5], [54, 36], [44, 48], [30, 52], [14, 46], [6, 34]], seed, 1.2, 3), (x, y) => {
    const a = (x + y) % 5 === 0, b = (x - y + 100) % 5 === 0;
    if (!a && !b) return white(x, y, seed) < 0.1 ? MESH[0] : null;
    return pick(MESH, 0.55 + (a && b ? 0.2 : 0) - (y * 0.004) + (white(x, y, seed + 1) - 0.5) * 0.3, x, y);
  });
  for (let x = 8; x < 56; x += 7) ellipse(p, x, 8, 2, 1.8, (xx, yy) => pick(['#4a3418', '#8a6a38', '#c4a468'], 0.7 - (xx - x) * 0.2, xx, yy));
  for (let x = 12; x < 52; x += 10) p.set(x, 44 - Math.round(Math.abs(x - 30) * 0.3), '#6a6a72');
  return finish(p, 30, 55, seed, 0);
}

// --- weaving & herbs ---------------------------------------------------------

/** An upright loom, half a bolt woven, a bench to sit on. */
export function makeLoom(seed = 29): Prop {
  const p = new Pix(74, 78);
  const g = 74;
  for (const x of [10, 54]) { capsule(p, x, g, x, 6, 2, 2, GW, seed + x, 0.25); capsule(p, x - 5, g + 1, x + 4, g - 12, 1, 1, GW, seed + x + 1, 0.2); }
  capsule(p, 6, 8, 60, 8, 1.8, 1.8, GW, seed + 5, 0.25);
  capsule(p, 8, 54, 58, 54, 1.6, 1.6, GW, seed + 6, 0.25);
  // Warp: fine pale threads, with a slack in them. Woven part below.
  for (let x = 13; x < 53; x += 2) for (let y = 10; y < 34; y++) p.set(x, y, pick(['#6a645a', '#a8a090', '#d4ccb8'], 0.4 + (x % 4 ? 0.2 : 0), x, y));
  const pal = [['#10182a', '#1c2a44', '#2e4a78'], ['#1c2a44', '#2e4a78', '#4a6ea4'], ['#6a645a', '#a8a090', '#d4ccb8'], ['#4a1c20', '#7a2c34', '#a84a50']];
  for (let y = 34; y < 54; y++) for (let x = 13; x < 53; x++) {
    const stripe = [0, 1, 0, 2, 3, 2, 0, 1][Math.floor((x - 13) / 5) % 8];
    p.set(x, y, pick(pal[stripe], 0.5 + (y % 2 ? 0.14 : -0.1) + ((x + y) % 4 === 0 ? 0.1 : 0) + (white(x, y, seed) - 0.5) * 0.12, x, y));
  }
  capsule(p, 12, 32, 54, 33, 1.2, 1.2, ['#4a3622', '#7a5a38', '#a07c50', '#c0a070'], seed + 8, 0.3);
  capsule(p, 12, 22, 54, 22, 0.8, 0.8, GW, seed + 9, 0.3);
  // A shuttle and a stool with a cushion of folded wool.
  capsule(p, 46, 50, 52, 52, 0.9, 0.9, ['#2a1c10', '#6a4a2a', '#a07c50'], seed, 0.2);
  for (const [x, dx] of [[28, -2], [42, 2], [35, 0]] as const) capsule(p, x, g - 15, x + dx, g, 1.2, 1.4, GW, seed + x, 0.3);
  ellipse(p, 35, g - 16, 9, 3.2, (x, y) => pick(GW, 0.6 + (y > g - 16 ? -0.2 : 0.08) + (white(x, y, seed) - 0.5) * 0.2, x, y));
  return finish(p, 37, g, seed, 24);
}

/** The herbalist's bench: mortar and pestle, jars, cut herbs, a little balance, a candle. */
export function makeMortarBench(seed = 30): Prop {
  const p = new Pix(96, 58);
  const g = 54;
  for (const x of [10, 62]) { capsule(p, x + 1, 30, x - 3, g, 1.3, 1.5, GW, seed + x, 0.3); capsule(p, x + 1, 30, x + 6, g, 1.3, 1.5, GW, seed + x + 1, 0.3); }
  box(p, 4, 32, 70, 3, 20, woodR(seed, 0.66), woodR(seed + 1, 0.46), woodR(seed + 2, 0.3), null);
  const y = 28;
  ellipse(p, 18, y - 2, 6, 3.4, (x, yy) => pick(STONE, 0.55 - (x - 12) * 0.03 + (yy > y - 2 ? -0.2 : 0.12), x, yy));
  ellipse(p, 18, y - 3, 3.8, 1.8, () => '#1c1a16');
  capsule(p, 19, y - 3, 24, y - 12, 1, 1.5, STONE, seed, 0.1);
  jar(p, 32, y + 1, 5, 9, ['#2a1a30', '#5a3a68', '#8a60a0'], seed); jar(p, 39, y + 1, 5, 7, LEAF, seed + 1); jar(p, 46, y + 1, 5, 11, ['#3a2a10', '#7a5a1c', '#c89a34'], seed + 2);
  for (let k = 0; k < 5; k++) capsule(p, 56 + k, y + 3, 64 + k * 2, y - 2 + (k & 1), 0.8, 0.8, LEAF, seed + k, 0.3);
  for (let k = 0; k < 6; k++) p.set(58 + k * 2, y - 3 + (k & 1), k % 2 ? '#c8a8d8' : '#e8d070'); // blossoms
  scale(p, 22, y + 4, seed);
  jar(p, 6, y + 2, 4, 9, ['#142a38', '#2c5a78', '#5a98b8'], seed + 4, '#c8b890');
  for (let yy = y - 8; yy < y + 2; yy++) p.set(70, yy, '#e8dcc0');
  p.set(70, y - 9, '#ffd060'); p.set(70, y - 10, '#fff2b0');
  return finish(p, 40, g, seed, 30, { lights: [{ dx: 30, dy: -42, r: 20, color: [1, 0.78, 0.4], flicker: 0.8 }] as Light[] });
}

/** Bunches of herbs, flowers and garlic hung to dry from a beam. */
export function makeHerbRack(seed = 31): Prop {
  const p = new Pix(72, 52);
  capsule(p, 2, 3, 70, 4, 1.4, 1.4, GW, seed, 0.3);
  const kinds: [string[], number][] = [[LEAF, 12], [['#3a3a2c', '#5e6a4a', '#8a9a72'], 14], [['#2a1a34', '#5a3c70', '#9a74b8'], 11], [['#4a3a10', '#8a7220', '#d8bc48'], 10], [['#4a1c20', '#7a2c30', '#b04a50'], 9], [['#6a6258', '#aaa292', '#e0d8c4'], 8], [LEAF, 13]];
  kinds.forEach(([pal, len], i) => {
    const x = 6 + i * 9;
    for (let y = 4; y < 4 + 5 + (i % 3) * 2; y++) p.set(x, y, '#8a7448');
    const y0 = 9 + (i % 3) * 2;
    for (let k = -3; k <= 3; k++) for (let y = y0; y < y0 + len - Math.abs(k) * 1.6; y++) p.set(x + k, y, pick(pal, 0.55 + (k < 0 ? 0.14 : -0.1) + (white(x + k, y, seed) - 0.5) * 0.45, x + k, y));
    for (let k = 0; k < 3; k++) p.set(x - 1 + k, y0 + 1, '#8a7448');
  });
  return finish(p, 36, 51, seed, 0);
}

// --- inn ---------------------------------------------------------------------

/** A long trestle table with tankards, bowls, a loaf and a guttering candle. */
export function makeLongTable(seed = 32): Prop {
  const p = new Pix(120, 58);
  const g = 54;
  for (const x of [10, 78]) { capsule(p, x + 1, 30, x - 4, g, 1.4, 1.6, GW, seed + x, 0.3); capsule(p, x + 1, 30, x + 6, g, 1.4, 1.6, GW, seed + x + 1, 0.3); }
  capsule(p, 12, g - 6, 86, g - 6, 0.8, 0.8, GW, seed, 0.3);
  box(p, 4, 32, 94, 3, 18, woodR(seed, 0.64), woodR(seed + 1, 0.44), woodR(seed + 2, 0.28), null);
  for (let x = 4; x < 98; x += 13) for (let y = 18; y < 22; y++) p.set(x + (y & 1), y, GW[1]); // plank joints on top
  const y = 26;
  for (const x of [14, 30, 52, 72]) tankard(p, x, y + (x % 3));
  ellipse(p, 42, y - 1, 5, 2, (x, yy) => pick(CLAY, 0.6 - (x - 37) * 0.04 + (yy > y - 1 ? -0.15 : 0.1), x, yy));
  ellipse(p, 42, y - 2, 3.6, 1.2, () => '#7a5a22');
  loaf(p, 62, y + 1, 11, 6, seed);
  ellipse(p, 86, y - 1, 5, 2, (x, yy) => pick(CLAY, 0.6 - (x - 81) * 0.04 + (yy > y - 1 ? -0.15 : 0.1), x, yy));
  for (let yy = y - 8; yy < y; yy++) p.set(23, yy, '#e8dcc0');
  p.set(23, y - 9, '#ffd060'); p.set(23, y - 10, '#fff2b0');
  return finish(p, 56, g, seed, 34, { lights: [{ dx: -33, dy: -44, r: 24, color: [1, 0.78, 0.4], flicker: 0.8 }] as Light[] });
}

/** A plank bench, scarred where boots and tankards have scraped it. */
export function makeInnBench(seed = 33, len = 84): Prop {
  const p = new Pix(len + 14, 30);
  const g = 26;
  for (const x of [8, len - 8]) { capsule(p, x, 12, x - 1, g, 1.3, 1.5, GW, seed + x, 0.3); capsule(p, x + 4, 11, x + 5, g - 3, 1.2, 1.3, GW, seed + x + 1, 0.3); }
  box(p, 3, 14, len - 4, 3, 8, woodR(seed, 0.6), woodR(seed + 1, 0.42), woodR(seed + 2, 0.28), null);
  for (let i = 0; i < 6; i++) p.set(8 + Math.round(white(i, 0, seed) * (len - 16)), 8 + Math.round(white(i, 1, seed) * 3), GW[1]);
  return finish(p, (len + 14) / 2, g, seed, 20);
}

/** Three kegs of ale stacked, one tapped, a mug under the spigot, a wet patch. */
export function makeAleKegs(seed = 34): Prop {
  const p = new Pix(62, 56);
  drawBarrel(p, 17, 50, 9, 18, seed, 'closed', GW);
  drawBarrel(p, 41, 50, 9, 18, seed + 1, 'closed', GW);
  drawBarrel(p, 29, 36, 9, 17, seed + 2, 'closed', GW);
  for (let y = 40; y < 43; y++) p.set(21, y, '#c8a040');
  p.set(22, 41, '#c8a040'); p.set(22, 42, '#a07820');
  for (let y = 43; y < 47; y++) p.set(22, y, '#7a5a22');
  tankard(p, 20, 52, GW);
  ellipse(p, 22, 52, 7, 1.8, () => '#2a1a10');
  return finish(p, 31, 52, seed, 30);
}

// --- general store -----------------------------------------------------------

/** Open crates of turnips, apples and cabbages, and a slumped sack of meal. */
export function makeCrateStack(seed = 35): Prop {
  const p = new Pix(84, 44);
  const g = 40;
  const crate = (x: number, y: number, w: number, goods: 'turnip' | 'apple' | 'cabbage', s: number): void => {
    box(p, x, y, w, 12, 12, woodR(s, 0.6), woodR(s + 1, 0.42, true), woodR(s + 2, 0.28), GW[5]);
    const ox = 12 * OBX;
    const cy = y - 12;
    for (let i = 0; i < 7; i++) {
      const gx = x + 3 + Math.round(white(i, 0, s) * (w - 5)) + Math.round(ox * 0.4), gy2 = cy + Math.round(white(i, 1, s) * 2) - 3;
      const pal = goods === 'turnip' ? ['#4a2a4e', '#8a5a8e', '#e8e0d4'] : goods === 'apple' ? ['#5a1812', '#a8322a', '#d86448'] : ['#26421e', '#4a7a36', '#8ab060'];
      ellipse(p, gx, gy2, 3, 2.6, (xx, yy) => pick(pal, 0.74 - (xx - gx) * 0.1 - (yy - gy2) * 0.06 + (white(xx, yy, s) - 0.5) * 0.2, xx, yy));
    }
  };
  crate(6, g, 26, 'turnip', seed); crate(36, g, 22, 'apple', seed + 5);
  crate(18, g - 12, 22, 'cabbage', seed + 9);
  polyFill(p, wobble([[60, g], [58, g - 16], [66, g - 24], [76, g - 22], [80, g - 10], [80, g]], seed, 1, 2), (x, y) => pick(SACK, 0.7 - (x - 58) * 0.014 + (fbm(x / 3, y / 2, seed) - 0.5) * 0.4, x, y));
  for (let x = 64; x < 74; x++) p.set(x, g - 23, SACK[0]);
  return finish(p, 42, g, seed, 30);
}

// --- outside -----------------------------------------------------------------

/** A clinker rowboat pulled up on the bank, oars shipped, a coil of line in the bottom. */
export function makeRowboat(seed = 36): Prop {
  const p = new Pix(120, 54);
  const g = 48;
  // Hull from the side, a touch from above: stern left, bow right and higher.
  const hull: [number, number][] = [[6, 22], [20, 34], [48, 41], [84, 38], [106, 24], [112, 12], [100, 20], [60, 25], [22, 22]];
  polyFill(p, hull, (x, y) => {
    const lap = Math.floor((y - 12) / 5);
    const lit = (y - 12) % 5 === 0 ? 0.2 : (y - 12) % 5 === 4 ? -0.22 : 0;
    return pick(['#10161c', '#1c2a34', '#2e4658', '#4a6a7c', '#6e8c9a'], 0.34 + lit + (white(lap, Math.floor(x / 14), seed) - 0.5) * 0.12 + (fbm(x / 6, y / 2, seed) - 0.5) * 0.3 - (x - 6) * 0.001, x, y);
  });
  // Inside: dark hollow with a thwart or two, line and a bailer.
  polyFill(p, [[10, 21], [100, 17], [96, 24], [60, 26], [22, 24]], (x, y) => pick(GW, 0.26 + (y - 17) * 0.03 + (white(x, y, seed) - 0.5) * 0.14, x, y));
  for (const x of [36, 66]) capsule(p, x, 20, x + 4, 26, 1.2, 1.2, GW, seed + x, 0.3);
  ellipse(p, 52, 24, 5, 1.8, () => '#8a7448');
  // Gunwale rail, a bow post, and the two oars laid along the side.
  for (let x = 8; x < 108; x++) { const y = Math.round(21 - (x - 8) * 0.085 + Math.sin(x * 0.2) * 0.3); for (let k = 0; k < 2; k++) p.set(x, y + k, GW[3 + k]); }
  capsule(p, 108, 14, 112, 8, 1.2, 1, GW, seed, 0.3);
  capsule(p, 14, 40, 96, 46, 0.9, 0.9, GW, seed + 1, 0.3);
  polyFill(p, [[96, 44], [106, 45], [106, 49], [96, 48]], (x, y) => pick(GW, 0.62 - (y - 44) * 0.06, x, y));
  mossBelow(p, seed);
  return finish(p, 60, g, seed, 56);
}

function mossBelow(p: Pix, seed: number): void {
  for (let x = 14; x < 100; x++) for (let y = 30; y < 42; y++) if (p.alpha(x, y) && fbm(x / 5, y / 3, seed + 9) > 0.7) p.set(x, y, pick(LEAF, 0.4, x, y));
}

/** A washing line between two poles; the laundry sways. */
export function makeWashLine(seed = 37): Prop {
  const W = 104, H = 66;
  const base = new Pix(W, H);
  const g = 62;
  for (const x of [6, 96]) capsule(base, x, g, x + 1, 8, 1.5, 1.3, GW, seed + x, 0.3);
  const cloths: [number, number, number, number, string[]][] = [
    [18, 9, 13, 16, ['#8a8478', '#c8c2b2', '#ece6d6']], [38, 10, 11, 22, ['#1c2a44', '#2e4a78', '#4a6ea4']],
    [56, 11, 15, 12, ['#8a7a60', '#c8b890', '#e8dcb4']], [76, 12, 11, 20, ['#4a1c20', '#7a2c34', '#a84a50']],
  ];
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const fr = new Pix(W, H);
    fr.blit(base, 0, 0);
    const a = (f / FRAMES) * Math.PI * 2;
    // The line sags between the poles.
    const lineY = (x: number): number => 8 + Math.round(Math.sin(((x - 6) / 90) * Math.PI) * 4);
    for (let x = 6; x <= 96; x++) fr.set(x, lineY(x), '#8a7448');
    cloths.forEach(([x0, , w, h, pal], i) => {
      const top = lineY(x0 + w / 2) + 1;
      for (let y = 0; y < h; y++) for (let k = 0; k < w; k++) {
        const sway = Math.round(Math.sin(a + i * 1.7) * 1.8 * (y / h));
        const fold = Math.sin(k * 0.9 + i) * 0.14;
        fr.set(x0 + k + sway, top + y, pick(pal, 0.58 + fold + (k < 2 ? 0.14 : k > w - 3 ? -0.14 : 0) + (white(k, y, seed + i) - 0.5) * 0.1, k, y));
      }
      for (const k of [1, w - 2]) fr.set(x0 + k, top - 1, '#6a5a38');
    });
    frames.push(selOutline(fr));
  }
  return { frames, ax: 52, ay: g + 2, shadow: 28 };
}

/** A pole frame with a net spread over it to dry, floats along the edge. */
export function makeNetFrame(seed = 38): Prop {
  const p = new Pix(104, 62);
  const g = 58;
  for (const x of [8, 94]) capsule(p, x, g, x, 6, 1.6, 1.4, GW, seed + x, 0.3);
  capsule(p, 6, 8, 96, 8, 1.2, 1.2, GW, seed, 0.3);
  polyFill(p, wobble([[10, 9], [92, 9], [88, 34], [70, 44], [46, 40], [26, 46], [12, 32]], seed, 1.3, 3), (x, y) => {
    const a = (x + y) % 5 === 0, b = (x - y + 200) % 5 === 0;
    if (!a && !b) return null;
    return pick(MESH, 0.5 + (a && b ? 0.22 : 0) + (white(x, y, seed) - 0.5) * 0.3 - y * 0.004, x, y);
  });
  for (let x = 14; x < 92; x += 8) ellipse(p, x, 11, 2, 1.8, (xx, yy) => pick(['#4a3418', '#8a6a38', '#c4a468'], 0.7 - (xx - x) * 0.2, xx, yy));
  ellipse(p, 50, g, 14, 2, () => '#1a1410');
  return finish(p, 52, g, seed, 40);
}

export const SHOP_ITEMS = {
  counter: makeCounter, bakeOven: makeBakeOven, kneadTrough: makeKneadTrough, wallShelves: makeWallShelves, hooks: makeHooks,
  fishRack: makeFishRack, fishTubs: makeFishTubs, netHeap: makeNetHeap, hungNet: makeHungNet, loom: makeLoom,
  mortarBench: makeMortarBench, herbRack: makeHerbRack, longTable: makeLongTable, innBench: makeInnBench, aleKegs: makeAleKegs,
  crateStack: makeCrateStack, rowboat: makeRowboat, washLine: makeWashLine, netFrame: makeNetFrame,
} as const;
