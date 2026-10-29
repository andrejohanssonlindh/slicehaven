import { type Environment, hourOf, moonLit, moonName } from './environment';

/**
 * Filaments: the rules for how strongly each magical aspect flows in a cell of
 * ground. The field that applies them over the world is `world3d/filaments3d.ts`.
 *
 * Based on Eon's "Omgivningens tillstånd" (seven levels, from magic-dead to
 * extremely strong). Here: -3 (magic-dead) .. +3 (extreme).
 *
 * A cell's reading = the conditions on that cell (time, sky, wind, indoors, its
 * ground, clouds and shadows) + what radiates into it from sources around it:
 * water, trees, stone, fire, ash, the dead, undead and the living. Each source
 * has a strength here, one cell away and two away (`Falloff`), and each kind of
 * source is capped so stacking stays sane. The sum is rounded and clamped.
 * Every contribution is kept so the UI can explain it.
 */
export type AspectId =
  | 'bio' | 'foto' | 'geo' | 'hydro' | 'nekro' | 'pneumo' | 'pyro' | 'skoto'
  | 'termo' | 'kryo' | 'helio' | 'astro' | 'selene' | 'kosmo' | 'ikono' | 'semo';

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
  { id: 'termo', name: 'Thermotropy', gloss: 'heat', color: '#e8503c' },
  { id: 'kryo', name: 'Cryotropy', gloss: 'cold', color: '#9fdcff' },
  { id: 'helio', name: 'Heliotropy', gloss: 'the sun', color: '#ffd23a' },
  { id: 'astro', name: 'Astrotropy', gloss: 'the stars', color: '#6f7cff' },
  { id: 'selene', name: 'Selenotropy', gloss: 'the moon', color: '#d6dcee' },
  { id: 'kosmo', name: 'Cosmotropy', gloss: 'the void', color: '#4a3a78' },
  { id: 'ikono', name: 'Iconotropy', gloss: 'symbols & patterns', color: '#e0a0e8' },
  { id: 'semo', name: 'Semotropy', gloss: 'signs & meanings', color: '#e6c27a' },
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

/** The ground of a cell, as the rules know it. */
export type Ground = 'grass' | 'forest' | 'path' | 'tallgrass' | 'flowers' | 'mud' | 'river' | 'pond' | 'ford';

/** What the rules need to know about one patch of ground (a cell of the field). */
export interface FCell {
  ground?: Ground;
  feature?: 'tree' | 'pine' | 'rock' | 'thicket';
  fire?: 'none' | 'burning' | 'burnt';
  /** How many dead lie here. */
  corpses?: number;
  indoors?: boolean;
}

/** Someone alive (or undead) standing in a cell. */
export interface FUnit {
  kind: string;
  team: 'party' | 'foe';
}

export interface FilamentOptions {
  /** Which units count as undead (they radiate necrotropy). */
  isUndead?: (u: FUnit) => boolean;
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

export const isWater = (c: FCell): boolean => c.ground === 'river' || c.ground === 'pond' || c.ground === 'ford';
export const isTall = (c: FCell): boolean =>
  (c.feature === 'tree' || c.feature === 'pine' || c.feature === 'thicket') && c.fire !== 'burnt';

export function emissions(c: FCell, units: FUnit[], env: Environment, opts: FilamentOptions): Emission[] {
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
    e('termo', 'Heat of fire', [3, 2, 1], 3.5);
    e('kryo', 'Warmth of fire', [-2, -1.5, -0.75], -2.5);
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
  cell: FCell;
  env: Environment;
  outdoors: boolean;
  clouded: boolean;
  /** Who casts a shadow onto this hex (tree/rock), if anyone. */
  shadowedBy: string | null;
  /** What breaks the wind here (a house upwind), if anything. Free-world fields only. */
  shelteredBy?: string | null;
  /** Close to people's homes. */
  settled?: boolean;
}

export type Base = (x: Context, add: (label: string, value: number) => void) => 'skipSources' | void;

/** Where people live: near homes, or on a road. */
const isHomely = (cell: FCell, settled?: boolean): boolean => !!settled || cell.ground === 'path';

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
    // By day a cloud deepens the dark; at night it works the other way, hiding the moon and stars that thin it.
    const gloom = env.time === 'day' ? 2 : env.time === 'dusk' ? 1 : -1;
    if (overcast(env)) add(env.time === 'night' ? 'Cloud hides moon and stars' : 'Overcast', gloom);
    else if (clouded) add(env.time === 'night' ? 'Cloud over the moon' : 'Under a cloud', gloom);
    if (shadowedBy) add(`In the shadow of a ${shadowedBy}`, 1);
  },

  pneumo: ({ env, outdoors, shelteredBy }, add) => {
    if (!outdoors) {
      add('Indoors', -2);
      return 'skipSources';
    }
    add(`Wind force ${env.windForce}`, [-2, -1, 0, 0, 1, 2, 2][Math.max(0, Math.min(6, env.windForce))]);
    if (shelteredBy && env.windForce > 0) add(`In the lee of a ${shelteredBy}`, -1);
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

  // --- heat and cold: the weather, the hour and what burns ---
  termo: ({ cell, env, outdoors }, add) => {
    if (isWater(cell)) add('Cool water', -1);
    if (!outdoors) {
      add('Walls hold warmth', 0.5);
      return;
    }
    if (env.time === 'day') add('Daylight warmth', 0.5);
    if (env.time === 'dusk') add('Evening', 0);
    if (env.time === 'night') add('Night chill', -1);
    const h = hourOf(env);
    if (env.time === 'day' && env.sky === 'clear' && h >= 10 && h <= 16) add('Midday sun', 0.5);
    if (overcast(env)) add('Damp air', env.sky === 'storm' ? -1 : -0.5);
    if (env.windForce >= 4) add('Biting wind', -0.5);
  },

  kryo: ({ cell, env, outdoors }, add) => {
    if (isWater(cell)) add('Cold water', 0.5);
    if (!outdoors) {
      add('Shelter from the cold', -1);
      return;
    }
    if (env.time === 'night') add('Night frost', 1);
    if (env.time === 'dusk') add('Cooling air', 0.5);
    if (env.time === 'day' && env.sky === 'clear') add('Sun-warmed air', -0.5);
    if (overcast(env)) add('Grey and raw', 0.5);
    if (env.windForce >= 4) add('Biting wind', 0.5);
  },

  // --- the sky: sun, stars, moon, the void. All read the clock. ---
  helio: ({ env, outdoors, clouded, shadowedBy }, add) => {
    if (!outdoors) {
      add('Indoors', -2);
      return;
    }
    const h = hourOf(env);
    if (env.time === 'night') {
      add('Sun below the horizon', -3);
      return;
    }
    if (env.time === 'dusk') add('Low sun', -1);
    else add('Sun above', 0);
    if (env.time === 'day' && h >= 10 && h <= 14) add('Sun at its height', 1);
    if (env.time === 'day' && env.sky === 'clear') add('Clear sky', 0.5);
    if (overcast(env)) add('Overcast', env.sky === 'storm' ? -1.5 : -1);
    else if (clouded) add('Under a cloud', -1);
    if (shadowedBy) add(`In the shadow of a ${shadowedBy}`, -1);
  },

  selene: ({ env, outdoors, clouded }, add) => {
    if (!outdoors) {
      add('Indoors', -2);
      return;
    }
    if (env.time !== 'night') {
      add(env.time === 'dusk' ? 'Moon not yet risen' : 'Moon below the horizon', env.time === 'dusk' ? -1 : -3);
      return;
    }
    add(moonName(env.moon), -2 + 4 * moonLit(env.moon));
    if (overcast(env)) add('Cloud hides the moon', env.sky === 'storm' ? -2 : -1.5);
    else if (clouded) add('Cloud over the moon', -1);
  },

  astro: ({ env, outdoors, clouded }, add) => {
    if (!outdoors) {
      add('No sky', -3);
      return;
    }
    if (env.time === 'day') {
      add('Stars lost in daylight', -3);
      return;
    }
    if (env.time === 'dusk') {
      add('Stars not yet out', -1);
      return;
    }
    add('Night sky', 0);
    if (env.sky === 'clear') add('Clear night', 1);
    const lit = moonLit(env.moon);
    if (lit > 0.25) add('Moonlight washes out the stars', -1.5 * lit);
    if (overcast(env)) add('Cloud hides the stars', env.sky === 'storm' ? -2.5 : -2);
    else if (clouded) add('Cloud over the stars', -1.5);
  },

  kosmo: ({ env, outdoors }, add) => {
    if (!outdoors) {
      add('Walls shut out the void', -1);
      return;
    }
    add('Under the sky', 0);
    if (env.time === 'night' && env.sky === 'clear') add('Open night sky', 1);
    if (overcast(env)) add('A lid of cloud', -1);
  },

  // --- meaning: the book gives no ambient strength for these two, only where they live (music, pictures, symbols,
  //     colours; writing and signs). So: weak in open country, normal where people live, and made things add to it ---
  ikono: ({ cell, outdoors, settled }, add) => {
    if (!outdoors) add('Indoors, among made things', 0);
    else if (isHomely(cell, settled)) add('Near homes: colours, signs, songs', 0);
    else add('Open country: no marks, no song', -1);
  },

  semo: ({ cell, outdoors, settled }, add) => {
    if (!outdoors) add('Indoors, among made things', 0);
    else if (isHomely(cell, settled)) add('Near homes: signs to read', 0);
    else add('Open country: nothing to read', -1);
    if (outdoors && cell.ground === 'path') add('A road: it says where to go', 0.5);
  },

  nekro: ({ cell }, add) => {
    // The book gives no ambient figure for death: it is normal everywhere, and comes from corpses, the sick,
    // refuse and rot (the sources below). Living wood holds it back a little; fallen leaves don't add to it.
    add('Normal', 0);
    if (cell.ground === 'forest') add('Living wood', -0.5);
  },
};

