import { STONE, stoneWall, WOOD } from './buildings';
import { makeAnvil, makeCoalBin, makeForge, makeToolRack, makeTrough, makeWorkbench, makeBed, makeChest, makeCupboard, makeHearth, makeRug, makeShelf, makeStool, makeTable } from './furniture';
import { type Light, type Prop, fbm, grime, pick, polyFill, selOutline, white } from './grit';
import { type HouseSpec, glassWindow, houseGeom, infill, paintRoof, stack, timber } from './houses';
import { Pix } from './pix';
import { FRAMES } from './props';

/**
 * What you see when you step inside: the roof and the front wall cut away, the
 * floor, the back and left walls from the inside, the right wall still in its
 * outer face. Same box, same anchor as the house, so the two swap in place.
 */

export interface RoomItem {
  prop: Prop;
  /** Across the room 0..1, and depth 0 (front) .. 1 (back wall). */
  u: number;
  d: number;
  /** Pixels above the floor, for things hung on the wall. */
  lift?: number;
}

/** The default furnishing of a one-room cottage. */
export function cottageItems(): RoomItem[] {
  return [
    { prop: makeRug(), u: 0.5, d: 0.4 },
    { prop: makeBed(), u: 0.17, d: 0.93 },
    { prop: makeCupboard(), u: 0.5, d: 0.98 },
    { prop: makeHearth(), u: 0.84, d: 0.97 },
    { prop: makeShelf(), u: 0.5, d: 0.99, lift: 40 },
    { prop: makeTable(), u: 0.5, d: 0.55 },
    { prop: makeStool(), u: 0.3, d: 0.3 },
    { prop: makeStool(3), u: 0.73, d: 0.36 },
    { prop: makeChest(), u: 0.92, d: 0.12 },
  ];
}

const forgeProp = makeForge();

/** A working smithy: forge in the middle-right, anvil, trough, bench, coal. */
export function smithyItems(): RoomItem[] {
  return [
    { prop: forgeProp, u: 0.76, d: 0.62 },
    { prop: makeAnvil(), u: 0.45, d: 0.5 },
    { prop: makeTrough(), u: 0.14, d: 0.46 },
    { prop: makeWorkbench(), u: 0.3, d: 0.96 },
    { prop: makeCoalBin(), u: 0.88, d: 0.2 },
    { prop: makeToolRack(), u: 0.62, d: 0.99, lift: 2 },
  ];
}

/** Floor of the room: planks that run across, each its own shade, nailed, worn in the traffic lane. */
function paintFloor(p: Pix, g: ReturnType<typeof houseGeom>, seed: number, earth = false): void {
  const { FX0, FX1, FB, DX, DY, Wf } = g;
  polyFill(p, [[FX0, FB], [FX1, FB], [FX1 + DX, FB + DY], [FX0 + DX, FB + DY]], (x, y) => {
    const d = (FB - y) / -DY;
    const u = (x - FX0 - d * DX) / Wf;
    if (earth) {
      // Beaten earth with flagstones around the forge and anvil.
      const cell = fbm(x / 6, y / 3.5, seed + 9);
      const flag = cell > 0.58 && u > 0.2;
      const e = flag ? pick(STONE, 0.3 + white(Math.floor(x / 7), Math.floor(y / 4), seed) * 0.3 + (white(x, y, seed + 2) - 0.5) * 0.1, x, y)
        : pick(['#1a120d', '#2b1f17', '#3e2e20', '#564030'], 0.3 + fbm(x / 4, y / 3, seed + 3) * 0.5 + (white(x, y, seed + 4) - 0.5) * 0.14 - Math.abs(u - 0.5) * 0.1, x, y);
      return e;
    }
    const row = Math.floor(d * 11);
    const along = u * Wf;
    const joint = Math.floor((along + (row % 3) * 17 + white(row, 0, seed) * 30) / 52);
    const base = white(row, joint, seed + 1);
    let v = 0.32 + base * 0.34 + (fbm(x / 9, y * 1.7, seed) - 0.5) * 0.3 + (white(x, y, seed + 2) - 0.5) * 0.08;
    if ((d * 11) % 1 < 0.09) v -= 0.25; // gap between boards
    if (Math.abs(u - 0.5) < 0.2 && d < 0.8) v -= 0.07; // worn lane
    return pick(WOOD, v, x, y);
  });
}

export function makeRoom(spec: HouseSpec & { items?: RoomItem[]; mode?: 'cutaway' | 'workshop' }): Prop {
  const { seed } = spec;
  const workshop = spec.mode === 'workshop';
  const cols = spec.cols ?? (workshop ? 4 : 5);
  const g = houseGeom(cols);
  const { Wf, Hw, DX, DY, FX0, FX1, FB, W, H } = g;
  const walls = workshop ? 'tarred' : spec.walls ?? 'white';
  const back = new Pix(W, H);

  // Back wall, seen from inside, with its frame and a window full of daylight.
  const bx0 = FX0 + DX, bx1 = FX1 + DX, by1 = FB + DY, by0 = by1 - Hw;
  infill(back, bx0, by0, bx1 - 1, by1 - 8, seed + 1, walls, 0.95);
  stoneWall(back, bx0, by1 - 9, bx1, by1, seed + 2, STONE, 2);
  timber(back, bx0, by1 - 11, bx1, by1 - 11, 3, seed + 3);
  timber(back, bx0, by0, bx1, by0, 4, seed + 4);
  for (const f of [0, 0.34, 0.66, 1]) {
    const x = Math.round(bx0 + f * (Wf - 4));
    timber(back, x, by0, x, by1 - 11, 3, seed + 5 + Math.round(f * 10));
  }
  glassWindow(back, Math.round(bx0 + Wf * 0.17), by0 + 10, 14, 18, false, null, false, seed + 8);
  // Daylight through it, not lamplight.
  for (let y = by0 + 10; y < by0 + 28; y++) for (let x = Math.round(bx0 + Wf * 0.17) - 5; x < Math.round(bx0 + Wf * 0.17) + 7; x++) {
    if (back.alpha(x, y) && (back.get(x, y)[2] > back.get(x, y)[0])) back.set(x, y, pick(['#6a8cb0', '#9cc0dc', '#cfe4f2', '#f4fbff'], 0.6 + (x - bx0) * 0.01 - (y - by0 - 10) * 0.02, x, y));
  }

  // Left wall from the inside: a slanted plane.
  const lp = new Pix(W, H);
  infill(lp, FX0, FB + DY - Hw, FX0 + DX, FB, seed + 20, walls, 0.8);
  polyFill(back, [[FX0, FB - Hw], [FX0 + DX, FB + DY - Hw], [FX0 + DX, FB + DY], [FX0, FB]], (x, y) => {
    const u = (x - FX0) / DX;
    const v = (FB + u * DY - y) / Hw;
    if (v < 0.14) return pick(STONE, 0.4 + (white(x >> 1, y >> 1, seed + 21) - 0.5) * 0.5, x, y);
    const c = lp.get(x, y);
    return c[3] ? c : '#6a5e4a';
  });
  for (const u of [0.02, 0.52, 0.98]) {
    const x = Math.round(FX0 + u * DX), y = Math.round(FB + u * DY);
    timber(back, x, y - Hw, x, y - Math.round(Hw * 0.14), 3, seed + 22 + Math.round(u * 10));
  }
  for (let x = FX0; x < FX0 + DX; x++) { const u = (x - FX0) / DX; for (let k = 0; k < 3; k++) back.set(x, Math.round(FB + u * DY - Hw) + k, pick(WOOD, 0.58 - k * 0.2, x, k)); }
  glassWindow(back, Math.round(FX0 + DX * 0.5), Math.round(FB + DY * 0.5 - Hw * 0.78), 8, 12, false, null, false, seed + 24);

  // Floor.
  paintFloor(back, g, seed + 30, workshop);

  // Right wall: the outer face stays, so the box still reads as a house.
  const rw = new Pix(W, H);
  infill(rw, FX1, FB + DY - Hw, FX1 + DX, FB, seed + 40, walls, 0.74);
  polyFill(back, [[FX1, FB - Hw], [FX1 + DX, FB + DY - Hw], [FX1 + DX, FB + DY], [FX1, FB]], (x, y) => {
    const u = (x - FX1) / DX;
    const v = (FB + u * DY - y) / Hw;
    if (v < 0.17) return pick(STONE, 0.33 + (white(x >> 1, y >> 1, seed + 41) - 0.5) * 0.5, x, y);
    const c = rw.get(x, y);
    return c[3] ? c : '#8a7c62';
  });
  for (const u of [0.02, 0.5, 0.98]) {
    const x = Math.round(FX1 + u * DX), y = Math.round(FB + u * DY);
    timber(back, x, y - Hw, x, y - Math.round(Hw * 0.17), 3, seed + 42 + Math.round(u * 10));
  }
  // Wall tops: the cut edge of the walls, with a plank cap.
  for (let k = 0; k < 4 && !workshop; k++) {
    for (let x = bx0; x <= bx1; x++) back.set(x, by0 - 1 - k, pick(WOOD, 0.7 - k * 0.12, x, k));
  }
  for (let x = FX1; x <= FX1 + DX && !workshop; x++) { const u = (x - FX1) / DX; for (let k = 0; k < 4; k++) back.set(x, Math.round(FB + u * DY - Hw) - 1 - k, pick(WOOD, 0.7 - k * 0.12, x, k)); }

  // Front stub: the low footing wall and a door-gap.
  const front = new Pix(W, H);
  const stubH = 16;
  if (workshop) {
    // Open front: heavy posts on stone pads, a lintel, a worn threshold.
    for (const u of [0.01, 0.5, 0.99]) {
      const x = Math.round(FX0 + u * (Wf - 5));
      timber(front, x, FB - Hw - 2, x, FB - 4, 5, seed + 52 + Math.round(u * 10));
      stoneWall(front, x - 2, FB - 6, x + 6, FB, seed + 53, STONE, 1);
    }
    timber(front, FX0 - 1, FB - Hw - 1, FX1 + 1, FB - Hw - 1, 5, seed + 54);
    for (let x = FX0; x < FX1; x++) front.set(x, FB, pick(STONE, 0.4 + white(x >> 1, 0, seed) * 0.3, x, 0));
  } else stoneWall(front, FX0 - 1, FB - stubH, FX1, FB, seed + 50, STONE, 3);
  if (!workshop) {
    for (let x = FX0 - 1; x <= FX1; x++) { front.set(x, FB - stubH, STONE[5]); front.set(x, FB - stubH - 1, STONE[4]); }
    const doorX = FX0 + 36, doorW = 20;
    for (let y = FB - stubH - 1; y <= FB; y++) for (let x = doorX; x < doorX + doorW; x++) front.data[(y * W + x) * 4 + 3] = 0;
    for (let x = doorX - 2; x < doorX + doorW + 2; x++) for (let k = 0; k < 2; k++) front.set(x, FB + k - 1, pick(STONE, 0.7 - k * 0.3, x, k));
  }
  grime(front, seed + 51, 0.5, FB + 2);

  // Furniture, back to front.
  const items = (spec.items ?? (workshop ? smithyItems() : cottageItems())).map((it) => ({
    ...it,
    x: Math.round(FX0 + it.u * Wf + it.d * DX),
    y: Math.round(FB + it.d * DY),
  }));
  // Wall-mounted pieces hang higher.
  items.sort((a, b) => a.y - b.y);
  const frames: Pix[] = [];
  const lights: Light[] = [];
  const ax = Math.round(FX0 + Wf / 2) + 1;
  const ay = FB + 2;
  const base = new Pix(W, H);
  base.blit(back, 0, 0);
  const baseO = selOutline(base);
  const frontO = selOutline(front);
  for (const it of items) {
    for (const l of it.prop.lights ?? []) lights.push({ ...l, dx: it.x + 1 - ax + l.dx, dy: it.y + 1 - ay + l.dy });
  }
  // Workshop: the roof sits on top, and the forge's chimney goes up through it.
  let roofO: Pix | null = null;
  let stackO: Pix | null = null;
  let smoke: { dx: number; dy: number } | undefined;
  if (workshop) {
    const { RISE } = g;
    const ex0 = FX0 - 7, ex1 = FX1 + 6, rx0 = ex0 + DX / 2, rx1 = ex1 + DX / 2;
    const eaveY = FB - Hw + 1, ridgeY = FB - Hw + DY / 2 - RISE;
    const rl = new Pix(W, H);
    const rf = paintRoof(rl, { ex0, ex1, rx0, rx1, eaveY, ridgeY, kind: spec.roof ?? 'shingle', seed: seed + 80, moss: 0.35 });
    roofO = selOutline(rl);
    const forge = items.find((it) => it.prop === forgeProp);
    if (forge) {
      const sx = forge.x - 6;
      const sl = new Pix(W, H);
      const jy = Math.round(rf.ridgeAt(sx + 6) + (rf.eaveAt(sx + 6) - rf.ridgeAt(sx + 6)) * 0.45);
      stack(sl, sx, 4, jy, seed + 63);
      stackO = selOutline(sl);
      smoke = { dx: sx + 7 - ax, dy: 6 - ay };
    }
  }
  for (let f = 0; f < FRAMES; f++) {
    const fr = new Pix(baseO.w, baseO.h);
    fr.blit(baseO, 0, 0);
    for (const it of items) {
      const spr = it.prop.frames[f % it.prop.frames.length];
      fr.blit(spr, it.x - it.prop.ax + 1, it.y - it.prop.ay + 1 - (it.lift ?? 0));
    }
    fr.blit(frontO, 0, 0);
    if (roofO) fr.blit(roofO, 0, 0);
    if (stackO) fr.blit(stackO, 0, 0);
    frames.push(fr);
  }
  return { frames, ax, ay, shadow: workshop ? 60 : 0, lights, smoke: smoke ? [smoke] : undefined, footprint: { cols, rows: 3 } };
}

/** The smithy: an open-fronted workshop at house scale, roof and all. */
export function makeSmithy(spec: HouseSpec & { items?: RoomItem[] } = { seed: 7 }): Prop {
  return makeRoom({ ...spec, mode: 'workshop' });
}
