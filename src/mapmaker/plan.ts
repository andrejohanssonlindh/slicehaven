import { CHUNK } from '../core/world3d/chunks';
import type { CompiledMap, MapSpec } from '../core/world3d/mapgen';
import type { Pick } from '../core/world3d/mapedit';
import type { PlacedProp } from '../core/world3d/props';
import type { Shape } from '../core/world3d/space';
import type { XZ } from '../core/world3d/terrain';
import type { Things } from '../core/world3d/things';

/**
 * The map seen from above (plan C5): drawn from the compiled map, so what is shown is what the game builds. North
 * (−z) is up. Things made by rules are drawn plain; what is placed by hand gets a light ring (it can be picked).
 */

export interface View {
  /** The world spot at the middle of the canvas. */
  cx: number;
  cz: number;
  /** Pixels (CSS) a metre. */
  scale: number;
}

export interface PlanState {
  spec: MapSpec;
  map: CompiledMap;
  things: Things;
  pick: Pick | null;
  /** A thing being dragged: drawn here instead. */
  drag?: { pick: Pick; to: XZ } | null;
}

const ROOF: Record<string, string> = { thatch: '#b89a52', shingle: '#6e5a48', tile: '#a5553a', sod: '#5f7a3a' };
const WATER = '#3d6f8f', ROAD = '#9c8461', MUD = '#6b5236', GRASS = '#46633a', OUTSIDE = '#1c2a18';

/** A colour for a kind of thing, from what it is a kind of. */
function colourOf(things: Things, kind: string): string {
  if (!things.has(kind)) return '#ff3fa0';
  const t = things.get(kind);
  const c = t.chain;
  if (c.includes('tree')) return '#24451f';
  if (t.flame || c.includes('fire')) return '#e8853a';
  if (c.includes('weapon') || c.includes('shield')) return '#c9d2dc';
  if (c.includes('rock') || c.includes('boulder') || c.includes('pillar')) return '#8d8a84';
  if (c.includes('shrub') || c.includes('plant')) return '#3a6a2c';
  if (c.includes('wall') || c.includes('fence') || c.includes('palisade')) return '#7a5a3a';
  if (c.includes('well') || c.includes('water')) return WATER;
  return '#c7a46a';
}

export class Plan {
  view: View = { cx: 0, cz: 0, scale: 4 };
  private readonly ctx: CanvasRenderingContext2D;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  get w(): number { return this.canvas.clientWidth; }
  get h(): number { return this.canvas.clientHeight; }

  /** World spot under a canvas point (CSS pixels). */
  toWorld(px: number, py: number): XZ {
    return [this.view.cx + (px - this.w / 2) / this.view.scale, this.view.cz + (py - this.h / 2) / this.view.scale];
  }

  toScreen(x: number, z: number): [number, number] {
    return [(x - this.view.cx) * this.view.scale + this.w / 2, (z - this.view.cz) * this.view.scale + this.h / 2];
  }

  /** Show the whole map. */
  fit(size: number): void {
    this.view = { cx: 0, cz: 0, scale: Math.max(0.5, Math.min(this.w, this.h) / (size * 1.04)) };
  }

  zoomAt(px: number, py: number, factor: number): void {
    const [x, z] = this.toWorld(px, py);
    this.view.scale = Math.min(80, Math.max(0.3, this.view.scale * factor));
    const [x2, z2] = this.toWorld(px, py);
    this.view.cx += x - x2;
    this.view.cz += z - z2;
  }

  draw(s: PlanState): void {
    const dpr = window.devicePixelRatio || 1;
    const W = Math.round(this.w * dpr), H = Math.round(this.h * dpr);
    if (this.canvas.width !== W || this.canvas.height !== H) [this.canvas.width, this.canvas.height] = [W, H];
    const g = this.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = OUTSIDE;
    g.fillRect(0, 0, W, H);
    // World to canvas: one transform, so everything below is drawn in metres.
    const k = this.view.scale * dpr;
    g.setTransform(k, 0, 0, k, (this.w / 2 - this.view.cx * this.view.scale) * dpr, (this.h / 2 - this.view.cz * this.view.scale) * dpr);
    const px = 1 / this.view.scale; // one CSS pixel, in metres
    const half = s.map.ground.size / 2;
    const ground = s.map.ground;

    g.fillStyle = GRASS;
    g.fillRect(-half, -half, half * 2, half * 2);
    this.grid(g, half, px);
    for (const m of ground.mud ?? []) this.disc(g, m.x, m.z, m.r, MUD, 0.55);
    if (ground.lake) this.disc(g, ground.lake.x, ground.lake.z, ground.lake.r, WATER, 1);
    for (const r of ground.rivers ?? []) this.line(g, r.pts, r.width, WATER);
    for (const r of ground.roads) this.line(g, r.pts, r.width, ROAD);

    // Everything standing, chunk by chunk over what is in view (wild woods included).
    const [x0, z0] = this.toWorld(0, 0), [x1, z1] = this.toWorld(this.w, this.h);
    const i0 = Math.floor(Math.max(-half, x0) / CHUNK), i1 = Math.floor(Math.min(half - 0.01, x1) / CHUNK);
    const j0 = Math.floor(Math.max(-half, z0) / CHUNK), j1 = Math.floor(Math.min(half - 0.01, z1) / CHUNK);
    const trees: PlacedProp[] = [], props: PlacedProp[] = [];
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const c = s.map.placed.chunk(i, j);
      for (const t of c.trees) trees.push({ kind: t.kind ?? 'oak', x: t.x, z: t.z, seed: t.seed });
      props.push(...c.props);
    }
    const dragging = s.drag ? this.spotOf(s, s.drag.pick) : null;
    const hidden = (p: { x: number; z: number }): boolean => !!dragging && Math.abs(p.x - dragging[0]) < 0.01 && Math.abs(p.z - dragging[1]) < 0.01;
    for (const p of props) if (!hidden(p)) this.thing(g, s.things, p, px);
    for (const t of trees) if (!hidden(t)) this.disc(g, t.x, t.z, 1.6, colourOf(s.things, t.kind), 0.85);

    // Houses: the footprint in the roof's colour, the door side marked.
    for (const h of s.map.layout.houses) {
      const moving = s.drag?.pick.list === 'houses' && s.spec.houses?.[s.drag.pick.i]?.id === h.id;
      const [x, z] = moving ? s.drag!.to : [h.x, h.z];
      g.save();
      g.translate(x, z);
      g.rotate(-h.rot);
      const hw = h.spec.width / 2, hd = h.spec.depth / 2;
      g.fillStyle = ROOF[h.spec.roof ?? 'thatch'] ?? '#888';
      g.fillRect(-hw, -hd, hw * 2, hd * 2);
      g.strokeStyle = '#2a1e16';
      g.lineWidth = px * 1.5;
      g.strokeRect(-hw, -hd, hw * 2, hd * 2);
      g.beginPath(); // the ridge
      g.moveTo(-hw, 0); g.lineTo(hw, 0);
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.stroke();
      g.fillStyle = '#2a1e16'; // the door, on the front (+z)
      g.fillRect(-0.6, hd - 0.1, 1.2, 0.5);
      g.restore();
      if (this.view.scale > 3) this.label(g, x, z, h.id, px, '#f4ead2');
    }

    // Who lives here, where they start; named places; the hero's start.
    for (const c of s.map.cast) this.disc(g, c.start[0], c.start[1], Math.max(0.45, px * 3), '#e2c2ff', 1);
    for (const [name, p] of Object.entries(s.map.places)) {
      if (p.kind !== 'spot') continue;
      this.cross(g, p.x, p.z, px * 5, '#e2c2ff', px);
      if (this.view.scale > 5) this.label(g, p.x, p.z + px * 10, name, px, '#e2c2ff');
    }
    this.star(g, s.map.hero[0], s.map.hero[1], Math.max(0.8, px * 7), px);

    // What is placed by hand: a light ring, so it is seen to be pickable.
    const ring = (p: Pick, r: number): void => {
      const at = this.spotOf(s, p);
      if (!at) return;
      g.beginPath();
      g.arc(at[0], at[1], r, 0, Math.PI * 2);
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = px * 1.2;
      g.stroke();
    };
    (s.spec.props ?? []).forEach((_, i) => ring({ list: 'props', i }, Math.max(0.6, px * 6)));
    (s.spec.trees ?? []).forEach((_, i) => ring({ list: 'trees', i }, Math.max(1.8, px * 6)));
    if (dragging && s.drag && s.drag.pick.list !== 'houses' && s.drag.pick.list !== 'notes') {
      const p = s.drag.pick.list === 'props' ? s.spec.props?.[s.drag.pick.i] : null;
      const t = s.drag.pick.list === 'trees' ? s.spec.trees?.[s.drag.pick.i] : null;
      if (p) this.thing(g, s.things, { ...p, x: s.drag.to[0], z: s.drag.to[1] }, px);
      if (t) this.disc(g, s.drag.to[0], s.drag.to[1], 1.6, colourOf(s.things, t.kind ?? 'oak'), 0.85);
    }

    // Notes: a pin with its number, a dashed ring for its area; done ones greyed.
    (s.spec.notes ?? []).forEach((n, i) => {
      const at = s.drag?.pick.list === 'notes' && s.drag.pick.i === i ? s.drag.to : n.at;
      const c = n.done ? '#9a9a9a' : n.by === 'claude' ? '#7fd4ff' : '#ffd84a';
      if (n.r) {
        g.beginPath();
        g.arc(at[0], at[1], n.r, 0, Math.PI * 2);
        g.setLineDash([px * 6, px * 4]);
        g.strokeStyle = c;
        g.lineWidth = px * 2;
        g.stroke();
        g.setLineDash([]);
      }
      const r = Math.max(0.5, px * 9);
      this.disc(g, at[0], at[1], r, c, 1);
      g.lineWidth = px * 1.5;
      g.strokeStyle = '#1a1420';
      g.stroke();
      g.fillStyle = '#1a1420';
      g.font = `bold ${px * 11}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(i + 1), at[0], at[1] + px * 0.5);
    });

    // What is picked.
    if (s.pick) {
      const at = s.drag?.pick === s.pick ? s.drag.to : this.spotOf(s, s.pick);
      if (at) {
        g.beginPath();
        g.arc(at[0], at[1], Math.max(1.2, px * 14), 0, Math.PI * 2);
        g.strokeStyle = '#d9a441';
        g.lineWidth = px * 3;
        g.stroke();
      }
    }
    this.scaleBar(g, dpr);
  }

  /** Where a picked thing stands in the compiled map (a house placed by road: where it was built). */
  spotOf(s: PlanState, p: Pick): XZ | null {
    if (p.list === 'notes') return s.spec.notes?.[p.i]?.at ?? null;
    if (p.list === 'houses') {
      const id = s.spec.houses?.[p.i]?.id;
      const b = s.map.layout.houses.find((h) => h.id === id);
      return b ? [b.x, b.z] : null;
    }
    const t = s.spec[p.list]?.[p.i];
    return t ? [t.x, t.z] : null;
  }

  private thing(g: CanvasRenderingContext2D, things: Things, p: PlacedProp, px: number): void {
    const colour = colourOf(things, p.kind);
    let shapes: Shape[] = [];
    try {
      shapes = things.has(p.kind) ? things.shapes(p) : [];
    } catch {
      shapes = [];
    }
    if (!shapes.length) return this.disc(g, p.x, p.z, Math.max(0.3, px * 3), colour, 1);
    for (const sh of shapes) {
      if (sh.kind === 'circle') this.disc(g, sh.x, sh.z, Math.max(sh.r, px * 2), colour, 1);
      else {
        g.save();
        g.translate(sh.x, sh.z);
        g.rotate(-sh.rot);
        g.fillStyle = colour;
        g.fillRect(-sh.hw, -sh.hd, Math.max(sh.hw * 2, px * 2), Math.max(sh.hd * 2, px * 2));
        g.restore();
      }
    }
  }

  private disc(g: CanvasRenderingContext2D, x: number, z: number, r: number, colour: string, alpha: number): void {
    g.globalAlpha = alpha;
    g.beginPath();
    g.arc(x, z, r, 0, Math.PI * 2);
    g.fillStyle = colour;
    g.fill();
    g.globalAlpha = 1;
  }

  private line(g: CanvasRenderingContext2D, pts: XZ[], width: number, colour: string): void {
    if (pts.length < 2) return;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = width;
    g.strokeStyle = colour;
    g.stroke();
  }

  private cross(g: CanvasRenderingContext2D, x: number, z: number, r: number, colour: string, px: number): void {
    g.beginPath();
    g.moveTo(x - r, z - r); g.lineTo(x + r, z + r);
    g.moveTo(x + r, z - r); g.lineTo(x - r, z + r);
    g.strokeStyle = colour;
    g.lineWidth = px * 2;
    g.stroke();
  }

  private star(g: CanvasRenderingContext2D, x: number, z: number, r: number, px: number): void {
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r;
      g.lineTo(x + Math.cos(a) * rr, z + Math.sin(a) * rr);
    }
    g.closePath();
    g.fillStyle = '#ffe9a0';
    g.fill();
    g.strokeStyle = '#1a1420';
    g.lineWidth = px;
    g.stroke();
  }

  private label(g: CanvasRenderingContext2D, x: number, z: number, text: string, px: number, colour: string): void {
    g.font = `${px * 11}px sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = px * 3;
    g.strokeStyle = 'rgba(20,14,26,0.8)';
    g.strokeText(text, x, z);
    g.fillStyle = colour;
    g.fillText(text, x, z);
  }

  /** Faint lines every 10 m (every 50 m when far out). */
  private grid(g: CanvasRenderingContext2D, half: number, px: number): void {
    const step = this.view.scale < 1.5 ? 50 : 10;
    g.beginPath();
    for (let v = Math.ceil(-half / step) * step; v <= half; v += step) {
      g.moveTo(v, -half); g.lineTo(v, half);
      g.moveTo(-half, v); g.lineTo(half, v);
    }
    g.strokeStyle = 'rgba(255,255,255,0.07)';
    g.lineWidth = px;
    g.stroke();
  }

  private scaleBar(g: CanvasRenderingContext2D, dpr: number): void {
    const metres = [1, 2, 5, 10, 20, 50, 100].find((m) => m * this.view.scale >= 60) ?? 100;
    const len = metres * this.view.scale;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const x = 10, y = this.h - 14;
    g.fillStyle = 'rgba(20,14,26,0.7)';
    g.fillRect(x - 4, y - 14, len + 44, 22);
    g.fillStyle = '#f0e6d2';
    g.fillRect(x, y, len, 3);
    g.font = '12px sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillText(`${metres} m`, x + len + 6, y + 5);
  }
}
