import { rollTest } from '../dice';
import type { Rng } from '../rng';
import type { StateDef } from './state';

/**
 * Effects on things (plan B7; design: director/design/effects.md). An effect on a thing is a state on its kind (saved,
 * redrawn and gated like any state, `state.ts`); its rules are here, pure, taking what stands near what and giving
 * back what changed. Its numbers are data (`content/effects/`). The world part (`engine3d/world/effects.ts`) runs a
 * round every 4 seconds of play, the rules' phase, in a fight and out of it.
 *
 * Burning, from the rules: a fire near something rolls its dice (less the wet) against the material's difficulty;
 * once it catches it grows a die a round to what the material can give; whatever burns is a fire to what is near it;
 * rain takes dice off; the fuel runs out and it is burnt.
 */

/** What a thing is made of, as fire sees it: the rules' classes of burning material. */
export type Material = 'straw' | 'cloth' | 'wood' | 'wool' | 'leather';
export const MATERIALS: readonly Material[] = ['straw', 'cloth', 'wood', 'wool', 'leather'];

/** The states a kind gets for having a material: the fire's dice on it (0: not burning), and burnt for good. */
export const BURN_STATES: Record<'burning' | 'burnt', StateDef> = { burning: { default: 0 }, burnt: { default: false } };

/** The numbers burning runs on (`content/effects/burning.ts`). */
export interface BurnRules {
  /** Per material: the difficulty a fire's roll must reach to catch it, the most dice it burns with, and seconds of fuel. */
  materials: Record<Material, { catches: number; peak: number; fuel: number }>;
  /** A round, seconds. */
  round: number;
  /** How far a fire reaches to catch something, metres: `reach` plus `perDie` for each of its dice (measured edge to middle, roughly). */
  reach: number;
  perDie: number;
}

/** Something that can burn, where it stands, and how it is now. */
export interface Burnable {
  id: string;
  kind: string;
  material: Material;
  x: number;
  z: number;
  /** The house it is in (null outdoors) and the storey. */
  house: string | null;
  level: number;
  /** The fire's dice on it now (0: not burning). */
  burning: number;
  burnt: boolean;
  /** Seconds it has burnt so far. */
  spent: number;
  /** Dice of wet on it (rain, a downpour), taken off a fire's dice, its own too. */
  wet: number;
}

/** A fire that can set things alight: a hearth, a torch, a campfire (its dice), or something burning. */
export interface FireSource {
  id: string;
  x: number;
  z: number;
  house: string | null;
  level: number;
  dice: number;
}

/** What changed on one thing in a round. */
export interface BurnChange {
  id: string;
  kind: string;
  burning: number;
  burnt: boolean;
  /** caught: it took fire; grew: a die more; out: put out by the wet; burnt: the fuel is spent. */
  why: 'caught' | 'grew' | 'out' | 'burnt';
  /** For `caught`: what set it alight. */
  from?: string;
}

/**
 * One round of fire among some things: what catches, grows, goes out and burns out. The things burning are fires to
 * the rest (pass them in `sources` too, or not: they are added here). `spent` is advanced on what burns.
 */
export function burnRound(things: Burnable[], sources: readonly FireSource[], rules: BurnRules, rng: Rng): BurnChange[] {
  const out: BurnChange[] = [];
  const fires: FireSource[] = [...sources, ...things.filter((t) => t.burning > 0 && !t.burnt).map((t) => ({ id: t.id, x: t.x, z: t.z, house: t.house, level: t.level, dice: t.burning }))];
  for (const t of things) {
    if (t.burnt) continue;
    const m = rules.materials[t.material];
    if (t.burning > 0) {
      // The wet takes its dice off the fire; nothing left, it's out.
      if (t.burning - t.wet <= 0) {
        out.push({ id: t.id, kind: t.kind, burning: 0, burnt: false, why: 'out' });
        continue;
      }
      t.spent += rules.round;
      if (t.spent >= m.fuel) {
        out.push({ id: t.id, kind: t.kind, burning: 0, burnt: true, why: 'burnt' });
        continue;
      }
      if (t.burning < m.peak) out.push({ id: t.id, kind: t.kind, burning: t.burning + 1, burnt: false, why: 'grew' });
      continue;
    }
    // Not burning: the strongest fire that reaches it tries to catch it.
    let best: FireSource | null = null;
    for (const f of fires) {
      if (f.id === t.id || f.house !== t.house || f.level !== t.level) continue;
      if (Math.hypot(f.x - t.x, f.z - t.z) > rules.reach + rules.perDie * f.dice) continue;
      if (!best || f.dice > best.dice) best = f;
    }
    if (!best) continue;
    const dice = best.dice - t.wet;
    if (dice <= 0) continue;
    if (rollTest({ n: dice, mod: 0 }, m.catches, rng).success) out.push({ id: t.id, kind: t.kind, burning: 1, burnt: false, why: 'caught', from: best.id });
  }
  return out;
}

/** Dice of wet on things out of doors, from the weather: soaked through in a storm, wet in rain, damp for a while after. */
export function weatherWet(rain: number, storm: boolean, damp: number): number {
  if (storm) return 4;
  if (rain > 0.3) return 2;
  return damp > 0.5 ? 1 : 0;
}
