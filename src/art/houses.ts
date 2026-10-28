import { Rng } from '../core/rng';
import {
  type Light, type Prop, chew, fbm, grime, mossify, pick, polyFill, selOutline, speckle, still, white,
} from './grit';
import { IRON, SHINGLE, STONE, WOOD, boards, stoneWall } from './buildings';
import { Pix } from './pix';

/**
 * Houses at real size: a person is 36 px tall, so the door is 42 and the wall
 * 48. A house covers about 4 hexes across and 3 rows deep. It is drawn as a
 * volume: front wall, a foreshortened side wall, a roof with a visible slope,
 * a chimney on the gable end. Walls and roof are separate layers so the roof
 * can lift away when someone steps inside.
 *
 * The frame is built the way a carpenter would: posts at the bays, rails,
 * paired knee braces. It looks old, not careless: beams are straight and
 * pegged, the age is in the plaster, the paint and the roof.
 */

const LIME = ['#5e5242', '#87795f', '#b0a282', '#cfc29f', '#e6dbb9'];
const SOOT = '#2a2018';
const SHINGLE_OLD = ['#2e241d', '#4e3f31', '#73604a', '#98816a', '#b9a58a'];
const THATCH_OLD = ['#2a2218', '#453a2a', '#675838', '#8a774a', '#ab9862', '#cdb87e'];

type Shutter = 'rust' | 'green' | 'blue';
const PAINT: Record<Shutter, readonly string[]> = {
  rust: ['#3a1a14', '#6a2c22', '#8e4030', '#b05a42'],
  green: ['#1c2e24', '#2e4a3a', '#46705a', '#6a9478'],
  blue: ['#1c2a3c', '#2e4866', '#46688c', '#6c90b0'],
};

export interface HouseSpec {
  seed: number;
  /** Width in hexes, 4 or 5. Depth is always 3 rows. */
  cols?: 4 | 5;
  roof?: 'thatch' | 'shingle';
  shop?: 'tankard' | 'herb' | 'loaf';
  shutters?: Shutter;
  lit?: boolean;
}

function darken(p: Pix, x: number, y: number, k: number): void {
  if (!p.alpha(x, y)) return;
  const i = (y * p.w + x) * 4;
  for (let c = 0; c < 3; c++) p.data[i + c] *= 1 - k;
}

/** A straight, pegged timber with grain, a lit edge and a shadow line on the plaster below. */
function timber(p: Pix, x0: number, y0: number, x1: number, y1: number, w: number, seed: number): void {
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.max(Math.abs(dx), Math.abs(dy));
  const horiz = Math.abs(dy) <= Math.abs(dx) * 0.4;
  const diag = !horiz && Math.abs(dx) > Math.abs(dy) * 0.4;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const warp = (fbm(i / 11, seed, seed) - 0.5) * 0.9;
    const cx = x0 + dx * t + (horiz ? 0 : 0);
    const cy = y0 + dy * t + (horiz ? warp : 0);
    for (let a = 0; a < w; a++) {
      const x = Math.round(cx + (horiz ? 0 : a + (diag ? 0 : warp)));
      const y = Math.round(cy + (horiz ? a : diag ? 0 : 0));
      const edge = a === 0 ? 0.16 : a === w - 1 ? -0.28 : 0;
      const grain = (fbm(i / 3, a * 2.4, seed + 3) - 0.5) * 0.35;
      p.set(x, y, pick(WOOD, 0.58 + edge + grain + (white(x, y, seed + 4) - 0.5) * 0.08, x, y));
      if (diag) p.set(x, y + 1, pick(WOOD, 0.5 + edge + grain, x, y + 1));
    }
    if (horiz) darken(p, Math.round(cx), Math.round(cy) + w, 0.35);
  }
  // Pegs where timbers meet.
  for (const [px, py] of [[x0 + (horiz ? 3 : 1), y0 + (horiz ? 1 : 3)], [x1 - (horiz ? 3 : 1), y1 + (horiz ? 1 : -3)]] as const) {
    p.set(px, py, WOOD[0]);
  }
}

/** Limewash over daub: aged but whole, with soot under the eaves, splash at the foot, a few hairline cracks. */
function limewash(p: Pix, x0: number, y0: number, x1: number, y1: number, seed: number, shade = 1): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const n = fbm(x / 7, y / 6, seed);
      let v = 0.74 - (x - x0) / (x1 - x0 + 1) * 0.16 + (n - 0.5) * 0.4 + (white(x, y, seed + 1) - 0.5) * 0.12;
      // Soot dripping from the eaves, rain splash at the foot.
      v -= Math.max(0, 1 - (y - y0) / 12) * 0.22 * (0.4 + fbm(x / 4, 1, seed + 2));
      v -= Math.max(0, 1 - (y1 - y) / 9) * 0.3 * (0.4 + fbm(x / 3, 2, seed + 3));
      if (fbm(x / 1.4, y / 12, seed + 4) > 0.7) v -= 0.18; // rain streaks
      p.set(x, y, pick(LIME, v * shade, x, y));
    }
  }
  // A few hairline cracks.
  const rng = Rng.fromSeed(seed + 5);
  for (let c = 0; c < Math.max(2, Math.round((x1 - x0) / 30)); c++) {
    let x = x0 + 6 + rng.int(Math.max(1, x1 - x0 - 12));
    let y = y0 + 4 + rng.int(Math.max(1, y1 - y0 - 14));
    for (let s = 0; s < 6 + rng.int(8); s++) {
      if (p.alpha(x, y)) p.set(x, y, LIME[1]);
      x += rng.int(3) - 1;
      y += rng.next() < 0.7 ? 1 : 0;
    }
  }
}

function glassWindow(p: Pix, cx: number, top: number, w: number, h: number, lit: boolean, shutters: Shutter | null, flowers: boolean, seed: number): void {
  const x0 = cx - Math.floor(w / 2);
  if (shutters) {
    for (const side of [-1, 1]) {
      const sx = side < 0 ? x0 - 6 : x0 + w + 1;
      for (let y = top - 1; y < top + h + 1; y++) {
        for (let x = sx; x < sx + 5; x++) {
          const board = (x - sx) % 2;
          const worn = fbm(x / 2, y / 3, seed + side) > 0.7;
          p.set(x, y, worn ? pick(WOOD, 0.45 + board * 0.1, x, y) : pick(PAINT[shutters], 0.62 - (x - sx) * 0.07 + board * 0.06 + (white(x, y, seed) - 0.5) * 0.16, x, y));
        }
      }
      // A slat cut-out, and the top and bottom rails.
      for (let x = sx + 1; x < sx + 4; x++) for (const y of [top + 3, top + 5]) p.set(x, y, PAINT[shutters][0]);
    }
  }
  // Frame, glass.
  for (let y = top; y < top + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const border = x < x0 + 2 || x >= x0 + w - 2 || y < top + 2 || y >= top + h - 2;
      const mull = x === x0 + Math.floor(w / 2) || x === x0 + Math.floor(w / 2) - 1 || y === top + Math.floor(h / 2);
      if (border || mull) p.set(x, y, pick(WOOD, x === x0 ? 0.55 : 0.4, x, y));
      else if (lit) p.set(x, y, pick(['#e8a23c', '#f4c25a', '#ffe08a', '#fff2b8'], 0.55 + (y < top + h / 2 ? 0.25 : 0) - (x - x0) * 0.015 + (white(x, y, seed + 7) - 0.5) * 0.2, x, y));
      else p.set(x, y, pick(['#10151f', '#1c2638', '#2e4060', '#5a7898'], 0.3 + (x - x0 + (top + h - y)) * 0.025 + (white(x, y, seed + 7) - 0.5) * 0.15, x, y));
    }
  }
  // Stone sill, with a drip shadow under it.
  for (let x = x0 - 2; x < x0 + w + 2; x++) {
    p.set(x, top + h, STONE[4]); p.set(x, top + h + 1, STONE[2]);
    darken(p, x, top + h + 2, 0.3);
  }
  for (let x = x0 - 1; x < x0 + w + 1; x++) p.set(x, top - 1, WOOD[2]);
  if (flowers) {
    for (let x = x0 - 1; x < x0 + w + 1; x++) for (let y = top + h + 2; y < top + h + 5; y++) p.set(x, y, pick(WOOD, 0.4 + (y - top - h) * 0.05 + (white(x, y, seed) - 0.5) * 0.2, x, y));
    for (let x = x0; x < x0 + w; x++) {
      const up = 1 + Math.floor(white(x, 0, seed + 9) * 3);
      for (let k = 0; k < up; k++) p.set(x, top + h + 1 - k, k === up - 1 && white(x, 1, seed + 9) < 0.6 ? ['#d8607a', '#f0d060', '#f4eee0', '#b04a8a'][Math.floor(white(x, 2, seed + 9) * 4)] : '#3f6d36');
    }
    for (let x = x0; x < x0 + w; x += 2) p.set(x, top + h + 5, '#3f6d36');
  }
}

function plankDoor(p: Pix, x0: number, top: number, w: number, bottom: number, seed: number): void {
  boards(p, x0, top, x0 + w - 1, bottom, seed, true);
  // Strap hinges and a ring handle.
  for (const y of [top + 7, bottom - 9]) {
    for (let x = x0; x < x0 + w - 4; x++) p.set(x, y, IRON[1 + (x & 1)]);
    for (let x = x0 + w - 7; x < x0 + w - 3; x++) p.set(x, y + 1, IRON[2]);
  }
  p.set(x0 + w - 5, Math.round((top + bottom) / 2), IRON[4]);
  p.set(x0 + w - 5, Math.round((top + bottom) / 2) + 1, IRON[2]);
  // Frame and a heavy lintel.
  for (let y = top - 3; y <= bottom; y++) { p.set(x0 - 1, y, WOOD[2]); p.set(x0 - 2, y, WOOD[1]); p.set(x0 + w, y, WOOD[1]); p.set(x0 + w + 1, y, WOOD[0]); }
  for (let x = x0 - 3; x <= x0 + w + 2; x++) for (let k = 0; k < 3; k++) p.set(x, top - 4 + k, pick(WOOD, 0.62 - k * 0.2, x, 0));
  // Worn stone steps.
  for (let k = 0; k < 2; k++) {
    for (let x = x0 - 4 + k; x <= x0 + w + 3 - k; x++) p.set(x, bottom + 1 + k, pick(STONE, 0.72 - k * 0.3 + (white(x, k, seed) - 0.5) * 0.3, x, k));
  }
}

function signBoard(p: Pix, x: number, y: number, kind: 'tankard' | 'herb' | 'loaf'): void {
  for (let k = 0; k < 11; k++) p.set(x + k, y, IRON[2 + (k & 1)]);
  p.set(x + 2, y + 1, IRON[2]); p.set(x + 8, y + 1, IRON[2]);
  p.set(x + 2, y + 2, IRON[1]); p.set(x + 8, y + 2, IRON[1]);
  for (let yy = y + 3; yy < y + 17; yy++) for (let xx = x; xx < x + 11; xx++) p.set(xx, yy, pick(WOOD, 0.6 - (xx - x) * 0.03 + (white(xx, yy, 5) - 0.5) * 0.15, xx, yy));
  for (let xx = x; xx < x + 11; xx++) { p.set(xx, y + 3, WOOD[1]); p.set(xx, y + 16, WOOD[1]); }
  for (let yy = y + 3; yy < y + 17; yy++) { p.set(x, yy, WOOD[1]); p.set(x + 10, yy, WOOD[1]); }
  const ink = (dx: number, dy: number, c: string): void => p.set(x + dx, y + 3 + dy, c);
  if (kind === 'tankard') {
    for (let yy = 3; yy < 11; yy++) for (let xx = 3; xx < 8; xx++) ink(xx, yy, yy < 5 ? '#f4eed8' : '#d6a23c');
    for (const yy of [5, 6, 7, 8]) ink(8, yy, '#d6a23c');
    ink(9, 5, '#d6a23c'); ink(9, 8, '#d6a23c');
  } else if (kind === 'herb') {
    for (const [dx, dy] of [[5, 2], [4, 3], [6, 3], [5, 4], [3, 5], [7, 5], [5, 6], [4, 7], [6, 7], [5, 8], [5, 9]] as const) ink(dx, dy, dy > 5 ? '#6a9a4a' : '#4a7a3a');
  } else {
    for (let xx = 2; xx < 9; xx++) for (let yy = 4; yy < 9; yy++) if (!((xx < 3 || xx > 7) && (yy < 5 || yy > 7))) ink(xx, yy, yy < 6 ? '#e6b25e' : '#c08438');
  }
}

interface Roof {
  ex0: number; ex1: number; rx0: number; rx1: number; eaveY: number; ridgeY: number;
  kind: 'thatch' | 'shingle'; seed: number; moss: number;
}

/**
 * A roof slope, seen from the front. Nothing straight: the ridge sags and
 * lumps, the eave droops and rises, the thatch shows its bundles and its
 * thick layered edge, there is moss where it stays damp and a patch of new straw.
 */
function paintRoof(p: Pix, r: Roof): { eaveAt: (x: number) => number; ridgeAt: (x: number) => number } {
  const { ex0, ex1, rx0, rx1, eaveY, ridgeY, seed } = r;
  const depth = eaveY - ridgeY;
  const xl = (t: number): number => rx0 + (ex0 - rx0) * t + (fbm(t * 6, 1, seed) - 0.5) * 5;
  const xr = (t: number): number => rx1 + (ex1 - rx1) * t + (fbm(t * 6, 2, seed) - 0.5) * 5;
  const sagAmt = 3.5;
  const ridgeAt = (x: number): number => {
    const s = (x - rx0) / (rx1 - rx0);
    return ridgeY + Math.sin(Math.PI * Math.min(1, Math.max(0, s))) * sagAmt + (fbm(x / 7, 5, seed + 1) - 0.5) * 3;
  };
  const eaveAt = (x: number): number => {
    const s = (x - ex0) / (ex1 - ex0);
    return eaveY + (fbm(x / 6, 7, seed + 2) - 0.5) * 7 + Math.sin(s * Math.PI * 2.3 + seed) * 1.6 + Math.sin(Math.PI * s) * 2;
  };
  const patchS = 0.25 + white(1, 2, seed) * 0.5, patchT = 0.4 + white(2, 2, seed) * 0.25;
  for (let y = ridgeY - 8; y <= eaveY + 14; y++) {
    const tNom = (y - ridgeY) / depth;
    const L = xl(Math.min(1, Math.max(0, tNom))), R = xr(Math.min(1, Math.max(0, tNom)));
    for (let x = Math.floor(L) - 6; x <= Math.ceil(R) + 6; x++) {
      const rg = ridgeAt(x), ev = eaveAt(x);
      const verge = x < L ? L - x : x > R ? x - R : 0;
      if (verge > 5) continue;
      if (y < rg || y > ev + 5) continue;
      const tt = Math.min(1.2, Math.max(0, (y - rg) / (ev - rg)));
      const s = (x - L) / (R - L);
      if (y > ev) {
        // The thick underside of the eave: straw ends, shadowed and ragged.
        const k = y - ev;
        if (white(x, y, seed + 3) < 0.12 + k * 0.13) continue;
        p.set(x, y, pick(r.kind === 'thatch' ? THATCH_OLD : SHINGLE_OLD, 0.28 - k * 0.04 + ((x >> 0) % 3 === 0 ? 0.12 : 0) + (white(x, y, seed + 4) - 0.5) * 0.16, x, y));
        continue;
      }
      let v: number;
      let pal: readonly string[];
      if (r.kind === 'thatch') {
        pal = THATCH_OLD;
        const N = 7;
        const bpos = tt * N + (fbm(s * 4, tt * 3, seed + 5) - 0.5) * 1.1;
        const f = bpos - Math.floor(bpos);
        v = 0.8 - tt * 0.16 - s * 0.3 + (0.5 - f) * 0.34 + (fbm(x * 0.7, y * 0.09, seed + 6) - 0.5) * 0.5 + (white(x, y, seed + 7) - 0.5) * 0.12;
        if (f > 0.84) v -= 0.22;
        if (white(x >> 1, y, seed + 8) < 0.05) v -= 0.25;
        if (Math.abs(s - patchS) < 0.09 && Math.abs(tt - patchT) < 0.14) v += 0.2 + (white(x, y, seed + 9) - 0.5) * 0.2;
      } else {
        pal = SHINGLE_OLD;
        const N = Math.max(5, Math.round(depth / 5.5));
        const rowF = tt * N + Math.sin(x * 0.06 + seed) * 0.35 + (fbm(x / 9, 3, seed + 5) - 0.5) * 0.5;
        const row = Math.floor(rowF);
        const fr = rowF - row;
        const sw = 7;
        const id = Math.floor((x + (row % 2) * 3.5) / sw);
        const base = white(id, row, seed + 6);
        v = 0.34 + base * 0.42 - s * 0.26 + (white(x, y, seed + 8) - 0.5) * 0.1;
        if (fr > 0.72) v -= 0.3 * ((fr - 0.72) / 0.28 + 0.4); // each course throws a shadow
        if ((x + (row % 2) * 3.5) % sw < 1) v -= 0.18;
        if (base > 0.93 && fr > 0.5) v += 0.2; // a curled shingle catching light
      }
      if (verge > 0) v = Math.min(v, 0.35) + (Math.floor(y / 3) % 2 ? 0.08 : 0); // layered end of the thatch
      let c: string = pick(pal, v, x, y);
      // Moss: in clumps, lower on the slope, mostly on the shady right.
      const mo = fbm(x / 5.5, y / 4.5, seed + 11) + tt * 0.12 + s * 0.08;
      if (r.moss && mo > 1.02 - r.moss * 0.5 && white(x, y, seed + 12) < 0.9) {
        c = pick(['#2a4024', '#3a5a2c', '#52743a', '#7a9648'], 0.2 + (mo - 0.7) * 1.3 + (white(x, y, seed + 13) - 0.5) * 0.4, x, y);
      }
      p.set(x, y, c);
    }
  }
  // Ridge cap: a rolled bundle, lumpy, tied with cross-ropes.
  for (let x = Math.round(rx0) - 3; x <= Math.round(rx1) + 3; x++) {
    const ry = Math.round(ridgeAt(Math.min(rx1, Math.max(rx0, x))));
    const lump = Math.sin(x * 0.55) * 0.7 + (white(x, 0, seed + 14) - 0.5);
    const th = 4 + Math.round(lump);
    for (let k = -3; k < th; k++) {
      const y = ry + k - 1;
      const v = 0.72 - k * 0.1 - (x - rx0) / (rx1 - rx0 + 1) * 0.25 + (white(x, y, seed + 15) - 0.5) * 0.2;
      p.set(x, y, r.kind === 'thatch' ? pick(THATCH_OLD, v + 0.08, x, y) : pick(SHINGLE_OLD, v * 0.85, x, y));
    }
    if (r.kind === 'thatch' && x % 6 === 0) { p.set(x, ry, '#6a5028'); p.set(x + 1, ry + 1, '#6a5028'); }
  }
  return { eaveAt, ridgeAt };
}

/** A dormer: a small gabled window poking out of the roof slope. */
function dormer(p: Pix, cx: number, base: number, seed: number, lit: boolean): void {
  const w = 22, h = 15;
  const x0 = cx - w / 2;
  limewash(p, x0, base - h, x0 + w - 1, base, seed + 70, 0.9);
  timber(p, x0, base - h, x0, base, 3, seed + 71);
  timber(p, x0 + w - 3, base - h, x0 + w - 3, base, 3, seed + 72);
  timber(p, x0, base - h, x0 + w - 1, base - h, 3, seed + 73);
  glassWindow(p, cx, base - h + 4, 10, 8, lit, null, false, seed + 74);
  // Cheek on the right, in shade.
  for (let k = 0; k < 6; k++) for (let y = base - h + k * 0.8; y < base - k * 0.5; y++) p.set(x0 + w + k, Math.round(y - k * 1.2), pick(LIME, 0.28 - k * 0.02, k, y));
  // Little roof: thick, uneven.
  polyFill(p, [[x0 - 4, base - h + 1], [cx, base - h - 10], [x0 + w + 4, base - h + 1]], (x, y) => {
    const u = (x - x0) / w;
    return pick(SHINGLE, 0.5 - u * 0.3 + (white(x, y, seed + 75) - 0.5) * 0.3 + ((y + (x >> 1)) % 3 === 0 ? -0.15 : 0), x, y);
  });
  for (let x = x0 - 4; x <= x0 + w + 4; x++) { p.set(x, base - h + 1, SHINGLE[0]); p.set(x, base - h + 2, SHINGLE[1]); }
}

/** A stone chimney stack against the gable wall: tapered, soot-stained, capped. */
function stack(p: Pix, x0: number, topY: number, groundY: number, seed: number): void {
  const w = 13;
  stoneWall(p, x0, topY + 6, x0 + w - 1, groundY, seed, STONE);
  // Taper: the lower part is wider, shoulders step in.
  for (let y = topY; y < topY + 6; y++) for (let x = x0 + 1; x < x0 + w - 1; x++) p.set(x, y, pick(STONE, 0.5 - (x - x0) * 0.03 + (white(x, y, seed) - 0.5) * 0.3, x, y));
  for (let x = x0 - 1; x <= x0 + w; x++) { p.set(x, topY, STONE[4]); p.set(x, topY + 1, STONE[1]); }
  for (let y = topY + 2; y < groundY; y++) {
    darken(p, x0 + w - 1, y, 0.35); darken(p, x0 + w - 2, y, 0.2);
    if (y < topY + 12) for (let x = x0; x < x0 + w; x++) darken(p, x, y, 0.35 * (1 - (y - topY) / 12));
  }
  // The dark flue.
  for (let x = x0 + 4; x < x0 + w - 4; x++) p.set(x, topY + 1, SOOT);
}

export function makeHouse(spec: HouseSpec): Prop {
  const { seed } = spec;
  const cols = spec.cols ?? 4;
  const Wf = cols === 5 ? 132 : 104;
  const Hw = 58, DX = 40, DY = -44, RISE = 28;
  const FX0 = 16, FX1 = FX0 + Wf, FB = 128, FE = FB - Hw;
  const W = FX1 + DX + 26, H = FB + 6;
  const shut = spec.shutters ?? 'rust';
  const lit = spec.lit !== false;
  const kind = spec.roof ?? 'thatch';

  const body = new Pix(W, H);
  const roofL = new Pix(W, H);

  // --- side wall (right), foreshortened, in shade ---
  const sideX = (u: number): number => FX1 + u * DX;
  const sideY = (u: number, v: number): number => FB + u * DY - v * Hw;
  const sideShade = new Pix(W, H);
  limewash(sideShade, FX1, FE + DY - 2, FX1 + DX, FB, seed + 20, 0.74);
  polyFill(body, [[FX1, FE], [FX1 + DX, FE + DY], [FX1 + DX, FB + DY], [FX1, FB]], (x, y) => {
    const u = (x - FX1) / DX;
    const v = (FB + u * DY - y) / Hw;
    if (v < 0.17) return pick(STONE, 0.35 + (white(x >> 1, y >> 1, seed + 21) - 0.5) * 0.5 + fbm(x / 3, y / 3, seed) * 0.2 - 0.08, x, y);
    const c = sideShade.get(x, y);
    return c[3] ? c : '#8a7c62';
  });
  // Side frame: posts at the corners and the middle, one rail, knee braces.
  for (const u of [0.02, 0.5, 0.98]) timber(body, Math.round(sideX(u)), Math.round(sideY(u, 0.17)), Math.round(sideX(u)), Math.round(sideY(u, 1)), 3, seed + 22 + Math.round(u * 10));
  for (let x = FX1; x < FX1 + DX; x++) { const u = (x - FX1) / DX; for (let k = 0; k < 3; k++) body.set(x, Math.round(sideY(u, 1)) + k, pick(WOOD, 0.58 - k * 0.2, x, k)); }
  // Small side window.
  const swx = Math.round(sideX(0.3)), swy = Math.round(sideY(0.3, 0.7));
  glassWindow(body, swx, swy, 8, 10, lit, spec.shutters ? shut : null, false, seed + 24);
  // Gable above the wall.
  polyFill(body, [[FX1, FE], [FX1 + DX, FE + DY], [FX1 + DX / 2, FE + DY / 2 - RISE]], (x, y) => pick(WOOD, 0.34 + (white(x >> 1, y, seed + 25) - 0.5) * 0.3 - (x - FX1) * 0.004, x, y));

  // --- front wall ---
  const posts = cols === 5 ? [0, 28, 62, 92, 128] : [0, 30, 62, 84, 100];
  const FL = FB - 9; // top of the stone footing
  limewash(body, FX0, FE, FX1 - 1, FL, seed + 30);
  stoneWall(body, FX0 - 1, FL, FX1, FB, seed + 31, STONE, 3);
  for (let x = FX0 - 1; x <= FX1; x++) body.set(x, FL, STONE[4]); // footing cap
  // Frame: sill, mid rail, top rail, posts, knee braces in pairs.
  timber(body, FX0, FL - 3, FX1, FL - 3, 3, seed + 32);
  timber(body, FX0, FE + 36, FX1, FE + 36, 3, seed + 33);
  timber(body, FX0 - 1, FE, FX1 + 1, FE, 4, seed + 34);
  for (const px of posts) timber(body, FX0 + px, FE, FX0 + px, FL - 3, px === 0 || px === Wf - 4 ? 4 : 3, seed + 35 + px);
  for (const px of posts.slice(1, -1)) {
    for (const side of [-1, 1]) {
      const bx = FX0 + px + (side > 0 ? 3 : 0);
      timber(body, bx, FE + 20, bx + side * 12, FE + 6, 2, seed + 40 + px + side);
    }
  }
  const doorX = FX0 + posts[1] + 5, doorW = 20;
  const winB = FX0 + posts[2] + 15;
  // Long brace in the plain end bay.
  const endBay = posts[posts.length - 2];
  if (!spec.shop) timber(body, FX0 + endBay + 4, FE + 35, FX0 + Wf - 6, FE + 7, 2, seed + 50);
  // Openings (drawn over the frame).
  glassWindow(body, FX0 + 16, FE + 12, 14, 18, lit, shut, true, seed + 51);
  glassWindow(body, winB, FE + 12, 14, 18, lit, shut, spec.shop !== 'tankard', seed + 52);
  if (cols === 5) glassWindow(body, FX0 + posts[3] + 18, FE + 12, 14, 18, false, shut, false, seed + 53);
  plankDoor(body, doorX, FE + 10, doorW, FB - 3, seed + 54);
  if (spec.shop) signBoard(body, FX0 + Wf - 15, FE + 10, spec.shop);
  // The eave throws a shadow down the wall.
  for (let y = FE + 5; y < FE + 13; y++) for (let x = FX0; x < FX1; x++) darken(body, x, y, 0.4 * (1 - (y - FE - 5) / 8));
  // Weather the wall base and the ground contact.
  mossify(body, seed + 60, 0.5, (_x, y) => (y > FL - 3 && y < FB ? 1.2 : 0));
  grime(body, seed + 61, 0.6, FB + 2);
  speckle(body, seed + 62, 0.02, 0.2, 0.3);

  // --- stack on the gable, drawn with the walls (in front of the side wall) ---
  const stackX = Math.round(FX1 + DX * 0.5 + 3);
  stack(body, stackX, 8, Math.round(FB + DY * 0.5 + 4), seed + 63);

  // --- roof (its own layer) ---
  const ex0 = FX0 - 7, ex1 = FX1 + 6;
  const rx0 = ex0 + DX / 2, rx1 = ex1 + DX / 2;
  const eaveY = FE + 1, ridgeY = FE + DY / 2 - RISE;
  paintRoof(roofL, { ex0, ex1, rx0, rx1, eaveY, ridgeY, kind, seed: seed + 80, moss: kind === 'thatch' ? 0.42 : 0.3 });
  const dcx = FX0 + Math.round(Wf * 0.46);
  dormer(roofL, dcx, Math.round(ridgeY + (eaveY - ridgeY) * 0.62) + 8, seed + 90, lit);
  chew(roofL, seed + 91, 0.06);

  const bodyO = selOutline(body);
  const roofO = selOutline(roofL);
  const full = new Pix(bodyO.w, bodyO.h);
  full.blit(bodyO, 0, 0);
  full.blit(roofO, 0, 0);

  const ax = Math.round(FX0 + Wf / 2) + 1;
  const glow = (wx: number, wy: number, r: number): Light => ({ dx: wx + 1 - ax, dy: wy + 1 - (FB + 2), r, color: [1, 0.72, 0.3], flicker: 0.3 });
  const lights: Light[] = lit ? [glow(FX0 + 16, FE + 21, 28), glow(winB, FE + 21, 28)] : [];
  const prop = still(full, ax, FB + 2, 60, {
    lights,
    smoke: [{ dx: stackX + 6 + 1 - ax, dy: 6 - (FB + 2) }],
    footprint: { cols, rows: 3 },
  });
  return prop;
}
