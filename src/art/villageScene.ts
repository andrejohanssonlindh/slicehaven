import { Rng } from '../core/rng';
import type { Prop } from './grit';
import { TILE_CENTER, TILE_DEPTH, TILE_H, TILE_STEP_Y, TILE_W, tileOrigin } from './hexTile';
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
}

interface Thing {
  x: number;
  y: number;
  prop: Prop;
  phase: number;
  decor: boolean;
}

/** A hex diorama with the full look pass: cast shadows, light, smoke, grade. */
export class VillageScene {
  readonly width: number;
  readonly height: number;
  private ground: Pix;
  private water: WaterPx[] = [];
  private things: Thing[] = [];

  constructor(cells: VCell[], placed: Placed[], opts: { padTop?: number; padSide?: number; seed?: number; tufts?: boolean } = {}) {
    const padTop = opts.padTop ?? 40;
    const padSide = opts.padSide ?? 10;
    const cols = Math.max(...cells.map((c) => c.col + (c.row & 1 ? 1.5 : 1)));
    const rows = Math.max(...cells.map((c) => c.row)) + 1;
    this.width = Math.ceil(cols * TILE_W) + padSide * 2;
    this.height = padTop + (rows - 1) * TILE_STEP_Y + TILE_H + TILE_DEPTH + 6;
    this.ground = new Pix(this.width, this.height);
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
      const c = centre(pl.col, pl.row);
      this.things.push({ x: c.x + (pl.ox ?? 0), y: c.y + 2 + (pl.oy ?? 0), prop: pl.prop, phase: rng.int(8), decor: false });
    }
    this.things.sort((a, b) => a.y - b.y);
  }

  render(t: number, look: Look): Pix {
    const out = new Pix(this.width, this.height);
    out.data.set(this.ground.data);
    paintWater(out, this.water, t);

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
