import { type Battle, type Cell, type Unit, cellAt } from './battle';
import type { Environment } from './environment';
import { type Hex, hexKey, neighbors } from './hex';

/**
 * Filaments: how strongly each magical aspect flows on each hex.
 *
 * Based on Eon's "Omgivningens tillstånd" (seven levels, from magic-dead to
 * extremely strong). Here: -3 (magic-dead) .. +3 (extreme). Each hex gets a raw
 * score from its own terrain, its neighbours, and the time/weather/wind, and
 * is then rounded and clamped. Every contribution is kept so the UI can
 * explain the number.
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
  /** Which units count as undead (strengthen necrotropy around them). */
  isUndead?: (u: Unit) => boolean;
}

/** Facts about a hex and its surroundings that the aspect rules look at. */
interface Context {
  cell: Cell;
  env: Environment;
  outdoors: boolean;
  near: Cell[]; // existing neighbour cells
  count: (pred: (c: Cell) => boolean) => number;
  living: number; // living creatures on/next to the hex
  undead: number;
}

const isWaterCell = (c: Cell): boolean => c.ground === 'river' || c.ground === 'pond' || c.ground === 'ford';
const isTree = (c: Cell): boolean =>
  (c.feature === 'tree' || c.feature === 'pine' || c.feature === 'thicket') && c.fire !== 'burnt';

const DARK_SKY = (env: Environment): boolean => env.sky !== 'clear';

type Rule = (x: Context, add: (label: string, value: number) => void) => void;

const RULES: Record<AspectId, Rule> = {
  hydro: ({ cell, env, outdoors, count }, add) => {
    if (!outdoors) {
      add('Indoors, no water', -3);
      return;
    }
    const inWater = isWaterCell(cell);
    if (inWater) {
      // Already in it: the water around you adds nothing more.
      add('Ground level', -1);
      add(cell.ground === 'ford' ? 'Wading in the river' : 'In the water', 1.5);
    } else {
      add('Dry land', -1);
      const w = count(isWaterCell);
      if (w) add(`Water next to you ×${w}`, Math.min(2, w * 0.75));
    }
    if (env.sky === 'rain') add('Rain', 1);
    if (env.sky === 'storm') add('Downpour', 2);
  },

  foto: ({ cell, env, outdoors, count }, add) => {
    if (env.time === 'day') add('Daylight', 0);
    if (env.time === 'dusk') add('Dusk', -1);
    if (env.time === 'night') add('Moon and stars', -2);
    if (!outdoors) add('Indoors', -1);
    else if (DARK_SKY(env)) add(env.time === 'night' ? 'No moon (clouds)' : 'Sun behind clouds', env.sky === 'storm' ? -1.5 : -1);
    if (isTree(cell)) add('Dense trees', -1);
    else if (count(isTree) >= 3) add('Under the canopy', -0.5);
    if (cell.fire === 'burning') add('Standing in fire', 2);
    const f = count((c) => c.fire === 'burning');
    if (f) add(`Firelight ×${f}`, Math.min(2, f));
    if (outdoors && env.time === 'day' && env.sky === 'clear' && count(isWaterCell) >= 2) add('Sun glare off water', 0.5);
  },

  skoto: ({ cell, env, outdoors, count }, add) => {
    if (env.time === 'day') {
      add(outdoors ? 'Daylight' : 'Indoors by day', outdoors ? -3 : -1);
      if (outdoors && DARK_SKY(env)) add('Thick clouds', 2);
      if (outdoors && isTree(cell)) add('Shade of trees', 1);
    } else if (env.time === 'dusk') {
      add('Dusk', -1);
    } else {
      add('Night', 0);
      if (outdoors && DARK_SKY(env)) add('Clouded night', 1);
      if (isTree(cell) || count(isTree) >= 3) add('Forest at night', 1);
    }
    if (cell.fire === 'burning') add('Standing in fire', -2);
    const f = count((c) => c.fire === 'burning');
    if (f) add(`Firelight ×${f}`, -Math.min(2, f));
  },

  pneumo: ({ cell, env, outdoors, count }, add) => {
    if (!outdoors) {
      add('Indoors', -2);
      return;
    }
    const byForce = [-2, -1, 0, 0, 1, 2, 2][Math.max(0, Math.min(6, env.windForce))];
    add(`Wind force ${env.windForce}`, byForce);
    if (isTree(cell) || count(isTree) >= 3) add('Sheltered by trees', -1);
  },

  pyro: ({ cell, env, count }, add) => {
    if (cell.ground === 'ford' || cell.ground === 'river' || cell.ground === 'pond') {
      add('In water', -3);
      return;
    }
    add('No open fire', -2);
    if (env.sky === 'rain' || env.sky === 'storm') add('Everything is wet', env.sky === 'storm' ? -0.75 : -0.5);
    if (cell.fire === 'burning') add('Standing in fire', 4);
    if (cell.fire === 'burnt') add('Smouldering embers', 0.5);
    const f = count((c) => c.fire === 'burning');
    if (f) add(`Fire next to you ×${f}`, Math.min(4, f * 1.5));
  },

  geo: ({ cell, count, outdoors }, add) => {
    if (cell.ground === 'river' || cell.ground === 'pond') add('In the water', -3);
    else if (cell.ground === 'ford') add('Standing in a river', -2);
    else if (cell.ground === 'path') add('Packed gravel', 0);
    else add('Loose soil', -1);
    const r = count((c) => c.feature === 'rock');
    if (r) add(`Stone next to you ×${r}`, r * 0.75);
    if (!outdoors) add('Walls around you', 0.5);
  },

  bio: ({ cell, count, living, outdoors }, add) => {
    add('Living forest', 0);
    if (cell.ground === 'flowers' || cell.ground === 'tallgrass') add('Lush growth', 0.5);
    if (cell.ground === 'path') add('Trampled path', -0.5);
    if (count(isTree) >= 3) add('Thick with trees', 0.5);
    if (cell.fire === 'burnt' || cell.fire === 'burning') add('Scorched earth', -1.5);
    const b = count((c) => c.fire === 'burnt');
    if (b) add(`Burnt ground nearby ×${b}`, -Math.min(1, b * 0.25));
    if (living >= 3) add(`Crowd (${living} living)`, 0.5);
    if (!outdoors) add('Indoors', -0.5);
  },

  nekro: ({ cell, count, undead }, add) => {
    add('Forest', -1);
    if (cell.ground === 'forest') add('Rotting leaf litter', 1.5);
    if (cell.ground === 'pond' || count((c) => c.ground === 'pond')) add('Still water', 1);
    if (cell.fire === 'burnt') add('Ash of a fire', 2);
    const b = count((c) => c.fire === 'burnt');
    if (b) add(`Ash nearby ×${b}`, Math.min(1, b * 0.5));
    if (cell.corpses) add(`Died here ×${cell.corpses}`, Math.min(3, cell.corpses));
    const nc = count((c) => !!c.corpses);
    if (nc) add(`Death nearby ×${nc}`, Math.min(1, nc * 0.5));
    if (undead) add(`Undead presence ×${undead}`, undead * 0.5);
  },
};

export function readHex(b: Battle, h: Hex, env: Environment, opts: FilamentOptions = {}): HexFilaments | null {
  const cell = cellAt(b, h);
  if (!cell) return null;
  const near = neighbors(h).map((n) => cellAt(b, n)).filter((c): c is Cell => !!c);
  const around = new Set([hexKey(h), ...neighbors(h).map(hexKey)]);
  const nearUnits = b.units.filter((u) => u.hp > 0 && around.has(hexKey(u.at)));
  const undead = nearUnits.filter((u) => opts.isUndead?.(u)).length;
  const ctx: Context = {
    cell,
    env,
    outdoors: !cell.indoors,
    near,
    count: (pred) => near.filter(pred).length,
    living: nearUnits.length - undead,
    undead,
  };
  const out = {} as HexFilaments;
  for (const a of ASPECTS) {
    const parts: Part[] = [];
    RULES[a.id](ctx, (label, value) => parts.push({ label, value }));
    const raw = parts.reduce((s, p) => s + p.value, 0);
    out[a.id] = { raw, parts, level: Math.max(-3, Math.min(3, Math.round(raw))) };
  }
  return out;
}

/** Filaments for every hex on the map. */
export function readMap(b: Battle, env: Environment, opts: FilamentOptions = {}): Map<string, HexFilaments> {
  const out = new Map<string, HexFilaments>();
  for (const [key, cell] of Object.entries(b.cells)) {
    const r = readHex(b, cell.at, env, opts);
    if (r) out.set(key, r);
  }
  return out;
}
