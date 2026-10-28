import { Rng } from '../core/rng';
import {
  type Prop, type Pt, capsule, chew, column, fbm, grime, mossify, pick, polyFill, selOutline, still, white, wobble,
} from './grit';
import { Pix } from './pix';
import { FRAMES } from './props';

/** Rough natural things: rocks and trees. Nothing round, nothing clean. */

const ROCK = ['#211f27', '#38353c', '#524d4c', '#706a62', '#928a7a', '#b6ad98', '#d6cdb4'];
const BARK = ['#1e130e', '#33211a', '#4b3324', '#654630', '#80593c'];
const LEAF = ['#0f1d16', '#192f20', '#244428', '#335c2d', '#4a7634', '#6a9440', '#91b34c', '#bdd069'];
const LEAF_OLIVE = ['#1b2412', '#2b3a19', '#40542a', '#5d7330', '#7f9238', '#a5ad48', '#cdc96a'];
const LEAF_RUST = ['#241a12', '#3b2a17', '#58411f', '#7b5a26', '#a07a30', '#c49a44'];

// --- rocks -----------------------------------------------------------------

const L2: Pt = [-0.55, -0.7];

function edgeInfo(pts: Pt[], x: number, y: number): { d: number; nx: number; ny: number } {
  let best = Infinity, nx = 0, ny = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const ex = x1 - x0, ey = y1 - y0;
    const t = Math.max(0, Math.min(1, ((x - x0) * ex + (y - y0) * ey) / (ex * ex + ey * ey || 1)));
    const d = Math.hypot(x - (x0 + ex * t), y - (y0 + ey * t));
    if (d < best) {
      best = d;
      // Outward normal for a clockwise polygon in screen space.
      const l = Math.hypot(ex, ey) || 1;
      nx = ey / l; ny = -ex / l;
    }
  }
  return { d: best, nx, ny };
}

/** One angular rock drawn into `p`, with chamfered facets, cracks, lichen and a little moss. */
function paintRock(p: Pix, cx: number, cy: number, rx: number, ry: number, seed: number, moss = 0.5): void {
  const rng = Rng.fromSeed(seed);
  const n = 7 + rng.int(3);
  const pts: Pt[] = [];
  const a0 = rng.next() * 0.6;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2 + (rng.next() - 0.5) * 0.45;
    const r = 0.74 + rng.next() * 0.36;
    let py = Math.sin(a) * ry * r;
    if (py > 0) py *= 0.75; // sits flat on the ground
    pts.push([cx + Math.cos(a) * rx * r, cy + py]);
  }
  // Clockwise in screen space already (angles grow clockwise because y points down).
  const sectors = 4 + rng.int(3);
  const sOff = rng.next() * Math.PI * 2;
  polyFill(p, pts, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    const { d, nx, ny } = edgeInfo(pts, px, py);
    const bw = 3.2;
    const sector = Math.floor((((Math.atan2(py - cy, px - cx) + sOff) / (Math.PI * 2)) % 1 + 1) % 1 * sectors);
    let v = (py < cy + ry * 0.05 ? 0.5 : 0.3) + (white(sector, 3, seed) - 0.5) * 0.34;
    if (d < bw) {
      const lam = nx * L2[0] + ny * L2[1];
      v += lam * 0.5 * (1 - d / bw);
    }
    // Inner plane: a ridge splits the face in two.
    const ridge = (px - cx) * 0.5 - (py - cy) * 0.35 + (white(1, 1, seed) - 0.5) * 3;
    if (ridge > 0) v -= 0.1;
    v += (white(x, y, seed + 4) - 0.5) * 0.14 + (fbm(x / 2, y / 2, seed + 5) - 0.5) * 0.2;
    return pick(ROCK.slice(1, 6), v, x, y);
  });
  // Cracks: wandering dark lines, a lit pixel on their left lip.
  for (let c = 0; c < 2 + rng.int(2); c++) {
    let x = cx + (rng.next() - 0.5) * rx * 1.2;
    let y = cy - ry * 0.7 + rng.next() * ry * 0.5;
    for (let s = 0; s < 5 + rng.int(7); s++) {
      if (!p.alpha(Math.floor(x), Math.floor(y))) break;
      p.set(x, y, ROCK[0]);
      p.set(x - 1, y, ROCK[4]);
      x += (rng.next() - 0.45) * 1.6;
      y += 0.6 + rng.next() * 1.1;
    }
  }
  // Lichen: pale crusty patches, mostly on the lit side.
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      if (!p.alpha(x, y)) continue;
      const l = fbm(x / 2.1, y / 2.1, seed + 6);
      if (l > 0.76 && white(x, y, seed + 7) < 0.6) {
        p.set(x, y, white(x, y, seed + 8) < 0.6 ? '#7f8a62' : '#a3a77a');
      }
    }
  }
  mossify(p, seed + 9, moss, (_x, y) => (y < cy - ry * 0.2 || y > cy + ry * 0.45 ? 1.1 : 0.5));
}

/** Soil and a few grass blades where a heavy thing sits in the turf. */
function bedIn(p: Pix, x0: number, x1: number, y: number, seed: number): void {
  for (let x = x0; x <= x1; x++) {
    if (white(x, y, seed) < 0.75) p.set(x, y, '#2e2016');
    if (white(x, y - 1, seed + 1) < 0.5) p.set(x, y - 1, '#46301f');
  }
  for (let x = x0; x <= x1; x += 2) {
    if (white(x, y, seed + 2) < 0.5) {
      const h = 1 + Math.floor(white(x, y, seed + 3) * 3);
      for (let k = 0; k < h; k++) p.set(x + Math.round(white(x, k, seed + 4) - 0.5), y - 1 - k, ['#3f6d36', '#5a8c3e', '#82ad4c'][k % 3]);
    }
  }
}

/** A weathered boulder, big enough to be an obstacle. */
export function makeBoulder(seed: number): Prop {
  const p = new Pix(36, 30);
  paintRock(p, 18, 15, 14, 11, seed, 0.6);
  chew(p, seed, 0.12);
  const o = selOutline(p);
  bedIn(o, 4, 33, 26, seed);
  return still(o, 19, 26, 26);
}

/** A cluster of three: one big, two leaning against it. */
export function makeOutcrop(seed: number): Prop {
  const p = new Pix(46, 30);
  paintRock(p, 28, 17, 13, 9, seed + 1, 0.5);
  paintRock(p, 12, 19, 9, 7, seed + 2, 0.4);
  paintRock(p, 36, 22, 7, 5, seed + 3, 0.3);
  chew(p, seed, 0.1);
  const o = selOutline(p);
  bedIn(o, 2, 46, 27, seed);
  return still(o, 24, 27, 30);
}

/** A few small stones, the kind you stub a toe on. */
export function makePebbles(seed: number): Prop {
  const p = new Pix(22, 12);
  paintRock(p, 6, 7, 4, 3, seed, 0.2);
  paintRock(p, 14, 6, 3, 2.5, seed + 1, 0.1);
  paintRock(p, 18, 8, 2.2, 1.8, seed + 2, 0);
  const o = selOutline(p);
  return still(o, 12, 11, 8);
}

// --- trees -----------------------------------------------------------------

interface Clump { x: number; y: number; r: number; pal: readonly string[]; tone: number }

const LIGHT3 = (() => {
  const l = [-0.55, -0.7, 0.55];
  const n = Math.hypot(...l);
  return l.map((v) => v / n);
})();

/**
 * An old oak. Lopsided crown made of many small leaf clumps with gaps where
 * you see branches and sky, a gnarled trunk with a flared, rooty base, moss on
 * the shaded side. Sways row by row.
 */
export function makeOak(seed: number, wind = 0): Prop {
  const rng = Rng.fromSeed(seed);
  const W = 54, H = 64;
  const cx = 26 + rng.int(3) - 1;
  const baseY = H - 4;
  const lean = (rng.next() - 0.5) * 7;
  const crownY = 25;

  // Trunk: wobbles, leans, flares into roots.
  const tx = (y: number): number => cx + lean * Math.pow(Math.max(0, (baseY - y) / (baseY - 30)), 1.6) + (fbm(y / 5, 1, seed) - 0.5) * 2.4;
  const thick = (y: number): number => {
    const k = (baseY - y) / (baseY - 28);
    return 1.7 + (1 - Math.min(1, k)) * 1.5 + Math.max(0, 5 - (baseY - y)) * 0.42 + (fbm(y / 3, 2, seed) - 0.5) * 1.3;
  };
  const trunk = new Pix(W, H);
  column(trunk, 28, baseY, tx, thick, BARK, seed + 2, 0.2);
  for (const [dx, k] of [[-1, 1], [1, 1], [-1, 0.6]] as const) {
    capsule(trunk, tx(baseY - 4) + dx * 2, baseY - 5, tx(baseY) + dx * (6 + rng.int(4)) * k, baseY + 1, 2.0, 0.8, BARK, seed + 5);
  }
  // Branches reaching up and out into the crown.
  const tips: Pt[] = [];
  const branchBase = [36, 33, 31, 29];
  branchBase.forEach((by, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const bx = tx(by);
    const ex = bx + side * (7 + rng.int(9)) + (rng.next() - 0.5) * 4;
    const ey = crownY - 4 + rng.int(8) - i * 0.5;
    capsule(trunk, bx, by, ex, ey, 1.9, 0.8, BARK, seed + 7 + i);
    tips.push([ex, ey]);
  });
  // Bark: vertical grooves, knots, moss on the shaded (right) side.
  for (let y = 28; y <= baseY + 1; y++) {
    for (let x = 0; x < W; x++) {
      if (!trunk.alpha(x, y)) continue;
      const g = fbm(x * 1.7, y / 9, seed + 12);
      if (g > 0.6) trunk.set(x, y, BARK[1]);
      else if (g < 0.32 && white(x, y, seed + 13) < 0.5) trunk.set(x, y, BARK[4]);
    }
  }
  const kx = Math.round(tx(baseY - 9)) - 1;
  trunk.set(kx, baseY - 9, BARK[0]); trunk.set(kx + 1, baseY - 9, BARK[0]); trunk.set(kx, baseY - 10, BARK[3]);
  mossify(trunk, seed + 14, 0.7, (x, y) => (y > baseY - 14 ? 1.2 : 0.4) * (x < tx(y) ? 1.1 : 0.6));

  // Crown: lots of clumps, biggest toward the middle, lopsided toward the lean.
  const clumps: Clump[] = [];
  const addClump = (x: number, y: number, r: number): void => {
    const roll = rng.next();
    const pal = roll < 0.18 ? LEAF_OLIVE : roll < 0.22 ? LEAF_RUST : LEAF;
    clumps.push({ x, y, r, pal, tone: (rng.next() - 0.5) * 0.18 });
  };
  const sx = cx + lean * 0.5;
  for (let i = 0; i < 17; i++) {
    const a = rng.next() * Math.PI * 2;
    const rho = Math.sqrt(rng.next());
    const x = sx + Math.cos(a) * rho * (16 + rng.int(4));
    const y = crownY + Math.sin(a) * rho * 14 - 1;
    addClump(x, y, 4.5 + rng.next() * 4 - rho * 1.2);
  }
  for (const [x, y] of tips) addClump(x + (rng.next() - 0.5) * 3, y - 1, 4 + rng.next() * 3);
  for (let i = 0; i < 6; i++) addClump(sx - 18 + rng.next() * 36, crownY + 9 + rng.next() * 8, 2.4 + rng.next() * 2);
  clumps.sort((a, b) => a.y - b.y);

  const crown = new Pix(W, H);
  for (let y = 0; y < 44; y++) {
    for (let x = 0; x < W; x++) {
      let bestZ = -Infinity, v = 0, pal: readonly string[] = LEAF, rim = 0;
      for (const c of clumps) {
        // Lumpy edge: warp the radius with noise so no clump is a circle.
        const warp = 1 + (fbm(x / 2.3, y / 2.3, seed + c.x * 7) - 0.5) * 0.7;
        const dx = (x + 0.5 - c.x) / (c.r * warp);
        const dy = (y + 0.5 - c.y) / (c.r * warp * 0.92);
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const dz = Math.sqrt(1 - d2);
        const z = dz * c.r + c.y * 0.35;
        if (z <= bestZ) continue;
        bestZ = z;
        const lam = Math.max(0, dx * LIGHT3[0] + dy * LIGHT3[1] + dz * LIGHT3[2]);
        v = 0.0 + lam * 0.74 + c.tone + (c.y < crownY ? 0.06 : -0.06);
        rim = d2;
        pal = c.pal;
      }
      if (bestZ === -Infinity) continue;
      // Leaves: chunky 2x2 stipple on top of the lighting.
      const chunk = white(x >> 1, y >> 1, seed + 3);
      v += (chunk - 0.5) * 0.34 + (white(x, y, seed + 4) - 0.5) * 0.16;
      if (white(x, y, seed + 5) < 0.04) v += 0.25;
      // Gaps near clump edges: branches and sky show through.
      if (rim > 0.5 && white(x, y, seed + 6) < 0.34 + (rim - 0.5) * 0.5) continue;
      crown.set(x, y, pick(pal, v, x, y));
    }
  }
  chew(crown, seed + 15, 0.3);
  // Shade cast by the crown on the trunk and branches below it.
  for (let y = 28; y <= 52; y++) {
    for (let x = 0; x < W; x++) {
      if (!trunk.alpha(x, y)) continue;
      let covered = false;
      for (let k = 1; k < 6 && !covered; k++) covered = crown.alpha(x, y - k) > 0;
      if (covered) {
        const i = (y * W + x) * 4;
        for (let c = 0; c < 3; c++) trunk.data[i + c] *= 0.62;
      }
    }
  }

  const phase = rng.next() * Math.PI * 2;
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const shifted = new Pix(W, H);
    for (let y = 0; y < 44; y++) {
      const k = Math.max(0, Math.min(1, (44 - y) / 36));
      const s = Math.sin((f / FRAMES) * Math.PI * 2 + phase + y * 0.05) * 1.1 * (1 + wind * 1.6) + wind * 2.2;
      const shift = Math.round(s * k);
      for (let x = 0; x < W; x++) {
        if (!crown.alpha(x, y)) continue;
        shifted.set(x + shift, y, crown.get(x, y));
      }
    }
    const frame = new Pix(W, H);
    frame.blit(trunk, 0, 0);
    frame.blit(shifted, 0, 0);
    grime(frame, seed, 0.25, H - 3);
    frames.push(selOutline(frame));
  }
  return { frames, ax: cx + 1, ay: baseY + 2, shadow: 30 };
}

/** A dead stump with a split top and fungus; a place to put the axe. */
export function makeStump(seed: number): Prop {
  const p = new Pix(24, 20);
  const cx = 11.5;
  column(p, 8, 16, () => cx, (y) => 5.4 + Math.max(0, y - 13) * 0.9 + (white(y, 0, seed) - 0.5), BARK, seed, 0.25);
  // Cut top: a tilted ellipse with rings.
  polyFill(p, wobble([[5, 8], [10, 5], [17, 6], [19, 9], [14, 11], [7, 11]], seed, 0.6), (x, y) => {
    const d = Math.hypot((x - 12) / 6, (y - 8) / 2.6);
    const ring = Math.sin(d * 9) > 0.3 ? 0.18 : 0;
    return pick(['#6b4c33', '#8a6a46', '#a98860', '#c4a67c'], 0.55 - d * 0.25 + ring + (white(x, y, seed + 3) - 0.5) * 0.2, x, y);
  });
  p.set(11, 5, '#2b1c12'); p.set(12, 6, '#2b1c12');
  mossify(p, seed + 4, 0.8, (_x, y) => (y > 12 ? 1.3 : 0.2));
  const o = selOutline(p);
  bedIn(o, 3, 21, 18, seed);
  return still(o, 12, 18, 16);
}

// --- water details ---------------------------------------------------------

/** Reeds and cattails at the water's edge, swaying out of step with each other. */
export function makeReeds(seed: number, wind = 0): Prop {
  const rng = Rng.fromSeed(seed);
  const W = 26, H = 28;
  const stems = Array.from({ length: 8 }, () => ({
    x: 3 + rng.int(18), h: 12 + rng.int(13), lean: (rng.next() - 0.5) * 3, ph: rng.next() * 6.28, cat: rng.next() < 0.45,
  }));
  const frames: Pix[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const p = new Pix(W, H);
    for (const s of stems) {
      let px = s.x;
      for (let i = 0; i < s.h; i++) {
        const k = i / s.h;
        const x = Math.round(s.x + (s.lean + Math.sin((f / FRAMES) * Math.PI * 2 + s.ph) * (0.9 + wind)) * k * k * 2);
        px = x;
        p.set(x, H - 3 - i, pick(['#2c4a28', '#43692f', '#6a9440', '#93b84d'], 0.4 + k * 0.5 + (white(i, s.x, seed) - 0.5) * 0.3, x, i));
      }
      if (s.cat) {
        for (let k = 0; k < 4; k++) p.set(px, H - 3 - s.h - k, k === 3 ? '#8a6a44' : k % 2 ? '#3b2416' : '#56351e');
        p.set(px - 1, H - 3 - s.h - 1, '#3b2416');
      }
    }
    frames.push(selOutline(p, 0.5));
  }
  return { frames, ax: 14, ay: H - 1, shadow: 0 };
}

/** A few lily pads, one flowering. Flat on the water. */
export function makeLilies(seed: number): Prop {
  const p = new Pix(30, 14);
  const pads: [number, number, number][] = [[7, 7, 4], [18, 5, 3], [22, 9, 3], [13, 10, 2]];
  for (const [cx, cy, r] of pads) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r - 1; x <= r + 1; x++) {
        const d = (x / (r + 1)) ** 2 + (y / (r * 0.6)) ** 2;
        if (d > 1) continue;
        if (x > 0 && Math.abs(y) < 1 && x > r - 2) continue; // the notch
        p.set(cx + x, cy + y, pick(['#1f3d24', '#2f5a30', '#4a7a3a', '#7aa84a'], 0.7 - d * 0.35 - (x + y) * 0.05 + (white(cx + x, cy + y, seed) - 0.5) * 0.2, x, y));
      }
    }
  }
  for (const [x, y, c] of [[7, 6, '#f4f0e2'], [6, 6, '#f4f0e2'], [8, 6, '#f0d8e8'], [7, 5, '#f2d75c'], [7, 7, '#e0b0d0']] as const) p.set(x, y, c);
  return still(selOutline(p, 0.4), 15, 12, 0);
}
