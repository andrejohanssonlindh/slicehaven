import type { AspectId, HexFilaments } from './filaments';
import { type Hex, hexDistance, hexKey, hexesWithin } from './hex';

/**
 * Sensing on the map (groundwork, not wired into play yet).
 *
 * A character using the mystic skill Sensing feels the filaments around them.
 * The better the roll, the further the sense reaches and the sharper it gets:
 * a weak roll only tells "stronger / weaker than normal" for the hexes next to
 * you, a great one gives exact levels, with what causes them, several hexes out.
 * The readings come from the same filament map the Magic tab shows (filaments.ts).
 */

/** How clearly a hex is sensed. */
export type SenseDetail = 'sign' | 'level' | 'exact';

export interface SensedHex {
  hex: Hex;
  distance: number;
  detail: SenseDetail;
  /** sign: −1/0/+1; level/exact: −3..+3. */
  aspects: Partial<Record<AspectId, number>>;
  /** Only with 'exact': what makes each aspect strong or weak. */
  why?: Partial<Record<AspectId, string[]>>;
}

export interface SenseResult {
  radius: number;
  hexes: SensedHex[];
}

/** Reach in hexes for a roll result (successes or advantage, ≥ 0). 0 = only your own hex. */
export function senseRadius(power: number): number {
  if (power <= 0) return 0;
  return Math.min(6, power <= 3 ? power : 3 + Math.floor((power - 3) / 2));
}

/** Detail falls off with distance: close hexes are sensed best. */
export function senseDetail(power: number, distance: number): SenseDetail {
  const margin = power - distance;
  return margin >= 3 ? 'exact' : margin >= 1 ? 'level' : 'sign';
}

export function sense(map: Map<string, HexFilaments>, caster: Hex, power: number, only?: AspectId[]): SenseResult {
  const radius = senseRadius(power);
  const hexes: SensedHex[] = [];
  for (const h of hexesWithin(caster, radius)) {
    const f = map.get(hexKey(h));
    if (!f) continue;
    const distance = hexDistance(caster, h);
    const detail = senseDetail(power, distance);
    const out: SensedHex = { hex: h, distance, detail, aspects: {} };
    for (const id of (only ?? Object.keys(f)) as AspectId[]) {
      const r = f[id];
      if (!r) continue;
      out.aspects[id] = detail === 'sign' ? Math.sign(r.level) : r.level;
      if (detail === 'exact') (out.why ??= {})[id] = r.parts.map((p) => p.label);
    }
    hexes.push(out);
  }
  return { radius, hexes };
}
