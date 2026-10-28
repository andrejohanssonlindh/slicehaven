import { Rng } from '../core/rng';
import {
  type Prop, type Pt, capsule, chew, dropShadow, fbm, grime, mossify, pick, polyFill, selOutline, still, white, wobble,
} from './grit';
import { Pix } from './pix';

/**
 * Village buildings and the clutter around them. Crooked beams, patched
 * roofs, stained plaster, mossy stone. Light from the top-left.
 */

export const STONE = ['#25222a', '#3b3841', '#575149', '#756d60', '#978d7b', '#b9ad94'];
export const WOOD = ['#1d130e', '#33211a', '#4d3524', '#6a4a31', '#876240', '#a07c52'];
const PLASTER = ['#5e5446', '#857960', '#a89b7e', '#c4b898', '#dccfae'];
export const THATCH = ['#3a2a18', '#57401f', '#7a5c2c', '#9c7a3c', '#bf9c52', '#dcbc72'];
export const SHINGLE = ['#251a14', '#3d2b20', '#58402e', '#745640', '#917150'];
export const IRON = ['#1c1d24', '#33353f', '#4f525f', '#747887', '#a0a5b3'];
const CLOTHRED = ['#401a1a', '#6c2a26', '#9a403a', '#c25e50'];

// --- surfaces --------------------------------------------------------------

/** Rubble masonry: uneven stones with mortar, bevelled so each one catches the light. */
export function stoneWall(p: Pix, x0: number, y0: number, x1: number, y1: number, seed: number, pal: readonly string[] = STONE, wobbleTop = 0): void {
  const rng = Rng.fromSeed(seed);
  let y = y0;
  while (y <= y1) {
    const h = 3 + rng.int(3);
    let x = x0 - rng.int(4);
    while (x <= x1) {
      const w = 4 + rng.int(5);
      const base = 0.35 + rng.next() * 0.4;
      for (let yy = y; yy < Math.min(y + h, y1 + 1); yy++) {
        for (let xx = Math.max(x, x0); xx < Math.min(x + w, x1 + 1); xx++) {
          if (wobbleTop && yy < y0 + wobbleTop && white(xx, 0, seed + 3) * wobbleTop > yy - y0) continue;
          const edgeL = xx === x ? 0.2 : 0;
          const edgeT = yy === y ? 0.2 : 0;
          const edgeB = yy === y + h - 1 ? -0.35 : 0;
          const edgeR = xx === x + w - 1 ? -0.3 : 0;
          const v = base + edgeL + edgeT + edgeB + edgeR + (white(xx, yy, seed) - 0.5) * 0.18 + (fbm(xx / 3, yy / 3, seed + 1) - 0.5) * 0.2;
          p.set(xx, yy, pick(pal, v, xx, yy));
        }
      }
      x += w;
    }
    y += h;
  }
}

/** Boards, each its own shade, with gaps, nails and the odd knot. */
export function boards(p: Pix, x0: number, y0: number, x1: number, y1: number, seed: number, vertical = true): void {
  const rng = Rng.fromSeed(seed);
  let a = vertical ? x0 : y0;
  const end = vertical ? x1 : y1;
  while (a <= end) {
    const w = 3 + rng.int(3);
    const base = 0.4 + rng.next() * 0.4;
    for (let k = 0; k < w && a + k <= end; k++) {
      const hi = vertical ? y1 : x1;
      const lo = vertical ? y0 : x0;
      for (let b = lo; b <= hi; b++) {
        const x = vertical ? a + k : b;
        const y = vertical ? b : a + k;
        let v = base + (k === 0 ? -0.28 : 0) + (white(x, y, seed + 1) - 0.5) * 0.14 + (fbm(x / 2, y / 9, seed + 2) - 0.5) * 0.2;
        if (k === 1) v += 0.1;
        p.set(x, y, pick(WOOD, v, x, y));
      }
    }
    // Nails and a knot.
    const nx = vertical ? a + 1 : x0 + 2 + rng.int(Math.max(1, x1 - x0 - 3));
    const ny = vertical ? y0 + 2 + rng.int(Math.max(1, y1 - y0 - 4)) : a + 1;
    p.set(nx, ny, WOOD[0]);
    if (rng.next() < 0.25) { p.set(nx, ny + 3, WOOD[0]); p.set(nx + 1, ny + 3, WOOD[1]); }
    a += w;
  }
}

/** Daub over wattle: dirty plaster, cracked, with the lath showing where it fell off. */
export function plaster(p: Pix, x0: number, y0: number, x1: number, y1: number, seed: number): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const n = fbm(x / 6, y / 5, seed);
      const patch = fbm(x / 3.5, y / 3, seed + 4);
      let v = 0.72 - (x - x0) / (x1 - x0 + 1) * 0.28 + (n - 0.5) * 0.5 + (white(x, y, seed + 1) - 0.5) * 0.14;
      if (patch > 0.72 && y > y0 + 4) {
        // Fallen plaster: bare wattle and mud.
        p.set(x, y, pick(WOOD, 0.3 + ((x + y) % 4 === 0 ? 0.25 : 0) + (white(x, y, seed + 5) - 0.5) * 0.2, x, y));
        continue;
      }
      if (fbm(x / 1.5, y / 11, seed + 3) > 0.7) v -= 0.22; // water streaks
      p.set(x, y, pick(PLASTER, v, x, y));
    }
  }
}

/** One crooked timber, drawn as a thick wobbly line. */
function beam(p: Pix, x0: number, y0: number, x1: number, y1: number, w: number, seed: number): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const jx = (fbm(i / 7, seed, seed) - 0.5) * 2.2;
    const jy = (fbm(i / 7, seed + 9, seed) - 0.5) * 2.2;
    const cx = x0 + (x1 - x0) * t + (Math.abs(y1 - y0) > Math.abs(x1 - x0) ? jx : 0);
    const cy = y0 + (y1 - y0) * t + (Math.abs(y1 - y0) > Math.abs(x1 - x0) ? 0 : jy);
    for (let a = 0; a < w; a++) {
      const horiz = Math.abs(y1 - y0) <= Math.abs(x1 - x0);
      const x = Math.round(cx + (horiz ? 0 : a));
      const y = Math.round(cy + (horiz ? a : 0));
      p.set(x, y, pick(WOOD, 0.62 - a / w * 0.5 + (white(x, y, seed + 2) - 0.5) * 0.2 + (fbm(x / 3, y / 3, seed) - 0.5) * 0.2, x, y));
    }
  }
}

interface RoofSpec {
  /** y of the top edge, y of the eaves, x centre, half-width at top and at the eaves. */
  top: number;
  eave: number;
  cx: number;
  halfTop: number;
  halfEave: number;
  kind: 'thatch' | 'shingle';
  seed: number;
  sag?: number;
  moss?: number;
}

/** A pitched roof seen from the front: lumpy, patched, drooping at the eaves. */
function roof(p: Pix, r: RoofSpec): void {
  const { top, eave, cx, halfTop, halfEave, seed } = r;
  const sag = r.sag ?? 3;
  const edge = (k: number, side: number): number => {
    const half = halfTop + (halfEave - halfTop) * k;
    return cx + side * (half + (fbm(k * 7, side * 3, seed) - 0.5) * 6 + Math.sin(k * 5 + side) * 1.2);
  };
  const pts: Pt[] = [];
  const bottom = eave + 5;
  for (let i = 0; i <= 6; i++) pts.push([edge(i / 6, 1), top + (bottom - top) * (i / 6)]);
  for (let i = 6; i >= 0; i--) pts.push([edge(i / 6, -1), top + (bottom - top) * (i / 6)]);
  // The eave is never a ruler line: it droops and rises along its length.
  const eaveAt = (x: number): number => eave + (fbm(x / 5, 3, seed + 5) - 0.5) * 6 + Math.sin(x * 0.11 + seed) * 1.5;
  const ridgeY = (x: number): number => top + Math.sin(((x - cx) / halfTop) * 2.2) * sag * 0.6 + Math.sin((x - cx) * 0.09) * sag * 0.5 + (fbm(x / 6, 0, seed + 2) - 0.5) * 2.2;
  const patchX = cx + (white(1, 1, seed) - 0.3) * halfEave * 0.8;
  const patchY = top + (eave - top) * 0.45;
  polyFill(p, pts, (x, y) => {
    if (y < ridgeY(x) || y > eaveAt(x)) return null;
    const k = (y - top) / (eave - top);
    const left = (x - (cx - halfEave)) / (2 * halfEave);
    let v: number;
    let pal: readonly string[];
    if (r.kind === 'thatch') {
      pal = THATCH;
      const course = (y - top) % 5;
      v = 0.78 - k * 0.22 - left * 0.3 + (1 - course / 5) * 0.14 + (fbm(x / 1.4, y / 6, seed + 3) - 0.5) * 0.5;
      if (white(x, y, seed + 4) < 0.07) v -= 0.3;
      // A fresh patch of repair thatch.
      if (Math.abs(x - patchX) < 7 && Math.abs(y - patchY) < 5) v += 0.22 + (white(x, y, seed + 6) - 0.5) * 0.2;
    } else {
      pal = SHINGLE;
      const row = Math.floor((y - top) / 4);
      const off = row % 2 ? 3 : 0;
      const sx = Math.floor((x + off) / 6);
      const rowBase = white(sx, row, seed + 7);
      v = 0.3 + rowBase * 0.45 - left * 0.25 + (white(x, y, seed + 8) - 0.5) * 0.1;
      if ((y - top) % 4 === 3) v -= 0.25; // shadow under each course
      if ((x + off) % 6 === 0) v -= 0.2;
      if (rowBase > 0.985) return null; // a missing shingle
    }
    return pick(pal, v, x, y);
  });
  // Ragged bottom edge with loose straws / chipped shingles.
  for (let x = 0; x < p.w; x++) {
    for (let y = eave - 2; y <= eave + 2; y++) {
      if (p.alpha(x, y) && !p.alpha(x, y + 1) && white(x, y, seed + 9) < 0.4) {
        const len = 1 + Math.floor(white(x, y, seed + 10) * (r.kind === 'thatch' ? 3 : 1));
        for (let k = 1; k <= len; k++) p.set(x, y + k, r.kind === 'thatch' ? THATCH[Math.max(0, 2 - k)] : SHINGLE[0]);
      }
    }
  }
  // Moss collects on the shady half.
  if (r.moss) {
    mossyRoof(p, top, eave + 3, seed, r.moss);
  }
}

function mossyRoof(p: Pix, y0: number, y1: number, seed: number, amount: number): void {
  const M = ['#2c4326', '#3b5a2c', '#506f34', '#6e8c42'];
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < p.w; x++) {
      if (!p.alpha(x, y)) continue;
      const n = fbm(x / 4, y / 3, seed + 21);
      if (n > 1 - amount * 0.5 && white(x, y, seed + 22) < 0.85) p.set(x, y, pick(M, 0.25 + (n - 0.5) * 1.4 + (white(x, y, seed + 23) - 0.5) * 0.4, x, y));
    }
  }
}

// --- smaller things --------------------------------------------------------

/** One barrel, hand-built: staves, hoops, a belly, a moss line. */
function paintBarrel(p: Pix, cx: number, base: number, rx: number, h: number, seed: number, kind: 'closed' | 'open' | 'apples'): void {
  const topY = base - h;
  for (let y = topY; y <= base; y++) {
    const k = (y - topY) / h;
    const belly = rx + Math.sin(k * Math.PI) * 1.3 - 1;
    for (let x = Math.round(cx - belly); x < Math.round(cx + belly); x++) {
      const u = (x + 0.5 - cx) / belly;
      const stave = Math.floor((x - cx + 20) / 2.2);
      let v = 0.86 - (u + 1) * 0.4 + (white(stave, 0, seed) - 0.5) * 0.3 + (white(x, y, seed + 1) - 0.5) * 0.1;
      if (Math.abs((x - cx + 20) % 2.2) < 0.5) v -= 0.18;
      p.set(x, y, pick(WOOD, v, x, y));
    }
  }
  // Hoops (one rusty).
  for (const [i, k] of [0.14, 0.78].entries()) {
    const y = Math.round(topY + h * k);
    const belly = rx + Math.sin(k * Math.PI) * 1.3 - 1;
    for (let x = Math.round(cx - belly); x < Math.round(cx + belly); x++) {
      p.set(x, y, i === 1 ? '#6b4a32' : IRON[2 + ((x + y) & 1)]);
      p.set(x, y + 1, i === 1 ? '#3e2a1e' : IRON[1]);
    }
  }
  // Lid / opening: an ellipse on top.
  for (let y = topY - 2; y <= topY + 2; y++) {
    for (let x = Math.round(cx - rx + 0.5); x < Math.round(cx + rx - 0.5); x++) {
      const d = ((x + 0.5 - cx) / (rx - 0.6)) ** 2 + ((y + 0.5 - topY) / 2.3) ** 2;
      if (d > 1) continue;
      if (kind === 'closed') p.set(x, y, pick(WOOD, 0.7 - d * 0.35 + (white(x, y, seed + 2) - 0.5) * 0.2, x, y));
      else if (d > 0.72) p.set(x, y, WOOD[3]);
      else if (kind === 'open') p.set(x, y, white(x, y, seed + 3) < 0.25 ? '#4a7ab0' : '#243e60');
      else p.set(x, y, white(x, y, seed + 3) < 0.3 ? '#b4503e' : white(x, y, seed + 4) < 0.5 ? '#86302a' : '#a8683a');
    }
  }
}

export function makeBarrels(seed: number, count: 1 | 3 = 3): Prop {
  const p = new Pix(36, 30);
  if (count === 1) {
    paintBarrel(p, 17, 24, 6.5, 14, seed, 'closed');
  } else {
    paintBarrel(p, 20, 20, 6.5, 13, seed, 'open');
    paintBarrel(p, 9, 25, 6.5, 14, seed + 1, 'closed');
    paintBarrel(p, 25, 26, 6, 13, seed + 2, 'apples');
  }
  grime(p, seed + 5, 0.5, 28);
  mossify(p, seed + 6, 0.3, (_x, y) => (y > 18 ? 1 : 0));
  return still(selOutline(p), 18, 27, 24);
}

/** Open crates, one with a lid propped on it, sacks leaning. */
export function makeCrates(seed: number): Prop {
  const p = new Pix(36, 28);
  const crate = (x0: number, y0: number, w: number, h: number, s: number, goods: boolean): void => {
    boards(p, x0, y0, x0 + w - 1, y0 + h - 1, s, false);
    for (const k of [0, w - 3]) for (let y = y0; y < y0 + h; y++) for (let x = x0 + k; x < x0 + k + 3; x++) p.set(x, y, pick(WOOD, 0.28 + (x - x0 - k) * 0.12, x, y));
    for (let x = x0; x < x0 + w; x++) { p.set(x, y0, WOOD[4]); p.set(x, y0 + h - 1, WOOD[0]); }
    if (goods) for (let x = x0 + 3; x < x0 + w - 3; x++) { p.set(x, y0 - 1, pick(['#4a7a3a', '#6a9a4a', '#8cba5c'], white(x, 0, s), x, y0)); if (white(x, 1, s) < 0.5) p.set(x, y0 - 2, '#6a9a4a'); }
  };
  crate(3, 16, 14, 10, seed, true);
  crate(17, 18, 13, 8, seed + 1, false);
  crate(8, 8, 12, 8, seed + 2, false);
  // A sack.
  polyFill(p, wobble([[26, 24], [34, 24], [33, 12], [29, 9], [26, 14]], seed, 0.8, 2), (x, y) => pick(['#4a3a28', '#6a5638', '#8a7248', '#ae9462'], 0.7 - (x - 26) * 0.07 + (white(x, y, seed) - 0.5) * 0.3, x, y));
  for (let x = 27; x < 32; x++) p.set(x, 11, '#3a2c1c');
  grime(p, seed + 5, 0.5, 26);
  return still(selOutline(p), 18, 26, 26);
}

/** A well: fieldstone ring, timber frame, little shingled roof, bucket on a rope. */
export function makeWell(seed: number): Prop {
  const W = 50, H = 62;
  const p = new Pix(W, H);
  const cx = 25, rimY = 44, rx = 15, ry = 6;
  // Front wall (the visible outside of the ring).
  stoneWall(p, cx - rx, rimY, cx + rx - 1, rimY + 14, seed, STONE);
  for (let y = rimY; y <= rimY + 14; y++) {
    for (let x = cx - rx; x < cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const edgeY = rimY + ry * Math.sqrt(Math.max(0, 1 - dx * dx));
      const bot = rimY + 14 + ry * Math.sqrt(Math.max(0, 1 - dx * dx)) * 0.35;
      if (y < edgeY - 0.5 || y > bot) { const i = (y * W + x) * 4; p.data[i + 3] = 0; continue; }
      // Cylinder shading: dark toward the right.
      const i = (y * W + x) * 4;
      const f = 1 - (dx + 1) * 0.28;
      for (let c = 0; c < 3; c++) p.data[i + c] *= f;
    }
  }
  // Top surface of the rim and the black water inside.
  for (let y = rimY - ry; y <= rimY + ry; y++) {
    for (let x = cx - rx; x < cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - rimY) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      if (d > 0.6) p.set(x, y, pick(STONE, 0.7 - dx * 0.25 + (white(x, y, seed + 3) - 0.5) * 0.25, x, y));
      else if (d > 0.5) p.set(x, y, STONE[0]);
      else p.set(x, y, white(x, y, seed + 4) < 0.1 ? '#3a5f86' : pick(['#0b1220', '#12203a', '#1a3050'], 0.4 - dx * 0.3 + dy * 0.2, x, y));
    }
  }
  // Posts and crossbeam, roof.
  for (const side of [-1, 1]) {
    const px = cx + side * 13;
    capsule(p, px, rimY - 2, px + side * 0.5, 14, 1.8, 1.8, WOOD, seed + 7 + side, 0.2);
  }
  capsule(p, cx - 13, 17, cx + 13, 17, 1.4, 1.4, WOOD, seed + 9, 0.2);
  // Rope and bucket.
  for (let y = 18; y < 33; y++) p.set(cx + 1 + (y > 28 ? 0 : 0), y, y % 2 ? '#a08a5a' : '#7a6642');
  const bx = cx + 1;
  for (let y = 33; y < 40; y++) for (let x = bx - 3; x <= bx + 3; x++) p.set(x, y, pick(WOOD, 0.72 - (x - bx + 3) * 0.1 + (white(x, y, seed + 8) - 0.5) * 0.2, x, y));
  for (const y of [34, 38]) for (let x = bx - 3; x <= bx + 3; x++) p.set(x, y, IRON[2]);
  for (let x = bx - 3; x <= bx + 3; x++) p.set(x, 33, WOOD[1]);
  // Little roof: two shingled slopes, left one lit.
  const rf = new Pix(W, H);
  roof(rf, { top: 2, eave: 16, cx, halfTop: 7, halfEave: 19, kind: 'shingle', seed: seed + 20, moss: 0.5 });
  p.blit(rf, 0, 0);
  dropShadow(p, cx - 14, cx + 14, 17, 4, 0.5);
  mossify(p, seed + 30, 0.6, (_x, y) => (y > rimY - 4 ? 1.2 : 0));
  grime(p, seed + 31, 0.5, rimY + 18);
  chew(p, seed + 32, 0.08);
  return still(selOutline(p), cx + 1, rimY + 18, 34);
}

/** A market stall: faded striped awning, sagging, counter piled with goods. */
export function makeStall(seed: number, goods: 'fruit' | 'cloth' | 'bread' = 'fruit'): Prop {
  const W = 58, H = 56;
  const p = new Pix(W, H);
  const x0 = 6, x1 = W - 7;
  // Back posts, counter, front posts.
  for (const x of [x0 + 1, x1 - 1]) capsule(p, x, 14, x + (x < W / 2 ? -0.5 : 0.5), 50, 1.4, 1.6, WOOD, seed + x, 0.2);
  // Counter: planks with a cloth hanging in front.
  boards(p, x0, 36, x1, 46, seed + 2, true);
  for (let y = 36; y <= 46; y++) for (let x = x0; x <= x1; x++) {
    if (y === 36) p.set(x, y, WOOD[5]);
    else if (y > 40) {
      // Skirt cloth with folds.
      const v = 0.55 + Math.sin((x - x0) * 0.9) * 0.2 - (y - 40) * 0.03 + (white(x, y, seed + 4) - 0.5) * 0.15;
      p.set(x, y, pick(goods === 'cloth' ? ['#1f3a4a', '#2c5a6e', '#3f7a8c', '#6aa0ac'] : ['#2a2e44', '#3c4568', '#55648c', '#7a8cb4'], v, x, y));
    }
  }
  for (let x = x0; x <= x1; x++) if (white(x, 0, seed + 5) < 0.4) p.set(x, 47 + (white(x, 1, seed + 5) < 0.5 ? 0 : 1), '#2a2e44');
  // Goods.
  const dot = (cx: number, cy: number, r: number, cols: readonly string[]): void => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r + 0.4) continue;
      p.set(cx + x, cy + y, pick(cols, 0.75 - (x + y) * 0.16 - (y > 0 ? 0.1 : 0), cx + x, cy + y));
    }
  };
  const APPLE = ['#4a1414', '#8a2a24', '#c43e32', '#e87a5a'];
  const CABB = ['#2a4a2a', '#47703a', '#6a9a4a', '#a0c870'];
  const LOAF = ['#4a2a14', '#7a4a22', '#a8742f', '#d49e50'];
  if (goods === 'fruit') {
    for (let i = 0; i < 6; i++) dot(x0 + 6 + i * 4, 34 - (i % 2), 2, i % 3 === 2 ? CABB : APPLE);
    dot(x1 - 10, 33, 3, CABB); dot(x1 - 5, 34, 3, CABB);
  } else if (goods === 'bread') {
    for (let i = 0; i < 5; i++) { for (let k = -3; k <= 3; k++) for (let j = 0; j < 3; j++) p.set(x0 + 5 + i * 8 + k, 33 + j - (k * k > 6 ? 0 : 1), pick(LOAF, 0.8 - j * 0.25 - (k + 3) * 0.04, k, j)); }
  } else {
    for (let i = 0; i < 4; i++) for (let y = 29; y < 36; y++) for (let x = x0 + 4 + i * 11; x < x0 + 13 + i * 11; x++) p.set(x, y, pick([['#40204a', '#6a3a7a', '#8e5aa0', '#b484c4'], ['#4a3a14', '#7a6224', '#a8883c', '#d4b05c'], ['#14404a', '#246878', '#3a90a0', '#6cbcc8']][i % 3], 0.7 - (y - 29) * 0.06 + Math.sin(x) * 0.12, x, y));
  }
  // Awning: sagging cloth, scalloped edge, faded stripes.
  const sag = (x: number): number => Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 2.2;
  polyFill(p, [[x0 - 4, 14], [x1 + 4, 14], [x1 + 7, 27], [x0 - 7, 27]], (x, y) => {
    const k = (y - 14) / 13;
    if (y > 24 + (white(x >> 2, 0, seed + 6) * 3) + sag(x) * 0.4 + (Math.floor((x - x0) / 4) % 2 === 0 ? 2 : 0) + 1) return null;
    const stripe = Math.floor((x - x0 + 8) / 5) % 2 === 0;
    const pal = stripe ? CLOTHRED : ['#8a7e66', '#a89c80', '#c4b898', '#dcd0b0'];
    const fold = Math.sin(x * 0.7) * 0.1;
    return pick(pal, 0.82 - k * 0.3 - (x - x0) / (x1 - x0) * 0.25 + fold + (white(x, y, seed + 7) - 0.5) * 0.16, x, y);
  });
  for (let x = x0 - 4; x <= x1 + 4; x++) p.set(x, 14, WOOD[3]);
  dropShadow(p, x0, x1, 28, 6, 0.55);
  // Front posts over the goods.
  for (const x of [x0, x1]) capsule(p, x, 20, x, 50, 1.2, 1.4, WOOD, seed + x + 1, 0.2);
  // A hanging string of onions.
  for (let y = 27; y < 34; y++) p.set(x1 - 18, y, '#a08a5a');
  for (let k = 0; k < 3; k++) dot(x1 - 18, 31 + k * 2, 1, ['#6a4a1a', '#9a6a22', '#c4903a', '#e4b860']);
  grime(p, seed + 8, 0.5, 52);
  chew(p, seed + 9, 0.05);
  return still(selOutline(p), 30, 52, 40);
}

/** A smithy: open-fronted shed, stone forge with live coals, anvil, quench barrel, tools on the wall. */
export function makeSmithy(seed: number): Prop {
  const W = 82, H = 70;
  const p = new Pix(W, H);
  const x0 = 6, x1 = W - 8, floor = 62;
  // Back wall: soot-black planks, with the forge's stone mass on the right.
  boards(p, x0, 28, x1, floor, seed, true);
  for (let y = 28; y <= floor; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * W + x) * 4;
    const f = 0.55 - (y - 28) * 0.003;
    for (let c = 0; c < 3; c++) p.data[i + c] *= f;
  }
  const fx0 = x1 - 30;
  stoneWall(p, fx0, 20, x1, floor, seed + 1, STONE);
  // Hood and chimney above the forge, soot-stained.
  stoneWall(p, fx0 + 8, 0, fx0 + 20, 22, seed + 2, STONE);
  // Fire mouth.
  for (let y = 40; y < 56; y++) for (let x = fx0 + 6; x < fx0 + 24; x++) {
    const d = Math.hypot((x - (fx0 + 15)) / 9.5, (y - 55) / 14);
    if (d > 1) continue;
    const heat = 1 - d + (fbm(x / 2, y / 2, seed + 3) - 0.5) * 0.5;
    p.set(x, y, pick(['#1a0e0c', '#4a1a10', '#8a2a14', '#d4521e', '#f29a38', '#ffe08a'], heat * 1.15, x, y));
  }
  for (let x = fx0 + 6; x < fx0 + 24; x++) { p.set(x, 39, STONE[1]); p.set(x, 40, STONE[2]); }
  // Anvil on a stump.
  const ax = 24;
  capsule(p, ax, 54, ax, 61, 4.2, 4.8, WOOD, seed + 4, 0.25);
  for (let x = ax - 6; x <= ax + 5; x++) { p.set(x, 51, IRON[4]); p.set(x, 52, IRON[3]); p.set(x, 53, IRON[2]); }
  for (let x = ax - 3; x <= ax + 2; x++) { p.set(x, 54, IRON[1]); p.set(x, 55, IRON[2]); }
  p.set(ax - 7, 52, IRON[3]); p.set(ax - 8, 52, IRON[2]); p.set(ax + 6, 51, IRON[2]);
  // Quench barrel at the left.
  paintBarrel(p, 11, 60, 6.5, 14, seed + 5, 'open');
  // Tools hung on the back wall.
  for (const [tx, kind] of [[30, 0], [35, 1], [40, 2]] as const) {
    for (let y = 33; y < 33 + (kind === 1 ? 11 : 9); y++) p.set(tx, y, WOOD[3]);
    for (let k = 0; k < 3; k++) p.set(tx + (kind === 2 ? -1 + k : k - 1), 33 + (kind === 0 ? 0 : 0), IRON[3]);
    p.set(tx, 32, IRON[1]);
  }
  for (const hx of [46, 50]) { p.set(hx, 34, IRON[3]); p.set(hx + 1, 34, IRON[3]); p.set(hx, 35, IRON[3]); p.set(hx + 1, 36, IRON[3]); p.set(hx, 36, IRON[3]); }
  // Roof: shingles, with a steep front slope on posts.
  for (const x of [x0 - 1, 46]) capsule(p, x, 22, x, floor, 2.0, 2.2, WOOD, seed + 6 + x, 0.2);
  beam(p, x0 - 4, 22, x1 + 4, 22, 3, seed + 8);
  dropShadow(p, x0, x1, 26, 10, 0.7);
  roof(p, { top: 4, eave: 25, cx: Math.round(W / 2) - 3, halfTop: 24, halfEave: 40, kind: 'shingle', seed: seed + 9, moss: 0.6 });
  // Soot: the whole back, stains up from the hood.
  for (let y = 0; y < 24; y++) for (let x = fx0 + 6; x < fx0 + 23; x++) {
    const i = (y * W + x) * 4;
    if (!p.data[i + 3]) continue;
    const f = 0.7 + (y / 24) * 0.25;
    for (let c = 0; c < 3; c++) p.data[i + c] *= f;
  }
  // Charcoal heap and floor dirt.
  for (let x = 14; x < 70; x++) for (let k = 0; k < 2; k++) if (white(x, k, seed + 11) < 0.7) p.set(x, floor + 1 + k, '#2a1c14');
  grime(p, seed + 12, 0.5, floor + 2);
  chew(p, seed + 13, 0.06);
  const o = selOutline(p);
  return still(o, 41, floor + 4, 0, {
    lights: [
      { dx: fx0 + 15 - 41 + 1, dy: 52 - floor - 3, r: 36, color: [1, 0.55, 0.2], flicker: 1 },
    ],
    smoke: [{ dx: fx0 + 14 - 41 + 1, dy: 1 - floor - 4 }],
  });
}

/** Hay, stacked in a rough cone with a pitchfork stuck in. */
export function makeHaystack(seed: number): Prop {
  const W = 38, H = 34;
  const p = new Pix(W, H);
  polyFill(p, wobble([[3, 31], [8, 14], [18, 3], [28, 14], [34, 31]], seed, 1.2, 3), (x, y) => {
    const u = (x - 19) / 16;
    const streak = fbm(x / 1.2, y / 5, seed);
    return pick(['#5a4222', '#86602e', '#b08a40', '#d8b860', '#ecd48a'], 0.62 - u * 0.4 - (y - 3) * 0.004 + (streak - 0.5) * 0.7 + (white(x, y, seed + 1) < 0.07 ? -0.3 : 0), x, y);
  });
  // Loose wisps hanging at the base.
  for (let x = 3; x < 35; x++) if (white(x, 0, seed + 2) < 0.4) p.set(x, 31 + Math.floor(white(x, 1, seed + 2) * 2), '#a8884a');
  // Pitchfork.
  capsule(p, 28, 30, 31, 8, 0.7, 0.7, WOOD, seed + 3, 0.2);
  for (const x of [29, 31, 33]) { p.set(x, 7, IRON[3]); p.set(x, 8, IRON[3]); p.set(x, 9, IRON[2]); }
  for (let x = 29; x <= 33; x++) p.set(x, 10, IRON[2]);
  grime(p, seed + 4, 0.5, 33);
  return still(selOutline(p), 19, 32, 26);
}

/** Stacked firewood, split logs end-on, a few bark-side showing. */
export function makeWoodpile(seed: number): Prop {
  const W = 34, H = 22;
  const p = new Pix(W, H);
  const rng = Rng.fromSeed(seed);
  for (let row = 0; row < 4; row++) {
    const y = H - 4 - row * 4;
    for (let x = 2 + (row % 2) * 2; x < W - 4; x += 4 + rng.int(2)) {
      const r = 2 + (rng.next() < 0.3 ? 1 : 0);
      for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
        if (xx * xx + yy * yy > r * r + 0.5) continue;
        const ring = Math.sin(Math.hypot(xx, yy) * 3.2) > 0.4;
        const edge = xx * xx + yy * yy > (r - 1) * (r - 1);
        p.set(x + xx, y + yy, edge ? pick(WOOD, 0.3 + (xx < 0 ? 0.2 : 0) + (white(x + xx, y + yy, seed) - 0.5) * 0.3, xx, yy) : pick(['#6a4c33', '#8a6a44', '#a98660', '#c4a47a'], 0.45 + (ring ? -0.1 : 0.05) - xx * 0.06 + (white(x + xx, y + yy, seed + 1) - 0.5) * 0.3, x + xx, y + yy));
      }
    }
  }
  // A split log lying in front, and an axe stuck in it.
  capsule(p, 6, 19, 18, 19, 1.8, 1.8, WOOD, seed + 4, 0.25);
  capsule(p, 22, 20, 28, 12, 0.7, 0.7, WOOD, seed + 5, 0.2);
  for (const [x, y] of [[27, 11], [28, 11], [29, 11], [29, 12], [28, 12]] as const) p.set(x, y, IRON[3]);
  grime(p, seed + 6, 0.4, 21);
  return still(selOutline(p), 17, 20, 22);
}

/** A rough wooden fence section, leaning a little, posts at uneven heights. */
export function makeFence(seed: number): Prop {
  const W = 36, H = 24;
  const p = new Pix(W, H);
  const rng = Rng.fromSeed(seed);
  for (const rail of [9, 15]) {
    const y0 = rail + Math.round((fbm(rail, seed, seed) - 0.5) * 2);
    for (let x = 0; x < W; x++) {
      const y = y0 + Math.round((x / W - 0.5) * 2 * (rng.next() < 0.01 ? 2 : 1) * 0.4);
      for (let k = 0; k < 2; k++) p.set(x, y + k, pick(WOOD, 0.62 - k * 0.3 + (white(x, y, seed) - 0.5) * 0.25, x, y));
    }
  }
  for (const px of [3, 17, 31]) {
    const top = 3 + rng.int(4);
    capsule(p, px, top, px + (rng.next() - 0.5), 21, 1.5, 1.7, WOOD, seed + px, 0.25);
    p.set(px, top - 1, WOOD[4]);
  }
  grime(p, seed + 5, 0.5, 23);
  mossify(p, seed + 6, 0.2, (_x, y) => (y > 14 ? 1 : 0));
  return still(selOutline(p), 18, 22, 14);
}

/** A tall lantern post with a real flame, for when the lights come on. */
export function makeLantern(): Prop {
  const p = new Pix(14, 46);
  capsule(p, 7, 9, 7, 43, 1.3, 1.6, WOOD, 3, 0.25);
  for (let x = 4; x <= 10; x++) p.set(x, 8, IRON[2]);
  for (let y = 2; y < 8; y++) for (let x = 5; x <= 9; x++) p.set(x, y, x === 5 || x === 9 || y === 2 ? IRON[1] : '#ffd878');
  p.set(7, 4, '#fff6c8'); p.set(7, 5, '#fff6c8'); p.set(6, 5, '#ffeaa0');
  p.set(7, 1, IRON[2]); p.set(6, 2, IRON[2]); p.set(8, 2, IRON[2]);
  for (let x = 4; x <= 10; x++) p.set(x, 8, IRON[1]);
  p.set(7, 20, IRON[2]); p.set(8, 20, IRON[2]);
  return still(selOutline(p), 8, 45, 10, { lights: [{ dx: 0, dy: -40, r: 34, color: [1, 0.72, 0.32], flicker: 0.8 }] });
}
