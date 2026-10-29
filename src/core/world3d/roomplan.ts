import { white } from '../noise';

/**
 * Furnishing a room by rules instead of coordinates. A recipe lists pieces in
 * priority order, each with a size and a rule ("against the back wall", "in the
 * middle", "around the table", "anywhere free"); `planRoom` finds a place for each
 * that does not overlap another or block the door, trying nearby spots when the
 * first is taken. Deterministic (the seed only breaks ties). The result also gives
 * each piece's footprint, so the same plan furnishes the room and blocks the feet.
 *
 * Frame: the house's own, metres. The room's back wall is z0, the door wall z1
 * (z grows toward the front), x runs along the front.
 */

export interface RoomRect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export type Rule =
  /** Against the back wall; `x` 0..1 along it (default: next free spot from the left). */
  | { at: 'back'; x?: number }
  /** Against a side wall; `z` 0..1 from the back to the front. */
  | { at: 'side'; wall: 'left' | 'right'; z?: number }
  /** Against the door wall (beside the door, never in front of it). */
  | { at: 'front'; x?: number }
  | { at: 'corner'; corner: 'backLeft' | 'backRight' | 'frontLeft' | 'frontRight' }
  /** In the middle of the room, nudged by (dx, dz) metres. */
  | { at: 'center'; dx?: number; dz?: number }
  /** Next to another piece (by id), on the first side with room: from `side` if given, else the front, then left, right, back (each further piece starts one side on). */
  | { at: 'around'; of: string; side?: 'front' | 'back' | 'left' | 'right' }
  /** Wherever there is room, off the walls. */
  | { at: 'free' }
  /** Old-style fractions (u across, d from the door to the back), for sets not yet converted. */
  | { at: 'fixed'; u: number; d: number };

export interface PieceIn {
  id: string;
  /** Footprint on the floor, metres (width across, depth front to back). */
  w: number;
  d: number;
  /** `floor` stands and blocks; `flat` lies on the floor (rug) and blocks nothing; `hung` is on the back wall, up off the floor. */
  kind: 'floor' | 'flat' | 'hung';
  /** Height above the floor for hung pieces, metres. */
  lift?: number;
  rule: Rule;
  /** This piece is the room's fire (hearth, oven, forge): the light and the filament source go here. */
  fire?: boolean;
}

export interface PlacedPiece {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  kind: PieceIn['kind'];
  lift: number;
  fire: boolean;
  /** Lines up with the room (back wall pieces, rugs) instead of facing the camera. */
  aligned: boolean;
}

export interface RoomPlan {
  pieces: PlacedPiece[];
  /** Pieces that found no place (a recipe too big for its room). */
  unplaced: string[];
}

/** Space kept clear in front of the door, metres: half-width and how far in. */
export const DOOR_CLEAR = { half: 0.85, depth: 1.6 };
/** Gap kept between floor pieces so a person can squeeze by. */
const GAP = 0.14;
const WALL = 0.03;

const overlap = (a: RoomRect, b: RoomRect, gap = 0): boolean =>
  a.x0 < b.x1 + gap && a.x1 > b.x0 - gap && a.z0 < b.z1 + gap && a.z1 > b.z0 - gap;

const rectAt = (x: number, z: number, w: number, d: number): RoomRect => ({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });

export function planRoom(room: RoomRect, doorX: number, pieces: readonly PieceIn[], seed = 0): RoomPlan {
  const placed: PlacedPiece[] = [];
  const unplaced: string[] = [];
  const solid: { id: string; r: RoomRect }[] = [];
  const hungSpans: { x0: number; x1: number; lift: number; top: number }[] = [];
  const doorZone: RoomRect = { x0: doorX - DOOR_CLEAR.half, x1: doorX + DOOR_CLEAR.half, z0: room.z1 - DOOR_CLEAR.depth, z1: room.z1 + 1 };
  const W = room.x1 - room.x0, D = room.z1 - room.z0;

  const inside = (r: RoomRect): boolean => r.x0 >= room.x0 + WALL && r.x1 <= room.x1 - WALL && r.z0 >= room.z0 + WALL && r.z1 <= room.z1 - WALL;
  /**
   * Would the door still reach nearly all the free floor with this piece added? (0.25 m cells, grown by a
   * walker's radius.) A recipe can then never wall a room in, whatever the room's size.
   */
  const connectedWith = (extra: RoomRect): boolean => {
    // A wider walker than the real one (0.2 m): the nav grid's cells are 0.5 m, so a gap under ~0.7 m is shut to the hero.
    const cell = 0.2, rad = 0.33;
    const nx = Math.floor(W / cell), nz = Math.floor(D / cell);
    const rects = [...solid.map((s) => s.r), extra];
    const free = (i: number, j: number): boolean => {
      if (i < 0 || j < 0 || i >= nx || j >= nz) return false;
      const x = room.x0 + (i + 0.5) * cell, z = room.z0 + (j + 0.5) * cell;
      return !rects.some((r) => x > r.x0 - rad && x < r.x1 + rad && z > r.z0 - rad && z < r.z1 + rad);
    };
    const si = Math.min(nx - 1, Math.max(0, Math.floor((doorX - room.x0) / cell))), sj = nz - 1;
    if (!free(si, sj)) return false;
    const seen = new Uint8Array(nx * nz);
    const stack = [si, sj];
    let reached = 0;
    while (stack.length) {
      const j = stack.pop()!, i = stack.pop()!;
      if (!free(i, j) || seen[j * nx + i]) continue;
      seen[j * nx + i] = 1;
      reached++;
      stack.push(i + 1, j, i - 1, j, i, j + 1, i, j - 1);
    }
    let total = 0;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (free(i, j)) total++;
    return reached >= total * 0.92;
  };
  let standing = true; // is the piece being placed a floor piece (which must keep the room connected)?
  const fits = (r: RoomRect): boolean => inside(r) && !overlap(r, doorZone) && !solid.some((s) => overlap(r, s.r, GAP)) && (!standing || connectedWith(r));
  const take = (p: PieceIn, x: number, z: number, aligned: boolean): void => {
    const lift = p.lift ?? 0;
    placed.push({ id: p.id, x, z, w: p.w, d: p.d, kind: p.kind, lift, fire: !!p.fire, aligned });
    if (p.kind === 'floor') solid.push({ id: p.id, r: rectAt(x, z, p.w, p.d) });
    if (p.kind === 'hung') hungSpans.push({ x0: x - p.w / 2, x1: x + p.w / 2, lift, top: lift + 0.5 });
  };

  /** Slide along a line from a preferred spot, alternately right and left, until a piece fits. */
  const slide = (p: PieceIn, from: number, at: (t: number) => { x: number; z: number }, lo: number, hi: number): { x: number; z: number } | null => {
    const step = 0.2;
    for (let k = 0; k <= Math.ceil((hi - lo) / step) * 2; k++) {
      const t = from + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * step * (k === 0 ? 0 : 1);
      if (t < lo || t > hi) continue;
      const pos = at(t);
      if (fits(rectAt(pos.x, pos.z, p.w, p.d))) return pos;
    }
    return null;
  };

  const find = (p: PieceIn): { x: number; z: number; aligned: boolean } | null => {
    const r = p.rule;
    const hw = p.w / 2, hd = p.d / 2;
    switch (r.at) {
      case 'fixed':
        return { x: room.x0 + r.u * W, z: room.z1 - r.d * D, aligned: r.d >= 0.9 };
      case 'back': {
        const from = room.x0 + hw + (r.x ?? 0) * Math.max(0, W - p.w);
        const s = slide(p, from, (t) => ({ x: t, z: room.z0 + hd + WALL }), room.x0 + hw, room.x1 - hw);
        return s && { ...s, aligned: true };
      }
      case 'front': {
        const from = room.x0 + hw + (r.x ?? 0) * Math.max(0, W - p.w);
        const s = slide(p, from, (t) => ({ x: t, z: room.z1 - hd - WALL }), room.x0 + hw, room.x1 - hw);
        return s && { ...s, aligned: false };
      }
      case 'side': {
        const x = r.wall === 'left' ? room.x0 + hw + WALL : room.x1 - hw - WALL;
        const from = room.z0 + hd + (r.z ?? 0.5) * Math.max(0, D - p.d);
        const s = slide(p, from, (t) => ({ x, z: t }), room.z0 + hd, room.z1 - hd);
        return s && { ...s, aligned: false };
      }
      case 'corner': {
        const x = r.corner.endsWith('Left') ? room.x0 + hw + WALL : room.x1 - hw - WALL;
        const z = r.corner.startsWith('back') ? room.z0 + hd + WALL : room.z1 - hd - WALL;
        if (fits(rectAt(x, z, p.w, p.d))) return { x, z, aligned: r.corner.startsWith('back') };
        // The corner is taken: next to it along the wall it is on.
        const s = r.corner.startsWith('back')
          ? slide(p, x, (t) => ({ x: t, z }), room.x0 + hw, room.x1 - hw)
          : slide(p, z, (t) => ({ x, z: t }), room.z0 + hd, room.z1 - hd);
        return s && { ...s, aligned: r.corner.startsWith('back') };
      }
      case 'center': {
        const cx = (room.x0 + room.x1) / 2 + (r.dx ?? 0), cz = room.z0 + D * 0.46 + (r.dz ?? 0);
        if (p.kind === 'flat') return { x: cx, z: cz, aligned: true };
        for (let ring = 0; ring < 12; ring++) {
          for (let k = 0; k < Math.max(1, ring * 6); k++) {
            const a = (k / Math.max(1, ring * 6)) * Math.PI * 2;
            const x = cx + Math.cos(a) * ring * 0.25, z = cz + Math.sin(a) * ring * 0.25;
            if (fits(rectAt(x, z, p.w, p.d))) return { x, z, aligned: false };
          }
        }
        return null;
      }
      case 'around': {
        const t = solid.filter((s) => s.id === r.of || s.id.startsWith(`${r.of}#`))[0]?.r ?? placed.filter((q) => q.id === r.of || q.id.startsWith(`${r.of}#`)).map((q) => rectAt(q.x, q.z, q.w, q.d))[0];
        if (!t) return null;
        const tcx = (t.x0 + t.x1) / 2, tcz = (t.z0 + t.z1) / 2;
        // Start with the front (toward the door), then the left, right and back; the n-th piece around rotates the start.
        const n = placed.filter((q) => q.id.startsWith(`${p.id.split('#')[0]}#`)).length;
        const sides = ['front', 'left', 'right', 'back'];
        const start = r.side ? sides.indexOf(r.side) : n;
        for (let k = 0; k < 4; k++) {
          const side = sides[(k + start) % 4];
          for (const off of [0, -0.45, 0.45, -0.9, 0.9]) {
            const g = GAP + 0.02; // just clear of the piece it sits next to
            const x = side === 'front' || side === 'back' ? tcx + off : side === 'left' ? t.x0 - hw - g : t.x1 + hw + g;
            const z = side === 'left' || side === 'right' ? tcz + off : side === 'front' ? t.z1 + hd + g : t.z0 - hd - g;
            if (fits(rectAt(x, z, p.w, p.d))) return { x, z, aligned: false };
          }
        }
        return null;
      }
      case 'free': {
        // Odds and ends hug the walls (the tidy places first), never scatter across the middle; the seed only breaks ties.
        const cand: { x: number; z: number; h: number }[] = [];
        for (let x = room.x0 + hw + WALL; x <= room.x1 - hw - WALL + 1e-6; x += 0.25) {
          for (let z = room.z0 + hd + WALL; z <= room.z1 - hd - WALL + 1e-6; z += 0.25) {
            const wall = Math.min(x - hw - room.x0, room.x1 - hw - x, z - hd - room.z0, room.z1 - hd - z);
            cand.push({ x, z, h: Math.round(wall / 0.3) + white(Math.round(x * 100), Math.round(z * 100), seed + p.id.length * 7) * 0.5 });
          }
        }
        cand.sort((a, b) => a.h - b.h);
        const c = cand.find((q) => fits(rectAt(q.x, q.z, p.w, p.d)));
        return c ? { x: c.x, z: c.z, aligned: false } : null;
      }
    }
  };

  for (const p of pieces) {
    if (p.kind === 'hung') {
      // On the back wall: no floor, but not on top of another hung piece at the same height.
      const r = p.rule;
      const from = room.x0 + p.w / 2 + (r.at === 'back' ? r.x ?? 0 : 0.5) * Math.max(0, W - p.w);
      const lift = p.lift ?? 1;
      let x: number | null = null;
      for (let k = 0; k < 60 && x === null; k++) {
        const t = from + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.15;
        if (t - p.w / 2 < room.x0 + WALL || t + p.w / 2 > room.x1 - WALL) continue;
        if (!hungSpans.some((h) => t - p.w / 2 < h.x1 + 0.05 && t + p.w / 2 > h.x0 - 0.05 && lift < h.top && lift + 0.5 > h.lift)) x = t;
      }
      if (x === null) unplaced.push(p.id);
      else take(p, x, room.z0 + WALL, true);
      continue;
    }
    standing = p.kind === 'floor';
    // The first-choice place, else anywhere free (the fire stays strict: it belongs where its rule says).
    const spot = find(p) ?? (p.fire || p.rule.at === 'free' ? null : find({ ...p, rule: { at: 'free' } }));
    if (!spot) {
      unplaced.push(p.id);
      continue;
    }
    take(p, spot.x, spot.z, spot.aligned || p.kind === 'flat');
  }
  return { pieces: placed, unplaced };
}

/** The floor footprints of a plan, as rects in the house's frame (for collision). */
export const footprints = (plan: RoomPlan): { id: string; x: number; z: number; hw: number; hd: number }[] =>
  plan.pieces.filter((p) => p.kind === 'floor').map((p) => ({ id: p.id, x: p.x, z: p.z, hw: p.w / 2, hd: p.d / 2 }));
