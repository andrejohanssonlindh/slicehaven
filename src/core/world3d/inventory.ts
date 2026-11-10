import type { Size } from './carry';

/**
 * The pack (plan B6, items and inventory; design: director/design/inventory.md). Pure rules.
 *
 * - **Grids.** Someone carries things in **grids** of square cells (a cell is about a fist, 10 cm): their **pockets**
 *   (small grids that take only pocket-sized things) and their **pack**, a rectangle worn on the back that takes pocket
 *   and bag-sized things. A pack has **sides** where **add-ons** are fitted: a side pouch is an item that, fitted, gives
 *   a grid of its own beside the pack (the director, 2026-11-10: "the backpack rectangular or square, with add-ons on
 *   the side").
 * - **Shapes.** An item takes a **shape** of cells: a rectangle (`[w, h]`), or an odd shape written as rows (`'##..'`,
 *   `'####'`). Left out, its size gives one: pocket 1×1, bag 2×2. Things bigger than a bag (in the hands, strapped,
 *   heavy) never go in a grid.
 * - **Placing.** An item lies at a cell of a grid (its shape's top left), turned 0–3 quarter turns. It fits when every
 *   cell is inside the grid and free. `findSpot` finds the first place (pockets first for pocket things), `autoPack`
 *   lays everything again, biggest first.
 */

/** A cell, as x (across) and y (down) from the shape's or grid's top left. */
export type Cell = readonly [number, number];
/** Quarter turns, clockwise. */
export type Turn = 0 | 1 | 2 | 3;

/** How a kind says its shape: a rectangle `[w, h]`, or rows with `#` for a cell (`['##..', '####']`). */
export type ShapeDef = readonly [number, number] | readonly string[];

/** Where an item lies in someone's grids. Plain data, saved on the loose thing (`Loose.in`). */
export interface PackSpot {
  grid: string;
  x: number;
  y: number;
  turn: Turn;
}

/** One grid someone carries: pockets, their pack, a fitted add-on. */
export interface Grid {
  id: string;
  w: number;
  h: number;
  /** The sizes it takes (pockets: pocket things; the pack: pocket and bag things). */
  takes: readonly Size[];
}

/** An item as the rules see it: its id, its shape (unturned) and size, and where it lies (if it does). */
export interface PackItem {
  id: string;
  cells: readonly Cell[];
  size: Size;
  at?: PackSpot;
}

/** The sizes that can go in a grid at all. */
export const PACKABLE: readonly Size[] = ['pocket', 'bag'];

/** The cells of a shape, unturned, from what a kind says (or its size). Null: it can't go in a grid. */
export function cellsOf(shape: ShapeDef | undefined, size: Size | undefined): Cell[] | null {
  if (!size || !PACKABLE.includes(size)) return null;
  if (!shape) return size === 'pocket' ? rect(1, 1) : rect(2, 2);
  if (typeof shape[0] === 'number') return rect(shape[0] as number, shape[1] as number);
  const cells: Cell[] = [];
  (shape as readonly string[]).forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && cells.push([x, y])));
  return normal(cells);
}

const rect = (w: number, h: number): Cell[] => Array.from({ length: w * h }, (_, i): Cell => [i % w, Math.floor(i / w)]);

/** Moved so its least x and y are 0. */
function normal(cells: readonly Cell[]): Cell[] {
  const mx = Math.min(...cells.map((c) => c[0])), my = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]): Cell => [x - mx, y - my]);
}

/** How wide and tall a set of cells is. */
export function extent(cells: readonly Cell[]): { w: number; h: number } {
  return { w: Math.max(...cells.map((c) => c[0])) + 1, h: Math.max(...cells.map((c) => c[1])) + 1 };
}

/** A shape turned clockwise by quarter turns, moved back to the top left. */
export function turned(cells: readonly Cell[], turn: Turn): Cell[] {
  let out: Cell[] = [...cells];
  for (let i = 0; i < turn; i++) {
    const h = extent(out).h;
    out = out.map(([x, y]): Cell => [h - 1 - y, x]);
  }
  return normal(out);
}

/** The cells an item covers in its grid where it lies. */
export function coverOf(cells: readonly Cell[], at: PackSpot): Cell[] {
  return turned(cells, at.turn).map(([x, y]): Cell => [x + at.x, y + at.y]);
}

const key = (x: number, y: number): string => `${x},${y}`;

/** The cells of a grid taken by the items lying in it (leaving out one, the item being moved). */
export function takenIn(grid: string, items: readonly PackItem[], except?: string): Set<string> {
  const s = new Set<string>();
  for (const it of items) if (it.at?.grid === grid && it.id !== except) for (const [x, y] of coverOf(it.cells, it.at)) s.add(key(x, y));
  return s;
}

/** Does a grid take things of this size? */
export const takes = (g: Grid, size: Size): boolean => g.takes.includes(size);

/** Does the item fit at this spot: a grid that takes its size, inside it, and on free cells? */
export function fits(grids: readonly Grid[], items: readonly PackItem[], item: Pick<PackItem, 'id' | 'cells' | 'size'>, at: PackSpot): boolean {
  const g = grids.find((x) => x.id === at.grid);
  if (!g || !takes(g, item.size)) return false;
  const taken = takenIn(g.id, items, item.id);
  return coverOf(item.cells, at).every(([x, y]) => x >= 0 && y >= 0 && x < g.w && y < g.h && !taken.has(key(x, y)));
}

/** The turns worth trying for a shape (a square needs none; a rectangle two; an odd shape all four). */
function turnsFor(cells: readonly Cell[]): Turn[] {
  const { w, h } = extent(cells);
  if (cells.length === w * h) return w === h ? [0] : [0, 1];
  return [0, 1, 2, 3];
}

/** The grids to try for a size, in order: pocket things in the pockets first, the rest in the pack first. */
function gridOrder(grids: readonly Grid[], size: Size): Grid[] {
  const ok = grids.filter((g) => takes(g, size));
  const pockety = (g: Grid): boolean => g.takes.length === 1 && g.takes[0] === 'pocket';
  return size === 'pocket' ? [...ok.filter(pockety), ...ok.filter((g) => !pockety(g))] : ok;
}

/**
 * The first place an item fits: grid by grid (`gridOrder`), row by row, trying its turns. Only `grids` given are tried
 * (pass one to keep it there). Null: no room anywhere.
 */
export function findSpot(grids: readonly Grid[], items: readonly PackItem[], item: Pick<PackItem, 'id' | 'cells' | 'size'>): PackSpot | null {
  for (const g of gridOrder(grids, item.size)) {
    for (const turn of turnsFor(item.cells)) {
      for (let y = 0; y < g.h; y++) {
        for (let x = 0; x < g.w; x++) {
          const at: PackSpot = { grid: g.id, x, y, turn };
          if (fits(grids, items, item, at)) return at;
        }
      }
    }
  }
  return null;
}

/**
 * Lay everything again, biggest first, each where it first fits (the auto-pack button). Returns where each goes, or
 * null if not all of them fit that way (then nothing should move).
 */
export function autoPack(grids: readonly Grid[], items: readonly PackItem[]): Record<string, PackSpot> | null {
  const order = [...items].sort((a, b) => b.cells.length - a.cells.length || (a.size === 'bag' ? -1 : 1) - (b.size === 'bag' ? -1 : 1) || a.id.localeCompare(b.id));
  const placed: PackItem[] = [];
  for (const it of order) {
    const at = findSpot(grids, placed, it);
    if (!at) return null;
    placed.push({ ...it, at });
  }
  return Object.fromEntries(placed.map((p) => [p.id, p.at!]));
}

/** The sides of a pack where add-ons are fitted. */
export type Side = 'left' | 'right';
export const SIDES: readonly Side[] = ['left', 'right'];

/** What a pack kind says (`bag` on a kind): its grid, and how many sides take an add-on (0–2: left, then right). */
export interface BagDef {
  grid: readonly [number, number];
  sides: number;
}

/** What an add-on kind says (`addon` on a kind): the grid it gives, fitted on a side of a pack. */
export interface AddonDef {
  grid: readonly [number, number];
}

/** Grid ids: `pocket:0`, `pack`, `side:left`. */
export const POCKET = (n: number): string => `pocket:${n}`;
export const PACK = 'pack';
export const SIDE = (s: Side): string => `side:${s}`;

/**
 * Someone's grids: their pockets (from their clothes; one kit for now), their pack if they wear one, and each add-on
 * fitted on a side the pack has (an add-on taller than the pack is cut to it).
 */
export function gridsOf(pockets: readonly (readonly [number, number])[], bag: BagDef | null, fitted: Partial<Record<Side, AddonDef>>): Grid[] {
  const grids: Grid[] = pockets.map(([w, h], n) => ({ id: POCKET(n), w, h, takes: ['pocket'] }));
  if (!bag) return grids;
  grids.push({ id: PACK, w: bag.grid[0], h: bag.grid[1], takes: PACKABLE });
  SIDES.slice(0, bag.sides).forEach((s) => {
    const a = fitted[s];
    if (a) grids.push({ id: SIDE(s), w: a.grid[0], h: Math.min(a.grid[1], bag.grid[1]), takes: PACKABLE });
  });
  return grids;
}

/** A free side of the pack for an add-on, left first, or null. */
export function freeSide(bag: BagDef | null, fitted: Partial<Record<Side, unknown>>): Side | null {
  return bag ? SIDES.slice(0, bag.sides).find((s) => !fitted[s]) ?? null : null;
}
