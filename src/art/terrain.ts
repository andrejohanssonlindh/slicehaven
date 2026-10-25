import { BOTTOM, EDGE, EDGE_MID, TILE_CENTER, TILE_DEPTH, TILE_H, TILE_W, inHex } from './hexTile';
import { fbm, white } from './noise';
import { OUTLINE, P } from './palette';
import { type Pix, ramp } from './pix';

export type Ground = 'grass' | 'forest' | 'path' | 'tallgrass' | 'flowers';

export interface TileArt {
  ground: Ground;
  /** River through this hex, entering and leaving through these edges (0 E .. 5 SE). */
  river?: [number, number];
  pond?: boolean;
  /** Impassable: drawn with a red border. */
  obstacle?: boolean;
  /** Burnt ground: ash and soot. */
  scorched?: boolean;
}

const ASH = ['#141011', '#231c1c', '#352b29', '#4a3e3a', '#5e524c'];

/** A water pixel, redrawn every frame for the flow animation. */
export interface WaterPx {
  x: number;
  y: number;
  depth: number; // 0 at the bank, 1 in the middle
  fx: number; // flow direction
  fy: number;
}

function grassColor(wx: number, wy: number, y: number, bias = 0): string {
  // A blade: bright pixel, with a dark pixel under it.
  if (white(wx, wy, 3) < 0.07) return P.grass[4];
  if (white(wx, wy - 1, 3) < 0.07) return P.grass[1];
  const n = fbm(wx / 18, wy / 12, 1);
  const v = 0.2 + n * 0.6 + (white(wx, wy, 1) - 0.5) * 0.2 + (0.5 - y / TILE_H) * 0.12 + bias;
  return ramp(P.grass.slice(1, 5), v, wx, wy);
}

function groundColor(ground: Ground, wx: number, wy: number, x: number, y: number): string {
  switch (ground) {
    case 'grass':
      return grassColor(wx, wy, y);
    case 'tallgrass':
      return grassColor(wx, wy, y, -0.18);
    case 'flowers': {
      const w = white(wx, wy, 11);
      if (w < 0.045) return P.flower[Math.floor(white(wx, wy, 12) * 4)];
      if (white(wx, wy - 1, 11) < 0.045) return P.grass[1];
      return grassColor(wx, wy, y, 0.05);
    }
    case 'forest': {
      const m = fbm(wx / 10, wy / 7, 2);
      if (m > 0.55) {
        return ramp(P.moss, (m - 0.55) * 2.2 + (white(wx, wy, 4) - 0.5) * 0.3 + 0.25, wx, wy);
      }
      if (white(wx, wy, 5) < 0.13) return P.leaf[Math.floor(white(wx, wy, 6) * 4)];
      return ramp(P.floor.slice(1), 0.25 + fbm(wx / 6, wy / 4, 7) * 0.5 + (white(wx, wy, 8) - 0.5) * 0.25, wx, wy);
    }
    case 'path': {
      // Grass creeps in at the edges of the path.
      const e = EDGE[y][x];
      if (e <= 3 && fbm(wx / 4, wy / 3, 13) > 0.35 + e * 0.12) return grassColor(wx, wy, y);
      if (white(wx, wy, 9) < 0.04) return P.stone[4];
      if (white(wx, wy - 1, 9) < 0.04) return P.dirt[1];
      return ramp(P.dirt.slice(2, 6), 0.2 + fbm(wx / 8, wy / 5, 10) * 0.55 + (white(wx, wy, 10) - 0.5) * 0.2, wx, wy);
    }
  }
}

/** Distance from (px,py) to the river's centre curve, plus flow direction there. */
function riverDistance(px: number, py: number, a: number, b: number): { d: number; fx: number; fy: number } {
  const A = EDGE_MID[a];
  const B = EDGE_MID[b];
  const C = TILE_CENTER;
  let best = Infinity;
  let fx = 0;
  let fy = 0;
  const STEPS = 24;
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const u = 1 - t;
    const x = u * u * A.x + 2 * u * t * C.x + t * t * B.x;
    const y = u * u * A.y + 2 * u * t * C.y + t * t * B.y;
    const d = Math.hypot(px - x, py - y);
    if (d < best) {
      best = d;
      fx = 2 * u * (C.x - A.x) + 2 * t * (B.x - C.x);
      fy = 2 * u * (C.y - A.y) + 2 * t * (B.y - C.y);
    }
  }
  const len = Math.hypot(fx, fy) || 1;
  return { d: best, fx: fx / len, fy: fy / len };
}

/**
 * Paint a tile's side face and top face into `buf` at (ox, oy).
 * Water pixels are recorded in `water` (world coords) for animation.
 */
export function paintTile(buf: Pix, ox: number, oy: number, art: TileArt, water: WaterPx[]): void {
  // Side face first, so the top face overlaps its first row.
  for (let x = 0; x < TILE_W; x++) {
    const yb = BOTTOM[x];
    if (yb < 0) continue;
    for (let k = 1; k <= TILE_DEPTH; k++) {
      const wx = ox + x;
      const wy = oy + yb + k;
      let c: string;
      if (k === 1) c = art.ground === 'path' ? P.dirt[1] : P.grass[0];
      else if (white(wx, wy, 20) < 0.06) c = P.stone[2];
      else c = ramp(P.sideEarth, 1 - k / TILE_DEPTH + (fbm(wx / 3, wy / 2, 21) - 0.5) * 0.5, wx, wy);
      buf.set(wx, wy, c);
    }
    buf.set(ox + x, oy + yb + TILE_DEPTH + 1, OUTLINE + '80');
  }

  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inHex(x, y)) continue;
      const wx = ox + x;
      const wy = oy + y;
      let c = groundColor(art.ground, wx, wy, x, y);

      if (art.river || art.pond) {
        let d: number;
        let hw: number;
        let fx = 1;
        let fy = 0;
        if (art.river) {
          const r = riverDistance(x + 0.5, y + 0.5, art.river[0], art.river[1]);
          ({ d, fx, fy } = r);
          hw = 4.4 + (fbm(wx / 9, wy / 9, 5) - 0.5) * 2.4;
        } else {
          // Roundish pond, squashed like the board.
          d = Math.hypot(x + 0.5 - TILE_CENTER.x, (y + 0.5 - TILE_CENTER.y) * 1.25);
          hw = 10.5 + (fbm(wx / 5, wy / 5, 5) - 0.5) * 4;
          fy = 0.2;
        }
        const bank = hw + 1.6 + fbm(wx / 3, wy / 3, 6) * 1.2;
        if (d < hw) {
          water.push({ x: wx, y: wy, depth: 1 - d / hw, fx, fy });
          c = P.water[2];
        } else if (d < hw + 0.9) {
          c = P.dirt[1];
        } else if (d < bank) {
          c = ramp(P.dirt.slice(2, 5), (bank - d) / 2.5 + (white(wx, wy, 14) - 0.5) * 0.4, wx, wy);
        }
      }
      if (art.scorched && !art.river && !art.pond) {
        const n = fbm(wx / 4, wy / 3, 30);
        if (n > 0.3 || EDGE[y][x] > 4) {
          c = white(wx, wy, 31) < 0.03 ? '#c43a2e' : ramp(ASH, n * 0.9 + (white(wx, wy, 32) - 0.5) * 0.3, wx, wy);
        }
      }
      buf.set(wx, wy, c);

      // Bevel: lit top-left rim, shaded bottom-right rim. Reads as a raised tile and a grid line.
      const e = EDGE[y][x];
      if (art.obstacle) {
        if (e === 1) buf.set(wx, wy, P.danger[1]);
        else if (e === 2) buf.set(wx, wy, P.danger[3]);
        else if (e === 3) buf.set(wx, wy, P.danger[2] + '60');
      } else if (e === 1) {
        const topLeft = !inHex(x - 1, y) || !inHex(x, y - 1);
        buf.set(wx, wy, topLeft ? '#ffffff30' : OUTLINE + '70');
      }
    }
  }
}

/** Draw animated water pixels for frame `t`. */
export function paintWater(buf: Pix, water: readonly WaterPx[], t: number): void {
  for (const w of water) {
    const along = w.x * w.fx + w.y * w.fy;
    const across = -w.x * w.fy + w.y * w.fx;
    const n = fbm((along - t * 1.2) / 7, across / 2.2, 9, 2);
    let v = 0.18 + 0.3 * (1 - w.depth) + (fbm(w.x / 5, w.y / 5, 15) - 0.5) * 0.15;
    if (n > 0.62) v += 0.22;
    if (n > 0.72) v += 0.25;
    let c = ramp(P.water.slice(0, 6), v, w.x, w.y);
    if (w.depth < 0.22 && white(w.x, w.y, Math.floor(t / 2)) < 0.3) c = P.water[5];
    if (n > 0.8 && white(w.x, w.y, t) < 0.5) c = P.water[6];
    buf.set(w.x, w.y, c);
  }
}
