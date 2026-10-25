/**
 * Hex grid math, axial coordinates, pointy-top layout.
 * Reference: https://www.redblobgames.com/grids/hexagons/
 */
export interface Hex {
  q: number;
  r: number;
}

export const hex = (q: number, r: number): Hex => ({ q, r });

export const hexKey = (h: Hex): string => `${h.q},${h.r}`;

export function parseHexKey(key: string): Hex {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

/** 0 E, 1 NE, 2 NW, 3 W, 4 SW, 5 SE */
export const DIRECTIONS: readonly Hex[] = [
  hex(1, 0), hex(1, -1), hex(0, -1), hex(-1, 0), hex(-1, 1), hex(0, 1),
];

/** Offset ("odd-r": odd rows shifted right) grid position -> axial hex. Maps are authored in offset coords. */
export const offsetToHex = (col: number, row: number): Hex => hex(col - (row - (row & 1)) / 2, row);

export const hexToOffset = (h: Hex): { col: number; row: number } => ({
  col: h.q + (h.r - (h.r & 1)) / 2,
  row: h.r,
});

export const hexEquals = (a: Hex, b: Hex): boolean => a.q === b.q && a.r === b.r;

export const hexAdd = (a: Hex, b: Hex): Hex => hex(a.q + b.q, a.r + b.r);

export const neighbors = (h: Hex): Hex[] => DIRECTIONS.map((d) => hexAdd(h, d));

export function hexDistance(a: Hex, b: Hex): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export function hexToPixel(h: Hex, size: number): { x: number; y: number } {
  return {
    x: size * Math.sqrt(3) * (h.q + h.r / 2),
    y: size * 1.5 * h.r,
  };
}

export function pixelToHex(x: number, y: number, size: number): Hex {
  const q = ((Math.sqrt(3) / 3) * x - y / 3) / size;
  const r = ((2 / 3) * y) / size;
  return hexRound(q, r);
}

function hexRound(q: number, r: number): Hex {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return hex(rq + 0, rr + 0); // +0 normalises -0
}

/** Corner points of a hex centred at origin, for drawing. */
export function hexCorners(size: number): { x: number; y: number }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return { x: size * Math.cos(a), y: size * Math.sin(a) };
  });
}

/**
 * Breadth-first reachable hexes within `range` steps, only through passable hexes.
 * Returns a map of hexKey -> cost.
 */
export function reachable(
  start: Hex,
  range: number,
  passable: (h: Hex) => boolean,
): Map<string, number> {
  const costs = new Map<string, number>([[hexKey(start), 0]]);
  let frontier = [start];
  for (let step = 1; step <= range; step++) {
    const next: Hex[] = [];
    for (const h of frontier) {
      for (const n of neighbors(h)) {
        const k = hexKey(n);
        if (costs.has(k) || !passable(n)) continue;
        costs.set(k, step);
        next.push(n);
      }
    }
    frontier = next;
  }
  return costs;
}
