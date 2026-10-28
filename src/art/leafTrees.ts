import { Rng } from '../core/rng';
import { BIRCH, type Season, WILLOW, leafPalette } from './foliage';
import { type Prop, capsule, chew, column, fbm, grime, mossify, pick, selOutline, white } from './grit';
import { Pix } from './pix';
import { FRAMES } from './props';
import { makeOak } from './rough';
import { type Clump, canopy } from './scrub';

/**
 * More leaf trees, each a species with its own habit, each seeded so no two
 * match: weeping willow and birch (hanging fronds), orchard apple, vase-shaped
 * elm, columnar poplar. Season swaps the leaves. They all sway.
 */

export const TREE_KINDS = ['oak', 'elm', 'willow', 'birch', 'apple', 'poplar'] as const;
export type TreeKind = (typeof TREE_KINDS)[number];

const BARK = ['#1e130e', '#33211a', '#4b3324', '#654630', '#80593c'];
const BARK_GREY = ['#1c1a18', '#34302c', '#504a42', '#6e665a', '#8c8272'];
const BIRCH_BARK = ['#24221f', '#5a5852', '#98968c', '#cfcdc2', '#f0eee2'];

interface Strand { x: number; y: number; len: number; ph: number; amp: number; tone: number; wide: boolean }

function drawStrands(p: Pix, strands: readonly Strand[], f: number, pal: readonly string[], wind: number, seed: number): void {
  for (const s of strands) {
    for (let i = 0; i < s.len; i++) {
      const k = i / s.len;
      if (k > 0.85 && white(i, s.x, seed) < (k - 0.85) * 4) continue; // frayed tip
      const sw = Math.sin((f / FRAMES) * Math.PI * 2 + s.ph + i * 0.07) * s.amp * Math.pow(k, 1.1) * (1 + wind * 1.5) + wind * 3 * k;
      const wig = (fbm(i / 3.5, s.x, seed) - 0.5) * 1.8 * k;
      const x = Math.round(s.x + sw + wig), y = s.y + i;
      const v = 0.3 + (1 - k) * 0.2 + s.tone + (white(x, i, seed + 1) - 0.5) * 0.35 + (i % 5 === 0 ? 0.2 : 0);
      const c = pick(pal, v, x, y);
      p.set(x, y, c);
      if (s.wide) p.set(x + 1, y, pick(pal, v - 0.15, x + 1, y));
      if (i % 3 === 1 && k > 0.12) p.set(x + (Math.floor(i / 3) % 2 ? 1 : -1) * (s.wide ? 2 : 1), y, pick(pal, v + 0.22, x, y));
    }
  }
}

interface Parts {
  W: number; H: number;
  trunk: Pix; crown: Pix;
  back?: Strand[]; front?: Strand[];
  strandPal?: readonly string[];
  /** Rows of the crown that sway (top..bottom) and how much. */
  rows: [number, number];
  amp?: number;
  seed: number; wind: number; baseY: number; cx: number; shadow: number;
  outline?: number;
}

function assemble(o: Parts): Prop {
  const rng = Rng.fromSeed(o.seed + 99);
  const phase = rng.next() * 6.28;
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const fr = new Pix(o.W, o.H);
    if (o.back && o.strandPal) drawStrands(fr, o.back, f, o.strandPal.slice(0, -1), o.wind, o.seed + 1);
    fr.blit(o.trunk, 0, 0);
    const [r0, r1] = o.rows;
    for (let y = 0; y < o.H; y++) {
      const k = Math.max(0, Math.min(1, (r1 - y) / Math.max(1, r1 - r0)));
      const s = Math.sin((f / FRAMES) * Math.PI * 2 + phase + y * 0.05) * (o.amp ?? 1.1) * (1 + o.wind * 1.6) + o.wind * 2.2;
      const shift = Math.round(s * k);
      for (let x = 0; x < o.W; x++) if (o.crown.alpha(x, y)) fr.set(x + shift, y, o.crown.get(x, y));
    }
    if (o.front && o.strandPal) drawStrands(fr, o.front, f, o.strandPal, o.wind, o.seed + 2);
    grime(fr, o.seed, 0.2, o.H - 3);
    frames.push(selOutline(fr, o.outline ?? 0.62));
  }
  return { frames, ax: o.cx + 1, ay: o.baseY + 2, shadow: o.shadow };
}

/** Bark: grooves, a few knots, moss low down on the damp side. */
function barkTexture(p: Pix, y0: number, y1: number, ramp: readonly string[], seed: number, cx: number): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < p.w; x++) {
      if (!p.alpha(x, y)) continue;
      const g = fbm(x * 1.7, y / 9, seed + 12);
      if (g > 0.6) p.set(x, y, ramp[1]);
      else if (g < 0.32 && white(x, y, seed + 13) < 0.5) p.set(x, y, ramp[4]);
    }
  }
  mossify(p, seed + 14, 0.6, (x, y) => (y > y1 - 14 ? 1.2 : 0.3) * (x < cx ? 1.1 : 0.5));
}

function flare(baseY: number, thick0: number, k = 0.45): (y: number, top: number, seed: number) => number {
  return (y, top, seed) => thick0 + (1 - Math.min(1, (baseY - y) / (baseY - top))) * 0 + Math.max(0, 5 - (baseY - y)) * k + (fbm(y / 3, 2, seed) - 0.5) * 1.2;
}

// --- willow -----------------------------------------------------------------

/** Weeping willow: a short, gnarled, leaning trunk, a loose dome, and curtains of hanging fronds. */
export function makeWillow(seed: number, season: Season = 'summer', wind = 0): Prop {
  const rng = Rng.fromSeed(seed * 3 + 1);
  const W = 78, H = 80, cx = 38, baseY = H - 4;
  const lean = (rng.next() - 0.5) * 8;
  const pal = WILLOW[season];
  const tx = (y: number): number => cx + lean * Math.pow(Math.max(0, (baseY - y) / 40), 1.5) + (fbm(y / 5, 1, seed) - 0.5) * 2.5;
  const th = flare(baseY, 3.4);
  const trunk = new Pix(W, H);
  column(trunk, 40, baseY, tx, (y) => th(y, 40, seed) + (y < 46 ? 0.8 : 0), BARK_GREY, seed + 2, 0.24);
  for (const [dx, k] of [[-1, 1], [1, 1], [-1, 0.6]] as const) capsule(trunk, tx(baseY - 4) + dx * 2, baseY - 5, tx(baseY) + dx * (6 + rng.int(4)) * k, baseY + 1, 2, 0.8, BARK_GREY, seed + 5 + dx);
  // Three limbs from the fork, reaching up and out.
  const tips: [number, number][] = [];
  for (let i = 0; i < 3; i++) {
    const side = i - 1;
    const ex = tx(40) + side * (12 + rng.int(7)) + (rng.next() - 0.5) * 4, ey = 24 + rng.int(6);
    capsule(trunk, tx(44), 44, ex, ey, 2.3, 1.0, BARK_GREY, seed + 7 + i);
    tips.push([ex, ey]);
  }
  barkTexture(trunk, 40, baseY + 1, BARK_GREY, seed, tx(baseY));
  // A dark hollow low on the trunk.
  for (const [x, y] of [[Math.round(tx(baseY - 12)), baseY - 12], [Math.round(tx(baseY - 12)) + 1, baseY - 12], [Math.round(tx(baseY - 12)), baseY - 11]] as const) trunk.set(x, y, BARK_GREY[0]);

  // Dome of small clumps.
  const clumps: Clump[] = [];
  const cy = 26;
  for (let i = 0; i < 22; i++) {
    const a = rng.next() * Math.PI * 2, rho = Math.sqrt(rng.next());
    clumps.push({ x: cx + lean * 0.5 + Math.cos(a) * rho * 22, y: cy + Math.sin(a) * rho * 11, r: 4.2 + rng.next() * 3.6, pal: i % 5 === 0 ? leafPalette(season, rng) : pal, tone: (rng.next() - 0.5) * 0.18 });
  }
  for (const [x, y] of tips) clumps.push({ x, y: y - 1, r: 4 + rng.next() * 2, pal, tone: 0.05 });
  clumps.sort((a, b) => a.y - b.y);
  const crown = canopy(W, H, clumps, seed + 3, 0.8);

  // The fronds: long, thin, hanging from the underside of the dome, some tangled short.
  const back: Strand[] = [], front: Strand[] = [];
  const N = 34;
  for (let i = 0; i < N; i++) {
    const u = (i / (N - 1)) * 2 - 1 + (rng.next() - 0.5) * 0.06;
    const x0 = cx + lean * 0.5 + u * (22 + rng.next() * 3);
    const y0 = cy + Math.sqrt(Math.max(0, 1 - u * u)) * 10 + rng.int(3) - 1;
    const maxLen = baseY - 6 - y0;
    const len = Math.min(maxLen, Math.round((10 + rng.next() * 32) * (0.6 + 0.5 * Math.abs(u))));
    const s: Strand = { x: x0, y: y0, len: rng.next() < 0.12 ? Math.round(len * 0.45) : len, ph: rng.next() * 6.28, amp: 1.2 + rng.next() * 1.6, tone: (rng.next() - 0.5) * 0.2, wide: rng.next() < 0.1 };
    (rng.next() < 0.45 ? back : front).push(s);
  }
  chew(crown, seed + 4, 0.1);
  return assemble({ W, H, trunk, crown, back, front, strandPal: pal, rows: [10, 40], amp: 0.9, seed, wind, baseY, cx, shadow: 40, outline: 0.42 });
}

// --- birch ------------------------------------------------------------------

/** Birch: white bark with black scars, thin drooping branches, airy light leaves, short hanging twigs. */
export function makeBirch(seed: number, season: Season = 'summer', wind = 0): Prop {
  const rng = Rng.fromSeed(seed * 5 + 2);
  const W = 52, H = 78, cx = 25, baseY = H - 4;
  const lean = (rng.next() - 0.5) * 6;
  const pal = BIRCH[season];
  const tx = (y: number): number => cx + lean * Math.pow(Math.max(0, (baseY - y) / 50), 1.4) + (fbm(y / 6, 3, seed) - 0.5) * 2.4;
  const trunk = new Pix(W, H);
  column(trunk, 22, baseY, tx, (y) => 2.1 + Math.max(0, y - 40) * 0.025 + Math.max(0, 4 - (baseY - y)) * 0.5 + (fbm(y / 3, 2, seed) - 0.5) * 0.7, BIRCH_BARK, seed + 2, 0.18);
  // Black horizontal scars, chevrons, and a dark fissured foot.
  for (let y = 24; y < baseY; y += 4 + Math.floor(white(y, 0, seed) * 4)) {
    const w = 1 + Math.floor(white(y, 1, seed) * 3), side = white(y, 2, seed) < 0.5 ? -1 : 1;
    for (let k = 0; k < w; k++) trunk.set(Math.round(tx(y)) + side * k - (side < 0 ? 0 : 1) + (side < 0 ? -1 : 0), y, BIRCH_BARK[0]);
    if (white(y, 3, seed) < 0.35) { trunk.set(Math.round(tx(y)), y + 1, BIRCH_BARK[0]); trunk.set(Math.round(tx(y)) + 1, y + 1, BIRCH_BARK[1]); }
  }
  for (let y = baseY - 11; y <= baseY + 1; y++) for (let x = 0; x < W; x++) if (trunk.alpha(x, y) && (white(x, y, seed + 6) < 0.18 + (y - (baseY - 11)) * 0.06 || fbm(x * 2, y / 5, seed + 7) > 0.62)) trunk.set(x, y, white(x, y, seed + 8) < 0.5 ? BIRCH_BARK[0] : BIRCH_BARK[1]);
  // Thin branches fanning up, drooping at the tips.
  const tips: [number, number][] = [];
  const nb = 6 + rng.int(3);
  for (let i = 0; i < nb; i++) {
    const by = 54 - i * 4.5 - rng.int(3), side = i % 2 === 0 ? -1 : 1;
    const ex = tx(by) + side * (5 + rng.next() * 12) * (1.3 - i * 0.08), ey = by - 8 - rng.next() * 10;
    capsule(trunk, tx(by), by, ex, ey, 1.1, 0.6, BIRCH_BARK, seed + 9 + i, 0.2);
    tips.push([ex, ey]);
  }
  tips.push([tx(22) - 1, 17], [tx(22) + 2, 12]);
  const clumps: Clump[] = [];
  for (const [x, y] of tips) {
    clumps.push({ x, y: y - 1, r: 3.6 + rng.next() * 2.6, pal, tone: (rng.next() - 0.5) * 0.2 });
    if (rng.next() < 0.8) clumps.push({ x: x + (rng.next() - 0.5) * 8, y: y + 3 + rng.next() * 4, r: 2.6 + rng.next() * 2, pal, tone: (rng.next() - 0.5) * 0.2 });
  }
  for (let i = 0; i < 6; i++) clumps.push({ x: cx + lean * 0.3 + (rng.next() - 0.5) * 22, y: 14 + rng.next() * 18, r: 3 + rng.next() * 2.5, pal, tone: 0 });
  clumps.sort((a, b) => a.y - b.y);
  const crown = canopy(W, H, clumps, seed + 3, 0.9);
  const front: Strand[] = [];
  for (const [x, y] of tips) {
    for (let k = 0; k < 2; k++) if (rng.next() < 0.8) front.push({ x: x + (rng.next() - 0.5) * 6, y: y + 2, len: 7 + rng.int(12), ph: rng.next() * 6.28, amp: 0.8 + rng.next() * 1.2, tone: (rng.next() - 0.5) * 0.2, wide: false });
  }
  return assemble({ W, H, trunk, crown, front, strandPal: pal, rows: [6, 50], amp: 1.0, seed, wind, baseY, cx, shadow: 24, outline: 0.5 });
}

// --- apple ------------------------------------------------------------------

/** An old orchard apple: low, wide, twisted, fruit among the leaves (blossom in spring), a prop under one limb. */
export function makeApple(seed: number, season: Season = 'summer', wind = 0): Prop {
  const rng = Rng.fromSeed(seed * 7 + 3);
  const W = 62, H = 58, cx = 30, baseY = H - 4;
  const lean = (rng.next() - 0.5) * 6;
  const tx = (y: number): number => cx + lean * Math.pow(Math.max(0, (baseY - y) / 22), 1.2) + Math.sin(y * 0.35 + seed) * 1.4;
  const trunk = new Pix(W, H);
  column(trunk, 30, baseY, tx, (y) => 3.2 + Math.max(0, 6 - (baseY - y)) * 0.5 + (fbm(y / 2.5, 5, seed) - 0.5) * 1.8, BARK, seed + 2, 0.26);
  for (const [dx, k] of [[-1, 1], [1, 1], [1, 0.5]] as const) capsule(trunk, tx(baseY - 3) + dx * 2, baseY - 4, tx(baseY) + dx * (6 + rng.int(3)) * k, baseY + 1, 1.8, 0.7, BARK, seed + 5 + dx);
  const tips: [number, number][] = [];
  for (let i = 0; i < 4; i++) {
    const side = [-1, 1, -1, 1][i];
    const ex = tx(30) + side * (10 + rng.int(12)), ey = 17 + rng.int(8);
    capsule(trunk, tx(34), 34 - i, ex, ey, 2.2, 0.9, BARK, seed + 7 + i);
    tips.push([ex, ey]);
  }
  // An old forked prop holding one limb up.
  const [ex1, ey1] = tips[1];
  const px = tx(34) + (ex1 - tx(34)) * 0.62, py = 34 + (ey1 - 34) * 0.62;
  capsule(trunk, px + 5, baseY, px, py + 2, 0.8, 0.8, BARK, seed + 30, 0.3);
  trunk.set(Math.round(px - 1), Math.round(py + 1), BARK[3]); trunk.set(Math.round(px + 1), Math.round(py + 1), BARK[3]);
  barkTexture(trunk, 30, baseY + 1, BARK, seed, tx(baseY));
  const clumps: Clump[] = [];
  for (let i = 0; i < 14; i++) {
    const a = rng.next() * Math.PI * 2, rho = Math.sqrt(rng.next());
    clumps.push({ x: cx + lean * 0.5 + Math.cos(a) * rho * 21, y: 22 + Math.sin(a) * rho * 10, r: 4.6 + rng.next() * 3.4 - rho, pal: leafPalette(season, rng), tone: (rng.next() - 0.5) * 0.2 });
  }
  for (const [x, y] of tips) clumps.push({ x, y: y - 1, r: 4.4 + rng.next() * 2, pal: leafPalette(season, rng), tone: 0 });
  clumps.sort((a, b) => a.y - b.y);
  const crown = canopy(W, H, clumps, seed + 3, 0.82);
  // Fruit among the leaves, blossom in spring.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!crown.alpha(x, y)) continue;
    const cluster = fbm(x / 3, y / 3, seed + 40);
    if (season === 'spring' && cluster > 0.52 && white(x, y, seed + 41) < 0.55) crown.set(x, y, ['#f8e8ee', '#f4b8cc', '#fffbf4', '#e88aa8'][Math.floor(white(x, y, seed + 42) * 4)]);
    else if (season !== 'spring' && cluster > 0.56 && white(x, y, seed + 43) < 0.2 && y > 14) {
      const c = season === 'autumn' ? ['#c4282e', '#e0b030', '#a02028'] : ['#78a03a', '#c8a830', '#c4403a'];
      crown.set(x, y, c[Math.floor(white(x, y, seed + 44) * c.length)]); crown.set(x - 1, y - 1, '#fff0c8');
    }
  }
  // Windfalls and a dead twig.
  for (let i = 0; i < 6; i++) { const x = cx - 14 + Math.round(white(i, 0, seed) * 28), y = baseY + 1 + Math.round(white(i, 1, seed) * 2); trunk.set(x, y, season === 'spring' ? '#f4d0dc' : '#b0282e'); trunk.set(x - 1, y - 1, season === 'spring' ? '#fff' : '#e86050'); }
  return assemble({ W, H, trunk, crown, rows: [6, 36], amp: 0.9, seed, wind, baseY, cx, shadow: 34 });
}

// --- elm --------------------------------------------------------------------

/** Elm: a vase. One trunk that splits low into a few steep limbs, a high broad crown, fine twigs hanging from the rim. */
export function makeElm(seed: number, season: Season = 'summer', wind = 0): Prop {
  const rng = Rng.fromSeed(seed * 11 + 4);
  const W = 70, H = 82, cx = 34, baseY = H - 4;
  const lean = (rng.next() - 0.5) * 6;
  const tx = (y: number): number => cx + lean * Math.pow(Math.max(0, (baseY - y) / 40), 1.5) + (fbm(y / 5, 6, seed) - 0.5) * 2;
  const trunk = new Pix(W, H);
  column(trunk, 48, baseY, tx, (y) => 3.5 + Math.max(0, 6 - (baseY - y)) * 0.5 + (fbm(y / 3, 2, seed) - 0.5) * 1.1, BARK, seed + 2, 0.22);
  for (const [dx, k] of [[-1, 1], [1, 1], [-1, 0.6]] as const) capsule(trunk, tx(baseY - 4) + dx * 2, baseY - 5, tx(baseY) + dx * (6 + rng.int(4)) * k, baseY + 1, 2, 0.8, BARK, seed + 5 + dx);
  const tips: [number, number][] = [];
  const limbs = 4 + rng.int(2);
  for (let i = 0; i < limbs; i++) {
    const u = limbs === 1 ? 0 : (i / (limbs - 1)) * 2 - 1;
    const ex = tx(48) + u * (13 + rng.int(9)) + (rng.next() - 0.5) * 4, ey = 22 + rng.int(10) - Math.abs(u) * -4;
    capsule(trunk, tx(50), 50 - rng.int(4), ex, ey, 2.5, 1.0, BARK, seed + 7 + i);
    // a side limb
    const mx = (tx(50) + ex) / 2, my = (50 + ey) / 2;
    capsule(trunk, mx, my, mx + u * 9 + (rng.next() - 0.5) * 6, my - 9, 1.4, 0.7, BARK, seed + 20 + i);
    tips.push([ex, ey], [mx + u * 9, my - 9]);
  }
  barkTexture(trunk, 46, baseY + 1, BARK, seed, tx(baseY));
  const clumps: Clump[] = [];
  for (const [x, y] of tips) {
    for (let k = 0; k < 3; k++) clumps.push({ x: x + (rng.next() - 0.5) * 14, y: y + (rng.next() - 0.5) * 10 - 2, r: 4.4 + rng.next() * 3.2, pal: leafPalette(season, rng), tone: (rng.next() - 0.5) * 0.2 });
  }
  for (let i = 0; i < 6; i++) clumps.push({ x: cx + (rng.next() - 0.5) * 36, y: 28 + rng.next() * 14, r: 4 + rng.next() * 3, pal: leafPalette(season, rng), tone: -0.06 });
  clumps.sort((a, b) => a.y - b.y);
  const crown = canopy(W, H, clumps, seed + 3, 0.84);
  const front: Strand[] = [];
  for (let i = 0; i < 18; i++) {
    const [x, y] = tips[rng.int(tips.length)];
    front.push({ x: x + (rng.next() - 0.5) * 18, y: y + 4 + rng.int(8), len: 6 + rng.int(12), ph: rng.next() * 6.28, amp: 0.8 + rng.next(), tone: (rng.next() - 0.5) * 0.2, wide: false });
  }
  const pal = leafPalette(season, rng);
  return assemble({ W, H, trunk, crown, front, strandPal: pal, rows: [10, 56], amp: 1.2, seed, wind, baseY, cx, shadow: 44 });
}

// --- poplar -----------------------------------------------------------------

/** Poplar: a narrow flame of leaves, silver flashing in the wind. */
export function makePoplar(seed: number, season: Season = 'summer', wind = 0): Prop {
  const rng = Rng.fromSeed(seed * 13 + 5);
  const W = 32, H = 88, cx = 15, baseY = H - 4;
  const lean = (rng.next() - 0.5) * 4;
  const tx = (y: number): number => cx + lean * Math.pow(Math.max(0, (baseY - y) / 70), 1.4) + Math.sin(y * 0.1 + seed) * 0.8;
  const trunk = new Pix(W, H);
  column(trunk, 50, baseY, tx, (y) => 1.8 + Math.max(0, 5 - (baseY - y)) * 0.4 + (fbm(y / 3, 2, seed) - 0.5) * 0.7, BARK_GREY, seed + 2, 0.22);
  barkTexture(trunk, 50, baseY + 1, BARK_GREY, seed, tx(baseY));
  const clumps: Clump[] = [];
  for (let y = 62; y > 6; y -= 3 + rng.int(2)) {
    const t = (62 - y) / 56;
    const half = 4 + Math.sin(Math.min(1, t * 1.15) * Math.PI) * 5 - Math.max(0, t - 0.8) * 8;
    for (let k = 0; k < 2; k++) clumps.push({ x: tx(y) + (rng.next() - 0.5) * half * 1.4, y: y + (rng.next() - 0.5) * 3, r: 2.8 + rng.next() * 2.6 + half * 0.15, pal: leafPalette(season, rng), tone: (rng.next() - 0.5) * 0.2 });
  }
  clumps.sort((a, b) => a.y - b.y);
  const crown = canopy(W, H, clumps, seed + 3, 1.15);
  // Silver undersides flashing: single light pixels scattered, denser on the lit side.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (crown.alpha(x, y) && white(x, y, seed + 60) < 0.07 && x < tx(y) + 3) crown.set(x, y, season === 'autumn' ? '#fff0a0' : '#d8e8d0');
  return assemble({ W, H, trunk, crown, rows: [4, 64], amp: 1.4, seed, wind, baseY, cx, shadow: 18 });
}

/** One entry point for the studio and for scenes. */
export function makeTree(kind: TreeKind, seed: number, season: Season = 'summer', wind = 0): Prop {
  switch (kind) {
    case 'oak': return makeOak(seed, wind, season);
    case 'elm': return makeElm(seed, season, wind);
    case 'willow': return makeWillow(seed, season, wind);
    case 'birch': return makeBirch(seed, season, wind);
    case 'apple': return makeApple(seed, season, wind);
    case 'poplar': return makePoplar(seed, season, wind);
  }
}
