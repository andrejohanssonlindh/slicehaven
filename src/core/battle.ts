import { DIRECTIONS, type Hex, hexAdd, hexDistance, hexEquals, hexKey, neighbors } from './hex';

/**
 * Battle state and rules: movement, targeting, damage. Pure and serialisable.
 * The engine renders this; it never decides rules itself.
 */
export type Team = 'party' | 'foe';

export interface Unit {
  id: string;
  kind: string; // sprite / stat block id
  name: string;
  team: Team;
  at: Hex;
  hp: number;
  maxHp: number;
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
  /** What the ground is, for magic and other terrain rules. */
  ground?: 'grass' | 'forest' | 'path' | 'tallgrass' | 'flowers' | 'river' | 'pond' | 'ford';
  /** What stands on the hex. */
  feature?: 'tree' | 'pine' | 'rock' | 'thicket' | 'mushrooms';
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

export const unitAt = (b: Battle, h: Hex): Unit | undefined => b.units.find((u) => u.hp > 0 && hexEquals(u.at, h));

/** Can a unit stand here? (not off-map, obstacle, water or occupied) */
export function canStand(b: Battle, h: Hex): boolean {
  const c = cellAt(b, h);
  return !!c && !c.obstacle && !c.water && !unitAt(b, h);
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
        const c = cellAt(b, n);
        if (!c || c.obstacle || c.water) continue;
        const occupant = unitAt(b, n);
        if (occupant && occupant.team !== unit.team) continue;
        out.set(k, { cost: step, parent: hexKey(h), canStop: !occupant });
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
    const c = cellAt(b, h);
    if (!c || c.obstacle || c.water) return false;
    const occ = unitAt(b, h);
    if (occ && (occ.team !== unit.team || i === path.length - 1)) return false;
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
      if (canStand(b, h)) out.push(h);
    }
  }
  return out;
}

/** Enemies (or allies, for heals) within `range` hexes. */
export function targetsInRange(b: Battle, unit: Unit, range: number, team: Team): Unit[] {
  return b.units.filter((u) => u.hp > 0 && u.team === team && hexDistance(u.at, unit.at) <= range);
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
  const party = b.units.filter((u) => u.hp > 0 && u.team !== unit.team);
  if (party.length === 0) return { path: [] };
  const target = party.reduce((best, u) => (hexDistance(u.at, unit.at) < hexDistance(best.at, unit.at) ? u : best));
  if (hexDistance(target.at, unit.at) === 1) return { path: [], target };
  const reach = walkReach(b, unit, range);
  let bestKey = hexKey(unit.at);
  let bestScore = hexDistance(unit.at, target.at) * 10;
  for (const [k, r] of reach) {
    if (!r.canStop) continue;
    const [q, rr] = k.split(',').map(Number);
    const score = hexDistance({ q, r: rr }, target.at) * 10 + r.cost; // closer first, then shorter
    if (score < bestScore) {
      bestScore = score;
      bestKey = k;
    }
  }
  const [q, r] = bestKey.split(',').map(Number);
  return { path: pathFromReach(reach, { q, r }), target };
}
