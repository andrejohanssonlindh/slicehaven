import { type Shape, cover, gap } from './footprint';
import { DIRECTIONS, type Hex, hexAdd, hexDistance, hexKey, neighbors } from './hex';

/**
 * Battle state and rules: movement, targeting, damage. Pure and serialisable.
 * The engine renders this; it never decides rules itself.
 */
export type Team = 'party' | 'foe' | 'npc';

export interface Unit {
  id: string;
  kind: string; // sprite / stat block id
  name: string;
  team: Team;
  at: Hex;
  hp: number;
  maxHp: number;
  /** Bigger than one hex: offsets from `at` (see core/footprint). Default one hex. */
  shape?: Shape;
}

export type FireState = 'none' | 'burning' | 'burnt';

export interface Cell {
  at: Hex;
  /** Blocks movement and line of sight (trees, rocks...). Burnt obstacles stay obstacles. */
  obstacle: boolean;
  /** Can catch fire. */
  flammable: boolean;
  water: boolean;
  fire: FireState;
  /** Turns left before a burning hex burns out. */
  burnTurns?: number;
  /** What the ground is, for magic and other terrain rules. */
  ground?: 'grass' | 'forest' | 'path' | 'tallgrass' | 'flowers' | 'mud' | 'river' | 'pond' | 'ford';
  /** What stands on the hex. */
  feature?: 'tree' | 'pine' | 'rock' | 'thicket' | 'mushrooms' | 'wall' | 'gate' | 'cart' | 'house' | 'campfire';
  /** Scenery that sits here (an id from the scene); big things cover several hexes. */
  object?: string;
  /** Under a roof. */
  indoors?: boolean;
  /** Creatures that died here (feeds necrotropy). */
  corpses?: number;
}

export interface Battle {
  cells: Record<string, Cell>;
  units: Unit[];
}

export const cellAt = (b: Battle, h: Hex): Cell | undefined => b.cells[hexKey(h)];

/** Every hex a unit covers. */
export const unitHexes = (u: Unit): Hex[] => cover(u.at, u.shape);

export const unitAt = (b: Battle, h: Hex): Unit | undefined => {
  const k = hexKey(h);
  return b.units.find((u) => u.hp > 0 && unitHexes(u).some((x) => hexKey(x) === k));
};

/** Steps between two units, edge to edge (big units are next to you if any part is). */
export const unitGap = (a: Unit, b: Unit): number => gap(unitHexes(a), unitHexes(b));

/** Can a one-hex unit stand here? (not off-map, obstacle, water or occupied) */
export function canStand(b: Battle, h: Hex): boolean {
  const c = cellAt(b, h);
  return !!c && !c.obstacle && !c.water && !unitAt(b, h);
}

/**
 * Could `unit` have its anchor at `at`? 'stop' = fits; 'pass' = can move through
 * (only allies in the way); 'blocked' = a wall, water, the map edge or an enemy.
 */
export function fit(b: Battle, unit: Unit, at: Hex): 'stop' | 'pass' | 'blocked' {
  let result: 'stop' | 'pass' = 'stop';
  for (const h of cover(at, unit.shape)) {
    const c = cellAt(b, h);
    if (!c || c.obstacle || c.water) return 'blocked';
    const occ = unitAt(b, h);
    if (!occ || occ === unit) continue;
    if (occ.team !== unit.team) return 'blocked';
    result = 'pass';
  }
  return result;
}

export interface Reach {
  cost: number;
  parent?: string;
  /** False for hexes you can pass through (allies) but not end on. */
  canStop: boolean;
}

/**
 * Walk: any path up to `range` steps. Can pass through allies, not enemies,
 * obstacles or water. Can't end on an occupied hex.
 */
export function walkReach(b: Battle, unit: Unit, range: number): Map<string, Reach> {
  const out = new Map<string, Reach>([[hexKey(unit.at), { cost: 0, canStop: true }]]);
  let frontier = [unit.at];
  for (let step = 1; step <= range; step++) {
    const next: Hex[] = [];
    for (const h of frontier) {
      for (const n of neighbors(h)) {
        const k = hexKey(n);
        if (out.has(k)) continue;
        const f = fit(b, unit, n);
        if (f === 'blocked') continue;
        out.set(k, { cost: step, parent: hexKey(h), canStop: f === 'stop' });
        next.push(n);
      }
    }
    frontier = next;
  }
  return out;
}

/** Shortest path (excluding the start) from a reach map. */
export function pathFromReach(reach: Map<string, Reach>, target: Hex): string[] {
  const path: string[] = [];
  let k: string | undefined = hexKey(target);
  while (k && reach.get(k)?.parent !== undefined) {
    path.unshift(k);
    k = reach.get(k)!.parent;
  }
  return path;
}

/** Is a hand-plotted walk path legal? Each step adjacent, passable, within range. */
export function isValidWalk(b: Battle, unit: Unit, path: Hex[], range: number): boolean {
  if (path.length === 0 || path.length > range) return false;
  let prev = unit.at;
  for (let i = 0; i < path.length; i++) {
    const h = path[i];
    if (hexDistance(prev, h) !== 1) return false;
    const f = fit(b, unit, h);
    if (f === 'blocked' || (f === 'pass' && i === path.length - 1)) return false;
    prev = h;
  }
  return true;
}

/** Jump: straight lines only, up to `range`, over anything. Must land on a free hex. */
export function jumpTargets(b: Battle, unit: Unit, range: number): Hex[] {
  const out: Hex[] = [];
  for (const d of DIRECTIONS) {
    let h = unit.at;
    for (let i = 1; i <= range; i++) {
      h = hexAdd(h, d);
      if (!cellAt(b, h)) break; // edge of the map
      if (fit(b, unit, h) === 'stop') out.push(h);
    }
  }
  return out;
}

/** Enemies (or allies, for heals) within `range` hexes. */
export function targetsInRange(b: Battle, unit: Unit, range: number, team: Team): Unit[] {
  return b.units.filter((u) => u.hp > 0 && u.team === team && unitGap(u, unit) <= range);
}

export function damage(u: Unit, amount: number): number {
  const dealt = Math.min(u.hp, amount);
  u.hp -= dealt;
  return dealt;
}

export function heal(u: Unit, amount: number): number {
  const healed = Math.min(u.maxHp - u.hp, amount);
  u.hp += healed;
  return healed;
}

/**
 * Simple monster AI: walk toward the nearest party unit (up to `range`),
 * stopping as close as possible. Returns the path taken and the target.
 */
export function aiMove(b: Battle, unit: Unit, range: number): { path: string[]; target?: Unit } {
  const party = b.units.filter((u) => u.hp > 0 && u.team !== unit.team && u.team !== 'npc');
  if (party.length === 0) return { path: [] };
  const target = party.reduce((best, u) => (unitGap(u, unit) < unitGap(best, unit) ? u : best));
  if (unitGap(target, unit) === 1) return { path: [], target };
  const reach = walkReach(b, unit, range);
  const targetHexes = unitHexes(target);
  let bestKey = hexKey(unit.at);
  let bestScore = gap(unitHexes(unit), targetHexes) * 10;
  for (const [k, r] of reach) {
    if (!r.canStop) continue;
    const [q, rr] = k.split(',').map(Number);
    const score = gap(cover({ q, r: rr }, unit.shape), targetHexes) * 10 + r.cost; // closer first, then shorter
    if (score < bestScore) {
      bestScore = score;
      bestKey = k;
    }
  }
  const [q, r] = bestKey.split(',').map(Number);
  return { path: pathFromReach(reach, { q, r }), target };
}
