import { Rng } from '../core/rng';
import { fbm, white } from './noise';
import { OUTLINE, P } from './palette';
import { Pix, ramp } from './pix';
import { FRAMES, type Sprite } from './props';

/**
 * Village edge scenery: palisade, gate, a big ivy-grown boulder, a handcart,
 * a campfire and cottages. Big things span several hexes: their anchor is the
 * middle of their footprint, at the front row's feet line.
 */

const LOG = ['#2a1a10', '#45301c', '#62452a', '#82603a', '#a07c4c'];
const CUT = ['#8a6a44', '#c9a66b', '#e2c690'];
const PLANK = ['#3b2416', '#5a3a22', '#7a5434', '#96704a'];
const ROPE = ['#7a6040', '#b0905a'];
const IRON = ['#1f1e2a', '#33333f', '#4b4c5b', '#686b7b'];
const STRAW = ['#4a3420', '#64462c', '#86613c', '#a8824f', '#c9a66b', '#dcc088'];
const PLASTER = ['#7a6e5c', '#a89a80', '#cbbd9e', '#ded2b6'];

const still = (p: Pix, ax: number, ay: number, shadow: number): Sprite => ({
  frames: Array.from({ length: FRAMES }, () => p), ax, ay, shadow,
});

/** One sharpened log, lit from the left. */
function log(p: Pix, x0: number, w: number, top: number, bottom: number, seed: number): void {
  for (let y = top; y <= bottom; y++) {
    // Pointed tip: narrower toward the top over the first rows.
    const tip = y - top;
    const inset = tip < 6 ? Math.ceil(((6 - tip) * w) / 13) : 0;
    for (let x = x0 + inset; x < x0 + w - inset; x++) {
      const u = (x - x0 + 0.5) / w; // 0 left .. 1 right
      if (tip < 5) {
        p.set(x, y, ramp(CUT, 1 - u * 0.9, x, y)); // fresh-cut point
        continue;
      }
      let v = 0.9 - u * 0.75 + (white(x, y, seed) - 0.5) * 0.25;
      if (white(x >> 1, y, seed + 1) < 0.08) v -= 0.25; // bark grooves
      p.set(x, y, ramp(LOG, v, x, y));
    }
  }
}

function lashing(p: Pix, x0: number, x1: number, y: number): void {
  for (let x = x0; x <= x1; x++) {
    p.set(x, y, ROPE[(x >> 1) % 2]);
    if (x % 3 === 0) p.set(x, y + 1, ROPE[0]);
  }
}

/** Palisade section for one hex: sharpened logs edge to edge, lashed with rope. */
export function makePalisade(seed: number): Sprite {
  const rng = Rng.fromSeed(seed);
  const W = 32;
  const H = 42;
  const p = new Pix(W, H);
  let x = 0;
  while (x < W) {
    const w = 5 + rng.int(2);
    log(p, x, Math.min(w, W - x), 1 + rng.int(4), H - 1, seed + x);
    x += w;
  }
  lashing(p, 0, W - 1, 12);
  lashing(p, 0, W - 1, H - 10);
  // Earth heaped at the foot.
  for (let x2 = 0; x2 < W; x2++) {
    const h = 2 + Math.round(fbm(x2 / 4, 0, seed) * 2);
    for (let k = 0; k < h; k++) p.set(x2, H - 1 - k, ramp(P.dirt.slice(1, 4), 0.3 + k * 0.2, x2, H - k));
  }
  // Outlined, but without side edges so neighbouring sections join up.
  const out = p.outlined(OUTLINE);
  clearEdges(out);
  return still(out, 17, H, 0);
}

/** Wipe the outline pixels on the left and right border (so wall sections tile). */
function clearEdges(p: Pix): void {
  for (let y = 0; y < p.h; y++) {
    for (const x of [0, p.w - 1]) {
      const i = (y * p.w + x) * 4;
      p.data[i + 3] = 0;
    }
  }
}

/** Torch flame pixel offset on the gate sprite (for the engine's light and sparks). */
export const GATE_TORCH = { dx: -27, dy: -38 };

/** The gate: two tall posts, a lintel, and a barred double door (or open). Spans two hexes. */
export function makeGate(open: boolean): Sprite {
  const W = 66;
  const H = 50;
  const p = new Pix(W, H);
  // Opening: the village behind, dark.
  const doorTop = 13;
  if (open) {
    for (let y = doorTop; y < H; y++) {
      for (let x = 8; x < W - 8; x++) {
        const deep = (y - doorTop) / (H - doorTop);
        const pathy = Math.abs(x - W / 2) < 6 + deep * 10;
        p.set(x, y, pathy ? ramp(P.dirt.slice(0, 3), deep * 0.9, x, y) : ramp(P.grass.slice(0, 3), deep * 0.8, x, y));
      }
    }
    // Door leaves swung inward: narrow, foreshortened.
    for (const side of [0, 1]) {
      for (let y = doorTop + 1; y < H - 1; y++) {
        for (let k = 0; k < 7; k++) {
          const x = side === 0 ? 9 + k : W - 10 - k;
          const v = 0.25 + k * 0.08 + (white(x, y, 9) - 0.5) * 0.2;
          p.set(x, y + (side === 0 ? -k / 3 : -k / 3), ramp(PLANK, v, x, y));
        }
      }
    }
  } else {
    // Planked doors with a seam, iron bands and a bar.
    for (let y = doorTop; y < H; y++) {
      for (let x = 8; x < W - 8; x++) {
        const plank = Math.floor((x - 8) / 5);
        const edge = (x - 8) % 5 === 0;
        let v = 0.55 + (white(plank, 0, 3) - 0.5) * 0.3 + (white(x, y, 4) - 0.5) * 0.18 - (y - doorTop) * 0.004;
        if (edge) v = 0.08;
        if (x === W / 2 || x === W / 2 - 1) v = 0.02; // seam
        p.set(x, y, ramp(PLANK, v, x, y));
      }
    }
    for (const by of [doorTop + 6, H - 9]) {
      for (let x = 8; x < W - 8; x++) {
        p.set(x, by, IRON[2]);
        p.set(x, by + 1, IRON[1]);
        if ((x - 10) % 9 === 0) p.set(x, by, IRON[3]); // rivets
      }
    }
    // The bar, resting in two brackets.
    const barY = doorTop + 16;
    for (let x = 12; x < W - 12; x++) {
      for (let k = 0; k < 3; k++) p.set(x, barY + k, ramp(LOG, 0.8 - k * 0.3, x, barY + k));
    }
    for (const bx of [16, W - 18]) for (let y = barY - 1; y <= barY + 3; y++) for (let k = 0; k < 2; k++) p.set(bx + k, y, IRON[1]);
  }
  // Posts.
  log(p, 0, 8, 2, H - 1, 21);
  log(p, W - 8, 8, 3, H - 1, 22);
  // Lintel beam with a little plank roof.
  for (let y = 7; y < 12; y++) {
    for (let x = 1; x < W - 1; x++) p.set(x, y, ramp(LOG, 0.85 - (y - 7) * 0.15 + (white(x, y, 5) - 0.5) * 0.2, x, y));
  }
  for (let y = 4; y < 8; y++) {
    const inset = 7 - y;
    for (let x = inset; x < W - inset; x++) p.set(x, y, ramp(PLANK, 0.9 - (y - 4) * 0.2 + (x % 6 === 0 ? -0.3 : 0), x, y));
  }
  lashing(p, 0, 7, 20);
  lashing(p, W - 8, W - 1, 20);
  // Torch in a bracket on the left post.
  const tx = 33 + GATE_TORCH.dx;
  const ty = H + GATE_TORCH.dy;
  for (let y = ty + 2; y < ty + 8; y++) p.set(tx, y, P.bark[2]);
  p.set(tx - 1, ty + 6, IRON[2]);
  p.set(tx + 1, ty + 6, IRON[2]);
  p.set(tx, ty + 1, '#c43a2e');
  p.set(tx, ty, '#f2a24a');
  p.set(tx - 1, ty + 1, '#f2a24a');
  p.set(tx + 1, ty + 1, '#ef6a48');
  p.set(tx, ty - 1, '#fff2a0');
  return still(p.outlined(OUTLINE), 34, H, 0);
}

interface Blob {
  x: number;
  y: number;
  r: number;
}

/** A boulder the size of a hay wagon, grown over with ivy. Spans three hexes (a triangle). */
export function makeIvyRock(seed: number): Sprite {
  const rng = Rng.fromSeed(seed);
  const W = 72;
  const H = 74;
  const blobs: Blob[] = [
    { x: 36, y: 46, r: 23 },
    { x: 18, y: 48, r: 15 },
    { x: 55, y: 48, r: 15 },
    { x: 32, y: 26, r: 16 },
    { x: 46, y: 30, r: 13 + rng.int(2) },
    { x: 38, y: 14, r: 10 },
    { x: 26, y: 59, r: 12 },
    { x: 48, y: 60, r: 11 },
  ];
  const L = [-0.55, -0.7, 0.55].map((v, _, a) => v / Math.hypot(...a));
  const p = new Pix(W, H);
  const shade = new Float32Array(W * H).fill(-1);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let best = -1;
      let bz = -Infinity;
      for (const b of blobs) {
        const dx = (x + 0.5 - b.x) / b.r;
        const dy = (y + 0.5 - b.y) / (b.r * 0.85);
        const d2 = dx * dx + dy * dy;
        if (d2 > 1 || y > H - 3) continue;
        const dz = Math.sqrt(1 - d2);
        const z = dz * b.r + b.y * 0.3;
        if (z <= bz) continue;
        bz = z;
        const l = Math.max(0, Math.round((dx * L[0] + dy * L[1] + dz * L[2]) * 5) / 5);
        best = 0.08 + l * 0.85;
      }
      if (best < 0) continue;
      shade[y * W + x] = best;
      let c = ramp(P.stone.slice(1), best + (white(x, y, seed) - 0.5) * 0.15, x, y);
      if (white(x, y, seed + 3) < 0.025) c = P.stone[1];
      if (fbm(x / 9, y / 4, seed + 4) > 0.68) c = P.stone[1]; // deep cracks
      p.set(x, y, c);
    }
  }
  // Ivy: ropes of vine hanging from the top, leafy where the noise says so.
  const ivy = new Pix(W, H);
  const vines = [12, 20, 27, 33, 40, 47, 55, 61].map((x) => ({ x: x + rng.int(3) - 1, len: 18 + rng.int(28) }));
  for (const v of vines) {
    let x = v.x;
    let top = 0;
    while (top < H && shade[top * W + x] < 0) top++;
    for (let y = top; y < Math.min(H - 3, top + v.len); y++) {
      x += white(x, y, seed + 7) < 0.2 ? (white(x, y, seed + 8) < 0.5 ? -1 : 1) : 0;
      if (shade[y * W + x] < 0) continue;
      ivy.set(x, y, (y & 1) ? '#2c4a26' : '#3a5a2a');
      // Leaves along the vine: little 2–3 px hearts.
      if (white(x, y, seed + 9) < 0.55) {
        for (const [lx, ly] of [[-1, 0], [1, 0], [-2, 1], [0, 1], [1, -1], [-1, -1]]) {
          if (white(x + lx, y + ly, seed + 10) < 0.6 && shade[(y + ly) * W + x + lx] >= 0) {
            ivy.set(x + lx, y + ly, ramp(P.foliage.slice(1, 6), 0.3 + (shade[(y + ly) * W + x + lx] ?? 0) * 0.7 + (white(x + lx, y + ly, seed + 11) - 0.5) * 0.3, x + lx, y + ly));
          }
        }
      }
    }
  }
  // A thick mat over the top and the left flank.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const s = shade[y * W + x];
      if (s < 0) continue;
      const n = fbm(x / 6, y / 5, seed + 12);
      const zone = (y < 40 ? 0.12 : 0) + (x < 34 ? 0.08 : 0);
      if (n + zone > 0.7) ivy.set(x, y, ramp(P.foliage.slice(1, 7), s * 0.8 + (white(x, y, seed + 13) - 0.5) * 0.45, x, y));
    }
  }
  p.blit(ivy, 0, 0);
  return still(p.outlined(OUTLINE), 36, H - 1, 60);
}

/** A big two-wheeled handcart with sacks under a tarp, shafts resting in the grass. Spans two hexes. */
export function makeHandcart(): Sprite {
  const W = 70;
  const H = 40;
  const p = new Pix(W, H);
  const bedTop = 18;
  const bedBottom = 26;
  // Shafts: two poles sloping down to the ground on the right.
  for (let x = 46; x < W - 1; x++) {
    const y = bedBottom - 2 + Math.round(((x - 46) / (W - 47)) * (H - bedBottom));
    p.set(x, y, ramp(LOG, 0.7, x, y));
    p.set(x, y - 1, ramp(LOG, 0.9, x, y));
    const y2 = y - 3;
    if (x > 50) p.set(x - 3, y2, ramp(LOG, 0.5, x, y2));
  }
  // Sacks and a tarp on the bed.
  const sacks: Blob[] = [{ x: 14, y: 14, r: 7 }, { x: 25, y: 12, r: 8 }, { x: 37, y: 14, r: 7 }, { x: 20, y: 7, r: 6 }, { x: 31, y: 6, r: 5 }];
  for (let y = 0; y < bedTop + 2; y++) {
    for (let x = 4; x < 48; x++) {
      let best = -1;
      for (const b of sacks) {
        const dx = (x + 0.5 - b.x) / b.r;
        const dy = (y + 0.5 - b.y) / (b.r * 0.8);
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        best = Math.max(best, 0.2 + Math.max(0, -dx * 0.5 - dy * 0.6 + Math.sqrt(1 - d2) * 0.5) * 0.8);
      }
      if (best < 0) continue;
      const tarp = x > 26 && y > 3 && fbm(x / 7, y / 5, 31) > 0.35;
      p.set(x, y, tarp ? ramp(['#1f2a24', '#2e3d33', '#3f5244', '#566b58'], best, x, y)
        : ramp(STRAW.slice(1, 6), best + (white(x, y, 32) < 0.1 ? -0.2 : 0), x, y));
    }
  }
  // Bed: plank box.
  for (let y = bedTop; y <= bedBottom; y++) {
    for (let x = 3; x < 49; x++) {
      const seam = (y - bedTop) % 3 === 0;
      p.set(x, y, ramp(PLANK, seam ? 0.15 : 0.6 - (y - bedTop) * 0.04 + (white(x, y, 33) - 0.5) * 0.2, x, y));
    }
  }
  for (const sx of [3, 25, 48]) for (let y = bedTop - 2; y <= bedBottom; y++) p.set(sx, y, PLANK[0]);
  // Back leg.
  for (let y = bedBottom; y < H - 1; y++) p.set(7, y, LOG[1]);
  // Wheel: rim, hub and spokes.
  const wx = 28;
  const wy = H - 11;
  const R = 10;
  for (let y = -R - 1; y <= R + 1; y++) {
    for (let x = -R - 1; x <= R + 1; x++) {
      const d = Math.hypot(x, y);
      if (d > R + 0.5) continue;
      if (d > R - 2) p.set(wx + x, wy + y, ramp(LOG, 0.9 - (y + R) / (2 * R) * 0.7, wx + x, wy + y));
      else if (d < 2.2) p.set(wx + x, wy + y, IRON[2]);
    }
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    for (let t = 2; t < R - 1; t++) p.set(wx + Math.round(Math.cos(a) * t), wy + Math.round(Math.sin(a) * t), LOG[2]);
  }
  return still(p.outlined(OUTLINE), 35, H - 1, 52);
}

/** Stones in a ring with crossed logs. Flames come from the engine as particles. */
export function makeCampfire(lit: boolean): Sprite {
  const W = 24;
  const H = 12;
  const p = new Pix(W, H);
  // Ash bed.
  for (let y = 3; y < H - 1; y++) {
    for (let x = 3; x < W - 3; x++) {
      if (((x - 12) / 8.5) ** 2 + ((y - 7) / 3.6) ** 2 > 1) continue;
      p.set(x, y, lit && white(x, y, 40) < 0.3 ? '#c43a2e' : ramp(['#211a1a', '#352b29', '#4a3e3a'], white(x, y, 41), x, y));
    }
  }
  // Logs.
  for (let t = 0; t < 12; t++) {
    p.set(6 + t, 9 - Math.round(t / 3), lit ? LOG[3] : '#2a2020');
    p.set(6 + t, 10 - Math.round(t / 3), lit ? LOG[1] : '#1a1414');
    p.set(17 - t, 9 - Math.round(t / 3), lit ? LOG[2] : '#2a2020');
  }
  if (lit) for (const [x, y] of [[11, 6], [12, 6], [12, 5], [13, 7]]) p.set(x, y, '#f2a24a');
  // Ring of stones.
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const x = Math.round(12 + Math.cos(a) * 10);
    const y = Math.round(7 + Math.sin(a) * 4);
    const c = Math.sin(a) > 0 ? P.stone[4] : P.stone[3];
    p.set(x, y, c);
    p.set(x + 1, y, c);
    p.set(x, y - 1, P.stone[5]);
  }
  return still(p.outlined('#1b142499'), 12, H - 1, 0);
}

/** Lit window position on the cottage sprite (for the engine's warm glow). */
export const COTTAGE_WINDOW = { dx: -12, dy: -14 };

/** Timber-framed cottage with a thatched roof and a lit window. Spans two hexes. */
export function makeCottage(seed: number): Sprite {
  const W = 70;
  const H = 62;
  const p = new Pix(W, H);
  const wallTop = 32;
  // Walls: plaster between dark beams.
  for (let y = wallTop; y < H - 1; y++) {
    for (let x = 8; x < W - 8; x++) {
      const beam = x === 8 || x === W - 9 || x === 35 || y === wallTop || y === H - 2 || (y === wallTop + 13 && x < 35);
      p.set(x, y, beam ? LOG[1] : ramp(PLASTER, 0.75 - (x - 8) / (W - 16) * 0.5 + (white(x, y, seed) - 0.5) * 0.15, x, y));
    }
  }
  // Diagonal brace in the right panel.
  for (let t = 0; t < 26; t++) p.set(36 + t, wallTop + 1 + Math.round(t * 0.95), LOG[1]);
  // Door and window.
  for (let y = H - 17; y < H - 2; y++) for (let x = 42; x < 52; x++) p.set(x, y, ramp(PLANK, x === 42 ? 0.1 : 0.45 - (y - H + 17) * 0.01, x, y));
  p.set(49, H - 10, IRON[3]);
  const wx = 35 + COTTAGE_WINDOW.dx;
  const wy = H + COTTAGE_WINDOW.dy;
  for (let y = wy - 4; y <= wy + 3; y++) {
    for (let x = wx - 5; x <= wx + 5; x++) {
      const frame = y === wy - 4 || y === wy + 3 || x === wx - 5 || x === wx + 5 || x === wx || y === wy;
      p.set(x, y, frame ? LOG[1] : y < wy ? '#fff2a0' : '#f2c94c');
    }
  }
  // Thatch: a thick trapezoid overhanging the walls, with ragged eaves.
  const roofTop = 4;
  const eave = wallTop + 4;
  for (let y = roofTop; y <= eave; y++) {
    const k = (y - roofTop) / (eave - roofTop);
    const half = 14 + k * 21;
    for (let x = Math.floor(35 - half); x <= Math.ceil(35 + half); x++) {
      if (y > eave - 3 && white(x, y, seed + 2) < 0.35) continue;
      const streak = fbm(x / 1.5, y / 6, seed + 3);
      const v = 0.85 - k * 0.35 - (x - 35 + half) / (2 * half) * 0.35 + (streak - 0.5) * 0.4;
      p.set(x, y, ramp(STRAW, v, x, y));
    }
  }
  // Ridge and chimney.
  for (let x = 22; x < 49; x++) p.set(x, roofTop, STRAW[2]);
  for (let y = 0; y < 9; y++) for (let x = 46; x < 51; x++) p.set(x, y, ramp(P.stone.slice(2), x === 46 ? 0.9 : 0.4, x, y));
  return still(p.outlined(OUTLINE), 35, H, 64);
}
