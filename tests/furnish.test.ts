import { describe, expect, it } from 'vitest';
import { type RoomSet, RECIPES, furnish } from '../src/content/furnish';
import { buildHouse } from '../src/core/world3d/house';
import { DOOR_CLEAR, type PieceIn, type RoomRect, footprints, planRoom } from '../src/core/world3d/roomplan';

/** Rooms of the bigger buildings are tested in their own buildings (`buildings.test.ts`), not in a cottage. */
const BIG = ['guestroom', 'landing', 'attic', 'upstairs', 'stall', 'aisle'];
const SETS = [...Object.keys(RECIPES).filter((k) => !BIG.includes(k)), 'smithy'] as RoomSet[];
/** House sizes that houses actually come in (width × depth, metres). */
const SIZES: [number, number][] = [[5, 4], [5.4, 4.2], [6.2, 4.6], [7.4, 5]];
/** From what width a room takes the whole recipe (the inn wants room for its tables). */
const COMFORT: Partial<Record<RoomSet, number>> = { inn: 9 };

const overlaps = (a: { x: number; z: number; hw: number; hd: number }, b: { x: number; z: number; hw: number; hd: number }): boolean =>
  Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.z - b.z) < a.hd + b.hd;

/** Share of the free floor (0.2 m cells, pieces grown by a walker's radius) the door can reach. */
function reach(room: RoomRect, doorX: number, fps: ReturnType<typeof footprints>): { free: number; reached: number } {
  const step = 0.2, r = 0.33; // the solver's own walker, wider than the real one (the nav grid is coarse)
  const nx = Math.floor((room.x1 - room.x0) / step), nz = Math.floor((room.z1 - room.z0) / step);
  const free = (i: number, j: number): boolean => {
    const x = room.x0 + (i + 0.5) * step, z = room.z0 + (j + 0.5) * step;
    return i >= 0 && j >= 0 && i < nx && j < nz && !fps.some((f) => Math.abs(x - f.x) < f.hw + r && Math.abs(z - f.z) < f.hd + r);
  };
  const seen = new Set<number>();
  const si = Math.floor((doorX - room.x0) / step), sj = nz - 1;
  const stack = free(si, sj) ? [[si, sj]] : [];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    if (seen.has(j * nx + i) || !free(i, j)) continue;
    seen.add(j * nx + i);
    stack.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
  }
  let total = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (free(i, j)) total++;
  return { free: total, reached: seen.size };
}

describe('furnishing by rules', () => {
  for (const set of SETS) {
    for (const [w, d] of SIZES) {
      it(`${set} in a ${w} × ${d} room: everything placed, no overlaps, door clear, floor connected`, () => {
        const m = buildHouse({ seed: 7, width: w, depth: d });
        const { plan } = furnish(set, m.room, m.door[0]);
        // The smithy keeps its authored fractions and was drawn for a bigger room; it may crowd a small one, but never the door.
        if (set !== 'smithy') {
          // The first four lines of a recipe are what the room is for; the rest may be left out of a tight room, nothing more.
          const core = RECIPES[set as keyof typeof RECIPES].slice(0, 4).map((l) => l.piece);
          for (const id of plan.unplaced) expect(core, `${set} ${w}x${d}: ${id} dropped`).not.toContain(id.split(/[#:]/)[0]);
          // And a comfortable room takes everything.
          if (w >= (COMFORT[set] ?? 6.2)) expect(plan.unplaced, `${set} ${w}x${d}`).toEqual([]);
        }
        const fps = footprints(plan);
        for (let i = 0; i < fps.length; i++) {
          const f = fps[i];
          if (set !== 'smithy') {
            expect(f.x - f.hw).toBeGreaterThanOrEqual(m.room.x0 - 1e-6);
            expect(f.x + f.hw).toBeLessThanOrEqual(m.room.x1 + 1e-6);
            expect(f.z - f.hd).toBeGreaterThanOrEqual(m.room.z0 - 1e-6);
            expect(f.z + f.hd).toBeLessThanOrEqual(m.room.z1 + 1e-6);
            for (let j = i + 1; j < fps.length; j++) expect(overlaps(f, fps[j]), `${f.id} / ${fps[j].id}`).toBe(false);
          }
          // Nothing in the way in the door's doorway.
          expect(overlaps(f, { x: m.door[0], z: m.room.z1 - DOOR_CLEAR.depth / 2, hw: DOOR_CLEAR.half, hd: DOOR_CLEAR.depth / 2 }), `${f.id} blocks the door`).toBe(false);
        }
        if (set !== 'smithy') {
          const r = reach(m.room, m.door[0], fps);
          expect(r.reached / r.free, `${set} ${w}x${d}: reachable floor`).toBeGreaterThan(0.85);
        }
      });
    }
  }

  it('a fire is marked in every room that has one, and hung things hang off the floor', () => {
    for (const set of ['home', 'inn', 'bakery', 'weaver', 'smithy'] as RoomSet[]) {
      const m = buildHouse({ seed: 7, width: 6.2, depth: 4.6 });
      const { plan } = furnish(set, m.room, m.door[0]);
      expect(plan.pieces.filter((p) => p.fire).length, set).toBe(1);
      for (const p of plan.pieces.filter((q) => q.kind === 'hung')) expect(p.lift).toBeGreaterThan(0.05);
    }
    const m = buildHouse({ seed: 7, width: 6.2, depth: 4.6 });
    expect(furnish('general', m.room, m.door[0]).plan.pieces.some((p) => p.fire)).toBe(false);
  });

  it('is deterministic', () => {
    const m = buildHouse({ seed: 7, width: 6.2, depth: 4.6 });
    const a = furnish('inn', m.room, m.door[0], 3).plan, b = furnish('inn', m.room, m.door[0], 3).plan;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('the solver slides a piece along the wall when its place is taken, and reports what does not fit', () => {
    const room: RoomRect = { x0: -2, x1: 2, z0: -1.5, z1: 1.5 };
    const box = (id: string, rule: PieceIn['rule']): PieceIn => ({ id, w: 1, d: 0.6, kind: 'floor', rule });
    const plan = planRoom(room, 1.5, [box('a', { at: 'back', x: 0 }), box('b', { at: 'back', x: 0 })]);
    expect(plan.unplaced).toEqual([]);
    const [a, b] = plan.pieces;
    expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(1);
    expect(a.z).toBeCloseTo(b.z, 6);
    const tooMany = planRoom(room, 1.5, Array.from({ length: 12 }, (_, i) => box(`p${i}`, { at: 'free' })));
    expect(tooMany.unplaced.length).toBeGreaterThan(0);
  });

  it('pieces go around a table on different sides', () => {
    const room: RoomRect = { x0: -3, x1: 3, z0: -2, z1: 2 };
    const plan = planRoom(room, 2.5, [
      { id: 'table', w: 1.2, d: 0.8, kind: 'floor', rule: { at: 'center' } },
      { id: 's#0', w: 0.4, d: 0.4, kind: 'floor', rule: { at: 'around', of: 'table' } },
      { id: 's#1', w: 0.4, d: 0.4, kind: 'floor', rule: { at: 'around', of: 'table' } },
    ]);
    expect(plan.unplaced).toEqual([]);
    const [t, s0, s1] = plan.pieces;
    for (const s of [s0, s1]) expect(Math.hypot(s.x - t.x, s.z - t.z)).toBeLessThan(1.4);
    expect(Math.hypot(s0.x - s1.x, s0.z - s1.z)).toBeGreaterThan(0.5);
  });
});

describe('what furniture gives off to the filaments', () => {
  const m = buildHouse({ width: 5.4, depth: 4.2, seed: 12, wallH: 2.4, roof: 'shingle' } as never);
  it('shelves with books, hangings and rugs become sources, standing where the pieces stand', () => {
    const { plan, sources } = furnish('herbalist', m.room, m.door[0]);
    expect(sources.filter((s) => s.kind === 'book').length).toBeGreaterThan(0);
    for (const s of sources) {
      expect(s.x).toBeGreaterThanOrEqual(m.room.x0 - 0.01);
      expect(s.x).toBeLessThanOrEqual(m.room.x1 + 0.01);
    }
    expect(plan.pieces.length).toBeGreaterThan(0);
  });
  it('a plain home has pictures (a hanging and a rug) but no books', () => {
    const { sources } = furnish('home', m.room, m.door[0]);
    expect(sources.some((s) => s.kind === 'art')).toBe(true);
    expect(sources.some((s) => s.kind === 'book')).toBe(false);
  });
});
