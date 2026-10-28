import { Rng } from '../rng';
import { type MeshData, type Vec3, addBeam, addBox, addFace, addOrientedBox, emptyMesh, norm } from './mesh';

/**
 * A village house as 3D geometry: stone footing, framed walls, a gabled roof
 * that overhangs, a chimney, a door and shuttered windows, an earth floor
 * inside. Local space: the front faces +z, x runs along the front, y is up,
 * the footprint is centred on the origin. Metres.
 *
 * Parts are split by material and by what the cut-away removes: when someone
 * is inside, every part with `cut: true` fades out (roof, front wall and what
 * hangs on it), so you look into the room.
 */

export type RoofKind = 'thatch' | 'shingle' | 'tile' | 'sod';

export interface House3DSpec {
  seed: number;
  /** Outside width along the front and depth, in metres. */
  width: number;
  depth: number;
  /** Wall height from the top of the footing to the eaves. */
  wallH?: number;
  roof?: RoofKind;
}

/** `roof` is thatch; the other kinds have their own. */
export type HouseMaterial = 'stone' | 'plaster' | 'timber' | 'roof' | 'shingle' | 'tile' | 'sod' | 'door' | 'window' | 'shutter' | 'floor' | 'roofUnder';

export interface HousePart {
  name: string;
  material: HouseMaterial;
  /** Removed by the cut-away. */
  cut: boolean;
  mesh: MeshData;
}

export interface HouseModel {
  parts: HousePart[];
  /** Floor height and the inner room (local), for placing furniture. */
  floorY: number;
  room: { x0: number; x1: number; z0: number; z1: number };
  /** Where the door is (local, on the front, at floor level). */
  door: Vec3;
  /** Collision footprint (local, axis-aligned rectangle). */
  footprint: { x0: number; x1: number; z0: number; z1: number };
  /** Top of the chimney (local), where smoke starts. */
  smoke: Vec3;
  /** Window centres on the outside, for the glow at night. */
  windows: { at: Vec3; normal: Vec3 }[];
}

const FOOT = 0.45; // footing height
const WALL_T = 0.22; // wall thickness
const BEAM = 0.18;

export function buildHouse(spec: House3DSpec): HouseModel {
  const rng = Rng.fromSeed(spec.seed);
  const W = spec.width, D = spec.depth;
  const wallH = spec.wallH ?? 2.5;
  const roofKind = spec.roof ?? 'thatch';
  const hw = W / 2, hd = D / 2;
  const top = FOOT + wallH;

  const part = (name: string, material: HouseMaterial, cut = false): HousePart => ({ name, material, cut, mesh: emptyMesh() });
  const stone = part('footing', 'stone');
  const walls = part('walls', 'plaster');
  const front = part('frontWall', 'plaster', true);
  const gables = part('gables', 'plaster', true);
  const timber = part('timber', 'timber');
  const frontTimber = part('frontTimber', 'timber', true);
  const roof = part('roof', roofKind === 'thatch' ? 'roof' : roofKind, true);
  const under = part('roofUnder', 'roofUnder', true);
  const chimney = part('chimney', 'stone', true);
  const door = part('door', 'door', true);
  const windows = part('windows', 'window');
  const frontWindows = part('frontWindows', 'window', true);
  const shutters = part('shutters', 'shutter');
  const frontShutters = part('frontShutters', 'shutter', true);
  const floor = part('floor', 'floor');

  // Footing: a stone plinth a little wider than the walls.
  addBox(stone.mesh, [-hw - 0.08, 0, -hd - 0.08], [hw + 0.08, FOOT, hd + 0.08], { aoBottom: 0.55, aoTop: 0.9, skip: ['ny'] });
  // Floor: beaten earth, just inside the walls.
  addFace(floor.mesh, [[-hw + WALL_T, FOOT + 0.01, hd - WALL_T], [hw - WALL_T, FOOT + 0.01, hd - WALL_T], [hw - WALL_T, FOOT + 0.01, -hd + WALL_T], [-hw + WALL_T, FOOT + 0.01, -hd + WALL_T]], [0.7, 0.7, 0.55, 0.55]);

  // Walls: back and sides stay, the front is cut away.
  const wallOpts = { aoBottom: 0.7, aoTop: 0.72 };
  addBox(walls.mesh, [-hw, FOOT, -hd], [hw, top, -hd + WALL_T], wallOpts);
  addBox(walls.mesh, [-hw, FOOT, -hd + WALL_T], [-hw + WALL_T, top, hd - WALL_T], wallOpts);
  addBox(walls.mesh, [hw - WALL_T, FOOT, -hd + WALL_T], [hw, top, hd - WALL_T], wallOpts);
  addBox(front.mesh, [-hw, FOOT, hd - WALL_T], [hw, top, hd], wallOpts);

  // Roof shape: gable along x, ridge over the middle.
  const pitch = roofKind === 'thatch' ? 0.85 : roofKind === 'sod' ? 0.5 : 0.68; // radians
  const over = roofKind === 'thatch' ? 0.55 : 0.4;
  const thick = roofKind === 'thatch' ? 0.32 : roofKind === 'sod' ? 0.26 : 0.12;
  const run = hd; // horizontal distance from the wall face to the ridge
  const rise = run * Math.tan(pitch);
  const ridgeY = top + rise;

  // Gable ends: triangles above the side walls (both faces), and the timbers on them.
  for (const sx of [-1, 1]) {
    const xo = sx * hw, xi = sx * (hw - WALL_T);
    const tri = (x: number, out: boolean): void => {
      const a: Vec3 = [x, top, hd], b: Vec3 = [x, top, -hd], c: Vec3 = [x, ridgeY, 0];
      const facesOut = (sx > 0) === out;
      addFace(gables.mesh, facesOut ? [b, c, a] : [a, c, b], [0.85, 0.7, 0.85]);
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
    addOrientedBox(roof.mesh, mid, ax, ay, az, [hw + over * 0.8, len / 2, thick / 2], { aoBottom: 0.85, aoTop: 1, skip: ['nz'] });
    // Underside, darker: what you see under the eaves.
    addOrientedBox(under.mesh, mid, ax, ay, az, [hw + over * 0.8, len / 2, thick / 2], { aoBottom: 0.45, aoTop: 0.35, skip: ['pz', 'px', 'nx', 'py', 'ny'] });
  };
  slope(1);
  slope(-1);
  // Ridge cap closes the notch where the two slopes meet.
  addBeam(roof.mesh, [-hw - over * 0.8, ridgeY + thick * 0.75, 0], [hw + over * 0.8, ridgeY + thick * 0.75, 0], thick * 1.6, [0, 1, 0]);

  // Chimney: stone stack on the right gable end, rising through the roof.
  const cx = hw - 0.75, cz = -hd * 0.3;
  const chTop = ridgeY + 0.9;
  addBox(chimney.mesh, [cx - 0.35, top - 0.2, cz - 0.35], [cx + 0.35, chTop, cz + 0.35], { aoBottom: 0.6, aoTop: 1 });
  addBox(chimney.mesh, [cx - 0.42, chTop, cz - 0.42], [cx + 0.42, chTop + 0.12, cz + 0.42], { aoBottom: 0.8 });

  // Timber frame, standing proud of the plaster. Front parts are cut away with the wall.
  const proud = 0.05;
  const zf = hd + proud * 0.5, xr = hw + proud * 0.5;
  const bays = Math.max(2, Math.round(W / 2));
  const frontFace: Vec3 = [0, 0, 1], sideFace: Vec3 = [1, 0, 0];
  const beam = (m: MeshData, a: Vec3, b: Vec3, face: Vec3): void => addBeam(m, a, b, BEAM, face, { aoBottom: 0.85 });
  // Posts and rails on the front.
  for (let i = 0; i <= bays; i++) {
    const x = -hw + BEAM / 2 + (W - BEAM) * (i / bays);
    beam(frontTimber.mesh, [x, FOOT, zf], [x, top, zf], frontFace);
  }
  const bay = W / bays;
  // The door sits in the middle of one of the first two bays.
  const doorBay = rng.int(2);
  const dx = -hw + bay * (doorBay + 0.5) + (rng.next() - 0.5) * 0.3;
  const doorW = 1.0, doorH = 1.95;
  const winY = FOOT + wallH * 0.55;
  // Sill rail just under the windows; the low rails stop at the door frame.
  const midY = winY - 0.45;
  for (const y of [FOOT + BEAM / 2, midY]) {
    beam(frontTimber.mesh, [-hw, y, zf], [dx - doorW / 2 - BEAM / 2, y, zf], frontFace);
    beam(frontTimber.mesh, [dx + doorW / 2 + BEAM / 2, y, zf], [hw, y, zf], frontFace);
  }
  beam(frontTimber.mesh, [-hw, top - BEAM / 2, zf], [hw, top - BEAM / 2, zf], frontFace);
  // Door frame: jambs and a heavy lintel.
  for (const s of [-1, 1]) beam(frontTimber.mesh, [dx + s * (doorW / 2 + BEAM / 2), FOOT, zf], [dx + s * (doorW / 2 + BEAM / 2), FOOT + doorH + 0.1, zf], frontFace);
  addBeam(frontTimber.mesh, [dx - doorW / 2 - BEAM - 0.1, FOOT + doorH + 0.12, zf + 0.02], [dx + doorW / 2 + BEAM + 0.1, FOOT + doorH + 0.12, zf + 0.02], BEAM * 1.3, frontFace);
  // The right side wall (the one the camera sees).
  const sideBays = Math.max(1, Math.round(D / 2));
  for (let i = 0; i <= sideBays; i++) {
    const z = hd - BEAM / 2 - (D - BEAM) * (i / sideBays);
    beam(timber.mesh, [xr, FOOT, z], [xr, top, z], sideFace);
  }
  for (const y of [FOOT + BEAM / 2, midY, top - BEAM / 2]) beam(timber.mesh, [xr, y, hd], [xr, y, -hd], sideFace);
  beam(timber.mesh, [xr, midY, -hd + 0.1], [xr, top - 0.1, -hd + D * 0.35], sideFace);
  // The left side wall gets the same frame (seen when the camera turns, and from inside).
  for (let i = 0; i <= sideBays; i++) {
    const z = hd - BEAM / 2 - (D - BEAM) * (i / sideBays);
    beam(timber.mesh, [-xr, FOOT, z], [-xr, top, z], [-1, 0, 0]);
  }
  for (const y of [FOOT + BEAM / 2, midY, top - BEAM / 2]) beam(timber.mesh, [-xr, y, hd], [-xr, y, -hd], [-1, 0, 0]);

  // Door: a plank door in its frame.
  addBox(door.mesh, [dx - doorW / 2, FOOT, hd], [dx + doorW / 2, FOOT + doorH, hd + 0.07], { aoBottom: 0.7, unitUV: true });
  // Steps up to it.
  addBox(stone.mesh, [dx - 0.7, 0, hd + 0.08], [dx + 0.7, FOOT * 0.5, hd + 0.55], { aoBottom: 0.6, skip: ['ny'] });

  // Windows: one in every other front bay that has no door, one on each side wall.
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
  const sideZ = hd - D / sideBays / 2;
  const winList: HouseModel['windows'] = [];
  for (let i = 0; i < bays; i++) {
    if (i === doorBay) continue;
    const x = -hw + bay * (i + 0.5);
    win(frontWindows.mesh, frontShutters.mesh, [x, winY, hd + 0.02], [0, 0, 1]);
    winList.push({ at: [x, winY, hd + 0.1], normal: [0, 0, 1] });
  }
  win(windows.mesh, shutters.mesh, [hw + 0.02, winY, sideZ], [1, 0, 0]);
  winList.push({ at: [hw + 0.1, winY, sideZ], normal: [1, 0, 0] });
  win(windows.mesh, shutters.mesh, [-hw - 0.02, winY, sideZ], [-1, 0, 0]);
  winList.push({ at: [-hw - 0.1, winY, sideZ], normal: [-1, 0, 0] });

  const parts = [stone, walls, front, gables, timber, frontTimber, roof, under, chimney, door, windows, frontWindows, shutters, frontShutters, floor]
    .filter((p) => p.mesh.indices.length > 0);
  return {
    parts,
    floorY: FOOT,
    room: { x0: -hw + WALL_T, x1: hw - WALL_T, z0: -hd + WALL_T, z1: hd - WALL_T },
    door: [dx, FOOT, hd],
    footprint: { x0: -hw - 0.1, x1: hw + 0.1, z0: -hd - 0.1, z1: hd + 0.6 },
    smoke: [cx, chTop + 0.12, cz],
    windows: winList,
  };
}
