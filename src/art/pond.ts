import { Rng } from '../core/rng';
import { IRON, WOOD } from './buildings';
import { type Prop, capsule, chew, fbm, grime, mossify, pick, selOutline, still, white } from './grit';
import { Pix } from './pix';
import { FRAMES } from './props';

/**
 * A village pond's furniture: what lives in and around the water, and a jetty
 * (brygga) to stand on. The water itself is the lake hexes in terrain.ts.
 */

const PAD = ['#16301c', '#24502a', '#3a7234', '#5a9440', '#82b858'];
const REED = ['#22381e', '#3a5e2c', '#5e8a3c', '#88b050', '#b0cc6c'];
const MUD = ['#1c140e', '#2e2218', '#463424', '#5e4a34'];
const WOODW = ['#1c1814', '#34302a', '#4e473d', '#6c6354', '#8a8070', '#a69c8a'];

/** Lily pads with notches and veins, a flower or two, one with a frog. Rings spread round them. */
export function makeLilyPads(seed: number, frog = false): Prop {
  const rng = Rng.fromSeed(seed * 3 + 1);
  const W = 44, H = 22;
  const pads: { x: number; y: number; r: number; notch: number; flower: boolean }[] = [];
  for (let i = 0; i < 4 + rng.int(3); i++) pads.push({ x: 6 + rng.int(32), y: 6 + rng.int(10), r: 3 + rng.int(3), notch: rng.next() * 6.28, flower: rng.next() < 0.3 });
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const p = new Pix(W, H);
    pads.forEach((pad, i) => {
      // A slow ring of light on the water around each pad.
      const ring = pad.r + 2 + ((f + i * 3) % FRAMES) * 0.25;
      for (let a = 0; a < 24; a++) {
        const x = Math.round(pad.x + Math.cos(a * 0.26) * ring * 1.3), y = Math.round(pad.y + Math.sin(a * 0.26) * ring * 0.55);
        if (white(a, i, seed + f) < 0.45) p.set(x, y, '#d4f1f680');
      }
      for (let y = -pad.r; y <= pad.r; y++) {
        for (let x = -pad.r - 2; x <= pad.r + 2; x++) {
          const d = (x / (pad.r + 2)) ** 2 + (y / (pad.r * 0.62)) ** 2;
          if (d > 1) continue;
          const ang = Math.atan2(y, x);
          if (Math.abs(((ang - pad.notch + 9.42) % 6.28) - 3.14) < 0.22 && d > 0.15) continue; // the notch
          const vein = Math.abs(Math.sin(ang * 4 + pad.notch)) < 0.1 && d > 0.1;
          p.set(pad.x + x, pad.y + y, pick(PAD, 0.62 - d * 0.35 - (x + y) * 0.03 + (vein ? 0.16 : 0) + (white(x, y, seed + i) - 0.5) * 0.2, x, y));
        }
      }
      if (pad.flower) {
        for (const [dx, dy, c] of [[0, -1, '#f4f0e2'], [-1, 0, '#f8d8e4'], [1, 0, '#f4f0e2'], [0, 0, '#f2d75c'], [0, -2, '#fffbea']] as const) p.set(pad.x + dx, pad.y + dy - 1, c);
      }
    });
    if (frog) {
      const pad = pads[0];
      const fx = pad.x, fy = pad.y - 2 + (f > 5 ? 0 : 0);
      for (const [dx, dy, c] of [[-2, 0, '#2a5a24'], [-1, 0, '#3a7a30'], [0, 0, '#4a9a3a'], [1, 0, '#3a7a30'], [2, 0, '#2a5a24'], [-1, -1, '#4a9a3a'], [0, -1, '#6ab84c'], [1, -1, '#4a9a3a'], [-1, 1, '#2a5a24'], [1, 1, '#2a5a24']] as const) p.set(fx + dx, fy + dy, c);
      p.set(fx - 1, fy - 2, '#e8e060'); p.set(fx + 1, fy - 2, f === 7 ? '#4a9a3a' : '#e8e060');
      if (f % 4 > 1) p.set(fx, fy + 1, '#c8d88c'); // throat
    }
    frames.push(selOutline(p, 0.35));
  }
  return { frames, ax: 23, ay: 16, shadow: 0 };
}

/** Reeds, bulrushes or yellow flag iris at the edge, swaying out of step. */
export function makeReedClump(seed: number, kind: 'reeds' | 'cattail' | 'iris' = 'reeds', wind = 0): Prop {
  const rng = Rng.fromSeed(seed * 5 + 2);
  const W = 38, H = 44, baseY = H - 4;
  const n = 16 + rng.int(8);
  const stems = Array.from({ length: n }, () => ({
    x: 5 + rng.next() * 28, h: 12 + rng.next() * 20, lean: (rng.next() - 0.5) * 5, ph: rng.next() * 6.28,
    head: kind === 'cattail' ? rng.next() < 0.5 : kind === 'iris' ? rng.next() < 0.3 : false,
    dead: rng.next() < 0.14, wide: kind === 'iris' || rng.next() < 0.3,
  }));
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const p = new Pix(W, H);
    // Mud, and the ring where the water meets the stems.
    for (let x = 3; x < W - 3; x++) {
      const y = baseY + 1 + Math.round(white(x, 0, seed) * 1.4);
      p.set(x, y, pick(MUD, 0.5 + (white(x, 1, seed) - 0.5) * 0.5, x, y));
      if (white(x, f, seed + 2) < 0.18) p.set(x, y + 1, '#b4d8e6a0');
    }
    for (const s of stems) {
      let px = s.x, py = baseY;
      for (let i = 0; i < s.h; i++) {
        const k = i / s.h;
        const x = Math.round(s.x + (s.lean + Math.sin((f / FRAMES) * Math.PI * 2 + s.ph) * (0.9 + wind)) * k * k * 2.2);
        const y = baseY - i;
        const col = s.dead ? pick(['#4a4020', '#7a6a38', '#a8944c'], 0.4 + k * 0.4, x, y) : pick(REED, 0.3 + k * 0.5 + (white(i, s.x, seed) - 0.5) * 0.3 - (x < s.x ? 0 : 0.05), x, y);
        p.set(x, y, col);
        if (s.wide) p.set(x + 1, y, pick(REED, 0.18 + k * 0.4, x, y));
        px = x; py = y;
      }
      if (s.head && kind === 'cattail') for (let k = 0; k < 5; k++) { p.set(px, py - k, k > 3 ? '#8a6a44' : k % 2 ? '#3a2416' : '#58381e'); p.set(px + 1, py - k, '#2e1c10'); }
      if (s.head && kind === 'iris') for (const [dx, dy, c] of [[0, -1, '#f2d020'], [-1, -1, '#e8c010'], [1, -1, '#f8e050'], [0, -2, '#f2d020'], [0, 0, '#c89a10']] as const) p.set(px + dx, py + dy, c);
    }
    frames.push(selOutline(p, 0.45));
  }
  return { frames, ax: 19, ay: baseY + 3, shadow: 0 };
}

/** A tiny dragonfly: hovers, darts, hovers. The whole path is inside the sprite. */
export function makeDragonfly(seed: number): Prop {
  const W = 40, H = 24;
  const rng = Rng.fromSeed(seed);
  const pts = Array.from({ length: FRAMES }, (_, i) => [8 + Math.round(Math.sin(i * 0.9 + seed) * 8) + i * 2, 12 + Math.round(Math.cos(i * 1.3) * 4)] as [number, number]);
  const col = rng.next() < 0.5 ? ['#2a6ac8', '#58a0f0'] : ['#2a8a5a', '#58d09a'];
  const frames: Pix[] = pts.map(([x, y], f) => {
    const p = new Pix(W, H);
    for (let k = 0; k < 6; k++) p.set(x - k, y, k < 2 ? col[1] : col[0]);
    p.set(x + 1, y, '#101820'); p.set(x + 1, y - 1, '#101820');
    const up = f % 2 === 0;
    for (const dx of [-1, -3]) { p.set(x + dx, y + (up ? -2 : 2), '#d8eef8a0'); p.set(x + dx + 1, y + (up ? -2 : 2), '#d8eef8a0'); p.set(x + dx, y + (up ? 2 : -2), '#d8eef860'); }
    return p;
  });
  return { frames, ax: 20, ay: 12, shadow: 0 };
}

/** Wet stones and mud at the bank. */
export function makeBankStones(seed: number): Prop {
  const rng = Rng.fromSeed(seed * 9);
  const p = new Pix(40, 18);
  for (let i = 0; i < 6; i++) {
    const cx = 5 + rng.next() * 30, cy = 7 + rng.next() * 6, rx = 2.5 + rng.next() * 4, ry = rx * 0.6;
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      const d = (x / rx) ** 2 + (y / ry) ** 2;
      if (d > 1) continue;
      p.set(Math.round(cx + x), Math.round(cy + y), pick(['#1c1e24', '#33363f', '#4e515c', '#6e7280', '#98a0ac'], 0.55 - d * 0.3 - (x + y) * 0.04 + (y > ry * 0.3 ? -0.2 : 0) + (white(x, y, seed + i) - 0.5) * 0.2, x, y));
    }
    for (let x = -rx; x <= rx; x++) p.set(Math.round(cx + x), Math.round(cy + ry + 1), '#1c3040a0'); // wet shadow
  }
  mossify(p, seed, 0.5, () => 0.9);
  for (let x = 2; x < 38; x++) if (white(x, 0, seed + 4) < 0.5) p.set(x, 14 + Math.round(white(x, 1, seed + 4) * 2), MUD[1 + Math.floor(white(x, 2, seed) * 2)]);
  return still(selOutline(p, 0.55), 20, 15, 0);
}

/** A half-sunk log with moss, a bracket fungus, and the bright line where the water laps it. */
export function makeFloatingLog(seed: number): Prop {
  const p = new Pix(54, 20);
  capsule(p, 5, 11, 48, 9, 4.2, 3.6, ['#14100c', '#241a12', '#3a2a1c', '#54402a', '#6e5638'], seed, 0.3);
  for (let x = 4; x < 50; x++) if (white(x, 0, seed + 2) < 0.7) p.set(x, 15 + Math.round(white(x, 1, seed + 2) * 1), '#b4d8e690');
  for (let y = 7; y < 15; y++) for (let x = 3; x < 8; x++) if (p.alpha(x, y)) p.set(x, y, pick(['#6a5030', '#9a7a4c', '#c8a874'], 0.6 + Math.sin(Math.hypot(x - 5, y - 11) * 2.6) * 0.2, x, y));
  mossify(p, seed + 4, 0.8, (_x, y) => (y < 11 ? 1.2 : 0.2));
  for (const x of [24, 29]) { p.set(x, 5, '#8a6a44'); p.set(x + 1, 5, '#c8a874'); p.set(x, 6, '#3a2414'); }
  return still(selOutline(p, 0.5), 27, 13, 0);
}

// --- the jetty ------------------------------------------------------------

/**
 * A small jetty. `across` runs left to right, `into` runs away from you, into
 * the water. Weathered boards with gaps and a broken one, mossy where it's
 * wet, posts leaning a little, a ripple round each, a rope coil, a bucket.
 * The anchor is the shore end.
 */
export function makeJetty(seed: number, dir: 'across' | 'into' = 'across', planks = 5): Prop {
  const rng = Rng.fromSeed(seed * 17 + 3);
  const across = dir === 'across';
  const L = 18 * planks + 6;          // length along the run
  const Wd = 20;                      // deck width, across the run
  const W = across ? L + 16 : Wd + 22, H = across ? Wd * 0.5 + 40 : L * 0.6 + 34;
  const frames: Pix[] = [];
  const postAt: number[] = [];
  for (let i = 0; i <= planks; i++) postAt.push(4 + i * (L - 8) / planks);
  const lean = postAt.map(() => (rng.next() - 0.5) * 1.6);
  const broken = 1 + rng.int(planks * 3 - 2);
  const base = new Pix(Math.ceil(W), Math.ceil(H));
  const deckH = 12;
  const x0 = 8, deckTop = across ? 10 : 6;
  const base_set = (x: number, y: number, c: string): void => base.set(x, y, c);

  if (across) {
    // Posts first (behind and below the deck).
    // Deck top: boards across the run, each its own slab.
    // Three rows of boards laid along the run, butt joints staggered, a gap where one has gone.
    let gapX = -1, gapLen = 0;
    for (let r = 0; r < 4; r++) {
      const y0 = deckTop + r * 3;
      let x = x0 - (r * 7) % 11;
      let bi = 0;
      while (x < x0 + L) {
        const len = 13 + Math.floor(white(r, bi, seed + 9) * 14);
        const base = 0.66 + white(r * 7 + bi, 0, seed) * 0.28;
        const missing = r === 1 && bi === broken % 3 + 1;
        for (let k = 0; k < len; k++) {
          const xx = x + k;
          if (xx < x0 || xx >= x0 + L) continue;
          for (let y = 0; y < 3; y++) {
            if (missing) { base_set(xx, y0 + y, white(xx, y, seed) < 0.18 ? '#2a4a6a' : '#0e1c2c'); continue; }
            const v = base + (y === 0 ? 0.1 : y === 2 ? -0.28 : 0) + (k === len - 1 ? -0.4 : 0) + (fbm(xx / 9, y0 + y, seed) - 0.5) * 0.3 + (white(xx, y0 + y, seed + 1) - 0.5) * 0.1 - (xx > x0 + L * 0.7 ? 0.1 : 0);
            base_set(xx, y0 + y, pick(WOODW, v, xx, y0 + y));
          }
          if (!missing && k === 2 && white(r, bi, seed + 3) < 0.7) base_set(xx, y0 + 1, WOODW[0]); // a nail
        }
        if (missing) { gapX = x; gapLen = len; }
        x += len; bi++;
      }
    }
    void gapX; void gapLen;
    // Front beam and its shadow.
    for (let x = x0; x < x0 + L; x++) {
      for (let k = 0; k < 4; k++) base.set(x, deckTop + deckH + k, pick(WOODW, 0.34 - k * 0.07 + (white(x, k, seed + 5) - 0.5) * 0.2 - (fbm(x / 6, 1, seed) > 0.62 ? 0.15 : 0), x, k));
      base.set(x, deckTop + deckH + 4, '#0a1420');
    }
    // Back beam edge.
    for (let x = x0; x < x0 + L; x++) base.set(x, deckTop - 1, WOODW[4]);
  } else {
    // Running away from you: planks are bands, the sides are two beams.
    const rows = Math.round(L * 0.6);
    for (let y = 0; y < rows; y++) {
      const bi = Math.floor(y / 3);
      if (bi === Math.floor(broken * rows / (planks * 3)) && y % 3 !== 0) { for (let x = 0; x < Wd - 4; x++) base.set(6 + x, 4 + y, white(x, y, seed) < 0.2 ? '#2a4a6a' : '#0e1c2c'); continue; }
      for (let x = 0; x < Wd - 4; x++) {
        const edge = y % 3 === 0 ? -0.22 : 0;
        base.set(6 + x, 4 + y, pick(WOODW, 0.56 + white(bi, 0, seed) * 0.3 + edge + (fbm(x / 3, y / 7, seed) - 0.5) * 0.3 + (white(x, y, seed + 1) - 0.5) * 0.1 - (y < 14 ? 0.12 : 0), x, y));
      }
      if (white(bi, 3, seed) < 0.35) { base.set(8, 4 + y, WOODW[0]); base.set(6 + Wd - 7, 4 + y, WOODW[0]); }
    }
    for (let y = 0; y < rows; y++) for (const sx of [3, 6 + Wd - 4]) for (let k = 0; k < 3; k++) base.set(sx + k, 4 + y, pick(WOODW, 0.55 - k * 0.14 + (white(sx + k, y, seed) - 0.5) * 0.2, sx + k, y));
  }
  // Props on the deck: a coil of rope, a bucket.
  const coilX = across ? x0 + 8 : 12, coilY = across ? deckTop + 3 : 4 + Math.round(L * 0.4);
  for (let r = 0; r < 3; r++) for (let a = 0; a < 14; a++) base.set(Math.round(coilX + Math.cos(a * 0.45) * (4 - r)), Math.round(coilY + Math.sin(a * 0.45) * (2 - r * 0.5)), r % 2 ? '#4a3e26' : '#6a5a38');
  if (across) {
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) base.set(x0 + L - 14 + x, deckTop - 3 + y, pick(WOOD, 0.62 - x * 0.07 + (white(x, y, seed) - 0.5) * 0.2, x, y));
    for (let x = 0; x < 6; x++) base.set(x0 + L - 14 + x, deckTop - 3, IRON[2]);
  }
  mossify(base, seed + 6, 0.5, (x, y) => (across ? (x > x0 + L * 0.55 ? 1.2 : 0.3) : (y < 14 ? 1.2 : 0.3)));
  chew(base, seed + 7, 0.05);

  for (let f = 0; f < FRAMES; f++) {
    const p = new Pix(base.w, base.h);
    // Posts: legs into the water, each with a ripple ring and a dark reflection.
    if (across) {
      postAt.forEach((px, i) => {
        const x = x0 + px + lean[i];
        const top = deckTop + deckH;
        capsule(p, x, top + 2, x + lean[i] * 0.5, top + 14, 1.7, 1.5, WOODW, seed + i * 3, 0.3);
        // Wet line and weed on the lower part of the post.
        for (let k = 8; k < 14; k++) p.set(Math.round(x + lean[i] * 0.3) - 1, top + k, k > 10 ? '#2a4a26' : '#3a342c');
        const ry = top + 12;
        for (let a = 0; a < 18; a++) if (white(a, i, seed + f) < 0.55) p.set(Math.round(x + Math.cos(a * 0.35 + f) * (3 + (f % FRAMES) * 0.18)), ry + 3 + Math.round(Math.sin(a * 0.35 + f) * 1.2 * (1 + (f % FRAMES) * 0.05)), '#cfe8f090');
        for (let k = 0; k < 3; k++) p.set(Math.round(x) - 1 + k, ry + 6, '#0a141e80');
      });
    } else {
      for (const sx of [4, 6 + Wd - 3]) {
        for (let i = 0; i < planks; i++) {
          const y = 4 + Math.round((i + 1) * (L * 0.6 - 8) / planks);
          capsule(p, sx + 1, y, sx + 1, y + 9, 1.5, 1.4, WOODW, seed + i * 3 + sx, 0.3);
          for (let a = 0; a < 12; a++) if (white(a, i, seed + f + sx) < 0.5) p.set(Math.round(sx + 1 + Math.cos(a * 0.55 + f) * (2 + (f % FRAMES) * 0.18)), y + 9 + Math.round(Math.sin(a * 0.55 + f)), '#cfe8f090');
        }
      }
    }
    p.blit(base, 0, 0);
    // A ladder at the far end and a bucket hung on a post.
    const o = selOutline(p, 0.55);
    frames.push(o);
  }
  grime(frames[0], seed, 0.15, frames[0].h);
  return { frames, ax: across ? x0 + 1 : 16, ay: across ? deckTop + deckH + 2 : Math.ceil(L * 0.6) + 9, shadow: 0 };
}
