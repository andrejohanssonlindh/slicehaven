import type { Cell, Unit } from '../battle';
import type { Environment } from '../environment';
import { ASPECTS, type AspectId, BASE, type Context, type Emission, type HexFilaments, type Part, emissions } from '../filaments';
import { CHUNK } from './chunks';

/**
 * Filaments in the free world: a map of cells (a hash map keyed "i,j", a heat
 * map when drawn) that is read by position. It keeps the hex version's rules
 * and every one of its contributions (`core/filaments.ts`: the same `BASE`
 * conditions and `emissions` tables, so the two can't drift apart), and swaps
 * the geometry: cells are 1.6 m (close to the old hex, and exactly 20 to a
 * chunk), and a source's strength at "here, 1 away, 2 away" becomes a smooth
 * falloff in cell widths. Shadows come from the real sun direction.
 *
 * The field is sparse and lazy: a cell is worked out when somebody reads it,
 * from the ground and the sources round it, and remembered until the weather,
 * the living or the sources change. Nothing here is sized by the world, so a
 * map of any size costs what is looked at.
 */

/** Cell width, metres. 32 / 20: whole cells tile a chunk. */
export const FCELL = CHUNK / 20;

/** How far a source's reach is stretched, against the hex table (which was tuned for 1.5 m hexes). */
export const REACH = 1.7;

export type SourceKind = 'tree' | 'pine' | 'thicket' | 'rock' | 'fire' | 'burnt' | 'corpse' | 'undead' | 'friend' | 'beast' | 'water' | 'light';

export interface FSource {
  x: number;
  z: number;
  kind: SourceKind;
  /** Strength multiplier (a torch is a small fire); for corpses, how many. Default 1. */
  weight?: number;
}

export type Ground = NonNullable<Cell['ground']>;

export interface FilamentWorld {
  /** The world patch, centred on the origin, metres across (the field covers the whole chunks it touches). */
  size: number;
  ground(x: number, z: number): Ground;
  indoors(x: number, z: number): boolean;
  /** Fixed things: trees, rocks, fires, the dead. */
  sources: readonly FSource[];
  /**
   * Instead of `sources`, a way to ask which fixed things lie in a rectangle of the ground (a streaming map's
   * index). It must return the same things each time until `setSources` is called.
   */
  sourcesIn?(x0: number, z0: number, x1: number, z1: number): readonly FSource[];
  /** Called when `setSources` says the fixed sources changed, before they are asked for again. */
  refresh?(): void;
}

export interface Conditions {
  env: Environment;
  /** Is this spot under a cloud? */
  isClouded?: (x: number, z: number) => boolean;
  /** Direction toward the sun (or moon), for object shadows. */
  sunDir?: [number, number, number];
}

type Gathered = { total: number; here: boolean; near: number; cap: number };

/** Strength at `d` cell widths from a source: the hex table's three numbers, joined smoothly; nothing past 2.5. */
export function falloffAt(fall: Emission['fall'], d: number): number {
  if (d <= 0) return fall[0];
  if (d <= 1) return fall[0] + (fall[1] - fall[0]) * d;
  if (d <= 2) return fall[1] + (fall[2] - fall[1]) * (d - 1);
  if (d <= 2.5) return fall[2] * (1 - (d - 2) / 0.5);
  return 0;
}

const GROUND_CODES: Ground[] = ['grass', 'forest', 'path', 'tallgrass', 'flowers', 'mud', 'river', 'pond', 'ford'];
/** Tree height (m) for shadow length; rocks only cast at dusk, as in the hex rules. */
const HEIGHT: Partial<Record<SourceKind, number>> = { tree: 6, pine: 8, thicket: 2, rock: 1.5 };

/** A cell's key: i and j may be negative, and a world can be tens of thousands of cells across. */
const OFF = 1 << 19, WIDE = 1 << 20;
const keyOf = (i: number, j: number): number => (j + OFF) * WIDE + (i + OFF);

/** The reach of a source's influence in cells, and the longest shadow in cells (10 m). */
const R = Math.ceil(2.5 * REACH);
const SHADOW_R = Math.ceil(10 / FCELL);

export class FilamentField {
  readonly cell = FCELL;
  readonly n: number;
  private readonly x0: number;
  private readonly world: FilamentWorld;
  private readonly groundCache = new Map<number, number>();
  private readonly indoorCache = new Map<number, boolean>();
  /** Fixed sources by the cell they stand in (filled as cells are asked about, or all at once from a list). */
  private staticCells = new Map<number, FSource[]>();
  private staticAsked = new Set<number>();
  private moverCells = new Map<number, FSource[]>();
  private movers: FSource[] = [];
  private cond: Conditions = { env: { time: 'day', sky: 'clear', windForce: 1, windDir: 0 } };
  private cache = new Map<number, HexFilaments>();
  private emCache = new Map<FSource, Emission[]>();

  constructor(world: FilamentWorld) {
    // The grid starts on a chunk corner, so heat-map cells line up with chunk edges.
    const lo = Math.floor(-world.size / 2 / CHUNK), hi = Math.ceil(world.size / 2 / CHUNK) - 1;
    this.n = (hi - lo + 1) * (CHUNK / FCELL);
    this.x0 = lo * CHUNK;
    this.world = world;
    this.setSources(world.sources);
  }

  cellOf(x: number, z: number): { i: number; j: number } {
    return { i: Math.floor((x - this.x0) / FCELL), j: Math.floor((z - this.x0) / FCELL) };
  }

  centre(i: number, j: number): { x: number; z: number } {
    return { x: this.x0 + (i + 0.5) * FCELL, z: this.x0 + (j + 0.5) * FCELL };
  }

  private inside(i: number, j: number): boolean {
    return i >= 0 && j >= 0 && i < this.n && j < this.n;
  }

  private groundOf(i: number, j: number): Ground {
    const k = keyOf(i, j);
    let g = this.groundCache.get(k);
    if (g === undefined) {
      const c = this.centre(i, j);
      g = GROUND_CODES.indexOf(this.world.ground(c.x, c.z));
      this.groundCache.set(k, g);
    }
    return GROUND_CODES[g];
  }

  private indoorsOf(i: number, j: number): boolean {
    const k = keyOf(i, j);
    let v = this.indoorCache.get(k);
    if (v === undefined) {
      const c = this.centre(i, j);
      v = this.world.indoors(c.x, c.z);
      this.indoorCache.set(k, v);
    }
    return v;
  }

  /** New weather or time: everything is re-read on demand. */
  setConditions(c: Conditions): void {
    this.cond = c;
    this.cache.clear();
    this.emCache.clear();
  }

  /** The things that move (the living): replaced as a whole. */
  setMovers(m: readonly FSource[]): void {
    this.movers = [...m];
    this.moverCells.clear();
    for (const s of this.movers) this.put(this.moverCells, s);
    this.cache.clear();
    this.emCache.clear();
  }

  /** Fixed sources changed (a fire lit, a tree felled, a chunk streamed in or out). */
  setSources(s: readonly FSource[]): void {
    this.world.refresh?.();
    this.staticCells.clear();
    this.staticAsked.clear();
    if (!this.world.sourcesIn) for (const src of s) this.put(this.staticCells, src);
    this.cache.clear();
    this.emCache.clear();
  }

  private put(into: Map<number, FSource[]>, s: FSource): void {
    const { i, j } = this.cellOf(s.x, s.z);
    const k = keyOf(i, j);
    const list = into.get(k);
    if (list) list.push(s);
    else into.set(k, [s]);
  }

  /** The fixed sources standing in cell (i, j). */
  private staticsAt(i: number, j: number): readonly FSource[] {
    const k = keyOf(i, j);
    if (this.world.sourcesIn && !this.staticAsked.has(k)) {
      this.staticAsked.add(k);
      const c = this.centre(i, j), h = FCELL / 2;
      const found = this.world.sourcesIn(c.x - h, c.z - h, c.x + h, c.z + h).filter((s) => {
        const o = this.cellOf(s.x, s.z);
        return o.i === i && o.j === j;
      });
      if (found.length) this.staticCells.set(k, [...found]);
    }
    return this.staticCells.get(k) ?? [];
  }

  private pseudoCell(i: number, j: number, src?: FSource): { cell: Cell; units: Unit[] } {
    const ground = this.inside(i, j) ? this.groundOf(i, j) : GROUND_CODES[0];
    const cell: Cell = {
      at: { q: i, r: j },
      obstacle: false,
      flammable: false,
      water: ground === 'river' || ground === 'pond' || ground === 'ford',
      fire: 'none',
      ground,
      indoors: this.inside(i, j) && this.indoorsOf(i, j),
    };
    const units: Unit[] = [];
    if (src) {
      const w = src.weight ?? 1;
      switch (src.kind) {
        case 'tree': case 'pine': case 'thicket': case 'rock': cell.feature = src.kind; break;
        case 'water': cell.ground = 'pond'; cell.water = true; break; // a well: still water, small
        case 'fire': cell.fire = 'burning'; break;
        case 'burnt': cell.fire = 'burnt'; break;
        case 'corpse': cell.corpses = w; break;
        default:
          units.push({ id: '', kind: src.kind, name: src.kind, team: src.kind === 'friend' ? 'party' : 'foe', at: { q: i, r: j }, hp: 1, maxHp: 1 });
      }
    }
    return { cell, units };
  }

  /** What one source (or the water of one ground cell) gives off, with its strength scale. */
  private emissionsOf(s: FSource, i: number, j: number): Emission[] {
    let ems = this.emCache.get(s);
    // Magic light (an orb, a ray): only phototropy, a little stronger than a torch's reach.
    if (!ems && s.kind === 'light') this.emCache.set(s, (ems = [{ aspect: 'foto', label: 'Magic light', fall: [1.6, 0.9, 0.3], cap: 3 }]));
    if (!ems) {
      const { env } = this.cond;
      const opts = { isUndead: (u: Unit) => u.kind === 'undead' };
      const { cell, units } = this.pseudoCell(i, j, s);
      // Emissions of the ground under it are counted from the ground itself; take only what the source adds.
      // (A water source is the one thing that adds its own water.)
      ems = emissions(cell, units, env, opts).filter((e) => s.kind === 'water' || !(e.label === 'Water' || e.label === 'Still water' || e.label === 'Sun glare off water'));
      this.emCache.set(s, ems);
    }
    return ems;
  }

  private waterEmissions(i: number, j: number): Emission[] {
    const { env } = this.cond;
    return emissions(this.pseudoCell(i, j).cell, [], env, { isUndead: (u: Unit) => u.kind === 'undead' });
  }

  /**
   * Everything that reaches cell (ti, tj): the water of the ground round it and every source round it, each with
   * the strength it has at that distance. Walls stop it: what burns indoors reaches only the room, what burns
   * outside stays outside.
   */
  private gather(ti: number, tj: number): Map<string, Gathered> {
    const got = new Map<string, Gathered>();
    const roofed = this.indoorsOf(ti, tj);
    const waterRing = new Map<number, Emission[]>();
    const add = (ems: readonly Emission[], scale: number, d: number): void => {
      for (const em of ems) {
        const v = falloffAt(em.fall, d) * scale;
        if (!v) continue;
        const id = `${em.aspect}|${em.label}`;
        const g = got.get(id) ?? { total: 0, here: false, near: 0, cap: em.cap };
        g.total += v;
        if (d === 0) g.here = true;
        else g.near += 1;
        got.set(id, g);
      }
    };
    for (let dj = -R; dj <= R; dj++) {
      for (let di = -R; di <= R; di++) {
        const d = Math.hypot(di, dj) / REACH;
        if (d > 2.5) continue;
        const si = ti + di, sj = tj + dj;
        if (!this.inside(si, sj) || this.indoorsOf(si, sj) !== roofed) continue;
        const g = this.groundOf(si, sj);
        if (g === 'river' || g === 'pond' || g === 'ford') {
          const k = keyOf(si, sj);
          let ems = waterRing.get(k);
          if (!ems) waterRing.set(k, (ems = this.waterEmissions(si, sj)));
          add(ems, 1, d);
        }
        for (const s of this.staticsAt(si, sj)) add(this.emissionsOf(s, si, sj), s.kind === 'corpse' ? 1 : s.weight ?? 1, d);
        for (const s of this.moverCells.get(keyOf(si, sj)) ?? []) add(this.emissionsOf(s, si, sj), s.kind === 'corpse' ? 1 : s.weight ?? 1, d);
      }
    }
    return got;
  }

  /** Who casts a shadow onto (x, z): a tree or rock toward the sun's far side, by the real sun direction. */
  private shadowedBy(x: number, z: number): string | null {
    const { env, sunDir } = this.cond;
    if (env.time === 'night' || !sunDir) return null;
    const hl = Math.hypot(sunDir[0], sunDir[2]) || 1;
    const sx = sunDir[0] / hl, sz = sunDir[2] / hl;
    const tan = Math.max(0.12, sunDir[1] / hl);
    const here = this.cellOf(x, z);
    for (let dj = -SHADOW_R; dj <= SHADOW_R; dj++) {
      for (let di = -SHADOW_R; di <= SHADOW_R; di++) {
        for (const s of this.staticsAt(here.i + di, here.j + dj)) {
          const h = HEIGHT[s.kind];
          if (!h || (s.kind === 'rock' && env.time !== 'dusk')) continue;
          const len = Math.min(10, h / tan);
          // Along the shadow (away from the sun) and across it.
          const dx = x - s.x, dz = z - s.z;
          const along = -(dx * sx + dz * sz), across = Math.abs(dx * sz - dz * sx);
          if (along > 0.4 && along < len && across < (s.kind === 'rock' ? 0.9 : 1.3)) return s.kind === 'thicket' ? 'thicket' : s.kind === 'rock' ? 'rock' : 'tree';
        }
      }
    }
    return null;
  }

  /** The reading of cell (i, j): all eight aspects, with every contribution. */
  readCell(i: number, j: number): HexFilaments {
    const key = keyOf(i, j);
    const have = this.cache.get(key);
    if (have) return have;
    const incoming = this.gather(i, j);
    const { env, isClouded } = this.cond;
    const c = this.centre(i, j);
    const { cell } = this.pseudoCell(i, j);
    const outdoors = !cell.indoors;
    const clouded = outdoors && !!isClouded?.(c.x, c.z);
    const ctx: Context = { cell, env, outdoors, clouded, shadowedBy: outdoors && !clouded && env.sky !== 'rain' && env.sky !== 'storm' ? this.shadowedBy(c.x, c.z) : null };
    const reading = {} as HexFilaments;
    for (const a of ASPECTS) {
      const parts: Part[] = [];
      const skip = BASE[a.id](ctx, (label, value) => parts.push({ label, value }));
      if (skip !== 'skipSources') {
        for (const [id, g] of incoming) {
          const [aspect, label] = id.split('|');
          if (aspect !== a.id) continue;
          const value = g.cap >= 0 ? Math.min(g.total, g.cap) : Math.max(g.total, g.cap);
          const where = g.here && g.near ? ` (here + ${g.near} near)` : g.here ? ' (here)' : ` ×${g.near} nearby`;
          parts.push({ label: label + where, value });
        }
      }
      const raw = parts.reduce((s, p) => s + p.value, 0);
      reading[a.id] = { raw, parts, level: Math.max(-3, Math.min(3, Math.round(raw))) + 0 };
    }
    this.cache.set(key, reading);
    return reading;
  }

  /** The aspect's raw strength at a point, blended smoothly between the four nearest cell centres (for drawing; rules use `readAt`). */
  smoothAt(x: number, z: number, aspect: AspectId): number {
    const fx = (x - this.x0) / FCELL - 0.5, fz = (z - this.x0) / FCELL - 0.5;
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    const c = (a: number, b: number): number => Math.max(-3, Math.min(3, this.readCell(Math.max(0, Math.min(this.n - 1, a)), Math.max(0, Math.min(this.n - 1, b)))[aspect].raw));
    return (c(i, j) * (1 - u) + c(i + 1, j) * u) * (1 - v) + (c(i, j + 1) * (1 - u) + c(i + 1, j + 1) * u) * v;
  }

  /** The reading at a point in metres. Outside the world patch it reads the nearest cell. */
  readAt(x: number, z: number): HexFilaments {
    const c = this.cellOf(x, z);
    return this.readCell(Math.max(0, Math.min(this.n - 1, c.i)), Math.max(0, Math.min(this.n - 1, c.j)));
  }
}
