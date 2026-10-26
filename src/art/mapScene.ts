import { Rng } from '../core/rng';
import { TILE_CENTER, TILE_DEPTH, TILE_H, TILE_STEP_Y, TILE_W, tileOrigin } from './hexTile';
import { makeGuard, makeShepherd, makeRat, makeSkeleton, makeVillager, makeWolf } from './mobs';
import { SHADOW } from './palette';
import { Pix } from './pix';
import {
  type Sprite, makeMushrooms, makePine, makeRock, makeThicket, makeTree, makeTuft,
} from './props';
import { type TileArt, type WaterPx, paintTile, paintWater } from './terrain';

export type PropKind = 'tree' | 'pine' | 'rock' | 'thicket' | 'mushrooms';
export type MobKind = 'shepherd' | 'rat' | 'wolf' | 'skeleton' | 'guard' | 'villager';

export interface CellArt extends TileArt {
  col: number;
  row: number;
  prop?: PropKind;
  mob?: MobKind;
  /** Draw a gold "selected" ring on this hex. */
  selected?: boolean;
}

interface Thing {
  x: number; // world position of the anchor (feet)
  y: number;
  sprite: Sprite;
  phase: number;
}

const MOB_MAKERS: Record<MobKind, () => Sprite> = {
  shepherd: makeShepherd, rat: makeRat, wolf: makeWolf, skeleton: makeSkeleton, guard: makeGuard,
  villager: () => makeVillager('tinker', 'stick'),
};

/** Renders a little hex diorama: static ground once, then water + sprites per frame. */
export class MapScene {
  readonly width: number;
  readonly height: number;
  private ground: Pix;
  private water: WaterPx[] = [];
  private things: Thing[] = [];
  private rings: { x: number; y: number }[] = [];

  constructor(cells: CellArt[], opts: { padTop?: number; padSide?: number; seed?: number } = {}) {
    const padTop = opts.padTop ?? 26;
    const padSide = opts.padSide ?? 2;
    const cols = Math.max(...cells.map((c) => c.col + (c.row & 1 ? 1.5 : 1)));
    const rows = Math.max(...cells.map((c) => c.row)) + 1;
    this.width = Math.ceil(cols * TILE_W) + padSide * 2;
    this.height = padTop + (rows - 1) * TILE_STEP_Y + TILE_H + TILE_DEPTH + 2;
    this.ground = new Pix(this.width, this.height);
    const rng = Rng.fromSeed(opts.seed ?? 7);

    const sorted = [...cells].sort((a, b) => a.row - b.row || a.col - b.col);
    for (const cell of sorted) {
      const o = tileOrigin(cell.col, cell.row);
      const ox = o.x + padSide;
      const oy = o.y + padTop;
      paintTile(this.ground, ox, oy, cell, this.water);
      const cx = ox + TILE_CENTER.x;
      const cy = oy + TILE_CENTER.y;

      if (cell.ground === 'tallgrass') {
        for (let i = 0; i < 6; i++) {
          this.add(cx - 10 + rng.int(20), cy - 6 + rng.int(13), makeTuft(rng.int(1e6)), rng);
        }
      } else if (cell.ground === 'grass' && !cell.river && !cell.pond && !cell.mob && rng.next() < 0.5) {
        this.add(cx - 9 + rng.int(18), cy - 5 + rng.int(10), makeTuft(rng.int(1e6)), rng);
      }
      if (cell.prop) {
        const seed = rng.int(1e6);
        const s = {
          tree: () => makeTree(seed), pine: () => makePine(seed), rock: () => makeRock(seed),
          thicket: () => makeThicket(seed), mushrooms: () => makeMushrooms(),
        }[cell.prop]();
        this.add(cx, cy + 2, s, rng);
      }
      if (cell.mob) this.add(cx, cy + 1, MOB_MAKERS[cell.mob](), rng);
      if (cell.selected) this.rings.push({ x: cx, y: cy + 1 });
    }
  }

  private add(x: number, y: number, sprite: Sprite, rng: Rng): void {
    this.things.push({ x, y, sprite, phase: rng.int(8) });
  }

  /** Render animation frame `t` (an integer that increases ~8 times per second). */
  render(t: number): Pix {
    const out = new Pix(this.width, this.height);
    out.data.set(this.ground.data);
    paintWater(out, this.water, t);

    for (const r of this.rings) ellipse(out, r.x, r.y, 11, 5, t % 8 < 4 ? '#f2c94ccc' : '#f2c94c88', true);
    for (const th of this.things) {
      if (th.sprite.shadow) {
        // Light from the top-left: shadows fall slightly to the right.
        ellipse(out, th.x + 2, th.y, th.sprite.shadow / 2, Math.max(2, th.sprite.shadow / 6), SHADOW, false);
      }
    }
    const drawOrder = [...this.things].sort((a, b) => a.y - b.y);
    for (const th of drawOrder) {
      const f = th.sprite.frames[(t + th.phase) % th.sprite.frames.length];
      out.blit(f, th.x - th.sprite.ax, th.y - th.sprite.ay);
    }
    return out;
  }
}

function ellipse(p: Pix, cx: number, cy: number, rx: number, ry: number, color: string, ringOnly: boolean): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (d > 1) continue;
      if (ringOnly && d < 0.55) continue;
      p.set(x, y, color);
    }
  }
}
