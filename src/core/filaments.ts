import { type Battle, type Cell, type Unit, cellAt } from './battle';
import type { Environment } from './environment';
import { DIRECTIONS, type Hex, hexAdd, hexDistance, hexKey, hexesWithin } from './hex';

/**
 * Filaments: how strongly each magical aspect flows on each hex.
 *
 * Based on Eon's "Omgivningens tillstånd" (seven levels, from magic-dead to
 * extremely strong). Here: -3 (magic-dead) .. +3 (extreme).
 *
 * A hex's reading = the conditions on that hex (time, sky, wind, indoors, its
 * ground, clouds and shadows) + what radiates into it from sources around it:
 * water, trees, stone, fire, ash, the dead, undead and the living. Sources
 * radiate to their own hex and up to two hexes out, weakening with distance,
 * and each kind of source is capped so stacking stays sane. The sum is
 * rounded and clamped. Every contribution is kept so the UI can explain it.
 */
export type AspectId = 'bio' | 'foto' | 'geo' | 'hydro' | 'nekro' | 'pneumo' | 'pyro' | 'skoto';

export interface AspectInfo {
  id: AspectId;
  name: string; // Eon name
  gloss: string; // what it is, in English
  color: string;
}

export const ASPECTS: AspectInfo[] = [
  { id: 'bio', name: 'Biotropy', gloss: 'life', color: '#7ad05a' },
  { id: 'foto', name: 'Phototropy', gloss: 'light', color: '#f6e27a' },
  { id: 'geo', name: 'Geotropy', gloss: 'earth & stone', color: '#c9a06a' },
  { id: 'hydro', name: 'Hydrotropy', gloss: 'water', color: '#5aaee0' },
  { id: 'nekro', name: 'Necrotropy', gloss: 'death & decay', color: '#a88ad0' },
  { id: 'pneumo', name: 'Pneumotropy', gloss: 'air & wind', color: '#c8f0f4' },
  { id: 'pyro', name: 'Pyrotropy', gloss: 'fire', color: '#f2803a' },
  { id: 'skoto', name: 'Skototropy', gloss: 'darkness', color: '#7a5ac8' },
];

export const LEVEL_NAMES: Record<number, string> = {
  [-3]: 'Magic-dead', [-2]: 'Very weak', [-1]: 'Weak', 0: 'Normal', 1: 'Strong', 2: 'Very strong', 3: 'Extreme',
};

export interface Part {
  label: string;
  value: number;
}

export interface Reading {
  level: number; // -3..3
  raw: number;
  parts: Part[];
}

export type HexFilaments = Record<AspectId, Reading>;

export interface FilamentOptions {
  /** Which units count as undead (they radiate necrotropy). */
  isUndead?: (u: Unit) => boolean;
  /** Is this hex under a cloud? (from the world's cloud field) */
  isClouded?: (h: Hex) => boolean;
}

// --- sources --------------------------------------------------------------------

/** Strength on the source hex, one hex away, two hexes away. */
export type Falloff = [number, number, number];

export interface Emission {
  aspect: AspectId;
  label: string;
  fall: Falloff;
  /** Max total from all sources of this label (same sign as the emission). */
  cap: number;
}

export const isWater = (c: Cell): boolean => c.ground === 'river' || c.ground === 'pond' || c.ground === 'ford';
export const isTall = (c: Cell): boolean =>
  (c.feature === 'tree' || c.feature === 'pine' || c.feature === 'thicket') && c.fire !== 'burnt';

export function emissions(c: Cell, units: Unit[], env: Environment, opts: FilamentOptions): Emission[] {
  const out: Emission[] = [];
  const e = (aspect: AspectId, label: string, fall: Falloff, cap: number) => out.push({ aspect, label, fall, cap });
  const lit = env.time !== 'night';

  if (isWater(c)) {
    e('hydro', 'Water', [1.5, 0.75, 0.25], 2);
    if (env.time === 'day' && env.sky === 'clear' && !c.indoors) e('foto', 'Sun glare off water', [1, 1, 0], 1);
  }
  if (c.ground === 'pond') e('nekro', 'Still water', [1, 0.5, 0], 1);
  if (isTall(c)) {
    e('bio', 'Trees', [0.5, 0.3, 0.1], 1);
    e('pneumo', 'Shelter of trees', [-1, -0.5, 0], -1);
    if (lit) {
      e('foto', 'Canopy', [-1, -0.3, 0], -1);
      e('skoto', 'Shade of trees', [1, 0.3, 0], 1);
    } else {
      e('skoto', 'Forest at night', [1, 0.5, 0.2], 1);
    }
  }
  // Rocks are never stood on, so their full strength reaches the hexes next to them, then fades fast.
  if (c.feature === 'rock') e('geo', 'Stone', [2, 2, 0.75], 2.5);
  if (c.fire === 'burning') {
    // The flames themselves and the heat around them are capped separately, so one fire
    // clearly warms its neighbours (+1 next to it) without making every edge of a blaze extreme.
    e('pyro', 'Fire', [4, 0, 0], 4);
    e('pyro', 'Heat of fire', [0, 2.5, 1.2], 3.5);
    e('foto', 'Firelight', [2, 1.5, 0.75], 2.5);
    e('skoto', 'Firelight', [-2, -1.5, -0.75], -3);
    e('bio', 'Burning', [-1.5, -0.25, 0], -1.5);
  }
  if (c.fire === 'burnt') {
    e('nekro', 'Ash', [2, 0.5, 0.2], 2);
    e('pyro', 'Embers', [0.5, 0, 0], 0.5);
    e('bio', 'Scorched earth', [-1.5, -0.25, 0], -1.5);
  }
  if (c.corpses) e('nekro', 'The dead', [1.5 * c.corpses, c.corpses, 0.4 * c.corpses], 3);
  for (const u of units) {
    if (opts.isUndead?.(u)) e('nekro', 'Undead', [1.5, 1, 0.4], 2);
    else if (u.team === 'party') e('bio', 'Friends', [1, 0.6, 0.25], 1.4);
    else e('bio', 'Beasts', [0.5, 0.3, 0.1], 0.8);
  }
  return out;
}

// --- conditions on the hex itself ------------------------------------------------------

export interface Context {
  cell: Cell;
  env: Environment;
  outdoors: boolean;
  clouded: boolean;
  /** Who casts a shadow onto this hex (tree/rock), if anyone. */
  shadowedBy: string | null;
}

export type Base = (x: Context, add: (label: string, value: number) => void) => 'skipSources' | void;

export const overcast = (env: Environment): boolean => env.sky === 'rain' || env.sky === 'storm';

export const BASE: Record<AspectId, Base> = {
  hydro: ({ cell, env, outdoors }, add) => {
    if (!outdoors) {
      add('Indoors, no water', -3);
      return 'skipSources';
    }
    add(isWater(cell) ? 'Ground level' : 'Dry land', -1);
    if (env.sky === 'rain') add('Rain', 1);
    if (env.sky === 'storm') add('Downpour', 2);
  },

  foto: ({ env, outdoors, clouded, shadowedBy }, add) => {
    if (!outdoors) {
      add('Indoors', env.time === 'day' ? -1 : env.time === 'dusk' ? -2 : -3);
      return;
    }
    if (env.time === 'day') add('Daylight', 0);
    if (env.time === 'dusk') add('Dusk', -1);
    if (env.time === 'night') add('Moon and stars', -2);
    if (env.time === 'day' && env.sky === 'clear') add('Clear sky', 1);
    if (overcast(env)) add('Overcast', env.sky === 'storm' ? -1.5 : -1);
    else if (clouded) add(env.time === 'night' ? 'Cloud over the moon' : 'Under a cloud', -1);
    if (shadowedBy) add(`In the shadow of a ${shadowedBy}`, -1);
  },

  skoto: ({ env, outdoors, clouded, shadowedBy }, add) => {
    if (!outdoors) {
      add('Indoors', env.time === 'day' ? -1 : env.time === 'dusk' ? -0.5 : 0);
      return;
    }
    if (env.time === 'day') add('Daylight', -3);
    if (env.time === 'dusk') add('Dusk', -1);
    if (env.time === 'night') add('Night', 0);
    const gloom = env.time === 'day' ? 2 : 1;
    if (overcast(env)) add('Overcast', gloom);
    else if (clouded) add(env.time === 'night' ? 'Cloud over the moon' : 'Under a cloud', gloom);
    if (shadowedBy) add(`In the shadow of a ${shadowedBy}`, 1);
  },

  pneumo: ({ env, outdoors }, add) => {
    if (!outdoors) {
      add('Indoors', -2);
      return 'skipSources';
    }
    add(`Wind force ${env.windForce}`, [-2, -1, 0, 0, 1, 2, 2][Math.max(0, Math.min(6, env.windForce))]);
  },

  pyro: ({ cell, env }, add) => {
    if (isWater(cell)) {
      add('In water', -3);
      return 'skipSources';
    }
    add('No open fire', -2);
    if (overcast(env)) add('Everything is wet', env.sky === 'storm' ? -0.75 : -0.5);
  },

  geo: ({ cell, outdoors }, add) => {
    if (cell.ground === 'river' || cell.ground === 'pond') {
      add('In the water', -3);
      return 'skipSources';
    }
    if (cell.ground === 'ford') add('Standing in a river', -2);
    else if (cell.ground === 'path') add('Packed gravel', 0);
    else add('Loose soil', -1);
    if (!outdoors) add('Walls around you', 0.5);
  },

  bio: ({ cell, outdoors }, add) => {
    add('Living land', 0);
    if (cell.ground === 'flowers' || cell.ground === 'tallgrass') add('Lush growth', 0.5);
    if (cell.ground === 'path') add('Trampled path', -0.5);
    if (!outdoors) add('Indoors', -0.5);
  },

  nekro: ({ cell }, add) => {
    add('Forest', -1);
    if (cell.ground === 'forest') add('Rotting leaf litter', 1.5);
  },
};

/**
 * Object shadows. Light comes from the top-left, so by day trees throw their
 * shadow one hex to the south-east; at dusk the low sun throws long shadows
 * two hexes east (from trees) and one (from rocks). No shadows at night or
 * under a grey sky.
 */
function shadowCaster(b: Battle, h: Hex, env: Environment, clouded: boolean): string | null {
  if (env.time === 'night' || overcast(env) || clouded) return null;
  const nameOf = (c: Cell | undefined, rocksToo: boolean): string | null => {
    if (!c) return null;
    if (isTall(c)) return c.feature === 'thicket' ? 'thicket' : 'tree';
    if (rocksToo && c.feature === 'rock') return 'rock';
    return null;
  };
  if (env.time === 'day') return nameOf(cellAt(b, hexAdd(h, DIRECTIONS[2])), false); // caster to the north-west
  const w1 = hexAdd(h, DIRECTIONS[3]);
  return nameOf(cellAt(b, w1), true) ?? nameOf(cellAt(b, hexAdd(w1, DIRECTIONS[3])), false); // casters to the west
}

// --- reading ---------------------------------------------------------------------

interface Gathered {
  total: number;
  here: boolean;
  near: number;
  cap: number;
}

/** Filaments for every hex on the map. */
export function readMap(b: Battle, env: Environment, opts: FilamentOptions = {}): Map<string, HexFilaments> {
  // 1. Radiate every source out to its neighbourhood.
  const incoming = new Map<string, Map<string, Gathered>>(); // hex -> "aspect|label" -> total
  const unitsAt = new Map<string, Unit[]>();
  for (const u of b.units) {
    if (u.hp <= 0) continue;
    const k = hexKey(u.at);
    unitsAt.set(k, [...(unitsAt.get(k) ?? []), u]);
  }
  for (const [key, cell] of Object.entries(b.cells)) {
    for (const em of emissions(cell, unitsAt.get(key) ?? [], env, opts)) {
      for (const t of hexesWithin(cell.at, 2)) {
        const d = hexDistance(cell.at, t);
        const v = em.fall[d];
        if (!v) continue;
        const tk = hexKey(t);
        if (!b.cells[tk]) continue;
        let m = incoming.get(tk);
        if (!m) incoming.set(tk, (m = new Map()));
        const id = `${em.aspect}|${em.label}`;
        const g = m.get(id) ?? { total: 0, here: false, near: 0, cap: em.cap };
        g.total += v;
        if (d === 0) g.here = true;
        else g.near += 1;
        m.set(id, g);
      }
    }
  }

  // 2. Add each hex's own conditions, then everything that reached it.
  const out = new Map<string, HexFilaments>();
  for (const [key, cell] of Object.entries(b.cells)) {
    const clouded = !cell.indoors && !!opts.isClouded?.(cell.at);
    const ctx: Context = {
      cell,
      env,
      outdoors: !cell.indoors,
      clouded,
      shadowedBy: cell.indoors ? null : shadowCaster(b, cell.at, env, clouded),
    };
    const reading = {} as HexFilaments;
    for (const a of ASPECTS) {
      const parts: Part[] = [];
      const skip = BASE[a.id](ctx, (label, value) => parts.push({ label, value }));
      if (skip !== 'skipSources') {
        for (const [id, g] of incoming.get(key) ?? []) {
          const [aspect, label] = id.split('|');
          if (aspect !== a.id) continue;
          const value = g.cap >= 0 ? Math.min(g.total, g.cap) : Math.max(g.total, g.cap);
          const where = g.here && g.near ? ` (here + ${g.near} near)` : g.here ? ' (here)' : ` ×${g.near} nearby`;
          parts.push({ label: label + where, value });
        }
      }
      const raw = parts.reduce((s, p) => s + p.value, 0);
      reading[a.id] = { raw, parts, level: Math.max(-3, Math.min(3, Math.round(raw))) + 0 }; // +0 drops -0
    }
    out.set(key, reading);
  }
  return out;
}

export function readHex(b: Battle, h: Hex, env: Environment, opts: FilamentOptions = {}): HexFilaments | null {
  return readMap(b, env, opts).get(hexKey(h)) ?? null;
}
