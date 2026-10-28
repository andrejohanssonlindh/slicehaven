import * as THREE from 'three';
import type { Sprite } from '../art/props';
import { TEXELS_PER_M } from '../core/world3d/tiers';
import type { Pix } from '../art/pix';
import { VIEWS, type View, type WalkSet } from '../art/folkWalk';
import { type AtlasSlot, spriteAtlas } from './atlas';
import { lit } from './materials';

/**
 * 2D art standing in the 3D world. A sprite is a vertical card turned to face
 * the camera's heading and stretched by 1/cos(pitch), so on screen every art
 * pixel lands on one rendered pixel, exactly as drawn. The z-buffer sorts it
 * against walls and roofs. Lit like everything else (its normal faces the
 * camera), and it casts an alpha-tested shadow.
 *
 * Flat things (rugs, straw) lie on the floor instead, stretched by 1/sin(pitch).
 */

export interface SpriteCard {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial>;
  /** Advance the animation (8 frames, ~8 fps). */
  tick(t: number): void;
}

/** One shared material per atlas texture: every sprite in an atlas draws with the same one. */
const materials = new WeakMap<THREE.Texture, THREE.MeshLambertMaterial>();
const ids = new WeakMap<object, number>();
let nextId = 0;

const idOf = (f: object): number => {
  let id = ids.get(f);
  if (id === undefined) ids.set(f, (id = nextId++));
  return id;
};

export function spriteCard(s: Sprite, pitch: number, opts: { flat?: boolean; ppm?: number; shadow?: boolean } = {}): SpriteCard {
  const ppm = opts.ppm ?? TEXELS_PER_M;
  const f0 = s.frames[0];
  const w = f0.w / ppm;
  const h = f0.h / ppm / (opts.flat ? Math.sin(pitch) : Math.cos(pitch));
  const geo = new THREE.PlaneGeometry(w, h);
  // Anchor (ax, ay) in art pixels goes to the origin: x centred on ax, the foot at y = 0.
  const ax = s.ax / f0.w, ay = s.ay / f0.h;
  geo.translate((0.5 - ax) * w, (ay - 0.5) * h, 0);
  if (opts.flat) geo.rotateX(-Math.PI / 2);
  // Frames live in the shared atlas; a frame change only rewrites the card's four UVs.
  const atlas = spriteAtlas();
  const slots = s.frames.map((f) => atlas.add(`f${idOf(f)}`, f));
  const tex = slots[0].texture;
  let mat = materials.get(tex);
  if (!mat) materials.set(tex, (mat = lit({ map: tex, sprite: true })));
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const setFrame = (i: number): void => {
    const u = slots[i].uv;
    uv.setXY(0, u.u0, u.v1).setXY(1, u.u1, u.v1).setXY(2, u.u0, u.v0).setXY(3, u.u1, u.v0);
    uv.needsUpdate = true;
  };
  setFrame(0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = opts.shadow ?? !opts.flat;
  mesh.receiveShadow = true;
  let last = 0;
  return {
    mesh,
    tick(t: number) {
      const i = Math.floor(t * 8) % slots.length;
      if (i !== last) {
        setFrame(i);
        last = i;
      }
    },
  };
}

/** People's material: like any sprite, but whatever stands in front of one gets cut, and people in front of people too. */
const personMaterials = new WeakMap<THREE.Texture, THREE.MeshLambertMaterial>();
const materialFor = (tex: THREE.Texture): THREE.MeshLambertMaterial => {
  let mat = personMaterials.get(tex);
  if (!mat) personMaterials.set(tex, (mat = lit({ map: tex, sprite: true, seeThrough: true })));
  return mat;
};

export interface WalkCard extends SpriteCard {
  /** Show a view, standing or walking. The walk restarts from its first frame when it begins. */
  pose(view: View, moving: boolean, speed?: number): void;
  readonly view: View;
  readonly moving: boolean;
}

/**
 * A person who can turn and walk: one card holding every view's standing and
 * walking frames from the shared atlas. Which frame shows is `pose` plus time;
 * the card itself is turned by the caller (see `faceScreen` in the world).
 */
export function walkCard(set: WalkSet, pitch: number, opts: { ppm?: number } = {}): WalkCard {
  const ppm = opts.ppm ?? TEXELS_PER_M;
  const f0 = set.views.front.idle[0];
  const w = f0.w / ppm, h = f0.h / ppm / Math.cos(pitch);
  const geo = new THREE.PlaneGeometry(w, h);
  const ax = set.ax / f0.w, ay = set.ay / f0.h;
  geo.translate((0.5 - ax) * w, (ay - 0.5) * h, 0);
  const atlas = spriteAtlas();
  const slotsOf = (frames: Pix[]): AtlasSlot[] => frames.map((f) => atlas.add(`f${idOf(f)}`, f));
  const table = {} as Record<View, { idle: AtlasSlot[]; walk: AtlasSlot[] }>;
  for (const v of VIEWS) table[v] = { idle: slotsOf(set.views[v].idle), walk: slotsOf(set.views[v].walk) };
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const mesh = new THREE.Mesh(geo, materialFor(table.front.idle[0].texture));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  let rate = 8;
  let view: View = 'front', moving = false, shown: AtlasSlot | null = null, startT: number | null = null;
  const show = (s: AtlasSlot): void => {
    if (s === shown) return;
    shown = s;
    const u = s.uv;
    uv.setXY(0, u.u0, u.v1).setXY(1, u.u1, u.v1).setXY(2, u.u0, u.v0).setXY(3, u.u1, u.v0);
    uv.needsUpdate = true;
    mesh.material = materialFor(s.texture);
  };
  show(table.front.idle[0]);
  return {
    mesh,
    get view() { return view; },
    get moving() { return moving; },
    pose(v, m, speed = 1.6) {
      if (m && !moving) startT = null;
      view = v;
      moving = m;
      // One cycle of six frames is about 1.2 m at a stroll, so the step rate follows the speed.
      rate = (8 * speed) / 1.6;
    },
    tick(t: number) {
      const slots = moving ? table[view].walk : table[view].idle;
      if (moving && startT === null) startT = t;
      const i = Math.floor((moving ? t - (startT ?? t) : t) * (moving ? rate : 8)) % slots.length;
      show(slots[i]);
    },
  };
}

/** A soft dark blob on the ground under a standing sprite. */
export function blobShadow(radius: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 12);
  geo.rotateX(-Math.PI / 2);
  geo.scale(1, 1, 0.6);
  const mat = new THREE.MeshBasicMaterial({ color: 0x0e0a14, transparent: true, opacity: 0.32, depthWrite: false });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 1;
  return m;
}
