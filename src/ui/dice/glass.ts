import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { DiceSkin } from '../../content/dice/skins';
import { PIPS, type Stage } from '.';

/**
 * The top level: dice thrown on glass over the game. The glass is a table seen from above, the edges of the screen
 * its walls. The dice are dropped in from a height along the longer side, bounce, tumble, knock into the walls and
 * each other, and come to rest (rigid-body physics, `cannon-es`). As at a table, a die that stops on another or
 * leaning is thrown again. The rules have already rolled (seeded, `core/dice.ts`), so the show works backwards: the
 * whole throw is simulated first, then each die's faces are laid on so that the face that ends up on top is the one
 * rolled (a D6 is turned inside its body; a D10's numbers are shifted round it), and then the throw is played back.
 * The movement is real physics; only which number is painted where is chosen.
 *
 * A D6 is a rounded cube with pips; a D10 a ten-sided die; a D100 is two D10s, tens (00–90) and ones (0–9), with
 * 00 and 0 making 100. A six that splits glows as it settles, stays put, and its two new dice drop out of it.
 */

const STEP = 1 / 60;
/** The longest a throw may take, seconds (anything still moving near the end stays where it is). */
const MAX_TIME = 9;
const GRAVITY = 70;
/** The lid over the glass (die units): nothing flies off the screen. */
const LID = 12;

/** The faces of a cube die by the cube's material slots (+x, −x, +y, −y, +z, −z): opposite faces make seven. */
const CUBE_FACES = [3, 4, 1, 6, 2, 5];
const CUBE_NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;

/** One body on the glass, before and after the throw. */
interface Thrown {
  shape: 'd6' | 'd10';
  /** A D6: the face rolled. */
  face?: number;
  /** A D10: its ten labels in order round the die, and which of them was rolled. */
  labels?: string[];
  target?: number;
  /** It is a six that splits: its two dice come out when it settles. */
  split: boolean;
  /** The body it splits from (index in the list), or null. */
  parent: number | null;
  // --- worked out by the simulation ---
  body?: CANNON.Body;
  spawn?: number;
  settle?: number;
  /** The face (D6 material slot, D10 kite) on top when it settled. */
  up?: number;
}

/** The dice of a throw, as bodies: a D100 becomes two D10s. */
function bodiesOf(stage: Stage): Thrown[] {
  const out: Thrown[] = [];
  for (const r of stage.rolls) {
    const at: number[] = [];
    for (const d of r.rolled) {
      at.push(out.length);
      if (d.sides === 6) out.push({ shape: 'd6', face: d.face, split: !d.counts, parent: d.from === null ? null : at[d.from] });
      else if (d.sides === 100) {
        const tens = d.face === 100 ? 0 : Math.floor(d.face / 10), ones = d.face % 10;
        out.push({ shape: 'd10', labels: Array.from({ length: 10 }, (_, i) => (i === 0 ? '00' : `${i}0`)), target: tens, split: false, parent: null });
        out.push({ shape: 'd10', labels: Array.from({ length: 10 }, (_, i) => `${i}`), target: ones, split: false, parent: null });
      } else {
        // A D10 (or another table die up to ten sides): its own numbers.
        const n = Math.min(10, d.sides);
        out.push({ shape: 'd10', labels: Array.from({ length: 10 }, (_, i) => `${(i % n) + 1}`), target: (d.face - 1) % 10, split: false, parent: null });
      }
    }
  }
  return out;
}

// --- the ten-sided die: a pentagonal trapezohedron, ten kites (the tips' height keeps each kite flat) ---
const D10_R = 0.62;
const D10_C = D10_R * 0.1056;
const D10_H = (D10_C * (1 + Math.cos(Math.PI / 5))) / (1 - Math.cos(Math.PI / 5));

interface Hull {
  verts: THREE.Vector3[];
  /** Each kite: its tip first, then round it, wound outward. */
  faces: number[][];
}

function d10Shape(): Hull {
  const verts = [new THREE.Vector3(0, 0, D10_H), new THREE.Vector3(0, 0, -D10_H)];
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5;
    verts.push(new THREE.Vector3(Math.cos(a) * D10_R, Math.sin(a) * D10_R, i % 2 ? -D10_C : D10_C));
  }
  const ring = (i: number): number => 2 + (((i % 10) + 10) % 10);
  const faces: number[][] = [];
  for (let k = 0; k < 5; k++) faces.push([0, ring(2 * k), ring(2 * k + 1), ring(2 * k + 2)]);
  for (let k = 0; k < 5; k++) faces.push([1, ring(2 * k + 1), ring(2 * k + 2), ring(2 * k + 3)]);
  // Wind each kite outward, keeping its tip first.
  return {
    verts,
    faces: faces.map((f) => {
      const [a, b, c] = f.map((i) => verts[i]);
      const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
      const mid = f.reduce((m, i) => m.add(verts[i]), new THREE.Vector3()).multiplyScalar(1 / f.length);
      return n.dot(mid) < 0 ? [f[0], f[3], f[2], f[1]] : f;
    }),
  };
}

/** The D10's outward face normals, in its own frame. */
const normalsOf = (s: Hull): THREE.Vector3[] => s.faces.map((f) => {
  const [a, b, c] = f.map((i) => s.verts[i]);
  return new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
});

/**
 * How a kite lies on its square of texture, true to its shape (all ten are alike): its corners' texture spots, and
 * where its number goes (canvas fractions, its top toward the tip) and how big, so the number sits in the wide part.
 */
function kiteLayout(s: Hull): { uvs: number[][]; text: { x: number; y: number; size: number } } {
  const [tip, a, far, b] = s.faces[0].map((i) => s.verts[i]);
  const ev = new THREE.Vector3().subVectors(tip, far).normalize();
  const ab = new THREE.Vector3().subVectors(b, a);
  const eu = ab.sub(ev.clone().multiplyScalar(ab.dot(ev))).normalize();
  const flat = [tip, a, far, b].map((p) => {
    const d = new THREE.Vector3().subVectors(p, far);
    return [d.dot(eu), d.dot(ev)];
  });
  const L = flat[0][1], w = Math.max(Math.abs(flat[1][0]), Math.abs(flat[3][0])), sc = 1 / Math.max(2 * w, L);
  const uvs = flat.map(([u, v]) => [0.5 + u * sc, v * sc + (1 - L * sc) / 2]);
  // The number a little above the widest part, as wide as the kite is there.
  const vNum = flat[1][1] + (L - flat[1][1]) * 0.22;
  const width = 2 * w * (1 - (vNum - flat[1][1]) / (L - flat[1][1]));
  return { uvs, text: { x: 0.5, y: 1 - (vNum * sc + (1 - L * sc) / 2), size: width * sc * 0.62 } };
}

/** The D10 as a mesh: one group (one material, one number) per kite. */
function d10Geometry(s: Hull): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [];
  const g = new THREE.BufferGeometry();
  const { uvs } = kiteLayout(s);
  s.faces.forEach((f, i) => {
    for (const tri of [[0, 1, 2], [0, 2, 3]]) {
      for (const j of tri) {
        const v = s.verts[f[j]];
        pos.push(v.x, v.y, v.z);
        uv.push(uvs[j][0], uvs[j][1]);
      }
    }
    g.addGroup(i * 6, 6, i);
  });
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** A canvas texture: a D6 face with pips, or a D10 kite's number (placed as `kiteLayout` says). */
function faceTexture(skin: DiceSkin, kind: 'pips' | 'kite', value: number | string, at = { x: 0.5, y: 0.56, size: 0.4 }): THREE.CanvasTexture {
  const n = 128;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!;
  g.fillStyle = skin.body;
  g.fillRect(0, 0, n, n);
  g.fillStyle = skin.pip;
  if (kind === 'pips') {
    g.strokeStyle = skin.edge;
    g.lineWidth = 10;
    g.strokeRect(0, 0, n, n);
    for (const [x, y] of PIPS[value as number]) {
      g.beginPath();
      g.arc(n * (0.25 + x * 0.25), n * (0.25 + y * 0.25), n * 0.085, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    const s = String(value);
    const px = n * at.size * (s.length > 1 ? 0.62 : 1);
    g.font = `800 ${px}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(s, n * at.x, n * at.y);
    // A 6 and a 9 are told apart by a line under them.
    if (s === '6' || s === '9') g.fillRect(n * at.x - px * 0.25, n * at.y + px * 0.45, px * 0.5, Math.max(2, px * 0.08));
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

/** A die at rest must lie this flat (its top face's tilt, cos) and on the glass, not on another die; else it is thrown again. */
const FLAT = Math.cos((8 * Math.PI) / 180);
/** How many times one die may be thrown again before it is taken as it lies (and the whole throw is tried anew). */
const RETHROWS = 3;
/** How many whole throws are tried, out of sight, for one where every die ends flat on the glass. */
const TRIES = 4;

interface Bounds {
  x: number;
  y0: number;
  y1: number;
}

interface Sim {
  p: Float32Array;
  q: Float32Array;
  frames: number;
  /** Dice taken as they lay though not flat on the glass (after their rethrows ran out). */
  bad: number;
}

/**
 * Simulate the whole throw: when each die comes in, how it moves, when and which way up it comes to rest. A die
 * that stops on top of another, or leaning, is picked up and thrown again, as at a table.
 */
function simulate(dice: Thrown[], bounds: Bounds): Sim {
  for (const d of dice) {
    delete d.body;
    delete d.spawn;
    delete d.settle;
    delete d.up;
  }
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, -GRAVITY) });
  const diceMat = new CANNON.Material('die'), glassMat = new CANNON.Material('glass');
  world.addContactMaterial(new CANNON.ContactMaterial(diceMat, glassMat, { friction: 0.35, restitution: 0.5 }));
  world.addContactMaterial(new CANNON.ContactMaterial(diceMat, diceMat, { friction: 0.2, restitution: 0.45 }));
  // The glass, a wall at each edge of the screen, and a lid so nothing leaves.
  const wall = (pos: [number, number, number], axis: [number, number, number], angle: number): void => {
    const b = new CANNON.Body({ mass: 0, material: glassMat, shape: new CANNON.Plane() });
    b.position.set(...pos);
    b.quaternion.setFromAxisAngle(new CANNON.Vec3(...axis), angle);
    world.addBody(b);
  };
  wall([0, 0, 0], [1, 0, 0], 0);
  wall([0, 0, LID], [1, 0, 0], Math.PI);
  wall([-bounds.x, 0, 0], [0, 1, 0], Math.PI / 2);
  wall([bounds.x, 0, 0], [0, 1, 0], -Math.PI / 2);
  wall([0, bounds.y0, 0], [1, 0, 0], -Math.PI / 2);
  wall([0, bounds.y1, 0], [1, 0, 0], Math.PI / 2);

  const d10 = d10Shape();
  const normals10 = normalsOf(d10);
  /** How high a die's middle is when it lies flat on the glass. */
  const restZ = { d6: 0.5, d10: normals10[0].dot(d10.verts[d10.faces[0][0]]) };
  const make = (d: Thrown): CANNON.Body => new CANNON.Body({
    mass: 1,
    material: diceMat,
    shape: d.shape === 'd6'
      ? new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
      : new CANNON.ConvexPolyhedron({ vertices: d10.verts.map((v) => new CANNON.Vec3(v.x, v.y, v.z)), faces: d10.faces }),
    linearDamping: 0.08,
    angularDamping: 0.12,
  });
  /** The face on top, and how flat it lies (1 = flat). */
  const upOf = (d: Thrown, b: CANNON.Body): { face: number; flat: number } => {
    const quat = new THREE.Quaternion(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    const list = d.shape === 'd6' ? CUBE_NORMALS.map((n) => new THREE.Vector3(...n)) : normals10;
    let best = 0, bestZ = -2;
    list.forEach((n, i) => {
      const z = n.clone().applyQuaternion(quat).z;
      if (z > bestZ) {
        bestZ = z;
        best = i;
      }
    });
    return { face: best, flat: bestZ };
  };

  // Thrown in along the longer side of the glass (from the left or right on a wide screen, from the bottom on a
  // tall one), from a height, so they drop, bounce and tumble before they roll out.
  const cy = (bounds.y0 + bounds.y1) / 2, hy = (bounds.y1 - bounds.y0) / 2, hx = bounds.x;
  const wide = hx > hy;
  const speed = Math.max(8, Math.min(16, 2 * Math.max(hx, hy) * 0.9));
  const side = Math.random() < 0.5 ? -1 : 1;
  const toss = (b: CANNON.Body): void => {
    if (wide) {
      b.position.set(-side * (hx - 0.9), cy + rand(-hy, hy) * 0.5, rand(3.5, 5.5));
      b.velocity.set(side * speed * rand(0.8, 1.15), rand(-3, 3), rand(-1, 2));
    } else {
      b.position.set(rand(-hx, hx) * 0.5, bounds.y0 + 0.9, rand(3.5, 5.5));
      b.velocity.set(rand(-3, 3), speed * rand(0.8, 1.15), rand(-1, 2));
    }
  };
  const spin = (b: CANNON.Body): void => {
    b.quaternion.setFromEuler(rand(0, 6.3), rand(0, 6.3), rand(0, 6.3));
    b.angularVelocity.set(rand(-25, 25), rand(-25, 25), rand(-25, 25));
  };

  // The first throw comes in a few frames apart; a split six's dice when it settles.
  let k = 0;
  for (const d of dice) if (d.parent === null) d.spawn = (k++) * 4;
  const maxFrames = Math.round(MAX_TIME / STEP);
  const n = dice.length;
  const p = new Float32Array(maxFrames * n * 3), q = new Float32Array(maxFrames * n * 4);
  const still = new Array<number>(n).fill(0);
  /** When each die was last thrown (it must move a while before it can be at rest), and how often it was thrown again. */
  const thrownAt = new Array<number>(n).fill(0);
  const again = new Array<number>(n).fill(0);
  let bad = 0;
  /** Picked up and thrown again: lifted and tossed back toward the middle of the glass. */
  const rethrow = (i: number, f: number): void => {
    const b = dice[i].body!;
    again[i]++;
    thrownAt[i] = f;
    still[i] = 0;
    b.velocity.set((-b.position.x / Math.max(1, hx)) * rand(4, 8) + rand(-2, 2), ((cy - b.position.y) / Math.max(1, hy)) * rand(4, 8) + rand(-2, 2), rand(14, 18));
    b.angularVelocity.set(rand(-25, 25), rand(-25, 25), rand(-25, 25));
  };
  const settle = (i: number, f: number): void => {
    const d = dice[i], b = d.body!;
    d.settle = f;
    d.up = upOf(d, b).face;
    // A settled die stays put: what lands after it bounces off it, and its face can no longer change.
    b.type = CANNON.Body.STATIC;
    b.mass = 0;
    b.updateMassProperties();
    b.velocity.setZero();
    b.angularVelocity.setZero();
    if (d.split) for (const c of dice) if (c.parent === i) c.spawn = f + 6;
  };
  let f = 0;
  for (; f < maxFrames; f++) {
    dice.forEach((d) => {
      if (d.spawn !== f) return;
      const b = make(d);
      if (d.parent === null) toss(b);
      else {
        // Out of the split six, from above it, so they drop onto it and off.
        const from = dice[d.parent].body!.position, nth = dice.filter((c) => c.parent === d.parent).indexOf(d);
        b.position.set(from.x + rand(-0.3, 0.3), from.y + rand(-0.3, 0.3), from.z + 2.2 + nth * 1.2);
        b.velocity.set(rand(-5, 5), rand(-5, 5), rand(1, 3));
      }
      spin(b);
      world.addBody(b);
      d.body = b;
      thrownAt[dice.indexOf(d)] = f;
    });
    world.step(STEP);
    dice.forEach((d, i) => {
      const b = d.body, o = f * n + i;
      if (!b) {
        p[o * 3 + 2] = -100; // not thrown yet: out of sight
        q[o * 4 + 3] = 1;
        return;
      }
      p.set([b.position.x, b.position.y, b.position.z], o * 3);
      q.set([b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w], o * 4);
      if (d.settle !== undefined) return;
      const slow = b.velocity.length() < 0.25 && b.angularVelocity.length() < 0.5;
      still[i] = slow ? still[i] + 1 : 0;
      if (still[i] < 10 || f - thrownAt[i] <= 20) return;
      // At rest: it counts only lying flat on the glass. On another die, or leaning, it is thrown again.
      const ok = upOf(d, b).flat >= FLAT && b.position.z < restZ[d.shape] + 0.12;
      if (ok || again[i] >= RETHROWS) {
        if (!ok) bad++;
        settle(i, f);
      } else rethrow(i, f);
    });
    if (dice.every((d) => d.settle !== undefined)) break;
    // Running out of time: whatever still moves stays where it is (and a split six's dice still come out).
    if (f === maxFrames - 90) dice.forEach((d, i) => {
      if (d.body && d.settle === undefined) {
        bad++;
        settle(i, f);
      }
    });
  }
  return { p, q, frames: Math.min(maxFrames, f + 1), bad };
}

/** Throws tried out of sight until one ends with every die flat on the glass (or the best of a few). */
function bestThrow(dice: Thrown[], bounds: Bounds): Sim {
  let best: { sim: Sim; at: Pick<Thrown, 'spawn' | 'settle' | 'up'>[] } | null = null;
  for (let i = 0; i < TRIES; i++) {
    const sim = simulate(dice, bounds);
    if (!best || sim.bad < best.sim.bad) best = { sim, at: dice.map((d) => ({ spawn: d.spawn, settle: d.settle, up: d.up })) };
    if (sim.bad === 0) break;
  }
  best!.at.forEach((a, i) => Object.assign(dice[i], a));
  return best!.sim;
}

/**
 * The glass on this screen: die units (a D6 is 1 across, `S` pixels) and the walls. Room is kept for the page's top
 * bar and the result line, less on a short screen; the dice are smaller on a small screen and when many are thrown,
 * so they have room to roll out side by side (a wide phone has little height).
 */
export function glassSize(W: number, H: number, count: number): { S: number; bounds: Bounds } {
  const top = Math.max(40, Math.min(110, H * 0.13)), bottom = Math.max(36, Math.min(80, H * 0.1));
  const w = W, h = H - top - bottom;
  // About 8 dice across the shorter side, and about 9 dice' worth of glass for every die thrown.
  const S = Math.max(22, Math.min(58, Math.min(w, h) / 8, Math.sqrt((w * h) / (9 * Math.max(4, count)))));
  return { S, bounds: { x: w / 2 / S - 0.05, y0: -H / 2 / S + bottom / S, y1: H / 2 / S - top / S } };
}

export async function throwOnGlass(stage: Stage): Promise<void> {
  const { root, skin } = stage;
  const W = window.innerWidth, H = window.innerHeight;
  const dice = bodiesOf(stage);
  const { S, bounds } = glassSize(W, H, dice.length);
  const sim = bestThrow(dice, bounds);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  root.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  // Looking straight down on the glass, which fills the screen: a die thrown up comes nearer and looks bigger.
  const fov = 30;
  const camera = new THREE.PerspectiveCamera(fov, W / H, 1, 400);
  camera.position.set(0, 0, H / 2 / S / Math.tan((fov / 2) * (Math.PI / 180)));
  scene.add(new THREE.AmbientLight(0xffffff, 1.3));
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.2);
  sun.position.set(-4, 6, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -bounds.x - 4, right: bounds.x + 4, top: bounds.y1 + 4, bottom: bounds.y0 - 4, near: 1, far: 40 });
  scene.add(sun);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(bounds.x * 2 + 4, bounds.y1 - bounds.y0 + 4), new THREE.ShadowMaterial({ opacity: 0.32 }));
  catcher.position.y = (bounds.y0 + bounds.y1) / 2;
  catcher.receiveShadow = true;
  scene.add(catcher);

  const textures: THREE.Texture[] = [];
  const cube = new RoundedBoxGeometry(1, 1, 1, 3, 0.14);
  const d10s = d10Shape();
  const kite = d10Geometry(d10s);
  stage.cleanup.push(() => {
    for (const t of textures) t.dispose();
    for (const g of [cube, kite, catcher.geometry]) g.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  });
  const layout = kiteLayout(d10s);
  const tex = (kind: 'pips' | 'kite', v: number | string): THREE.Texture => {
    const t = faceTexture(skin, kind, v, layout.text);
    textures.push(t);
    return t;
  };
  const pips = CUBE_FACES.map((v) => tex('pips', v));

  // Each die's faces, laid on now that we know which way up it settles.
  const meshes = dice.map((d) => {
    const outer = new THREE.Group();
    let mats: THREE.MeshStandardMaterial[];
    let inner: THREE.Mesh;
    if (d.shape === 'd6') {
      mats = pips.map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.45 }));
      inner = new THREE.Mesh(cube, mats);
      // Turn the cube inside its body so the rolled face sits where the top one settled (a turn of the cube onto itself).
      inner.quaternion.setFromUnitVectors(new THREE.Vector3(...CUBE_NORMALS[CUBE_FACES.indexOf(d.face!)]), new THREE.Vector3(...CUBE_NORMALS[d.up ?? 4]));
    } else {
      // Shift the numbers round the die so the one rolled is on the kite that settled on top.
      const shift = (d.target! - (d.up ?? 0) + 20) % 10;
      mats = d10s.faces.map((_, i) => new THREE.MeshStandardMaterial({ map: tex('kite', d.labels![(i + shift) % 10]), roughness: 0.45 }));
      inner = new THREE.Mesh(kite, mats);
    }
    inner.castShadow = true;
    outer.add(inner);
    outer.visible = false;
    scene.add(outer);
    return { outer, mats };
  });

  const glow = new THREE.Color(skin.split);
  const t0 = performance.now();
  await new Promise<void>((done) => {
    const frame = (): void => {
      const f = stage.skipped() ? sim.frames - 1 : Math.min(sim.frames - 1, Math.floor((performance.now() - t0) / 1000 / STEP));
      dice.forEach((d, i) => {
        const o = f * dice.length + i, m = meshes[i];
        m.outer.visible = sim.p[o * 3 + 2] > -50;
        m.outer.position.set(sim.p[o * 3], sim.p[o * 3 + 1], sim.p[o * 3 + 2]);
        m.outer.quaternion.set(sim.q[o * 4], sim.q[o * 4 + 1], sim.q[o * 4 + 2], sim.q[o * 4 + 3]);
        if (d.split && d.settle !== undefined && f >= d.settle) {
          // A six that split: it glows as it settles, then fades back as its two dice take over.
          const k = Math.max(0, 1 - ((f - d.settle) * STEP) / 1.2);
          for (const mat of m.mats) {
            mat.emissive.copy(glow).multiplyScalar(0.2 + 0.5 * k);
            mat.transparent = true;
            mat.opacity = 0.6 + 0.4 * k;
          }
        }
      });
      renderer.render(scene, camera);
      if (f >= sim.frames - 1) return done();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
