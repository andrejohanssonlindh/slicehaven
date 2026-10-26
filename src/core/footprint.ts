import { DIRECTIONS, type Hex, hex, hexAdd, hexDistance, hexKey } from './hex';

/**
 * Footprints: things bigger than one hex (a boulder, a cart, a gate, a troll).
 * A shape is a list of axial offsets from the thing's anchor hex; the anchor is
 * always offset (0,0). Static scenery lists its hexes directly; units carry a
 * shape and move by their anchor.
 */
export type Shape = readonly Hex[];

export const SHAPES = {
  /** One hex: the default for everything. */
  one: [hex(0, 0)],
  /** Two hexes side by side (east of the anchor). */
  two: [hex(0, 0), hex(1, 0)],
  /** Three hexes in a triangle: anchor, east, and the one below between them. */
  three: [hex(0, 0), hex(1, 0), hex(0, 1)],
  /** A hex and its six neighbours. */
  seven: [hex(0, 0), ...DIRECTIONS],
} as const satisfies Record<string, Shape>;

/** The hexes a shape covers when its anchor is at `at`. */
export const cover = (at: Hex, shape: Shape = SHAPES.one): Hex[] => shape.map((o) => hexAdd(at, o));

/** Fewest steps between any hex of `a` and any hex of `b` (0 if they overlap). */
export function gap(a: readonly Hex[], b: readonly Hex[]): number {
  let best = Infinity;
  for (const x of a) for (const y of b) best = Math.min(best, hexDistance(x, y));
  return best;
}

/** Next to (or overlapping) each other. */
export const touching = (a: readonly Hex[], b: readonly Hex[]): boolean => gap(a, b) <= 1;

/** The hexes around a footprint: next to it but not part of it. */
export function around(hexes: readonly Hex[]): Hex[] {
  const inside = new Set(hexes.map(hexKey));
  const seen = new Set<string>();
  const out: Hex[] = [];
  for (const h of hexes) {
    for (const d of DIRECTIONS) {
      const n = hexAdd(h, d);
      const k = hexKey(n);
      if (inside.has(k) || seen.has(k)) continue;
      seen.add(k);
      out.push(n);
    }
  }
  return out;
}
