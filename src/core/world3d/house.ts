import { Rng } from '../rng';
import { type MeshData, type Vec3, addBeam, addBox, addFace, addOrientedBox, emptyMesh, norm } from './mesh';

/**
 * A village building as 3D geometry: stone footing, framed walls, a gabled roof
 * that overhangs, a chimney, a door and shuttered windows, an earth floor
 * inside. Local space: the front faces +z, x runs along the front, y is up,
 * the footprint is centred on the origin. Metres.
 *
 * Besides the one-room cottage there are three bigger plans (`HousePlan`): the inn
 * (two full storeys and an attic under the roof), the shop (shop below, rooms above)
 * and the stable (one storey, stalls along the back). Storeys are joined by straight
 * stairs along the front wall; every room's door is on its own front (+z) side.
 *
 * Parts are split by material and by what the cut-away removes. Each cut part has a
 * `level`: it fades while someone inside is on that storey or below it. So the roof
 * (top level) and the front wall of a storey go whenever you stand in or under it,
 * and the floors and walls of the storeys above you go too, but the ones you stand on
 * stay. Parts with `cut: false` always show.
 */

export type RoofKind = 'thatch' | 'shingle' | 'tile' | 'sod';

/** How the walls are made: plaster in a timber frame (the default), bare planks, or fieldstone. */
export type WallKind = 'framed' | 'plank' | 'stone';

/** What the building is: the cottage is the village's one-room house. */
export type HousePlan = 'cottage' | 'inn' | 'shop' | 'stable';

/** Outside sizes of the bigger plans, metres (the cottage is whatever the spec says; the old small one is 5 x 4). */
export const PLAN_SIZE: Record<Exclude<HousePlan, 'cottage'>, { width: number; depth: number }> = {
  inn: { width: 12.4, depth: 8.4 },
  shop: { width: 9.2, depth: 6.6 },
  stable: { width: 12.2, depth: 6.4 },
};

export interface House3DSpec {
  walls?: WallKind;
  seed: number;
  /** Outside width along the front and depth, in metres. */
  width: number;
  depth: number;
  /** Wall height from the top of the footing to the eaves (cottage and stable; the other plans set their own). */
  wallH?: number;
  roof?: RoofKind;
  plan?: HousePlan;
}

/** `roof` is thatch; the other kinds have their own. */
export type HouseMaterial = 'stone' | 'plaster' | 'timber' | 'roof' | 'shingle' | 'tile' | 'sod' | 'door' | 'window' | 'shutter' | 'floor' | 'roofUnder';

export interface HousePart {
  name: string;
  material: HouseMaterial;
  /** Removed by the cut-away. */
  cut: boolean;
  /** Cut parts only: fades while the viewer's storey is at or below this. */
  level?: number;
  /** The back wall only: fades too while the viewer is on this storey or below, if the house faces away from the camera. */
  away?: number;
  mesh: MeshData;
}

export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/** A room to furnish. Its door is on its z1 side at `doorX` (the room planner's frame). */
export interface LevelRoom {
  rect: Rect;
  doorX: number;
  /** What the room is for: `main` (the ground floor's own kind), `guest`, `landing`, `attic`, `upstairs`, `stall`, `aisle`. */
  role: string;
  /** Floor kept free of furniture (the stairs and the room to step on and off them). */
  reserved: Rect[];
  /** Floor kept clear instead of the usual space in front of the door. */
  zones?: Rect[];
  /** Where people come in (default: at the door), for the "can everything be reached" check. */
  entry?: { x: number; z: number };
  /** A smaller clear space in front of the door than the default, for stalls. */
  clear?: { half: number; depth: number };
}

export interface Level {
  floorY: number;
  rooms: LevelRoom[];
  /** What blocks feet on this storey besides walls and furniture: partitions, and the stairs' footprints. */
  blocks: Rect[];
  /** The tall walls among them: what stops the eye (low stall boards do not). */
  sight: Rect[];
}

/** A straight flight along the front wall from storey `from` up to `to`. `path` is the walk up, local, with the height of each point. */
export interface Stair {
  from: number;
  to: number;
  /** The flight's footprint: on `from` it is the steps, on `to` the opening in the floor. */
  rect: Rect;
  path: { x: number; z: number; y: number }[];
}

export interface HouseModel {
  parts: HousePart[];
  /** Floor height and the inner room (local), for placing furniture. */
  floorY: number;
  room: { x0: number; x1: number; z0: number; z1: number };
  /** Where the door is (local, on the front, at floor level). */
  door: Vec3;
  /** Half the width of the doorway for feet. */
  doorHalf: number;
  /** Collision footprint (local, axis-aligned rectangle). */
  footprint: { x0: number; x1: number; z0: number; z1: number };
  /** Top of the chimney (local), where smoke starts. */
  smoke: Vec3;
  /** Window centres on the outside, for the glow at night. */
  windows: { at: Vec3; normal: Vec3 }[];
  /** Storeys, ground first (a cottage has one). */
  levels: Level[];
  stairs: Stair[];
}

const FOOT = 0.45; // footing height
const WALL_T = 0.22; // wall thickness
const BEAM = 0.18;
const SLAB = 0.25; // floor thickness between storeys
const PART_T = 0.12; // inner partition thickness
const TREAD = 0.26;
const STAIR_W = 1.0;
const DOOR_OPEN = 0.6; // half the gap in a partition for a doorway

export function buildHouse(spec: House3DSpec): HouseModel {
  const rng = Rng.fromSeed(spec.seed);
  const plan = spec.plan ?? 'cottage';
  const W = spec.width, D = spec.depth;
  const roofKind = spec.roof ?? 'thatch';
  const hw = W / 2, hd = D / 2;

  // Storeys: heights of their walls (the inn's last is the attic's knee wall).
  const heights = plan === 'inn' ? [2.7, 2.5, 1.5] : plan === 'shop' ? [2.8, 2.2] : [spec.wallH ?? (plan === 'stable' ? 2.7 : 2.5)];
  const nL = heights.length, topLevel = nL - 1;
  const floorY: number[] = [], wallTop: number[] = [], wallBot: number[] = [];
  heights.forEach((h, k) => {
    floorY[k] = k === 0 ? FOOT : wallTop[k - 1] + SLAB;
    wallBot[k] = k === 0 ? FOOT : floorY[k] - SLAB;
    wallTop[k] = floorY[k] + h;
  });
  const top = wallTop[topLevel];
  // Inner faces of the walls.
  const ix0 = -hw + WALL_T, ix1 = hw - WALL_T, iz0 = -hd + WALL_T, iz1 = hd - WALL_T;

  const wallKind = spec.walls ?? 'framed';
  const framed = wallKind === 'framed';
  const wallMat: HouseMaterial = wallKind === 'plank' ? 'timber' : wallKind === 'stone' ? 'stone' : 'plaster';
  const partMap = new Map<string, HousePart>();
  /** The part for a material and fade level (`level` undefined: never cut). */
  const part = (material: HouseMaterial, level?: number, name: string = material): HousePart => {
    const key = `${name}|${material}|${level ?? 'x'}|${name === 'backWall' ? 'b' : ''}`;
    let p = partMap.get(key);
    if (!p) partMap.set(key, (p = { name, material, cut: level !== undefined, level, mesh: emptyMesh() }));
    return p;
  };
  /** Parts of storey k that are not on its front: shown always on the ground storey, hidden from below for the ones above. */
  const upperLevel = (k: number): number | undefined => (k === 0 ? undefined : k - 1);

  // Footing: a stone plinth a little wider than the walls.
  addBox(part('stone', undefined, 'footing').mesh, [-hw - 0.08, 0, -hd - 0.08], [hw + 0.08, FOOT, hd + 0.08], { aoBottom: 0.55, aoTop: 0.9, skip: ['ny'] });
  // Floor: beaten earth, just inside the walls.
  addFace(part('floor').mesh, [[ix0, FOOT + 0.01, iz1], [ix1, FOOT + 0.01, iz1], [ix1, FOOT + 0.01, iz0], [ix0, FOOT + 0.01, iz0]], [0.7, 0.7, 0.55, 0.55]);

  // Walls, a storey at a time: back and sides stay, the front is cut away.
  const wallOpts = { aoBottom: 0.7, aoTop: 0.72 };
  for (let k = 0; k < nL; k++) {
    const w = part(wallMat, upperLevel(k), 'walls').mesh;
    // The back wall is its own part: it also fades, when the house is turned so that it faces the camera.
    const back = part(wallMat, k === 0 ? -1 : k - 1, 'backWall');
    back.away = k;
    addBox(back.mesh, [-hw, wallBot[k], -hd], [hw, wallTop[k], -hd + WALL_T], wallOpts);
    addBox(w, [-hw, wallBot[k], -hd + WALL_T], [-hw + WALL_T, wallTop[k], hd - WALL_T], wallOpts);
    addBox(w, [hw - WALL_T, wallBot[k], -hd + WALL_T], [hw, wallTop[k], hd - WALL_T], wallOpts);
    addBox(part(wallMat, k, 'frontWall').mesh, [-hw, wallBot[k], hd - WALL_T], [hw, wallTop[k], hd], wallOpts);
  }

  // Roof shape: gable along x, ridge over the middle.
  const pitch = roofKind === 'thatch' ? 0.85 : roofKind === 'sod' ? 0.5 : 0.68; // radians
  const over = roofKind === 'thatch' ? 0.55 : 0.4;
  const thick = roofKind === 'thatch' ? 0.32 : roofKind === 'sod' ? 0.26 : 0.12;
  const run = hd; // horizontal distance from the wall face to the ridge
  const rise = run * Math.tan(pitch);
  const ridgeY = top + rise;
  const roof = part(roofKind === 'thatch' ? 'roof' : roofKind, topLevel, 'roof').mesh;
  const under = part('roofUnder', topLevel).mesh;
  const gables = part(wallMat, topLevel, 'gables').mesh;

  // Gable ends: triangles above the side walls (both faces), and the timbers on them.
  for (const sx of [-1, 1]) {
    const xo = sx * hw, xi = sx * (hw - WALL_T);
    const tri = (x: number, out: boolean): void => {
      const a: Vec3 = [x, top, hd], b: Vec3 = [x, top, -hd], c: Vec3 = [x, ridgeY, 0];
      const facesOut = (sx > 0) === out;
      addFace(gables, facesOut ? [b, c, a] : [a, c, b], [0.85, 0.7, 0.85]);
    };
    tri(xo, true);
    tri(xi, false);
  }

  // Roof slopes: an oriented slab per side, overhanging the eaves and the gables.
  const slope = (sz: number): void => {
    const len = (run + over) / Math.cos(pitch);
    const down: Vec3 = norm([0, -Math.sin(pitch), sz * Math.cos(pitch)]); // from ridge toward the eave
    const n: Vec3 = norm([0, Math.cos(pitch), sz * Math.sin(pitch)]);
    const ridge: Vec3 = [0, ridgeY, 0];
    const mid: Vec3 = [ridge[0] + down[0] * len / 2 + n[0] * thick / 2, ridge[1] + down[1] * len / 2 + n[1] * thick / 2, ridge[2] + down[2] * len / 2 + n[2] * thick / 2];
    // Axes: x along the ridge, y along the slope (eave to ridge), z the slab normal.
    const ay: Vec3 = [-down[0], -down[1], -down[2]];
    const ax: Vec3 = sz > 0 ? [1, 0, 0] : [-1, 0, 0];
    const az = n;
    addOrientedBox(roof, mid, ax, ay, az, [hw + over * 0.8, len / 2, thick / 2], { aoBottom: 0.85, aoTop: 1, skip: ['nz'] });
    // Underside, darker: what you see under the eaves.
    addOrientedBox(under, mid, ax, ay, az, [hw + over * 0.8, len / 2, thick / 2], { aoBottom: 0.45, aoTop: 0.35, skip: ['pz', 'px', 'nx', 'py', 'ny'] });
  };
  slope(1);
  slope(-1);
  // Ridge cap closes the notch where the two slopes meet.
  addBeam(roof, [-hw - over * 0.8, ridgeY + thick * 0.75, 0], [hw + over * 0.8, ridgeY + thick * 0.75, 0], thick * 1.6, [0, 1, 0]);

  // Chimney: stone stack on the right gable end, rising through the roof.
  const chimney = part('stone', topLevel, 'chimney').mesh;
  const cx = hw - 0.75, cz = -hd * 0.3;
  const chTop = ridgeY + 0.9;
  addBox(chimney, [cx - 0.35, top - 0.2, cz - 0.35], [cx + 0.35, chTop, cz + 0.35], { aoBottom: 0.6, aoTop: 1 });
  addBox(chimney, [cx - 0.42, chTop, cz - 0.42], [cx + 0.42, chTop + 0.12, cz + 0.42], { aoBottom: 0.8 });

  // Where the door is, and how big.
  const bays = Math.max(2, Math.round(W / 2));
  const bay = W / bays;
  const doorW = plan === 'stable' ? 2.0 : plan === 'inn' ? 1.3 : plan === 'shop' ? 1.1 : 1.0;
  const doorH = plan === 'stable' ? 2.25 : 1.95;
  let dx: number;
  if (plan === 'cottage') {
    // The door sits in the middle of one of the first two bays.
    const doorBay = rng.int(2);
    dx = -hw + bay * (doorBay + 0.5) + (rng.next() - 0.5) * 0.3;
  } else if (plan === 'stable') {
    dx = (rng.next() - 0.5) * 1.2;
  } else {
    // The stairs fill the front's left end; the door is in the right part.
    dx = ix1 - (plan === 'inn' ? 3.0 : 2.0) + (rng.next() - 0.5) * 0.6;
  }

  // Timber frame, standing proud of the plaster. Front parts are cut away with the wall.
  const proud = 0.05;
  const zf = hd + proud * 0.5, xr = hw + proud * 0.5;
  const frontFace: Vec3 = [0, 0, 1], sideFace: Vec3 = [1, 0, 0];
  const beam = (m: MeshData, a: Vec3, b: Vec3, face: Vec3): void => addBeam(m, a, b, BEAM, face, { aoBottom: 0.85 });
  const sideBays = Math.max(1, Math.round(D / 2));
  const windowsAt = (k: number): number => floorY[k] + heights[k] * (k === topLevel && plan === 'inn' ? 0.5 : 0.55);
  const winList: HouseModel['windows'] = [];
  const win = (m: MeshData, sm: MeshData, at: Vec3, face: Vec3): void => {
    const w = 0.8, h = 0.7;
    const along: Vec3 = face[2] !== 0 ? [1, 0, 0] : [0, 0, -face[0]];
    const c: Vec3 = [at[0] + face[0] * 0.04, at[1], at[2] + face[2] * 0.04];
    addOrientedBox(m, c, along, [0, 1, 0], face, [w / 2, h / 2, 0.04], { unitUV: true });
    for (const s of [-1, 1]) {
      const sc: Vec3 = [c[0] + along[0] * s * (w / 2 + 0.2), c[1], c[2] + along[2] * s * (w / 2 + 0.2)];
      addOrientedBox(sm, sc, along, [0, 1, 0], face, [0.19, h / 2 + 0.05, 0.03], { unitUV: true });
    }
  };
  for (let k = 0; k < nL; k++) {
    const ft = part('timber', k, 'frontTimber').mesh;
    const sideLevel = upperLevel(k);
    const st = part('timber', sideLevel, 'timber').mesh;
    const yb = wallBot[k], yt = wallTop[k];
    const winY = windowsAt(k);
    const midY = winY - 0.45; // sill rail just under the windows
    // Posts and rails on the front. (Planked and stone walls carry no frame: only the door's own frame and the corner posts are timber.)
    for (let i = 0; i <= bays; i++) {
      if (!framed && i > 0 && i < bays) continue;
      const x = -hw + BEAM / 2 + (W - BEAM) * (i / bays);
      if (k === 0 && Math.abs(x - dx) < doorW / 2 + BEAM * 1.5) continue; // not through the door
      beam(ft, [x, yb, zf], [x, yt, zf], frontFace);
    }
    if (framed) {
      if (k === 0) {
        // The low rails stop at the door frame.
        for (const y of [FOOT + BEAM / 2, midY]) {
          beam(ft, [-hw, y, zf], [dx - doorW / 2 - BEAM / 2, y, zf], frontFace);
          beam(ft, [dx + doorW / 2 + BEAM / 2, y, zf], [hw, y, zf], frontFace);
        }
      } else {
        for (const y of [yb + BEAM / 2, midY]) beam(ft, [-hw, y, zf], [hw, y, zf], frontFace);
      }
      beam(ft, [-hw, yt - BEAM / 2, zf], [hw, yt - BEAM / 2, zf], frontFace);
    }
    // The right side wall (the one the camera sees), and the left (seen when the camera turns, and from inside).
    for (let i = 0; i <= sideBays; i++) {
      if (!framed && i > 0 && i < sideBays) continue;
      const z = hd - BEAM / 2 - (D - BEAM) * (i / sideBays);
      beam(st, [xr, yb, z], [xr, yt, z], sideFace);
      beam(st, [-xr, yb, z], [-xr, yt, z], [-1, 0, 0]);
    }
    if (framed) {
      for (const y of [yb + BEAM / 2, midY, yt - BEAM / 2]) {
        beam(st, [xr, y, hd], [xr, y, -hd], sideFace);
        beam(st, [-xr, y, hd], [-xr, y, -hd], [-1, 0, 0]);
      }
      if (k === 0 && plan === 'cottage') beam(st, [xr, midY, -hd + 0.1], [xr, yt - 0.1, -hd + D * 0.35], sideFace);
    }

    // Windows: one in every front bay that has no door, and on the side walls (the cottage has one each, the bigger plans one per bay).
    const fw = part('window', k, 'frontWindows').mesh, fs = part('shutter', k, 'frontShutters').mesh;
    for (let i = 0; i < bays; i++) {
      const x = -hw + bay * (i + 0.5);
      if (k === 0 && Math.abs(x - dx) < doorW / 2 + 0.9) continue;
      win(fw, fs, [x, winY, hd + 0.02], [0, 0, 1]);
      winList.push({ at: [x, winY, hd + 0.1], normal: [0, 0, 1] });
    }
    const sw = part('window', sideLevel, 'windows').mesh, ss = part('shutter', sideLevel, 'shutters').mesh;
    const nSide = plan === 'cottage' ? 1 : sideBays;
    for (let i = 0; i < nSide; i++) {
      const sz = hd - D / sideBays * (i + 0.5);
      win(sw, ss, [hw + 0.02, winY, sz], [1, 0, 0]);
      winList.push({ at: [hw + 0.1, winY, sz], normal: [1, 0, 0] });
      win(sw, ss, [-hw - 0.02, winY, sz], [-1, 0, 0]);
      winList.push({ at: [-hw - 0.1, winY, sz], normal: [-1, 0, 0] });
    }
  }
  // Door frame: jambs and a heavy lintel.
  const dt = part('timber', 0, 'frontTimber').mesh;
  for (const s of [-1, 1]) beam(dt, [dx + s * (doorW / 2 + BEAM / 2), FOOT, zf], [dx + s * (doorW / 2 + BEAM / 2), FOOT + doorH + 0.1, zf], frontFace);
  addBeam(dt, [dx - doorW / 2 - BEAM - 0.1, FOOT + doorH + 0.12, zf + 0.02], [dx + doorW / 2 + BEAM + 0.1, FOOT + doorH + 0.12, zf + 0.02], BEAM * 1.3, frontFace);
  // Door: a plank door in its frame. Steps up to it.
  addBox(part('door', 0).mesh, [dx - doorW / 2, FOOT, hd], [dx + doorW / 2, FOOT + doorH, hd + 0.07], { aoBottom: 0.7, unitUV: true });
  addBox(part('stone', undefined, 'footing').mesh, [dx - doorW / 2 - 0.2, 0, hd + 0.08], [dx + doorW / 2 + 0.2, FOOT * 0.5, hd + 0.55], { aoBottom: 0.6, skip: ['ny'] });

  // --- inside: stairs, floors, partitions, rooms ---------------------------------------------------------------------
  const levels: Level[] = floorY.map((y) => ({ floorY: y, rooms: [], blocks: [], sight: [] }));
  const stairs: Stair[] = [];
  const rectOf = (x0: number, x1: number, z0: number, z1: number): Rect => ({ x0, x1, z0, z1 });
  const fullRect = rectOf(ix0, ix1, iz0, iz1);

  /** A wall segment between two points along x (or z) on one storey: a low part that always shows with the storey, and a tall part that is cut away. */
  const partition = (k: number, r: Rect, lowOnly = false, height = 1.45): void => {
    const y0 = floorY[k], lowTop = y0 + Math.min(height, heights[k]);
    addBox(part('timber', upperLevel(k), 'timber').mesh, [r.x0, y0, r.z0], [r.x1, lowTop, r.z1], { aoBottom: 0.7, aoTop: 0.9 });
    if (!lowOnly) addBox(part('plaster', k, 'partition').mesh, [r.x0, lowTop, r.z0], [r.x1, wallTop[k], r.z1], { aoBottom: 0.8, aoTop: 0.72 });
    levels[k].blocks.push(r);
    if (!lowOnly) levels[k].sight.push(r);
  };
  /** A wall along x at z = zc, with doorways at the given x centres. */
  const wallWithDoors = (k: number, x0: number, x1: number, zc: number, doors: number[]): void => {
    const sorted = [...doors].sort((a, b) => a - b);
    let x = x0;
    const z0 = zc - PART_T / 2, z1 = zc + PART_T / 2;
    for (const d of sorted) {
      if (d - DOOR_OPEN > x + 0.02) partition(k, rectOf(x, d - DOOR_OPEN, z0, z1));
      // The lintel over the doorway.
      addBox(part('plaster', k, 'partition').mesh, [d - DOOR_OPEN, floorY[k] + 2.05, z0], [d + DOOR_OPEN, wallTop[k], z1], { aoBottom: 0.8 });
      addBeam(part('timber', k, 'frontTimber').mesh, [d - DOOR_OPEN - 0.05, floorY[k] + 2.0, z1 + 0.04], [d + DOOR_OPEN + 0.05, floorY[k] + 2.0, z1 + 0.04], 0.1, frontFace);
      // Jambs, and the room door standing open against the wall inside.
      for (const s of [-1, 1]) addBeam(part('timber', k, 'frontTimber').mesh, [d + s * (DOOR_OPEN + 0.03), floorY[k], z1 + 0.04], [d + s * (DOOR_OPEN + 0.03), floorY[k] + 2.05, z1 + 0.04], 0.1, frontFace);
      addBox(part('door', k).mesh, [d - DOOR_OPEN - 0.01, floorY[k], z0 - 0.85], [d - DOOR_OPEN + 0.05, floorY[k] + 1.95, z0], { aoBottom: 0.7, unitUV: true });
      x = d + DOOR_OPEN;
    }
    if (x1 > x + 0.02) partition(k, rectOf(x, x1, z0, z1));
  };

  // Stairs: a flight from storey k to k+1 along the front wall, starting at x = xs.
  const flight = (k: number, xs: number, last: boolean): Stair => {
    const y0 = floorY[k], y1 = floorY[k + 1];
    const n = Math.ceil((y1 - y0) / 0.2), runL = n * TREAD, xe = xs + runL;
    const rect = rectOf(xs, xe, iz1 - STAIR_W, iz1);
    const zc = iz1 - STAIR_W / 2;
    const lv = k === 0 ? undefined : k - 1;
    const ts = part('timber', lv, 'timber').mesh;
    for (let i = 0; i < n; i++) {
      const yTop = y0 + ((i + 1) * (y1 - y0)) / n;
      addBox(ts, [xs + i * TREAD, yTop - 0.1, rect.z0], [xs + (i + 1) * TREAD, yTop, rect.z1], { aoBottom: 0.6, aoTop: 0.95 });
    }
    // Stringers on both sides, and a rail on the open side.
    for (const z of [rect.z0 + 0.05, rect.z1 - 0.05]) addBeam(ts, [xs, y0 + 0.02, z], [xe, y1 - 0.2, z], 0.1, frontFace, { aoBottom: 0.6 });
    const zr = rect.z0 + 0.04;
    addBeam(ts, [xs, y0 + 0.95, zr], [xe, y1 + 0.75, zr], 0.07, frontFace);
    for (let i = 0; i <= Math.floor(runL); i++) {
      const x = xs + (i / Math.max(1, Math.floor(runL))) * runL;
      const t = (x - xs) / runL, y = y0 + t * (y1 - y0);
      addBeam(ts, [x, y, zr], [x, y + 0.9, zr], 0.07, frontFace);
    }
    // Off the stairs on the walkway behind them, where both ends meet it.
    const zw = rect.z0 - 0.55;
    const s: Stair = {
      from: k,
      to: k + 1,
      rect,
      // The ground flight is approached along its own line from the open floor before its foot; the next flight (carrying on from
      // the first) from the walkway behind. The last flight steps off straight ahead; the first of two, to the walkway.
      path: [k === 0 ? { x: xs - 0.5, z: zc, y: y0 } : { x: xs + 0.45, z: zw, y: y0 }, { x: xs + 0.05, z: zc, y: y0 }, { x: xe - 0.05, z: zc, y: y1 }, last ? { x: xe + 0.5, z: zc, y: y1 } : { x: xe + 0.3, z: zw, y: y1 }],
    };
    stairs.push(s);
    levels[k].blocks.push(rect);
    levels[k + 1].blocks.push(rect);
    return s;
  };

  /** A floor between storeys k-1 and k, with an opening where a flight comes up. */
  const slab = (k: number, hole: Rect | null): void => {
    const m = part('timber', k - 1, 'timber').mesh;
    const y0 = floorY[k] - SLAB, y1 = floorY[k];
    const o = { aoBottom: 0.5, aoTop: 0.9 };
    const piece = (x0: number, x1: number, z0: number, z1: number): void => {
      if (x1 - x0 > 0.01 && z1 - z0 > 0.01) addBox(m, [x0, y0, z0], [x1, y1, z1], o);
    };
    if (!hole) return piece(ix0, ix1, iz0, iz1);
    piece(ix0, hole.x0, iz0, iz1);
    piece(hole.x1, ix1, iz0, iz1);
    piece(hole.x0, hole.x1, iz0, hole.z0);
    piece(hole.x0, hole.x1, hole.z1, iz1);
  };

  const doorRoomKey = 'main';
  if (plan === 'cottage') {
    levels[0].rooms.push({ rect: fullRect, doorX: dx, role: doorRoomKey, reserved: [] });
  } else if (plan === 'stable') {
    // Stalls along the back, each with its own low partitions; the aisle in front.
    const nStall = 5, stallD = 3.0;
    const stallZ1 = iz0 + stallD;
    const sw = (ix1 - ix0 - PART_T * (nStall - 1)) / nStall;
    for (let i = 0; i < nStall; i++) {
      const xa = ix0 + i * (sw + PART_T), xb = xa + sw;
      if (i > 0) partition(0, rectOf(xa - PART_T, xa, iz0, stallZ1), true, 1.15);
      // A rail gate across the stall's front (a horse is seen over it); it blocks feet.
      const gm = part('timber', undefined, 'timber').mesh;
      for (const y of [FOOT + 0.4, FOOT + 0.85]) addBeam(gm, [xa, y, stallZ1], [xb, y, stallZ1], 0.09, frontFace);
      for (const x of [xa + 0.05, xb - 0.05]) addBeam(gm, [x, FOOT, stallZ1], [x, FOOT + 1.05, stallZ1], 0.12, frontFace);
      levels[0].blocks.push(rectOf(xa, xb, stallZ1 - 0.06, stallZ1 + 0.06));
      levels[0].rooms.push({ rect: rectOf(xa, xb, iz0, stallZ1), doorX: (xa + xb) / 2, role: 'stall', reserved: [], clear: { half: 0.6, depth: 0.5 } });
    }
    levels[0].rooms.push({ rect: rectOf(ix0, ix1, stallZ1 + 0.05, iz1), doorX: dx, role: 'aisle', reserved: [] });
  } else {
    // Inn and shop: the main stair rises from the front-left to the first floor.
    const xs1 = ix0 + 1.0;
    const f1 = flight(0, xs1, plan === 'shop');
    const f1x1 = f1.rect.x1;
    levels[0].rooms.push({ rect: fullRect, doorX: dx, role: doorRoomKey, reserved: [rectOf(ix0, f1x1 + 0.1, iz1 - STAIR_W - 0.4, iz1)] });
    const head1 = f1.path[3];
    /** The first floor: a corridor along the front (the stairs come up into it) and rooms behind, each with a doorway onto it. */
    const firstFloor = (shares: number[], roles: string[], holes: Rect[]): void => {
      const zp = iz1 - 2.3; // the wall between the corridor and the rooms
      const n = shares.length;
      const total = shares.reduce((a, b) => a + b, 0), inner = ix1 - ix0 - PART_T * (n - 1);
      const doors: number[] = [];
      const made: { r: Rect; d: number; role: string }[] = [];
      let xa = ix0;
      for (let i = 0; i < n; i++) {
        const xb = xa + (inner * shares[i]) / total;
        const d = (xa + xb) / 2 + (rng.next() - 0.5) * 0.4;
        doors.push(d);
        made.push({ r: rectOf(xa, xb, iz0, zp - PART_T / 2), d, role: roles[i] });
        if (i > 0) partition(1, rectOf(xa - PART_T, xa, iz0, zp + PART_T / 2));
        xa = xb + PART_T;
      }
      wallWithDoors(1, ix0, ix1, zp, doors);
      // The corridor, entered from the stairs; its floor is kept clear along the flights and in front of every door.
      levels[1].rooms.push({
        rect: rectOf(ix0, ix1, zp + PART_T / 2, iz1),
        doorX: head1.x,
        role: 'landing',
        reserved: [...holes, ...doors.map((d) => rectOf(d - 0.8, d + 0.8, zp, zp + 1.1))],
        zones: [],
        entry: { x: head1.x, z: head1.z },
      });
      for (const { r, d, role } of made) levels[1].rooms.push({ rect: r, doorX: d, role, reserved: [] });
    };
    if (plan === 'shop') {
      // The shop: a bedroom and the keeper's own room off a landing.
      slab(1, f1.rect);
      firstFloor([0.4, 0.6], ['guest', 'upstairs'], [f1.rect]);
    } else {
      // Inn: the second flight carries on from the first to the attic, and a corridor with four guest rooms behind it fills the first floor.
      const f2 = flight(1, f1x1, true);
      const f2x1 = f2.rect.x1;
      slab(1, f1.rect);
      slab(2, f2.rect);
      firstFloor([1, 1, 1, 1], ['guest', 'guest', 'guest', 'guest'], [rectOf(xs1, f2x1, iz1 - STAIR_W, iz1)]);
      // The attic: one long room under the roof, with the stairs coming up at its front.
      const head2 = f2.path[3];
      levels[2].rooms.push({
        rect: rectOf(ix0, ix1, iz0 + 0.2, iz1),
        doorX: head2.x,
        role: 'attic',
        reserved: [f2.rect],
        zones: [rectOf(f2x1, f2x1 + 1.5, iz1 - STAIR_W - 0.3, iz1)],
        entry: { x: head2.x, z: head2.z },
      });
    }
  }

  const parts = [...partMap.values()].filter((p) => p.mesh.indices.length > 0);
  return {
    parts,
    floorY: FOOT,
    room: { x0: ix0, x1: ix1, z0: iz0, z1: iz1 },
    door: [dx, FOOT, hd],
    doorHalf: doorW / 2 + 0.15,
    footprint: { x0: -hw - 0.1, x1: hw + 0.1, z0: -hd - 0.1, z1: hd + 0.6 },
    smoke: [cx, chTop + 0.12, cz],
    windows: winList,
    levels,
    stairs,
  };
}
