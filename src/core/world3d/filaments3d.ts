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
 * Static things (ground, indoors) are sampled once; sources and the weather
 * can change, and every change just marks the field dirty.
 */

/** Cell width, metres. 32 / 20: whole cells tile a chunk. */
export const FCELL = CHUNK / 20;

export type SourceKind = 'tree' | 'pine' | 'thicket' | 'rock' | 'fire' | 'burnt' | 'corpse' | 'undead' | 'friend' | 'beast';

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

export class FilamentField {
  readonly cell = FCELL;
  readonly n: number;
  private readonly x0: number;
  private groundGrid: Uint8Array;
  private indoorGrid: Uint8Array;
  private statics: FSource[];
  private movers: FSource[] = [];
  private cond: Conditions = { env: { time: 'day', sky: 'clear', windForce: 1, windDir: 0 } };
  private incoming: Map<string, Map<string, Gathered>> | null = null;
  private cache = new Map<string, HexFilaments>();

  constructor(world: FilamentWorld) {
    // The grid starts on a chunk corner, so heat-map cells line up with chunk edges.
    const lo = Math.floor(-world.size / 2 / CHUNK), hi = Math.ceil(world.size / 2 / CHUNK) - 1;
    this.n = (hi - lo + 1) * (CHUNK / FCELL);
    this.x0 = lo * CHUNK;
    this.statics = [...world.sources];
    this.groundGrid = new Uint8Array(this.n * this.n);
    this.indoorGrid = new Uint8Array(this.n * this.n);
    for (let j = 0; j < this.n; j++) {
      for (let i = 0; i < this.n; i++) {
        const c = this.centre(i, j);
        this.groundGrid[j * this.n + i] = GROUND_CODES.indexOf(world.ground(c.x, c.z));
        this.indoorGrid[j * this.n + i] = world.indoors(c.x, c.z) ? 1 : 0;
      }
    }
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

  /** New weather or time: everything is re-read on demand. */
  setConditions(c: Conditions): void {
    this.cond = c;
    this.incoming = null;
    this.cache.clear();
  }

  /** The things that move (the living): replaced as a whole. */
  setMovers(m: readonly FSource[]): void {
    this.movers = [...m];
    this.incoming = null;
    this.cache.clear();
  }

  /** Fixed sources changed (a fire lit, a tree felled). */
  setSources(s: readonly FSource[]): void {
    this.statics = [...s];
    this.incoming = null;
    this.cache.clear();
  }

  private pseudoCell(i: number, j: number, src?: FSource): { cell: Cell; units: Unit[] } {
    const code = this.inside(i, j) ? this.groundGrid[j * this.n + i] : 0;
    const ground = GROUND_CODES[code];
    const cell: Cell = {
      at: { q: i, r: j },
      obstacle: false,
      flammable: false,
      water: ground === 'river' || ground === 'pond' || ground === 'ford',
      fire: 'none',
      ground,
      indoors: this.inside(i, j) && this.indoorGrid[j * this.n + i] === 1,
    };
    const units: Unit[] = [];
    if (src) {
      const w = src.weight ?? 1;
      switch (src.kind) {
        case 'tree': case 'pine': case 'thicket': case 'rock': cell.feature = src.kind; break;
        case 'fire': cell.fire = 'burning'; break;
        case 'burnt': cell.fire = 'burnt'; break;
        case 'corpse': cell.corpses = w; break;
        default:
          units.push({ id: '', kind: src.kind, name: src.kind, team: src.kind === 'friend' ? 'party' : 'foe', at: { q: i, r: j }, hp: 1, maxHp: 1 });
      }
    }
    return { cell, units };
  }

  private build(): Map<string, Map<string, Gathered>> {
    const { env } = this.cond;
    const opts = { isUndead: (u: Unit) => u.kind === 'undead' };
    const inc = new Map<string, Map<string, Gathered>>();
    const spread = (i: number, j: number, ems: Emission[], scale: number): void => {
      // Walls stop it: what burns indoors reaches only the room, what burns outside stays outside.
      const roofed = this.indoorGrid[j * this.n + i] === 1;
      for (const em of ems) {
        for (let dj = -2; dj <= 2; dj++) {
          for (let di = -2; di <= 2; di++) {
            const d = Math.hypot(di, dj);
            const v = falloffAt(em.fall, d) * scale;
            if (!v || !this.inside(i + di, j + dj) || (this.indoorGrid[(j + dj) * this.n + i + di] === 1) !== roofed) continue;
            const k = `${i + di},${j + dj}`;
            let m = inc.get(k);
            if (!m) inc.set(k, (m = new Map()));
            const id = `${em.aspect}|${em.label}`;
            const g = m.get(id) ?? { total: 0, here: false, near: 0, cap: em.cap };
            g.total += v;
            if (d === 0) g.here = true;
            else g.near += 1;
            m.set(id, g);
          }
        }
      }
    };
    // The ground itself: water and the like radiate from every cell it fills.
    for (let j = 0; j < this.n; j++) {
      for (let i = 0; i < this.n; i++) {
        const g = GROUND_CODES[this.groundGrid[j * this.n + i]];
        if (g !== 'river' && g !== 'pond' && g !== 'ford') continue;
        spread(i, j, emissions(this.pseudoCell(i, j).cell, [], env, opts), 1);
      }
    }
    for (const s of [...this.statics, ...this.movers]) {
      const { i, j } = this.cellOf(s.x, s.z);
      if (!this.inside(i, j)) continue;
      const { cell, units } = this.pseudoCell(i, j, s);
      // Emissions of the ground under it are already counted above; take only what the source adds.
      const ems = emissions(cell, units, env, opts).filter((e) => !(e.label === 'Water' || e.label === 'Still water' || e.label === 'Sun glare off water'));
      spread(i, j, ems, s.kind === 'corpse' ? 1 : (s.weight ?? 1));
    }
    return inc;
  }

  /** Who casts a shadow onto (x, z): a tree or rock toward the sun's far side, by the real sun direction. */
  private shadowedBy(x: number, z: number): string | null {
    const { env, sunDir } = this.cond;
    if (env.time === 'night' || !sunDir) return null;
    const hl = Math.hypot(sunDir[0], sunDir[2]) || 1;
    const sx = sunDir[0] / hl, sz = sunDir[2] / hl;
    const tan = Math.max(0.12, sunDir[1] / hl);
    for (const s of this.statics) {
      const h = HEIGHT[s.kind];
      if (!h || (s.kind === 'rock' && env.time !== 'dusk')) continue;
      const len = Math.min(10, h / tan);
      // Along the shadow (away from the sun) and across it.
      const dx = x - s.x, dz = z - s.z;
      const along = -(dx * sx + dz * sz), across = Math.abs(dx * sz - dz * sx);
      if (along > 0.4 && along < len && across < (s.kind === 'rock' ? 0.9 : 1.3)) return s.kind === 'thicket' ? 'thicket' : s.kind === 'rock' ? 'rock' : 'tree';
    }
    return null;
  }

  /** The reading of cell (i, j): all eight aspects, with every contribution. */
  readCell(i: number, j: number): HexFilaments {
    const key = `${i},${j}`;
    const have = this.cache.get(key);
    if (have) return have;
    this.incoming ??= this.build();
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
        for (const [id, g] of this.incoming.get(key) ?? []) {
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
