import { type Ground3D, splatAt } from '../core/world3d/terrain';
import { TEXELS_PER_M } from '../core/world3d/tiers';
import { THATCH, WOOD, boards, stoneWall } from './buildings';
import { fbm, pick, white } from './grit';
import { infill } from './houses';
import { GW } from './humble';
import { TILE_CENTER } from './hexTile';
import { P } from './palette';
import { Pix, ramp } from './pix';
import { groundColor } from './terrain';

/**
 * Textures for the 3D world, painted by the same hands as the 2D art: the
 * limewash, timber, stone and ground painters, at 21 texels per metre so a
 * texel is about one rendered pixel at the base zoom. All tile seamlessly
 * enough to repeat (the noise is sampled in wrapped coordinates where it matters).
 */

const TPM = TEXELS_PER_M;

/** Limewash over daub, a panel the size of a wall bay, repeating. */
export function plasterTex(seed: number): Pix {
  const p = new Pix(128, 64);
  infill(p, 0, 0, 127, 63, seed, 'white');
  return p;
}

export function stoneTex(seed: number): Pix {
  const p = new Pix(64, 64);
  stoneWall(p, 0, 0, 63, 63, seed);
  return p;
}

export function timberTex(seed: number): Pix {
  const p = new Pix(32, 64);
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const grain = (fbm(x / 1.2, y / 9, seed) - 0.5) * 0.5;
      p.set(x, y, pick(WOOD, 0.5 + grain + (white(x, y, seed + 1) - 0.5) * 0.1 + (x % 8 === 0 ? -0.15 : 0), x, y));
    }
  }
  return p;
}

/** Thatch: combed bundles in courses, darker in the gaps, moss in damp patches. */
export function thatchTex(seed: number): Pix {
  const p = new Pix(128, 128);
  for (let y = 0; y < p.h; y++) {
    const course = Math.floor(y / 10);
    const cy = y % 10;
    for (let x = 0; x < p.w; x++) {
      const shift = Math.round(white(course, 0, seed) * 8);
      const bundle = Math.floor((x + shift) / 7);
      const strand = fbm(x / 0.9, y / 7, seed + course) - 0.5;
      let v = 0.62 + strand * 0.55 + (white(bundle, course, seed + 2) - 0.5) * 0.25 - (cy > 7 ? 0.32 : 0) + (cy < 2 ? 0.08 : 0);
      if ((x + shift) % 7 === 0) v -= 0.12;
      const moss = fbm(x / 9, y / 7, seed + 5);
      p.set(x, y, moss > 0.74 ? ramp(P.moss, 0.35 + (moss - 0.74) * 3 + strand * 0.4, x, y) : pick(THATCH, v, x, y));
    }
  }
  return p;
}

export function roofUnderTex(seed: number): Pix {
  const p = new Pix(64, 64);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) p.set(x, y, pick(THATCH.slice(0, 3), 0.4 + (fbm(x / 1, y / 6, seed) - 0.5) * 0.6, x, y));
  return p;
}

export function doorTex(seed: number): Pix {
  const p = new Pix(22, 42);
  boards(p, 0, 0, 21, 41, seed, true);
  for (const y of [7, 33]) for (let x = 0; x < 18; x++) p.set(x, y, '#33353f');
  p.set(17, 21, '#a0a5b3');
  return p;
}

/** Window: a frame, four panes. Lit windows are added by the material at night (emissive). */
export function windowTex(): Pix {
  const p = new Pix(17, 15);
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const frame = x < 2 || x > 14 || y < 2 || y > 12 || x === 8 || y === 7;
      p.set(x, y, frame ? pick(WOOD, 0.45, x, y) : pick(['#10151f', '#1c2638', '#2e4060', '#5a7898'], 0.3 + (x + 15 - y) * 0.025, x, y));
    }
  }
  return p;
}

/** The glow of a lit window, as an emissive mask (same layout as windowTex). */
export function windowGlowTex(): Pix {
  const p = new Pix(17, 15);
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const frame = x < 2 || x > 14 || y < 2 || y > 12 || x === 8 || y === 7;
      p.set(x, y, frame ? '#000000' : pick(['#a8601c', '#e8a23c', '#f4c25a', '#ffe08a'], 0.45 + (y < 7 ? 0.25 : 0), x, y));
    }
  }
  return p;
}

export function shutterTex(seed: number): Pix {
  const pal = ['#1c2a1e', '#2a4430', '#3e6044', '#5a7e5a', '#86a07c'];
  const p = new Pix(8, 16);
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const worn = fbm(x / 2, y / 3, seed) > 0.68;
      p.set(x, y, worn ? pick(WOOD, 0.45, x, y) : pick(pal, 0.6 + (x % 2) * 0.08 - (x === 7 ? 0.2 : 0) + (white(x, y, seed) - 0.5) * 0.16, x, y));
    }
  }
  return p;
}

/** Beaten earth floor, straw trodden in. */
export function floorTex(seed: number): Pix {
  const p = new Pix(64, 64);
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      if (white(x, y, seed) < 0.04) { p.set(x, y, '#8a7438'); continue; }
      p.set(x, y, pick(GW, 0.35 + (fbm(x / 6, y / 5, seed + 1) - 0.5) * 0.4 + (white(x, y, seed + 2) - 0.5) * 0.15, x, y));
    }
  }
  return p;
}

export function barkTex(seed: number): Pix {
  const bark = ['#1e130e', '#33211a', '#4b3324', '#654630', '#80593c'];
  const p = new Pix(32, 64);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const ridge = fbm(x / 1.3, y / 10, seed);
    p.set(x, y, pick(bark, 0.25 + ridge * 0.7 + (white(x, y, seed + 1) - 0.5) * 0.15, x, y));
  }
  return p;
}

/** Leaves: clumps of lit and shaded leaves, with gaps of dark between them. */
export function leafTex(seed: number): Pix {
  const p = new Pix(64, 64);
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const clump = fbm(x / 3, y / 3, seed);
      const leaf = white(x, y, seed + 1);
      p.set(x, y, ramp(P.foliage.slice(1), 0.15 + clump * 0.75 + (leaf - 0.5) * 0.35, x, y));
    }
  }
  return p;
}

/**
 * The ground under the whole patch: grass, long grass and flowers, stamped mud,
 * the dirt road, leaf litter under the tree, wet bank by the lake. Painted from
 * the splat with noisy edges, so nothing has a seam.
 */
export function groundTex(g: Ground3D): Pix {
  const n = Math.round(g.size * TPM);
  const p = new Pix(n, n);
  const half = g.size / 2;
  // Splat on a coarse grid (every 4 texels), interpolated: the noise does the edges.
  const S = 4, gn = Math.ceil(n / S) + 1;
  const grid = new Array(gn * gn);
  for (let j = 0; j < gn; j++) for (let i = 0; i < gn; i++) grid[j * gn + i] = splatAt(g, -half + (i * S) / TPM, -half + (j * S) / TPM);
  const cx = TILE_CENTER.x, cy = TILE_CENTER.y;
  const SH = ['#1e1a16', '#2e2820', '#463c2e', '#5e523e', '#7a6c52'];
  for (let y = 0; y < n; y++) {
    const fj = y / S, j = Math.floor(fj), v = fj - j;
    for (let x = 0; x < n; x++) {
      const fi = x / S, i = Math.floor(fi), u = fi - i;
      const a = grid[j * gn + i], b = grid[j * gn + i + 1], c = grid[(j + 1) * gn + i], d = grid[(j + 1) * gn + i + 1];
      const w = (k: 'road' | 'mud' | 'shore' | 'shade' | 'wild'): number => (a[k] * (1 - u) + b[k] * u) * (1 - v) + (c[k] * (1 - u) + d[k] * u) * v;
      const jit = (white(x, y, 5) - 0.5) * 0.22 + (fbm(x / 6, y / 6, 6) - 0.5) * 0.45;
      let col: string;
      if (w('shore') + jit > 0.5) {
        col = ramp(SH, 0.3 + fbm(x / 5, y / 4, 7) * 0.45 + (white(x, y, 8) - 0.5) * 0.25 - w('shore') * 0.2, x, y);
      } else if (w('mud') + jit > 0.5) col = groundColor('mud', x, y, cx, cy);
      else if (w('road') + jit > 0.5) col = groundColor('path', x, y, cx, cy);
      else if (w('shade') + jit > 0.55) col = groundColor('forest', x, y, cx, cy);
      else if (w('wild') + jit > 0.55) col = groundColor(fbm(x / 30, y / 30, 9) > 0.55 ? 'flowers' : 'tallgrass', x, y, cx, cy);
      else col = groundColor('grass', x, y, cx, cy);
      p.set(x, y, col);
    }
  }
  return p;
}
