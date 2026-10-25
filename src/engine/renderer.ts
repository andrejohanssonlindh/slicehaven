import type { Battle, Unit } from '../core/battle';
import { type Hex, hexKey, hexToOffset, offsetToHex } from '../core/hex';
import { Rng } from '../core/rng';
import { EDGE, TILE_CENTER, TILE_DEPTH, TILE_H, TILE_STEP_Y, TILE_W, inHex, tileOrigin } from '../art/hexTile';
import type { MobKind } from '../art/mapScene';
import { makeRat, makeShepherd, makeSkeleton, makeWolf } from '../art/mobs';
import { SHADOW } from '../art/palette';
import { Pix } from '../art/pix';
import {
  FRAMES, type Sprite, charred, makeMushrooms, makePine, makeRock, makeStones, makeThicket, makeTree, makeTuft,
} from '../art/props';
import { type WaterPx, paintTile, paintWater } from '../art/terrain';
import { STATS, type SandboxCell } from '../content/sandbox';
import type { Effects } from './effects';
import { type Light, Lighting } from './lighting';
import type { Weather } from './weather';

export type HighlightStyle = 'reach' | 'path' | 'jump' | 'foe' | 'ally' | 'tool';

export interface Highlight {
  at: Hex;
  style: HighlightStyle;
}

const HL: Record<HighlightStyle, { fill: string; edge: string }> = {
  reach: { fill: '#f2c94c30', edge: '#f2c94cb0' },
  path: { fill: '#f2c94c80', edge: '#fff2a0' },
  jump: { fill: '#8fe0d040', edge: '#8fe0d0d0' },
  foe: { fill: '#ef6a4840', edge: '#ef6a48' },
  ally: { fill: '#9fe07040', edge: '#9fe070' },
  tool: { fill: '#f2a24a30', edge: '#f2a24aa0' },
};

const PAD_TOP = 34;
const PAD_SIDE = 6;
const STEP_MS = 140;

interface CellVis {
  art: SandboxCell;
  ox: number;
  oy: number;
  cx: number;
  cy: number;
}

interface WindSprite {
  x: number;
  y: number;
  cell: string;
  make: (wind: number) => Sprite;
  sets: Map<number, Sprite>;
  burnt?: Sprite;
  phase: number;
  /** Props stay (as charred); tufts disappear when burnt. */
  survivesFire: boolean;
}

interface UnitAnim {
  points: { x: number; y: number }[];
  start: number;
  duration: number;
  arc: number; // jump height (0 = walk hops)
  resolve: () => void;
}

interface UnitVis {
  x: number;
  y: number;
  flip: boolean;
  flashUntil: number;
  dyingSince?: number;
  anim?: UnitAnim;
  lunge?: { dx: number; dy: number; start: number };
}

const FACES_LEFT: Partial<Record<MobKind, boolean>> = { wolf: true, rat: true };

export class Renderer {
  readonly width: number;
  readonly height: number;
  private cells = new Map<string, CellVis>();
  private ground!: Pix;
  private water: WaterPx[] = [];
  private things: WindSprite[] = [];
  private units = new Map<string, UnitVis>();
  private spriteCache = new Map<string, Sprite>();
  private lighting: Lighting;
  private mask: Uint8Array;
  private burnt = new Set<string>();

  constructor(cells: SandboxCell[], private battle: Battle) {
    const cols = Math.max(...cells.map((c) => c.col + (c.row & 1 ? 1.5 : 1)));
    const rows = Math.max(...cells.map((c) => c.row)) + 1;
    this.width = Math.ceil(cols * TILE_W) + PAD_SIDE * 2;
    this.height = PAD_TOP + (rows - 1) * TILE_STEP_Y + TILE_H + TILE_DEPTH + 4;
    this.lighting = new Lighting(this.width, this.height);
    this.mask = new Uint8Array(this.width * this.height);

    const rng = Rng.fromSeed(5);
    for (const art of [...cells].sort((a, b) => a.row - b.row || a.col - b.col)) {
      const o = tileOrigin(art.col, art.row);
      const ox = o.x + PAD_SIDE;
      const oy = o.y + PAD_TOP;
      const key = hexKey(offsetToHex(art.col, art.row));
      const cv: CellVis = { art, ox, oy, cx: ox + TILE_CENTER.x, cy: oy + TILE_CENTER.y };
      this.cells.set(key, cv);

      const tufts = art.ground === 'tallgrass' ? 6 : art.ground === 'grass' && !art.river && !art.pond && rng.next() < 0.5 ? 1 : 0;
      for (let i = 0; i < tufts; i++) {
        const seed = rng.int(1e6);
        const spread = tufts > 1 ? 1 : 0.8;
        this.addThing(cv.cx - Math.round(10 * spread) + rng.int(Math.round(20 * spread)), cv.cy - 6 + rng.int(13), key,
          (w) => makeTuft(seed, w), false, rng);
      }
      if (art.prop) {
        const seed = rng.int(1e6);
        const make = {
          tree: (w: number) => makeTree(seed, w), pine: (w: number) => makePine(seed, w),
          thicket: (w: number) => makeThicket(seed, w), rock: () => makeRock(seed), mushrooms: () => makeMushrooms(),
        }[art.prop];
        this.addThing(cv.cx, cv.cy + 2, key, make, art.prop !== 'thicket', rng); // thickets burn away
      }
      if (art.ford) this.addThing(cv.cx, cv.cy + 4, key, () => makeStones(), true, rng);
    }
    this.rebuildGround();
    for (const u of battle.units) this.addUnit(u);
  }

  private addThing(x: number, y: number, cell: string, make: (w: number) => Sprite, survivesFire: boolean, rng: Rng): void {
    this.things.push({ x, y, cell, make, sets: new Map(), phase: rng.int(FRAMES), survivesFire });
  }

  rebuildGround(): void {
    this.ground = new Pix(this.width, this.height);
    this.water = [];
    for (const [key, cv] of this.cells) {
      paintTile(this.ground, cv.ox, cv.oy, { ...cv.art, scorched: this.burnt.has(key) }, this.water);
    }
  }

  // --- queries -------------------------------------------------------------

  /** Which hex is under world pixel (x, y)? Checks the top faces only. */
  hexAt(x: number, y: number): Hex | null {
    let found: string | null = null;
    for (const [key, cv] of this.cells) {
      if (inHex(Math.floor(x - cv.ox), Math.floor(y - cv.oy))) found = key; // later rows win (drawn on top)
    }
    if (!found) return null;
    const [q, r] = found.split(',').map(Number);
    return { q, r };
  }

  /** Where a unit's feet go on a hex. */
  feet(h: Hex): { x: number; y: number } {
    const cv = this.cells.get(hexKey(h));
    if (cv) return { x: cv.cx, y: cv.cy + 1 };
    const { col, row } = hexToOffset(h);
    const o = tileOrigin(col, row);
    return { x: o.x + PAD_SIDE + TILE_CENTER.x, y: o.y + PAD_TOP + TILE_CENTER.y + 1 };
  }

  unitPos(id: string): { x: number; y: number } | undefined {
    const v = this.units.get(id);
    return v && { x: v.x, y: v.y };
  }

  unitTop(u: Unit): number {
    return (this.unitPos(u.id)?.y ?? 0) - this.mobSprite(u, false).ay - 4;
  }

  // --- units & animation ------------------------------------------------------

  addUnit(u: Unit): void {
    const p = this.feet(u.at);
    this.units.set(u.id, { x: p.x, y: p.y, flip: false, flashUntil: 0 });
  }

  private mobSprite(u: Unit, flip: boolean, white = false): Sprite {
    const s = STATS[u.kind];
    const key = `${s.sprite}:${s.variant ?? ''}:${flip}:${white}`;
    let sp = this.spriteCache.get(key);
    if (!sp) {
      if (white) {
        const base = this.mobSprite(u, flip);
        sp = { ...base, frames: base.frames.map(silhouette) };
      } else if (flip) {
        const base = this.mobSprite(u, false);
        sp = { ...base, frames: base.frames.map((f) => f.flipX()), ax: base.frames[0].w - 1 - base.ax };
      } else {
        sp = {
          shepherd: () => makeShepherd(s.variant), wolf: makeWolf, rat: makeRat, skeleton: makeSkeleton,
        }[s.sprite]();
      }
      this.spriteCache.set(key, sp);
    }
    return sp;
  }

  private face(u: Unit, v: UnitVis, dx: number): void {
    if (Math.abs(dx) < 0.5) return;
    const wantsLeft = dx < 0;
    const drawnLeft = !!FACES_LEFT[STATS[u.kind].sprite];
    v.flip = wantsLeft !== drawnLeft;
  }

  /** Walk along hexes (each a step) or jump straight to the last one. */
  animateMove(u: Unit, hexes: Hex[], jump: boolean): Promise<void> {
    const v = this.units.get(u.id);
    if (!v || hexes.length === 0) return Promise.resolve();
    const points = [{ x: v.x, y: v.y }, ...(jump ? [hexes[hexes.length - 1]] : hexes).map((h) => this.feet(h))];
    this.face(u, v, points[points.length - 1].x - points[0].x);
    return new Promise((resolve) => {
      v.anim = {
        points,
        start: performance.now(),
        duration: jump ? 420 + hexes.length * 40 : STEP_MS * (points.length - 1),
        arc: jump ? 16 : 0,
        resolve,
      };
    });
  }

  lunge(u: Unit, toward: Hex): void {
    const v = this.units.get(u.id);
    if (!v) return;
    const t = this.feet(toward);
    const d = Math.hypot(t.x - v.x, t.y - v.y) || 1;
    this.face(u, v, t.x - v.x);
    v.lunge = { dx: ((t.x - v.x) / d) * 5, dy: ((t.y - v.y) / d) * 5, start: performance.now() };
  }

  faceToward(u: Unit, toward: Hex): void {
    const v = this.units.get(u.id);
    if (v) this.face(u, v, this.feet(toward).x - v.x);
  }

  flash(u: Unit): void {
    const v = this.units.get(u.id);
    if (v) v.flashUntil = performance.now() + 260;
  }

  kill(u: Unit): Promise<void> {
    const v = this.units.get(u.id);
    if (v) v.dyingSince = performance.now();
    return new Promise((r) => setTimeout(r, 520));
  }

  removeUnit(id: string): void {
    this.units.delete(id);
  }

  markBurnt(cellKey: string): void {
    this.burnt.add(cellKey);
    this.rebuildGround();
  }

  isBurnt(cellKey: string): boolean {
    return this.burnt.has(cellKey);
  }

  // --- per-frame -------------------------------------------------------------

  update(now: number, effects: Effects, weather: Weather): void {
    for (const [id, v] of this.units) {
      if (v.anim) {
        const a = v.anim;
        const t = Math.min(1, (now - a.start) / a.duration);
        const segs = a.points.length - 1;
        const f = t * segs;
        const i = Math.min(segs - 1, Math.floor(f));
        const k = f - i;
        const p0 = a.points[i];
        const p1 = a.points[i + 1];
        v.x = p0.x + (p1.x - p0.x) * k;
        v.y = p0.y + (p1.y - p0.y) * k;
        if (t >= 1) {
          v.x = a.points[segs].x;
          v.y = a.points[segs].y;
          v.anim = undefined;
          a.resolve();
        }
      }
      if (v.dyingSince && now - v.dyingSince > 500) {
        effects.burst('puff', v.x, v.y - 8, 14);
        this.units.delete(id);
      }
    }

    // Fire: particles from burning cells, embers from fresh ash.
    for (const [key, c] of Object.entries(this.battle.cells)) {
      const cv = this.cells.get(key);
      if (!cv) continue;
      if (c.fire === 'burning') {
        const tall = c.obstacle && cv.art.prop !== 'rock';
        const n = tall ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const x = cv.cx + (Math.random() - 0.5) * (tall ? 20 : 22);
          const y = cv.cy + 2 - (tall ? Math.random() * 30 : Math.random() * 6);
          effects.emit('fire', x, y, (Math.random() - 0.5) * 0.3, -0.5 - Math.random() * 0.8, 6 + Math.random() * 10);
        }
        if (Math.random() < 0.5) effects.emit('smoke', cv.cx + (Math.random() - 0.5) * 10, cv.cy - (tall ? 30 : 6), 0, -0.4, 30 + Math.random() * 20);
        if (Math.random() < 0.15) effects.emit('ember', cv.cx + (Math.random() - 0.5) * 16, cv.cy - 10, (Math.random() - 0.5) * 1.5, -1.2, 18);
      }
    }
    void weather;
  }

  /** Point lights for this frame: fires, glowing eyes. */
  private lights(now: number, battle: Battle, effects: Effects, darkness: number): Light[] {
    const out: Light[] = [...effects.lights()];
    // After dark, heroes carry a faint lantern so you can still find them.
    if (darkness > 0.05) {
      for (const u of battle.units) {
        const v = this.units.get(u.id);
        if (v && u.hp > 0 && u.team === 'party') out.push({ x: v.x, y: v.y - 6, r: 24, color: [0.55 * darkness, 0.42 * darkness, 0.22 * darkness] });
      }
    }
    for (const [key, c] of Object.entries(battle.cells)) {
      if (c.fire !== 'burning') continue;
      const cv = this.cells.get(key);
      if (!cv) continue;
      const flicker = 0.85 + Math.sin(now / 70 + cv.cx) * 0.08 + Math.random() * 0.1;
      out.push({ x: cv.cx, y: cv.cy - 4, r: 46, color: [1.5 * flicker, 0.9 * flicker, 0.4 * flicker] });
    }
    for (const u of battle.units) {
      if (u.hp > 0 && STATS[u.kind].sprite === 'skeleton') {
        const v = this.units.get(u.id);
        if (v) out.push({ x: v.x, y: v.y - 20, r: 9, color: [0.3, 0.9, 1.1] });
      }
    }
    return out;
  }

  render(now: number, weather: Weather, effects: Effects, highlights: Highlight[], selected?: string): Pix {
    const out = new Pix(this.width, this.height);
    out.data.set(this.ground.data);
    const frame = Math.floor((now / 125) * (1 + weather.wind * 1.2));
    paintWater(out, this.water, Math.floor(now / 125));

    // Rain rings on water and ground.
    for (const s of weather.splashes) {
      out.set(s.x - 1, s.y, '#c8e0f0a0');
      out.set(s.x + 1, s.y, '#c8e0f0a0');
      if (s.life > 2) out.set(s.x, s.y - 1, '#c8e0f0c0');
    }

    // Collect drawables with their feet y for depth sorting.
    const windLevel = Math.round(weather.wind * 2) / 2;
    const draws: { y: number; x: number; sprite: Sprite; f: number; unit?: Unit }[] = [];
    for (const th of this.things) {
      const burnt = this.burnt.has(th.cell);
      if (burnt && !th.survivesFire) continue;
      let sp: Sprite;
      if (burnt) {
        th.burnt ??= charred(th.make(0), th.x * 31 + th.y);
        sp = th.burnt;
      } else {
        sp = th.sets.get(windLevel) ?? th.make(windLevel);
        th.sets.set(windLevel, sp);
      }
      draws.push({ x: th.x, y: th.y, sprite: sp, f: (frame + th.phase) % FRAMES });
    }
    for (const u of this.battle.units) {
      const v = this.units.get(u.id);
      if (!v) continue;
      if (v.dyingSince && Math.floor((now - v.dyingSince) / 60) % 2 === 0) continue; // flicker out
      let x = v.x;
      let y = v.y;
      let lift = 0;
      if (v.anim) {
        const t = Math.min(1, (now - v.anim.start) / v.anim.duration);
        lift = v.anim.arc ? Math.sin(t * Math.PI) * v.anim.arc : Math.abs(Math.sin(t * (v.anim.points.length - 1) * Math.PI)) * 2;
      }
      if (v.lunge) {
        const t = (now - v.lunge.start) / 220;
        if (t >= 1) v.lunge = undefined;
        else {
          const k = Math.sin(t * Math.PI);
          x += v.lunge.dx * k;
          y += v.lunge.dy * k;
        }
      }
      const sp = this.mobSprite(u, v.flip, now < v.flashUntil);
      draws.push({ x: Math.round(x), y: Math.round(y - lift), sprite: sp, f: (frame + u.id.length) % FRAMES, unit: u });
      // Ground shadow stays on the ground during jumps.
      ellipse(out, x + 2, y, sp.shadow / 2, Math.max(2, sp.shadow / 6), SHADOW);
    }
    for (const d of draws) {
      if (!d.unit && d.sprite.shadow) ellipse(out, d.x + 2, d.y, d.sprite.shadow / 2, Math.max(2, d.sprite.shadow / 6), SHADOW);
    }

    this.mask.fill(0);
    draws.sort((a, b) => a.y - b.y);
    for (const d of draws) this.blitMasked(out, d.sprite.frames[d.f], d.x - d.sprite.ax, d.y - d.sprite.ay);

    effects.drawParticles(out);

    this.lighting.apply(out, {
      ambient: weather.ambient(),
      desaturate: weather.desaturation(),
      cloud: weather.cloud,
      drift: weather.drift,
      flash: weather.flash,
      lights: this.lights(now, this.battle, effects, Math.max(0, weather.tod - 1)),
    });

    // Fire is bright even at night: redraw young flame pixels unlit.
    for (const p of effects.particles) {
      if ((p.kind === 'fire' || p.kind === 'ember') && p.life / p.max > 0.5) out.set(p.x, p.y, p.kind === 'fire' ? '#fff2a0' : '#f2a24a');
    }

    // Unlit UI layer on the ground: highlights + selection ring (hidden behind sprites).
    for (const h of highlights) this.drawHighlight(out, h);
    if (selected) {
      const v = this.units.get(selected);
      if (v) this.ring(out, v.x, v.y, Math.floor(now / 250) % 2 === 0 ? '#f2c94c' : '#d9a441');
    }

    // Rain and leaves.
    const dropColor = weather.tod > 1.5 ? '#6a7c9890' : '#a8c4dca0';
    const vx = weather.wind * 2.2;
    for (const d of weather.drops) {
      for (let i = 0; i < 3; i++) out.set(d.x - (vx * i) / 5, d.y - i * 1.5, dropColor);
    }
    for (const l of weather.leaves) out.set(l.x, l.y, l.color);

    effects.drawOverlay(out);
    for (const u of this.battle.units) this.hpBar(out, u);
    return out;
  }

  private blitMasked(out: Pix, src: Pix, dx: number, dy: number): void {
    out.blit(src, dx, dy);
    for (let y = 0; y < src.h; y++) {
      const oy = dy + y;
      if (oy < 0 || oy >= this.height) continue;
      for (let x = 0; x < src.w; x++) {
        const ox = dx + x;
        if (ox < 0 || ox >= this.width) continue;
        if (src.data[(y * src.w + x) * 4 + 3]) this.mask[oy * this.width + ox] = 1;
      }
    }
  }

  private drawHighlight(out: Pix, h: Highlight): void {
    const cv = this.cells.get(hexKey(h.at));
    if (!cv) return;
    const style = HL[h.style];
    for (let y = 0; y < TILE_H; y++) {
      for (let x = 0; x < TILE_W; x++) {
        if (!inHex(x, y)) continue;
        const wx = cv.ox + x;
        const wy = cv.oy + y;
        if (this.mask[wy * this.width + wx]) continue;
        const e = EDGE[y][x];
        if (e <= 2) out.set(wx, wy, e === 1 ? style.edge : style.fill);
        else out.set(wx, wy, style.fill);
      }
    }
  }

  private ring(out: Pix, cx: number, cy: number, color: string): void {
    for (let y = -6; y <= 6; y++) {
      for (let x = -13; x <= 13; x++) {
        const d = (x / 12) ** 2 + (y / 5) ** 2;
        if (d > 1 || d < 0.6) continue;
        const px = Math.round(cx + x);
        const py = Math.round(cy + y);
        if (py < 0 || px < 0 || py >= this.height || px >= this.width) continue;
        if (this.mask[py * this.width + px] && y < 0) continue; // behind the unit
        out.set(px, py, color);
      }
    }
  }

  private hpBar(out: Pix, u: Unit): void {
    const v = this.units.get(u.id);
    if (!v || u.hp <= 0) return;
    const sp = this.mobSprite(u, false);
    const w = 14;
    const x0 = Math.round(v.x - w / 2);
    const y0 = Math.round(v.y - sp.ay - 5);
    const fill = Math.round((u.hp / u.maxHp) * (w - 2));
    const color = u.team === 'party' ? '#5ac040' : '#e04a3a';
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < 4; y++) {
        const edge = x === 0 || y === 0 || x === w - 1 || y === 3;
        out.set(x0 + x, y0 + y, edge ? '#1b1424' : x - 1 < fill ? color : '#3a2a30');
      }
    }
  }
}

function silhouette(p: Pix): Pix {
  const out = new Pix(p.w, p.h);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.alpha(x, y)) out.set(x, y, '#ffffff');
  return out;
}

function ellipse(p: Pix, cx: number, cy: number, rx: number, ry: number, color: string): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) p.set(x, y, color);
    }
  }
}
