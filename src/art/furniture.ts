import { Rng } from '../core/rng';
import { IRON, STONE, WOOD, stoneWall } from './buildings';
import {
  type Light, type Prop, type Pt, capsule, chew, fbm, grime, mossify, pick, polyFill, selOutline, still, white,
} from './grit';
import { Pix } from './pix';
import { FRAMES } from './props';

/**
 * Things for inside: furniture, hearth, forge. Drawn at the same scale as the
 * people (a 36 px person sits on a 14 px stool) and in the same slanted
 * 3/4 view as the houses: you see the front, the top, and the right side.
 */

type Painter = (x: number, y: number) => string;

/** Depth runs up and to the right, like the houses'. */
const OBX = 0.5, OBY = -0.8;

const woodP = (seed: number, shade: number, vertical = false): Painter => (x, y) =>
  pick(WOOD, shade + (fbm(vertical ? x * 1.6 : x / 6, vertical ? y / 6 : y * 1.6, seed) - 0.5) * 0.42 + (white(x, y, seed + 1) - 0.5) * 0.1, x, y);

const stoneP = (seed: number, shade: number): Painter => (x, y) =>
  pick(STONE, shade + (fbm(x / 3, y / 3, seed) - 0.5) * 0.5 + (white(x >> 1, y >> 1, seed + 1) - 0.5) * 0.3, x, y);

/** A box seen from above-front-right: top, front, right side. (x, y) is the front-bottom-left corner. */
function box(p: Pix, x: number, y: number, w: number, h: number, d: number, top: Painter, front: Painter, side: Painter, edge: string | null = WOOD[5]): void {
  const ox = d * OBX, oy = d * OBY;
  polyFill(p, [[x + w, y - h], [x + w + ox, y - h + oy], [x + w + ox, y + oy], [x + w, y]], side);
  polyFill(p, [[x, y - h], [x + w, y - h], [x + w + ox, y - h + oy], [x + ox, y - h + oy]], top);
  polyFill(p, [[x, y - h], [x + w, y - h], [x + w, y], [x, y]], front);
  if (edge) for (let xx = Math.round(x); xx < Math.round(x + w); xx++) p.set(xx, Math.round(y - h), edge);
}

const ellipse = (p: Pix, cx: number, cy: number, rx: number, ry: number, paint: Painter): void => {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) p.set(x, y, paint(x, y));
    }
  }
};

const POT = ['#2a1a14', '#4e2e20', '#7a4a30', '#a46a44', '#c88c5c'];
const CLOTH = ['#40201e', '#6c2a26', '#9a403a', '#c25e50'];

function finish(p: Pix, ax: number, ay: number, seed: number, shadow = 20, extra: Partial<Prop> = {}): Prop {
  grime(p, seed, 0.35, ay);
  chew(p, seed + 1, 0.05);
  return still(selOutline(p), ax + 1, ay + 1, shadow, extra);
}

export function makeTable(seed = 1): Prop {
  const p = new Pix(76, 58);
  const g = 54;
  for (const x of [11, 52]) capsule(p, x, 34, x, g, 2.1, 2.3, WOOD, seed + x, 0.25);
  box(p, 8, 34, 48, 4, 24, woodP(seed, 0.7), woodP(seed + 1, 0.48), woodP(seed + 2, 0.32));
  capsule(p, 67, 20, 67, 35, 1.8, 1.8, WOOD, seed + 9, 0.25);
  // Things on it: bowl, loaf, jug, candle in a dish.
  ellipse(p, 36, 21, 6, 2.6, (x, y) => pick(POT, 0.62 - (x - 30) * 0.03 + (y > 21 ? -0.15 : 0), x, y));
  ellipse(p, 36, 20, 4.2, 1.5, () => '#d4a050');
  ellipse(p, 24, 24, 5, 2, (x, y) => pick(['#4a2a14', '#7a4a22', '#a8742f', '#d49e50'], 0.7 - (y - 24) * 0.2, x, y));
  for (let y = 16; y < 22; y++) for (let x = 47; x < 51; x++) p.set(x, y, pick(POT, 0.8 - (x - 47) * 0.2, x, y));
  p.set(51, 18, POT[2]); p.set(51, 19, POT[2]);
  for (let y = 18; y < 24; y++) p.set(18, y, '#e8dcc0');
  p.set(18, 17, '#ffd060'); p.set(18, 16, '#fff2b0');
  return finish(p, 38, g, seed, 30, { lights: [{ dx: -20, dy: -38, r: 22, color: [1, 0.78, 0.4], flicker: 0.8 }] });
}

export function makeStool(seed = 2): Prop {
  const p = new Pix(30, 32);
  for (const x of [7, 15]) capsule(p, x, 17, x + (x > 10 ? 1 : -1), 29, 1.5, 1.7, WOOD, seed + x, 0.25);
  capsule(p, 21, 12, 21, 21, 1.3, 1.3, WOOD, seed + 4, 0.25);
  box(p, 4, 17, 14, 3, 9, woodP(seed, 0.72), woodP(seed + 1, 0.46), woodP(seed + 2, 0.3));
  return finish(p, 12, 29, seed, 14);
}

export function makeBench(seed = 3): Prop {
  const p = new Pix(58, 34);
  for (const x of [7, 38]) capsule(p, x, 17, x + (x > 20 ? 1 : -1), 31, 1.7, 1.9, WOOD, seed + x, 0.25);
  capsule(p, 50, 12, 50, 22, 1.4, 1.4, WOOD, seed + 4, 0.25);
  box(p, 4, 18, 40, 4, 10, woodP(seed, 0.72), woodP(seed + 1, 0.46), woodP(seed + 2, 0.3));
  return finish(p, 24, 31, seed, 22);
}

export function makeBed(seed = 4): Prop {
  const p = new Pix(82, 62);
  const g = 58;
  for (const x of [8, 52]) capsule(p, x, 46, x, g, 2.4, 2.6, WOOD, seed + x, 0.25);
  // Frame, headboard at the left end.
  box(p, 6, 48, 50, 8, 26, woodP(seed, 0.66), woodP(seed + 1, 0.46), woodP(seed + 2, 0.3));
  box(p, 6, 48, 4, 26, 26, woodP(seed, 0.7), woodP(seed + 3, 0.5, true), woodP(seed + 2, 0.3, true));
  // Mattress surface: straw tick, blanket over the foot end, a pillow at the head.
  const ox = 26 * OBX, oy = 26 * OBY;
  polyFill(p, [[10, 40], [56, 40], [56 + ox, 40 + oy], [10 + ox, 40 + oy]], (x, y) => {
    const t = (40 - y) / -oy;
    const u = x - 10 - t * ox;
    if (u > 14) {
      const stripe = Math.floor((u + t * 6) / 5) % 2;
      return pick(CLOTH, 0.62 + stripe * 0.12 - t * 0.1 + (fbm(x / 3, y / 3, seed) - 0.5) * 0.3 + (white(x, y, seed + 5) - 0.5) * 0.1, x, y);
    }
    return pick(['#6a5a3c', '#8c7a50', '#b09c68', '#d4c28a'], 0.6 + (fbm(x / 2, y / 2, seed + 6) - 0.5) * 0.6, x, y);
  });
  polyFill(p, [[10, 40], [56, 40], [56, 48], [10, 48]], (x, y) => pick(['#3e3a46', '#6a6676', '#9a96a6', '#c4c0ce'], 0.55 + (Math.floor(x / 3) % 2 ? 0.15 : -0.1) + (y < 42 ? 0.1 : 0), x, y));
  ellipse(p, 21, 26, 7, 3.4, (x, y) => pick(['#8a8794', '#bab6c2', '#e6e2e8', '#f6f2f4'], 0.8 - (x - 14) * 0.03 - (y - 22) * 0.03, x, y));
  // Footboard in front of the blanket.
  box(p, 52, 48, 4, 14, 26, woodP(seed, 0.7), woodP(seed + 3, 0.5, true), woodP(seed + 2, 0.3, true));
  return finish(p, 40, g, seed, 36);
}

export function makeChest(seed = 5): Prop {
  const p = new Pix(52, 38);
  box(p, 5, 32, 32, 14, 16, woodP(seed, 0.64), woodP(seed + 1, 0.48), woodP(seed + 2, 0.3));
  box(p, 4, 18, 34, 5, 17, woodP(seed + 3, 0.78), woodP(seed + 4, 0.55), woodP(seed + 5, 0.36));
  for (const x of [9, 30]) {
    for (let y = 18; y < 32; y++) { p.set(x, y, IRON[2]); p.set(x + 1, y, IRON[1]); }
    for (let k = 0; k < 4; k++) p.set(x + 8 + k, 14 - k * 0.8, IRON[2]);
  }
  for (let y = 19; y < 24; y++) for (let x = 19; x < 24; x++) p.set(x, y, x === 19 || y === 19 ? IRON[4] : IRON[2]);
  p.set(21, 21, IRON[0]);
  return finish(p, 22, 32, seed, 26);
}

export function makeCupboard(seed = 6): Prop {
  const p = new Pix(54, 80);
  box(p, 6, 74, 32, 8, 14, woodP(seed, 0.4), woodP(seed + 1, 0.4), woodP(seed + 2, 0.28), null); // plinth
  box(p, 6, 66, 32, 54, 14, woodP(seed, 0.62), woodP(seed + 3, 0.5, true), woodP(seed + 4, 0.3, true));
  // Two doors with raised panels, a gap down the middle, iron latches.
  for (const dx of [0, 15]) {
    for (const [y0, y1] of [[18, 40], [43, 63]] as const) {
      for (let y = y0; y < y1; y++) for (let x = 9 + dx; x < 21 + dx; x++) {
        const edge = x === 9 + dx || y === y0;
        p.set(x, y, pick(WOOD, (edge ? 0.28 : 0.55) + (fbm(x * 1.5, y / 6, seed + 7) - 0.5) * 0.3, x, y));
      }
    }
  }
  for (let y = 14; y < 66; y++) p.set(22, y, WOOD[0]);
  for (const x of [20, 24]) for (let y = 38; y < 44; y++) p.set(x, y, IRON[3]);
  // Cornice and a jug on top.
  box(p, 4, 16, 36, 4, 16, woodP(seed + 8, 0.75), woodP(seed + 9, 0.55), woodP(seed + 10, 0.35));
  for (let y = 4; y < 14; y++) for (let x = 24; x < 30; x++) p.set(x, y, pick(POT, 0.8 - (x - 24) * 0.14 + (y < 7 ? 0.1 : 0), x, y));
  p.set(30, 7, POT[2]); p.set(30, 8, POT[2]); p.set(31, 8, POT[2]);
  return finish(p, 24, 74, seed, 26);
}

/** Wall-mounted: a shelf with jars, crocks and a loaf. Sits on the back wall. */
export function makeShelf(seed = 7): Prop {
  const p = new Pix(58, 34);
  const jar = (x: number, h: number, w: number, c: readonly string[]): void => {
    for (let y = 24 - h; y < 24; y++) for (let k = 0; k < w; k++) p.set(x + k, y, pick(c, 0.8 - k * (0.9 / w) + (y < 24 - h + 2 ? 0.1 : 0) + (white(x + k, y, seed) - 0.5) * 0.15, x + k, y));
    for (let k = 1; k < w - 1; k++) p.set(x + k, 24 - h - 1, c[1]);
  };
  jar(6, 12, 6, POT); jar(14, 8, 7, ['#2a3a2a', '#44603a', '#6a8c4a', '#98b864']); jar(24, 14, 5, POT);
  jar(31, 9, 8, ['#2e3a4e', '#44608a', '#6a8cb4', '#9ab8d4']); jar(42, 7, 7, POT);
  box(p, 3, 27, 50, 3, 7, woodP(seed, 0.72), woodP(seed + 1, 0.5), woodP(seed + 2, 0.32));
  for (const x of [8, 44]) for (let y = 30; y < 34; y++) p.set(x, y, WOOD[1]);
  return finish(p, 28, 33, seed, 0);
}

function flame(p: Pix, x0: number, x1: number, base: number, h: number, f: number, seed: number): void {
  for (let x = x0; x < x1; x++) {
    const mid = 1 - Math.abs((x - (x0 + x1) / 2) / ((x1 - x0) / 2));
    const hh = h * mid * (0.55 + fbm(x * 0.55 + f * 0.9, f * 0.7, seed) * 0.9);
    for (let k = 0; k < hh; k++) {
      const t = k / Math.max(1, hh);
      p.set(x, base - k, pick(['#7a1a10', '#c43a1e', '#ee7a2a', '#ffc04a', '#fff0a0'], 1 - t * 0.9 - (1 - mid) * 0.3 + (white(x, k, seed + f) - 0.5) * 0.3, x, k));
    }
  }
}

/** A stone hearth with a live fire, an iron crane and a pot. Animated. */
export function makeHearth(seed = 8): Prop {
  const W = 84, H = 96;
  const base = new Pix(W, H);
  const g = 90;
  // Chimney breast above the mantel.
  polyFill(base, [[18, 40], [62, 40], [56, 4], [24, 4]], stoneP(seed, 0.5));
  box(base, 8, g, 56, 46, 14, stoneP(seed + 1, 0.62), stoneP(seed + 2, 0.46), stoneP(seed + 3, 0.28), STONE[5]);
  stoneWall(base, 8, g - 46, 63, g, seed + 4, STONE);
  // The opening: a dark arch with soot above it.
  polyFill(base, [[20, g], [52, g], [52, g - 22], [48, g - 29], [36, g - 32], [24, g - 29], [20, g - 22]], (x, y) => pick(['#060404', '#120a08', '#26140e'], 0.2 + (g - y) * 0.004 + (white(x, y, seed) - 0.5) * 0.2, x, y));
  for (let x = 19; x < 53; x++) { base.set(x, g - 31 + Math.round(Math.abs(x - 36) * 0.18), STONE[5]); }
  box(base, 5, g - 46, 62, 5, 18, woodP(seed + 5, 0.74), woodP(seed + 6, 0.5), woodP(seed + 7, 0.3));
  for (let x = 6; x < 66; x++) base.set(x, g - 52 + 6, WOOD[1]);
  // Iron crane and pot.
  for (let y = g - 30; y < g - 8; y++) base.set(24, y, IRON[2]);
  for (let x = 24; x < 40; x++) base.set(x, g - 30, IRON[2]);
  for (let y = g - 30; y < g - 16; y++) base.set(38, y, IRON[1]);
  ellipse(base, 38, g - 12, 6, 5, (x, y) => pick(IRON, 0.6 - (x - 32) * 0.05 + (y < g - 14 ? 0.15 : 0), x, y));
  ellipse(base, 38, g - 16, 5, 1.4, () => '#6a4a22');
  // Logs and ash.
  capsule(base, 24, g - 2, 44, g - 4, 2.1, 2.1, WOOD, seed + 8, 0.3);
  capsule(base, 28, g - 5, 46, g - 2, 1.9, 1.9, WOOD, seed + 9, 0.3);
  for (let x = 16; x < 60; x++) if (white(x, 0, seed + 10) < 0.5) base.set(x, g + 1, '#3a3430');
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const fr = base.scaled(1);
    flame(fr, 26, 48, g - 4, 24, f, seed);
    // Glow on the stone around the opening.
    for (let y = g - 32; y < g; y++) for (let x = 14; x < 58; x++) {
      if (!fr.alpha(x, y)) continue;
      const c = fr.get(x, y);
      if (c[0] > 200 && c[2] < 140) continue;
      const d = Math.hypot((x - 37) / 22, (y - (g - 10)) / 22);
      if (d < 1) { const k = (1 - d) * 0.35; fr.set(x, y, [c[0] + (255 - c[0]) * k * 0.8, c[1] + (140 - c[1]) * k * 0.5, c[2], 255]); }
    }
    frames.push(selOutline(fr));
  }
  return { frames, ax: 38, ay: g + 2, shadow: 40, lights: [{ dx: 0, dy: -14, r: 46, color: [1, 0.55, 0.22], flicker: 1 }] as Light[] };
}

/** A woven rug, flat on the floor. */
export function makeRug(seed = 9): Prop {
  const p = new Pix(76, 40);
  const w = 46, d = 22, ox = d * OBX, oy = d * OBY;
  const x0 = 6, y0 = 34;
  const pts: Pt[] = [[x0, y0], [x0 + w, y0], [x0 + w + ox, y0 + oy], [x0 + ox, y0 + oy]];
  polyFill(p, pts, (x, y) => {
    const t = (y0 - y) / -oy;
    const u = (x - x0 - t * ox) / w;
    const edge = Math.min(u, 1 - u, t, 1 - t);
    const wv = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? 0.04 : -0.04;
    let v = 0.55;
    let pal: readonly string[] = CLOTH;
    if (edge < 0.07) { pal = ['#1e2a3a', '#2e4866', '#46688c', '#6c90b0']; v = 0.5; }
    else if (edge < 0.13) { pal = ['#4a4030', '#8c7a50', '#b09c68', '#d4c28a']; v = 0.6; }
    else if (Math.abs(u - 0.5) + Math.abs(t - 0.5) * 2.1 < 0.28) { pal = ['#4a4030', '#8c7a50', '#b09c68', '#d4c28a']; v = 0.55; }
    return pick(pal, v + wv + (white(x, y, seed) - 0.5) * 0.14 + (fbm(x / 3, y / 3, seed) - 0.5) * 0.18, x, y);
  });
  for (let i = 0; i < w; i += 2) { p.set(x0 + i, y0 + 1, '#c8b88a'); p.set(x0 + i + ox, y0 + oy - 1, '#c8b88a'); }
  grime(p, seed, 0.3, y0);
  return still(p, 30, 28, 0);
}

export function makeLadder(seed = 10): Prop {
  const p = new Pix(24, 70);
  capsule(p, 5, 68, 9, 4, 1.6, 1.4, WOOD, seed, 0.25);
  capsule(p, 17, 68, 20, 4, 1.6, 1.4, WOOD, seed + 1, 0.25);
  for (let y = 62; y > 8; y -= 8) {
    const t = (68 - y) / 64;
    const xa = 5 + t * 4, xb = 17 + t * 3;
    for (let x = Math.round(xa); x <= Math.round(xb); x++) { p.set(x, y, pick(WOOD, 0.7, x, y)); p.set(x, y + 1, WOOD[1]); }
  }
  return finish(p, 12, 68, seed, 8);
}

// --- smithy ----------------------------------------------------------------

/** A forge: waist-high stone hearth with glowing coals on top and a hood behind. Animated. */
export function makeForge(seed = 11): Prop {
  const W = 84, H = 78;
  const base = new Pix(W, H);
  const g = 74;
  // Hood: a tapering stone mass against the back wall.
  polyFill(base, [[16, 30], [70, 30], [60, 2], [26, 2]], stoneP(seed, 0.5));
  for (let y = 2; y < 30; y++) for (let x = 16; x < 70; x++) if (base.alpha(x, y) && y > 24) { const i = (y * W + x) * 4; for (let c = 0; c < 3; c++) base.data[i + c] *= 0.7; }
  // The hearth block.
  box(base, 8, g, 58, 30, 26, stoneP(seed + 1, 0.4), stoneP(seed + 2, 0.46), stoneP(seed + 3, 0.28), STONE[5]);
  stoneWall(base, 8, g - 30, 65, g, seed + 4, STONE);
  // Arch at the front for the ash pit.
  polyFill(base, [[24, g], [48, g], [48, g - 12], [44, g - 17], [28, g - 17], [24, g - 12]], () => '#0c0806');
  // Bellows to the left.
  polyFill(base, [[0, g - 12], [14, g - 22], [14, g - 6], [0, g - 2]], (x, y) => pick(['#1e1410', '#3a281c', '#5a4030', '#7a5a42'], 0.55 - (x * 0.02) + (Math.floor(y / 3) % 2 ? 0.1 : -0.05), x, y));
  for (let x = 0; x < 14; x += 3) for (let y = g - 22 + x * 0.1; y < g - 3; y += 1) if (white(x, y, seed) < 0.02) base.set(x, Math.round(y), IRON[3]);
  capsule(base, 12, g - 14, 20, g - 20, 1.2, 1.2, IRON, seed, 0.1);
  const frames: Pix[] = [];
  const ox = 26 * OBX, oy = 26 * OBY;
  for (let f = 0; f < FRAMES; f++) {
    const fr = base.scaled(1);
    // Coal bed on top of the hearth.
    polyFill(fr, [[14, g - 30], [60, g - 30], [60 + ox, g - 30 + oy], [14 + ox, g - 30 + oy]].map(([x, y]): Pt => [x, y]).map(([x, y], i): Pt => (i < 2 ? [x, y] : [x - 2, y + 2])), (x, y) => {
      const heat = fbm(x * 0.35 + f * 0.25, y * 0.5 - f * 0.3, seed + 20) * 1.4 - 0.1 + (white(x, y, seed + f) - 0.5) * 0.2;
      const cx = 40, cy = g - 40;
      const mask = 1 - Math.min(1, Math.hypot((x - cx) / 24, (y - cy) / 8));
      return pick(['#120a08', '#2a120e', '#7a2414', '#d4521e', '#f29a38', '#ffe08a'], heat * 0.6 + mask * 0.55, x, y);
    });
    flame(fr, 32, 52, g - 31, 10, f, seed + 3);
    // A bar of iron heating in the coals.
    for (let x = 22; x < 40; x++) fr.set(x, g - 34 + Math.round((x - 22) * 0.1), x > 32 ? '#ffb050' : '#9a8878');
    frames.push(selOutline(fr));
  }
  return { frames, ax: 38, ay: g + 2, shadow: 44, lights: [{ dx: 4, dy: -34, r: 56, color: [1, 0.5, 0.18], flicker: 1 }] as Light[] };
}

export function makeAnvil(seed = 12): Prop {
  const p = new Pix(44, 44);
  const g = 40;
  // Stump base with the oak's bark.
  for (let y = 22; y <= g; y++) for (let x = 12; x < 32; x++) {
    const u = (x - 12) / 20;
    p.set(x, y, pick(['#1e130e', '#33211a', '#4b3324', '#654630', '#80593c'], 0.85 - u * 0.7 + (fbm(x * 1.7, y / 9, seed) - 0.5) * 0.5, x, y));
  }
  ellipse(p, 22, 22, 10, 3, (x, y) => pick(['#4a3a2a', '#6a5640', '#887258', '#a38c6e'], 0.6 + (fbm(x / 3, y / 3, seed) - 0.5) * 0.4, x, y));
  // Anvil: face, horn, waist, foot.
  polyFill(p, [[8, 14], [36, 14], [34, 18], [26, 19], [26, 24], [30, 26], [30, 28], [14, 28], [14, 26], [18, 24], [18, 19], [12, 18]], (x, y) => pick(IRON, 0.72 - (x - 8) * 0.012 - (y - 14) * 0.03 + (white(x, y, seed) - 0.5) * 0.1, x, y));
  polyFill(p, [[36, 14], [42, 15], [36, 18]], (x, y) => pick(IRON, 0.6 - (x - 36) * 0.04, x, y));
  for (let x = 9; x < 36; x++) p.set(x, 14, IRON[4]);
  p.set(22, 13, '#ffb050'); p.set(23, 13, '#ff8030'); // a spark's worth of heat on the face
  return finish(p, 22, g, seed, 24);
}

export function makeTrough(seed = 13): Prop {
  const W = 60, H = 36;
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const p = new Pix(W, H);
    const g = 32;
    box(p, 5, g, 38, 14, 16, woodP(seed, 0.6), woodP(seed + 1, 0.46, true), woodP(seed + 2, 0.3, true));
    const ox = 16 * OBX, oy = 16 * OBY;
    polyFill(p, [[8, g - 14], [40, g - 14], [40 + ox - 2, g - 14 + oy + 2], [8 + ox + 2, g - 14 + oy + 2]], (x, y) => {
      const n = fbm((x + f * 1.5) / 5, y / 2, seed + 4);
      return pick(['#0e1c32', '#1c3558', '#2e5a8a', '#6a9cc8', '#c8e4f0'], 0.34 + (n - 0.5) * 0.7 + (n > 0.64 ? 0.2 : 0), x, y);
    });
    for (const x of [14, 33]) for (let y = g - 14; y < g; y++) { p.set(x, y, IRON[2]); p.set(x + 1, y, IRON[1]); }
    grime(p, seed, 0.4, g);
    frames.push(selOutline(p));
  }
  return { frames, ax: 24, ay: 34, shadow: 30 };
}

/** Tools hung on the wall: hammers, tongs, a rasp. */
export function makeToolRack(seed = 14): Prop {
  const p = new Pix(60, 36);
  box(p, 3, 8, 54, 3, 4, woodP(seed, 0.66), woodP(seed + 1, 0.46), woodP(seed + 2, 0.3));
  const rng = Rng.fromSeed(seed);
  const hang = (x: number, len: number, head: 'hammer' | 'tongs' | 'rasp'): void => {
    for (let y = 8; y < 8 + len; y++) p.set(x, y, head === 'tongs' ? IRON[2 + (y & 1)] : WOOD[3]);
    if (head === 'hammer') for (let k = -3; k <= 3; k++) { p.set(x + k, 8 + len, IRON[3]); p.set(x + k, 9 + len, IRON[2]); }
    if (head === 'tongs') { p.set(x - 1, 8 + len, IRON[2]); p.set(x + 1, 8 + len, IRON[2]); p.set(x - 2, 9 + len, IRON[1]); p.set(x + 2, 9 + len, IRON[1]); for (let y = 8; y < 8 + len; y++) p.set(x + 1, y, IRON[1]); }
    if (head === 'rasp') for (let y = 8 + len - 8; y < 8 + len; y++) { p.set(x - 1, y, IRON[3]); p.set(x, y, IRON[2]); p.set(x + 1, y, IRON[3]); }
  };
  hang(10, 18, 'hammer'); hang(20, 24, 'tongs'); hang(29, 15, 'hammer'); hang(38, 22, 'tongs'); hang(48, 20, 'rasp');
  void rng;
  return finish(p, 30, 35, seed, 0);
}

export function makeCoalBin(seed = 15): Prop {
  const p = new Pix(54, 36);
  const g = 32;
  box(p, 4, g, 34, 16, 14, woodP(seed, 0.5), woodP(seed + 1, 0.42, true), woodP(seed + 2, 0.28, true), null);
  const ox = 14 * OBX, oy = 14 * OBY;
  polyFill(p, [[7, g - 16], [35, g - 16], [35 + ox, g - 16 + oy], [7 + ox, g - 16 + oy]], (x, y) => {
    const n = white(x >> 1, y >> 1, seed);
    return n < 0.12 ? pick(['#5a5a64', '#8a8a96'], 0.7, x, y) : pick(['#08080a', '#14141a', '#24242c', '#34343c'], 0.4 + n * 0.5 + (y < g - 22 ? 0.1 : 0), x, y);
  });
  for (let x = 6; x < 36; x += 5) for (let y = g - 18; y < g - 15; y++) p.set(x + (y & 1), y, '#24242c');
  return finish(p, 22, g, seed, 24);
}

export function makeWorkbench(seed = 16): Prop {
  const p = new Pix(84, 52);
  const g = 48;
  for (const x of [8, 62]) capsule(p, x, 26, x, g, 2.3, 2.5, WOOD, seed + x, 0.25);
  box(p, 4, 28, 64, 5, 20, woodP(seed, 0.68), woodP(seed + 1, 0.46), woodP(seed + 2, 0.3));
  capsule(p, 78, 14, 78, 34, 2, 2, WOOD, seed + 3, 0.25);
  // A vice, a horseshoe, a hammer.
  for (let y = 12; y < 22; y++) for (let x = 12; x < 20; x++) p.set(x, y, pick(IRON, 0.62 - (x - 12) * 0.07 + (y < 14 ? 0.2 : 0), x, y));
  for (let y = 22; y < 26; y++) p.set(15, y, IRON[1]);
  for (let a = 0; a < 6; a++) { p.set(32 + Math.round(Math.cos(a / 5 * 3.1 + 3.1) * 5), 18 + Math.round(Math.sin(a / 5 * 3.1 + 3.1) * -3), IRON[3]); }
  capsule(p, 42, 20, 54, 17, 0.9, 0.9, WOOD, seed + 4, 0.2);
  for (let y = 14; y < 19; y++) for (let x = 54; x < 58; x++) p.set(x, y, IRON[2 + (x & 1)]);
  mossify(p, seed, 0.1, () => 0);
  return finish(p, 40, g, seed, 34);
}

/** Every furnishing, by name, for galleries and for dressing rooms. */
export const FURNITURE: Record<string, () => Prop> = {
  table: makeTable, stool: makeStool, bench: makeBench, bed: makeBed, chest: makeChest, cupboard: makeCupboard,
  shelf: makeShelf, hearth: makeHearth, rug: makeRug, ladder: makeLadder,
  forge: makeForge, anvil: makeAnvil, trough: makeTrough, 'tool rack': makeToolRack, 'coal bin': makeCoalBin, workbench: makeWorkbench,
};
