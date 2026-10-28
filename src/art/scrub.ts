import { Rng } from '../core/rng';
import { type Prop, type Pt, capsule, chew, fbm, mossify, pick, polyFill, selOutline, white, wobble } from './grit';
import { Pix } from './pix';
import { FRAMES } from './props';

/**
 * Village shrubbery: bushes, hedges, brambles, weeds and a kitchen-garden bed.
 * Lumpy and unkempt: dead twigs poking out, bare patches, a gap in the hedge,
 * flowers where they happened to take, weeds at the foot. Seeded, so every one differs.
 */

export const SHRUB_KINDS = ['bush', 'flowering', 'berry', 'hedge', 'bramble', 'weeds', 'garden'] as const;
export type ShrubKind = (typeof SHRUB_KINDS)[number];

const LEAF = ['#0f1d16', '#1a3022', '#27472a', '#365e2e', '#4e7a36', '#729a42', '#9ab852'];
const LEAF_DRY = ['#1c2212', '#2c3a18', '#44542a', '#64762f', '#889638', '#b0b04c'];
const LEAF_DARK = ['#0c1814', '#142a22', '#1e3c2c', '#2c5236', '#406a40'];
const SAGE = ['#1c2a26', '#2e443c', '#4a6458', '#6e8878', '#98ae9a'];
const TWIG = ['#1e150e', '#35261a', '#523a26', '#745238'];

interface Clump { x: number; y: number; r: number; pal: readonly string[]; tone: number }

const L = (() => { const l = [-0.55, -0.7, 0.55]; const n = Math.hypot(...l); return l.map((v) => v / n); })();

function canopy(W: number, H: number, clumps: Clump[], seed: number, squash = 0.85): Pix {
  const out = new Pix(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let bestZ = -Infinity, v = 0, pal: readonly string[] = LEAF, rim = 0;
      for (const c of clumps) {
        const warp = 1 + (fbm(x / 2.1, y / 2.1, seed + Math.round(c.x * 5)) - 0.5) * 0.8;
        const dx = (x + 0.5 - c.x) / (c.r * warp), dy = (y + 0.5 - c.y) / (c.r * warp * squash);
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const dz = Math.sqrt(1 - d2);
        const z = dz * c.r + c.y * 0.4;
        if (z <= bestZ) continue;
        bestZ = z;
        v = 0.2 + Math.max(0, dx * L[0] + dy * L[1] + dz * L[2]) * 0.72 + c.tone;
        rim = d2;
        pal = c.pal;
      }
      if (bestZ === -Infinity) continue;
      v += (white(x >> 1, y >> 1, seed + 3) - 0.5) * 0.36 + (white(x, y, seed + 4) - 0.5) * 0.16;
      if (white(x, y, seed + 5) < 0.045) v += 0.28;
      // Gaps toward clump edges: twigs and light show through.
      if (rim > 0.45 && white(x, y, seed + 6) < 0.3 + (rim - 0.45) * 0.6) continue;
      out.set(x, y, pick(pal, v, x, y));
    }
  }
  chew(out, seed + 7, 0.28);
  return out;
}

/** Soil and ragged grass round the foot of a plant. */
function foot(o: Pix, x0: number, x1: number, y: number, seed: number): void {
  for (let x = x0; x <= x1; x++) {
    if (white(x, y, seed) < 0.7) o.set(x, y, '#2e2016');
    if (white(x, y - 1, seed + 1) < 0.45) o.set(x, y - 1, '#46301f');
  }
  for (let x = x0; x <= x1; x++) {
    if (white(x, y, seed + 2) < 0.38) {
      const h = 1 + Math.floor(white(x, y, seed + 3) * 4);
      for (let k = 0; k < h; k++) o.set(x, y - 1 - k, ['#3f6d36', '#5a8c3e', '#82ad4c', '#a8c866'][Math.min(3, k)]);
    }
  }
}

/** Dead twigs poking out where the foliage thins. */
function twigs(p: Pix, cx: number, cy: number, spread: number, n: number, rng: Rng, seed: number): void {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * (0.1 + rng.next() * 0.8);
    const len = 5 + rng.int(8);
    const sx = cx + (rng.next() - 0.5) * spread * 0.6, sy = cy + rng.next() * 4;
    capsule(p, sx, sy, sx + Math.cos(a) * len * 1.3, sy + Math.sin(a) * len, 0.6, 0.4, TWIG, seed + i, 0.3);
    if (rng.next() < 0.5) p.set(Math.round(sx + Math.cos(a) * len * 1.3 + 1), Math.round(sy + Math.sin(a) * len - 1), TWIG[3]);
  }
}

const BLOOM: Record<string, string[]> = {
  pink: ['#e87a9a', '#f4a6bc', '#f8d0dc', '#c4506e'],
  white: ['#f4f0e2', '#e4e0cc', '#fffbea', '#f2d75c'],
  mixed: ['#e87a9a', '#f4f0e2', '#f2d75c', '#a090e0', '#f4a6bc'],
};

export function makeShrub(seed: number, kind: ShrubKind = 'bush', wind = 0): Prop {
  const rng = Rng.fromSeed(seed * 7 + kind.length);
  if (kind === 'garden') return makeGarden(seed);
  if (kind === 'weeds') return makeWeeds(seed, wind);
  if (kind === 'bramble') return makeBramble(seed, wind);
  const hedge = kind === 'hedge';
  const W = hedge ? 72 : 46, H = hedge ? 28 : 26;
  const baseY = H - 5;
  const clumps: Clump[] = [];
  const pal = (): readonly string[] => {
    const r = rng.next();
    if (kind === 'berry') return r < 0.2 ? LEAF_DRY : LEAF_DARK;
    return r < 0.16 ? LEAF_DRY : r < 0.22 ? SAGE : LEAF;
  };
  const add = (x: number, y: number, r: number): void => { clumps.push({ x, y, r, pal: pal(), tone: (rng.next() - 0.5) * 0.2 }); };
  if (hedge) {
    const gapAt = 10 + rng.int(W - 30), gapW = 6 + rng.int(6);
    for (let x = 6; x < W - 5; x += 4 + rng.int(3)) {
      if (x > gapAt && x < gapAt + gapW) continue; // a gap where it died back
      const up = Math.sin(x * 0.18 + seed) * 2.5 + (rng.next() - 0.5) * 5;
      add(x, baseY - 7 + up, 4.5 + rng.next() * 3);
      if (rng.next() < 0.6) add(x + rng.int(4) - 2, baseY - 3, 3.5 + rng.next() * 2);
      if (rng.next() < 0.4) add(x + rng.int(6) - 3, baseY - 12 + up, 2.2 + rng.next() * 2.2); // an overgrown shoot
    }
  } else {
    const lop = (rng.next() - 0.5) * 6;
    const n = 9 + rng.int(4);
    for (let i = 0; i < n; i++) {
      const a = rng.next() * Math.PI * 2, rho = Math.sqrt(rng.next());
      add(W / 2 + lop + Math.cos(a) * rho * 16, baseY - 6 + Math.sin(a) * rho * 4.5, 4 + rng.next() * 3.5 - rho * 1.2);
    }
    for (let i = 0; i < 3; i++) add(W / 2 + (rng.next() - 0.5) * 30, baseY - 3, 3 + rng.next() * 2);
  }
  clumps.sort((a, b) => a.y - b.y);
  const stems = new Pix(W, H);
  twigs(stems, W / 2, baseY - 4, W * (hedge ? 0.9 : 0.5), hedge ? 9 : 5, rng, seed);
  // Bare stems at the foot, showing through.
  for (let i = 0; i < (hedge ? 10 : 5); i++) {
    const x = (hedge ? 6 : W / 2 - 10) + rng.next() * (hedge ? W - 12 : 20);
    capsule(stems, x, baseY + 1, x + (rng.next() - 0.5) * 3, baseY - 8 - rng.int(4), 0.7, 0.6, TWIG, seed + 30 + i, 0.3);
  }
  const crown = canopy(W, H, clumps, seed, 0.85);
  // Flowers, berries: where they took, in clusters, a few already faded.
  const blooms = kind === 'flowering' ? BLOOM[['pink', 'white', 'mixed'][seed % 3]] : null;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!crown.alpha(x, y)) continue;
      const cluster = fbm(x / 3.2, y / 3, seed + 40);
      if (blooms && cluster > 0.6 && white(x, y, seed + 41) < 0.5) {
        const faded = white(x, y, seed + 42) < 0.14;
        crown.set(x, y, faded ? '#9a8458' : blooms[Math.floor(white(x, y, seed + 43) * blooms.length)]);
      }
      if (kind === 'berry' && cluster > 0.55 && white(x, y, seed + 44) < 0.22) {
        const rot = white(x, y, seed + 45) < 0.15;
        crown.set(x, y, rot ? '#2a1a20' : white(x, y, seed + 46) < 0.5 ? '#c4283a' : '#7a1c3a');
        if (!rot) crown.set(x - 1, y - 1, '#f08080');
      }
    }
  }
  const frames: Pix[] = [];
  const phase = rng.next() * 6.28;
  for (let f = 0; f < FRAMES; f++) {
    const fr = new Pix(W, H);
    fr.blit(stems, 0, 0);
    for (let y = 0; y < H; y++) {
      const k = Math.max(0, Math.min(1, (baseY - y) / 22));
      const shift = Math.round(Math.sin((f / FRAMES) * Math.PI * 2 + phase + y * 0.08) * 0.8 * (1 + wind * 1.5) * k + wind * 1.6 * k);
      for (let x = 0; x < W; x++) if (crown.alpha(x, y)) fr.set(x + shift, y, crown.get(x, y));
    }
    mossify(fr, seed + 50, 0.1, () => 0);
    const o = selOutline(fr);
    foot(o, 3, W - 2, H - 1, seed);
    frames.push(o);
  }
  return { frames, ax: Math.round(W / 2) + 1, ay: H, shadow: hedge ? 40 : 26 };
}

function makeBramble(seed: number, wind: number): Prop {
  const rng = Rng.fromSeed(seed * 11);
  const W = 46, H = 30, baseY = H - 5;
  const p = new Pix(W, H);
  // Arching canes, thorned, with a few leaves and blackberries.
  const BR = ['#1a0e10', '#2e1a1c', '#4a2a2c', '#6a3e3a'];
  for (let i = 0; i < 9; i++) {
    const x0 = 12 + rng.next() * 22, top = 6 + rng.int(14);
    const dir = (rng.next() - 0.5) * 2;
    let px = x0, py = baseY;
    for (let s = 0; s < 16; s++) {
      const t = s / 15;
      const nx = x0 + dir * 14 * Math.sin(t * 1.4) + (fbm(s / 3, i, seed) - 0.5) * 4;
      const ny = baseY - (baseY - top) * Math.sin(t * Math.PI * 0.62) + t * t * 4;
      capsule(p, px, py, nx, ny, 0.9, 0.7, BR, seed + i * 3 + s, 0.25);
      if (s % 3 === 1) p.set(Math.round(nx + 1), Math.round(ny - 1), '#8a6a5a'); // thorn
      if (s % 4 === 2 && rng.next() < 0.8) {
        for (const [dx, dy] of [[1, 0], [2, 0], [1, -1], [-1, 0], [-2, 0], [-1, 1], [0, 1]] as const) p.set(Math.round(nx + dx), Math.round(ny + dy), pick(LEAF_DARK, 0.4 + white(nx + dx, ny + dy, seed) * 0.5, dx, dy));
      }
      px = nx; py = ny;
    }
    if (rng.next() < 0.7) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 1]] as const) p.set(Math.round(px + dx), Math.round(py + dy), white(dx, dy, seed + i) < 0.3 ? '#8a3a5a' : '#1c1020');
  }
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const fr = new Pix(W, H);
    for (let y = 0; y < H; y++) {
      const k = Math.max(0, Math.min(1, (baseY - y) / 22));
      const s = Math.round((Math.sin((f / FRAMES) * Math.PI * 2 + y * 0.1) * 0.7 + wind * 1.6) * k);
      for (let x = 0; x < W; x++) if (p.alpha(x, y)) fr.set(x + s, y, p.get(x, y));
    }
    const o = selOutline(fr, 0.5);
    foot(o, 5, W - 4, H - 1, seed);
    frames.push(o);
  }
  return { frames, ax: 24, ay: H, shadow: 24 };
}

function makeWeeds(seed: number, wind: number): Prop {
  const rng = Rng.fromSeed(seed * 13);
  const W = 30, H = 30, baseY = H - 3;
  const plants = Array.from({ length: 9 }, () => ({
    x: 4 + rng.int(22), h: 9 + rng.int(14), lean: (rng.next() - 0.5) * 5, ph: rng.next() * 6.28,
    kind: ['nettle', 'dock', 'thistle', 'nettle'][rng.int(4)],
  }));
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const p = new Pix(W, H);
    for (const pl of plants) {
      let px = pl.x, py = baseY;
      for (let i = 0; i <= pl.h; i++) {
        const k = i / pl.h;
        const x = Math.round(pl.x + (pl.lean + Math.sin((f / FRAMES) * Math.PI * 2 + pl.ph) * (0.8 + wind)) * k * k * 2);
        const y = baseY - i;
        p.set(x, y, pick(['#2a4426', '#427038', '#6a9a48'], 0.4 + k * 0.4 + (white(i, pl.x, seed) - 0.5) * 0.2, x, y));
        if (i > 3 && i % 4 === 0 && pl.kind !== 'thistle') {
          const w = pl.kind === 'dock' ? 3 : 2;
          for (let s = 1; s <= w; s++) { p.set(x - s, y + (s > 1 ? 1 : 0), '#4a7a3c'); p.set(x + s, y + (s > 1 ? 1 : 0), '#365e2e'); }
        }
        px = x; py = y;
      }
      if (pl.kind === 'dock') for (let k = 0; k < 5; k++) p.set(px + (k % 2), py - k, k > 1 ? '#8a3a2a' : '#6a4a2a');
      if (pl.kind === 'thistle') { p.set(px, py - 1, '#a060b0'); p.set(px - 1, py - 1, '#8a48a0'); p.set(px + 1, py - 1, '#b878c4'); p.set(px, py, '#3a5a30'); }
      if (pl.kind === 'nettle' && pl.h > 16) { p.set(px, py - 1, '#c0c890'); p.set(px + 1, py, '#a0a870'); }
    }
    const o = selOutline(p, 0.45);
    foot(o, 2, W - 1, H - 1, seed);
    frames.push(o);
  }
  return { frames, ax: 16, ay: H, shadow: 10 };
}

/** A kitchen-garden bed: heaped earth, cabbages going to seed, leeks, a bean pole. Nobody weeded it this week. */
function makeGarden(seed: number): Prop {
  const rng = Rng.fromSeed(seed * 17);
  const W = 56, H = 36;
  const p = new Pix(W, H);
  const pts: Pt[] = wobble([[4, 28], [50, 28], [54, 20], [10, 20]], seed, 1.2, 3);
  polyFill(p, pts, (x, y) => pick(['#1c120c', '#2e2016', '#47301f', '#64462c'], 0.4 + (fbm(x / 3, y / 2, seed) - 0.5) * 0.7 + (y < 23 ? 0.12 : 0), x, y));
  // Furrows.
  for (let x = 6; x < 52; x++) for (const y of [23, 26]) if (p.alpha(x, y)) p.set(x, y, '#1c120c');
  // Cabbages.
  for (let i = 0; i < 4; i++) {
    const cx = 10 + i * 10 + rng.int(4), cy = 22 + (i % 2) * 3;
    for (let y = -4; y <= 4; y++) for (let x = -5; x <= 5; x++) {
      const d = (x / 5) ** 2 + (y / 3.8) ** 2;
      if (d > 1) continue;
      p.set(cx + x, cy + y, pick(['#1e3a26', '#32603a', '#5a8c52', '#9ab890'], 0.65 - d * 0.35 - (x + y) * 0.03 + (Math.abs(x) % 3 === 0 ? -0.1 : 0.05) + (white(x, y, seed + i) - 0.5) * 0.2, x, y));
    }
    if (rng.next() < 0.5) for (let k = 0; k < 5; k++) p.set(cx + Math.round((rng.next() - 0.5) * 3), cy - 5 - k, k > 2 ? '#e8d048' : '#6a8a40'); // bolted
  }
  // Leeks along the back.
  for (let i = 0; i < 7; i++) {
    const x = 8 + i * 6 + rng.int(3), h = 6 + rng.int(4);
    for (let k = 0; k < h; k++) { p.set(x, 19 - k, k < 3 ? '#d8e0c0' : pick(['#2a4a32', '#4a7a4a', '#7aa860'], k / h, x, k)); if (k > 3 && k % 2 === 0) p.set(x + (i % 2 ? 1 : -1), 19 - k, '#3a6a3c'); }
  }
  // Bean pole, leaning, with string.
  capsule(p, 48, 26, 50, 4, 0.8, 0.7, TWIG, seed, 0.2);
  capsule(p, 42, 26, 50, 5, 0.6, 0.6, TWIG, seed + 1, 0.2);
  for (let y = 6; y < 24; y += 2) { p.set(49 + Math.round(Math.sin(y) ), y, '#4a7a3a'); p.set(47, y + 1, '#2a4a26'); }
  for (const [x, y] of [[49, 10], [48, 16], [47, 20]] as const) { p.set(x, y, '#e8e0d0'); p.set(x + 1, y, '#e8e0d0'); }
  chew(p, seed + 5, 0.15);
  const o = selOutline(p, 0.55);
  foot(o, 4, 52, 30, seed + 9);
  return { frames: Array.from({ length: FRAMES }, () => o), ax: 28, ay: 31, shadow: 22 };
}
