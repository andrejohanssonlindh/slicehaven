import { Rng } from '../core/rng';
import { fbm, white } from './noise';
import { OUTLINE, P } from './palette';
import { Pix, ramp } from './pix';

/** An animated standing object. Anchor = the pixel that sits on the hex centre. */
export interface Sprite {
  frames: Pix[];
  ax: number;
  ay: number;
  /** Width of the ground shadow ellipse (0 = none). */
  shadow: number;
}

export const FRAMES = 8;
const LIGHT = (() => {
  const l = [-0.55, -0.7, 0.55];
  const n = Math.hypot(...l);
  return l.map((v) => v / n);
})();

interface Blob {
  x: number;
  y: number;
  r: number;
}

/** Shade a cluster of spheres ("clumps" of leaves). Returns null outside. */
function clumpShade(blobs: Blob[], x: number, y: number, seed: number): number | null {
  let best: { z: number; v: number } | null = null;
  for (const b of blobs) {
    const dx = (x + 0.5 - b.x) / b.r;
    const dy = (y + 0.5 - b.y) / b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 > 1) continue;
    const dz = Math.sqrt(1 - d2);
    const z = dz * b.r + b.y * 0.15; // lower clumps sit in front
    if (best && z <= best.z) continue;
    const lambert = Math.max(0, dx * LIGHT[0] + dy * LIGHT[1] + dz * LIGHT[2]);
    best = { z, v: 0.15 + lambert * 0.85 };
  }
  if (!best) return null;
  // Leafy texture: small noisy clusters.
  return best.v + (fbm(x / 2.2, y / 2.2, seed) - 0.5) * 0.45 + (white(x, y, seed) - 0.5) * 0.12;
}

/**
 * Horizontal shift for row y in frame f. `wind` 0..1: calm sway at 0; at 1 the
 * plant leans downwind and sways harder.
 */
function swayShift(y: number, top: number, bottom: number, f: number, phase: number, amp: number, wind = 0): number {
  const s = Math.sin((f / FRAMES) * Math.PI * 2 + phase) * amp * (1 + wind * 1.6) + wind * amp * 2;
  const k = Math.max(0, Math.min(1, (bottom - y) / (bottom - top)));
  return Math.round(s * k);
}

/** Burnt version of a sprite: charcoal colours, most of the foliage gone. */
export function charred(s: Sprite, seed: number): Sprite {
  const ash = ['#0e0b0c', '#211a1a', '#362c2a', '#4f4440'];
  const frames = s.frames.map((f) => {
    const out = new Pix(f.w, f.h);
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        const [r, g, b, a] = f.get(x, y);
        if (!a) continue;
        const leafy = g > r + 8 && g > b;
        if (leafy && white(x, y, seed) < 0.8) continue;
        const l = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
        const ember = leafy && white(x, y, seed + 1) < 0.15;
        out.set(x, y, ember ? '#c43a2e' : ramp(ash, l * 1.6, x, y));
      }
    }
    return out;
  });
  return { ...s, frames, shadow: Math.round(s.shadow * 0.6) };
}

function trunk(p: Pix, cx: number, top: number, bottom: number, half: number): void {
  for (let y = top; y <= bottom; y++) {
    const flare = y > bottom - 3 ? bottom - 3 - y + 1 : 0; // roots widen at the base
    const h = half - flare;
    for (let x = cx - h; x <= cx + h; x++) {
      const t = (x - (cx - h)) / (2 * h + 1);
      const v = 0.85 - t * 0.8 + (white(x, y, 31) - 0.5) * 0.3 + (x % 3 === 0 && white(x, y, 32) < 0.5 ? -0.2 : 0);
      p.set(x, y, ramp(P.bark, v, x, y));
    }
  }
}

/** Broad-leaf tree. Takes the whole hex: use as an obstacle. */
export function makeTree(seed: number, wind = 0): Sprite {
  const rng = Rng.fromSeed(seed);
  const W = 42; // room to lean downwind
  const H = 44;
  const cx = 17;
  const blobs: Blob[] = [
    { x: cx, y: 16, r: 11 },
    { x: cx - 7 + rng.int(3), y: 20, r: 7 + rng.int(2) },
    { x: cx + 7 - rng.int(3), y: 20, r: 7 + rng.int(2) },
    { x: cx - 4, y: 9 + rng.int(2), r: 7 },
    { x: cx + 5, y: 10, r: 6 + rng.int(2) },
    { x: cx + rng.int(3) - 1, y: 24, r: 6 },
  ];
  const phase = rng.next() * Math.PI * 2;
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const p = new Pix(W, H);
    trunk(p, cx, 24, H - 3, 2);
    const leaves = new Pix(W, H);
    for (let y = 0; y < 31; y++) {
      for (let x = 0; x < W; x++) {
        const sx = x - swayShift(y, 0, 30, f, phase, 1.2, wind);
        const v = clumpShade(blobs, sx, y, seed);
        if (v !== null) leaves.set(x, y, ramp(P.foliage.slice(1), v, sx, y));
      }
    }
    p.blit(leaves.outlined('#0b170f'), -1, -1);
    frames.push(p);
  }
  return { frames, ax: cx, ay: H - 3, shadow: 22 };
}

/** Conifer. Narrow and tall. */
export function makePine(seed: number, wind = 0): Sprite {
  const rng = Rng.fromSeed(seed);
  const W = 32;
  const H = 46;
  const cx = 13;
  const phase = rng.next() * Math.PI * 2;
  const tiers = [
    { top: 2, bottom: 15, half: 6 },
    { top: 9, bottom: 24, half: 9 },
    { top: 17, bottom: 34, half: 11 },
  ];
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const p = new Pix(W, H);
    trunk(p, cx, 32, H - 3, 1);
    const needles = new Pix(W, H);
    for (const t of tiers) {
      for (let y = t.top; y <= t.bottom; y++) {
        const k = (y - t.top) / (t.bottom - t.top);
        const jag = (white(0, y, seed) - 0.5) * 2;
        const half = Math.max(0.5, t.half * k + jag * 0.6);
        const shift = swayShift(y, 0, 34, f, phase, 1.0, wind);
        for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
          const u = (x + 0.5 - cx) / (half + 0.5);
          if (Math.abs(u) > 1) continue;
          // Ragged bottom edge of each tier.
          if (y > t.bottom - 2 && white(x, y, seed + 1) < 0.45) continue;
          const v = 0.55 - u * 0.4 - k * 0.25 + (white(x, y, seed + 2) - 0.5) * 0.35;
          needles.set(x + shift, y, ramp(P.pine, v, x, y));
        }
      }
    }
    p.blit(needles.outlined('#08130f'), -1, -1);
    frames.push(p);
  }
  return { frames, ax: cx, ay: H - 3, shadow: 16 };
}

/** Thorny thicket: an obstacle, low and wide, with red berries. */
export function makeThicket(seed: number, wind = 0): Sprite {
  const rng = Rng.fromSeed(seed);
  const W = 34;
  const H = 22;
  const blobs: Blob[] = [
    { x: 9, y: 13, r: 7 }, { x: 18, y: 11, r: 8 }, { x: 23, y: 15, r: 6 }, { x: 14, y: 16, r: 6 },
  ];
  const phase = rng.next() * Math.PI * 2;
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const leaves = new Pix(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const sx = x - swayShift(y, 3, 18, f, phase, 0.7, wind);
        const v = clumpShade(blobs, sx, y, seed);
        if (v === null) continue;
        let c = ramp([...P.moss, P.foliage[4]], v * 0.9, sx, y);
        if (white(sx, y, seed + 5) < 0.035 && v > 0.4) c = P.danger[2];
        if (white(sx, y, seed + 6) < 0.05) c = P.bark[1]; // thorny twigs
        leaves.set(x, y, c);
      }
    }
    frames.push(leaves.outlined('#0b170f'));
  }
  return { frames, ax: 15, ay: 20, shadow: 24 };
}

/** Mossy boulder. */
export function makeRock(seed: number): Sprite {
  const rng = Rng.fromSeed(seed);
  const W = 26;
  const H = 20;
  const blobs: Blob[] = [
    { x: 12, y: 12, r: 8 }, { x: 17 + rng.int(2), y: 13, r: 6 }, { x: 8, y: 14, r: 5 },
  ];
  const p = new Pix(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let best: number | null = null;
      for (const b of blobs) {
        const dx = (x + 0.5 - b.x) / b.r;
        const dy = (y + 0.5 - b.y) / (b.r * 0.8);
        const d2 = dx * dx + dy * dy;
        if (d2 > 1 || y > 17) continue;
        const dz = Math.sqrt(1 - d2);
        // Faceted look: quantise the normal a little.
        const l = Math.max(0, Math.round((dx * LIGHT[0] + dy * LIGHT[1] + dz * LIGHT[2]) * 4) / 4);
        best = Math.max(best ?? 0, 0.1 + l * 0.85);
      }
      if (best === null) continue;
      let c = ramp(P.stone.slice(1), best + (white(x, y, seed) - 0.5) * 0.15, x, y);
      if (y < 11 && fbm(x / 3, y / 2, seed) > 0.55) c = ramp(P.moss, best, x, y); // moss on top
      if (white(x, y, seed + 3) < 0.03) c = P.stone[1]; // cracks
      p.set(x, y, c);
    }
  }
  const out = p.outlined(OUTLINE);
  return { frames: Array.from({ length: FRAMES }, () => out), ax: 13, ay: 18, shadow: 22 };
}

/** Small swaying grass tuft. Decoration, not an obstacle. */
export function makeTuft(seed: number, wind = 0): Sprite {
  const rng = Rng.fromSeed(seed);
  const W = 15;
  const H = 9;
  const blades = Array.from({ length: 5 + rng.int(3) }, () => ({
    x: 2 + rng.int(7),
    h: 4 + rng.int(5),
    lean: rng.int(3) - 1,
    c: 2 + rng.int(4),
  }));
  const phase = rng.next() * Math.PI * 2;
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const p = new Pix(W, H);
    const s = Math.round(Math.sin((f / FRAMES) * Math.PI * 2 + phase) * 1.2 * (1 + wind) + wind * 2.5);
    for (const b of blades) {
      for (let i = 0; i < b.h; i++) {
        const k = i / b.h;
        const x = b.x + Math.round((b.lean + s) * k * k);
        p.set(x, H - 1 - i, P.grass[Math.min(5, b.c + (k > 0.6 ? 1 : 0)) - (i === 0 ? 1 : 0)]);
      }
    }
    frames.push(p);
  }
  return { frames, ax: 5, ay: H - 1, shadow: 0 };
}

/** Flat stepping stones across a ford. */
export function makeStones(): Sprite {
  const p = new Pix(24, 12);
  const stones = [[3, 8, 3], [10, 5, 3], [17, 3, 3], [12, 9, 2]];
  for (const [sx, sy, r] of stones) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r - 1; x <= r + 1; x++) {
        if ((x / (r + 1.2)) ** 2 + (y / (r * 0.7)) ** 2 > 1) continue;
        p.set(sx + x, sy + y, y < 0 ? P.stone[4] : y === 0 ? P.stone[3] : P.stone[2]);
      }
    }
  }
  const out = p.outlined('#1b1424aa');
  return { frames: Array.from({ length: FRAMES }, () => out), ax: 12, ay: 10, shadow: 0 };
}

/** Little red-capped mushrooms. */
export function makeMushrooms(): Sprite {
  const p = new Pix(9, 6);
  const dots: [number, number, string][] = [
    [1, 2, P.danger[2]], [2, 2, P.danger[3]], [3, 2, P.danger[2]], [2, 1, P.danger[3]],
    [2, 3, P.flower[2]], [2, 4, P.flower[2]],
    [5, 3, P.danger[2]], [6, 3, P.danger[3]], [6, 4, P.flower[2]],
  ];
  for (const [x, y, c] of dots) p.set(x, y, c);
  p.set(2, 2, P.flower[2]);
  const out = p.outlined('#1b142499');
  return { frames: Array.from({ length: FRAMES }, () => out), ax: 4, ay: 6, shadow: 0 };
}
