import { Rng } from '../core/rng';
import type { Prop } from './grit';
import { EDGE, TILE_CENTER, TILE_DEPTH, TILE_H, TILE_STEP_Y, TILE_W, inHex, tileOrigin } from './hexTile';
import { type Look, type WorldLight, applyLook, castShadow, contactShadow, drawSmoke } from './look';
import { Pix } from './pix';
import { makeTuft } from './props';
import { type TileArt, type WaterPx, paintTile, paintWater } from './terrain';

export interface VCell extends TileArt {
  col: number;
  row: number;
}

export interface Placed {
  col: number;
  row: number;
  /** Pixel offset from the hex centre. */
  ox?: number;
  oy?: number;
  prop: Prop;
  /** Lets a page find this thing again: tap tests and swapping a house for its inside. */
  id?: string;
}

interface Thing {
  x: number;
  y: number;
  prop: Prop;
  phase: number;
  decor: boolean;
  id?: string;
}

/** Neighbour offsets in an odd-r grid, in the art's edge order: E, NE, NW, W, SW, SE. */
function neighbours(col: number, row: number): [number, number][] {
  return row & 1
    ? [[col + 1, row], [col + 1, row - 1], [col, row - 1], [col - 1, row], [col, row + 1], [col + 1, row + 1]]
    : [[col + 1, row], [col, row - 1], [col - 1, row - 1], [col - 1, row], [col - 1, row + 1], [col, row + 1]];
}

/** Tell each pond hex which neighbours are water too, so the pond is one body of water. */
export function joinLakes(cells: VCell[]): VCell[] {
  const lake = new Set(cells.filter((c) => c.lake).map((c) => `${c.col},${c.row}`));
  return cells.map((c) => (c.lake ? { ...c, waterEdges: neighbours(c.col, c.row).flatMap(([nc, nr], e) => (lake.has(`${nc},${nr}`) ? [e] : [])) } : c));
}

/** A hex diorama with the full look pass: cast shadows, light, smoke, grade. */
export class VillageScene {
  readonly width: number;
  readonly height: number;
  private ground: Pix;
  private water: WaterPx[] = [];
  private things: Thing[] = [];
  private foot: { x: number; y: number }[] = [];

  constructor(cells: VCell[], placed: Placed[], opts: { padTop?: number; padSide?: number; seed?: number; tufts?: boolean } = {}) {
    const padTop = opts.padTop ?? 40;
    const padSide = opts.padSide ?? 10;
    const cols = Math.max(...cells.map((c) => c.col + (c.row & 1 ? 1.5 : 1)));
    const rows = Math.max(...cells.map((c) => c.row)) + 1;
    this.width = Math.ceil(cols * TILE_W) + padSide * 2;
    this.height = padTop + (rows - 1) * TILE_STEP_Y + TILE_H + TILE_DEPTH + 6;
    this.ground = new Pix(this.width, this.height);
    cells = joinLakes(cells);
    const rng = Rng.fromSeed(opts.seed ?? 3);
    const occupied = new Set(placed.map((p) => `${p.col},${p.row}`));
    const centre = (col: number, row: number): { x: number; y: number } => {
      const o = tileOrigin(col, row);
      return { x: o.x + padSide + TILE_CENTER.x, y: o.y + padTop + TILE_CENTER.y };
    };

    for (const cell of [...cells].sort((a, b) => a.row - b.row || a.col - b.col)) {
      const o = tileOrigin(cell.col, cell.row);
      paintTile(this.ground, o.x + padSide, o.y + padTop, cell, this.water);
      if ((opts.tufts ?? true) && !cell.river && !cell.pond && !occupied.has(`${cell.col},${cell.row}`)) {
        const c = centre(cell.col, cell.row);
        const n = cell.ground === 'tallgrass' ? 6 : cell.ground === 'grass' && rng.next() < 0.45 ? 1 : 0;
        for (let i = 0; i < n; i++) {
          this.things.push({ x: c.x - 10 + rng.int(20), y: c.y - 6 + rng.int(13), prop: makeTuft(rng.int(1e6)) as Prop, phase: rng.int(8), decor: true });
        }
      }
    }
    for (const pl of placed) {
      const fp = pl.prop.footprint;
      if (fp) {
        // Front-centre anchor: the footprint reaches back (up) by its depth and spreads across.
        for (let r = pl.row - fp.rows + 1; r <= pl.row; r++) {
          for (let c = pl.col - Math.floor((fp.cols - 1) / 2); c < pl.col - Math.floor((fp.cols - 1) / 2) + fp.cols; c++) {
            const o = tileOrigin(c, r);
            this.foot.push({ x: o.x + padSide, y: o.y + padTop });
          }
        }
      }
      const c = centre(pl.col, pl.row);
      this.things.push({ x: c.x + (pl.ox ?? 0), y: c.y + 2 + (pl.oy ?? 0), prop: pl.prop, phase: rng.int(8), decor: false, id: pl.id });
    }
    this.things.sort((a, b) => a.y - b.y);
  }

  /** The id of the frontmost placed thing with a visible pixel at this world point. */
  hit(wx: number, wy: number): string | undefined {
    for (let i = this.things.length - 1; i >= 0; i--) {
      const th = this.things[i];
      if (!th.id) continue;
      const f = th.prop.frames[0];
      const sx = Math.floor(wx - (th.x - th.prop.ax)), sy = Math.floor(wy - (th.y - th.prop.ay));
      // A few pixels of slack, so a thin person is easy to hit with a finger.
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (f.alpha(sx + dx, sy + dy) > 40) return th.id;
    }
    return undefined;
  }

  /** Where a placed thing stands, in world pixels (its anchor). */
  where(id: string): { x: number; y: number } | undefined {
    const th = this.things.find((t) => t.id === id);
    return th && { x: th.x, y: th.y };
  }

  /** Swap what a placed thing looks like (a house for its inside) without rebuilding the ground. */
  swap(id: string, prop: Prop): void {
    const th = this.things.find((t) => t.id === id);
    if (th) th.prop = prop;
  }

  render(t: number, look: Look, showFootprints = false): Pix {
    const out = new Pix(this.width, this.height);
    out.data.set(this.ground.data);
    paintWater(out, this.water, t);
    if (showFootprints) {
      for (const f of this.foot) {
        for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
          if (!inHex(x, y)) continue;
          const e = EDGE[y][x];
          if (e <= 2) out.set(f.x + x, f.y + y, e === 1 ? '#46d2ffd0' : '#46d2ff50');
          else out.set(f.x + x, f.y + y, '#46d2ff18');
        }
      }
    }

    const frameOf = (th: Thing): Pix => th.prop.frames[(t + th.phase) % th.prop.frames.length];
    for (const th of this.things) {
      if (th.decor || !th.prop.shadow) continue;
      castShadow(out, frameOf(th), th.prop.ax, th.prop.ay, th.x, th.y, look.shadow);
      contactShadow(out, th.x + 1, th.y, th.prop.shadow / 2.2, Math.max(1.5, th.prop.shadow / 8), look.shadow * 0.9);
    }
    const lights: WorldLight[] = [];
    for (const th of this.things) {
      out.blit(frameOf(th), th.x - th.prop.ax, th.y - th.prop.ay);
      for (const l of th.prop.lights ?? []) lights.push({ ...l, x: th.x + l.dx, y: th.y + l.dy });
    }
    for (const th of this.things) {
      for (const s of th.prop.smoke ?? []) drawSmoke(out, th.x + s.dx, th.y + s.dy, t + th.phase * 3);
    }
    applyLook(out, t, look, lights);
    return out;
  }
}
