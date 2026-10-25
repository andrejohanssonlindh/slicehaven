import { type Battle, type Cell, cellAt, unitAt } from './battle';
import { type Environment, SKY_CLOUD, type Sky, windVector } from './environment';
import { DIRECTIONS, type Hex, hexAdd, hexSpace } from './hex';
import { fbm } from './noise';
import type { Rng } from './rng';

/**
 * The world between turns: clouds drift with the wind, fires spread and burn
 * out, storms throw lightning. It changes only when a turn passes, so the
 * board stays readable while you plan.
 */
export interface WorldState {
  turn: number;
  /** Cloud field offset, in hex units. */
  cloudX: number;
  cloudY: number;
}

export const newWorld = (): WorldState => ({ turn: 1, cloudX: 0, cloudY: 0 });

/** Cloud shadow strength at a point in hex space, 0..1 (soft edge for visuals). */
export function cloudShade(x: number, y: number, cloudX: number, cloudY: number, cover: number): number {
  if (cover <= 0.001) return 0;
  // More cover lowers the threshold: clear skies get the odd small cloud, storms are mostly shadow.
  const threshold = 0.6 - cover * 0.1;
  const n = fbm((x - cloudX) / 2.6, (y - cloudY) / 2.2, 50, 3);
  return Math.max(0, Math.min(1, (n - threshold) * 12 + 0.5));
}

/** Is this hex under a cloud right now? (The rules' yes/no version of cloudShade.) */
export function isClouded(h: Hex, w: WorldState, sky: Sky): boolean {
  const p = hexSpace(h);
  return cloudShade(p.x, p.y, w.cloudX, w.cloudY, SKY_CLOUD[sky]) >= 0.5;
}

/** How easily a hex catches fire from a neighbour (before wind and weather). */
function flammability(c: Cell): number {
  if (c.feature === 'thicket') return 0.45;
  if (c.feature === 'tree' || c.feature === 'pine') return 0.35;
  if (c.ground === 'tallgrass') return 0.5;
  if (c.ground === 'forest') return 0.3;
  return 0.25;
}

/** How many turns a fire lasts on this hex. */
function burnTurns(c: Cell, env: Environment): number {
  const base = c.feature === 'tree' || c.feature === 'pine' ? 3 : 2;
  const wet = env.sky === 'rain' || env.sky === 'storm' ? 1 : 0;
  return Math.max(1, base - wet);
}

/** Set a hex on fire. Returns false if it can't burn. */
export function ignite(c: Cell, env: Environment): boolean {
  if (!c.flammable || c.fire !== 'none') return false;
  c.fire = 'burning';
  c.burnTurns = burnTurns(c, env);
  return true;
}

export interface WorldEvents {
  strikes: Hex[];
  ignited: Hex[];
  burntOut: Hex[];
  /** Damage dealt to units this step (unit id -> amount, with the reason). */
  damage: { unitId: string; amount: number; reason: 'fire' | 'lightning' }[];
}

/** Advance the world by one turn. Mutates battle and world state. */
export function stepWorld(b: Battle, env: Environment, w: WorldState, rng: Rng): WorldEvents {
  const ev: WorldEvents = { strikes: [], ignited: [], burntOut: [], damage: [] };
  const wind = windVector(env);

  // 1. Clouds drift with the wind.
  const speed = 0.3 + env.windForce * 0.3;
  w.cloudX += wind.x * speed;
  w.cloudY += wind.y * speed;

  // 2. Fire spreads, then burns down.
  const burning = Object.values(b.cells).filter((c) => c.fire === 'burning');
  const wet = env.sky === 'storm' ? 0.25 : env.sky === 'rain' ? 0.4 : 1;
  for (const c of burning) {
    DIRECTIONS.forEach((d) => {
      const n = cellAt(b, hexAdd(c.at, d));
      if (!n || !n.flammable || n.fire !== 'none') return;
      // Downwind spreads more, upwind less. Directions are roughly screen-aligned.
      const dir = hexSpace(d);
      const len = Math.hypot(dir.x, dir.y);
      const along = (dir.x * wind.x + dir.y * wind.y) / len;
      const p = Math.min(0.9, flammability(n) * (1 + along * env.windForce * 0.15) * wet);
      if (rng.next() < p && ignite(n, env)) ev.ignited.push(n.at);
    });
  }
  for (const c of burning) {
    c.burnTurns = (c.burnTurns ?? 1) - 1 - (wet < 1 && rng.next() < 0.5 ? 1 : 0);
    if (c.burnTurns <= 0) {
      c.fire = 'burnt';
      c.burnTurns = undefined;
      if (c.feature === 'thicket') c.obstacle = false; // burnt away
      ev.burntOut.push(c.at);
    }
  }

  // 3. Storm: at most one bolt per turn, drawn to tall things and clouded hexes.
  if (env.sky === 'storm' && rng.next() < 0.75) {
    const cells = Object.values(b.cells);
    const weights = cells.map((c) => (c.obstacle && c.feature !== 'rock' ? 4 : 1) * (isClouded(c.at, w, env.sky) ? 2 : 1));
    let pick = rng.next() * weights.reduce((s, x) => s + x, 0);
    const target = cells.find((_, i) => (pick -= weights[i]) <= 0) ?? cells[0];
    ev.strikes.push(target.at);
    const victim = unitAt(b, target.at);
    if (victim) ev.damage.push({ unitId: victim.id, amount: 3, reason: 'lightning' });
    if (ignite(target, env)) ev.ignited.push(target.at);
  }

  // 4. Standing in fire hurts.
  for (const u of b.units) {
    if (u.hp > 0 && cellAt(b, u.at)?.fire === 'burning') ev.damage.push({ unitId: u.id, amount: 1, reason: 'fire' });
  }

  w.turn += 1;
  return ev;
}
