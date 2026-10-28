import * as THREE from 'three';
import type { Sprite } from '../art/props';
import { TEXELS_PER_M } from '../core/world3d/tiers';
import { lit, pixTexture } from './materials';

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
  frames: THREE.Texture[];
  /** Advance the animation (8 frames, ~8 fps). */
  tick(t: number): void;
}

const cache = new WeakMap<object, THREE.Texture[]>();

function framesOf(s: Sprite): THREE.Texture[] {
  let tex = cache.get(s);
  if (!tex) {
    const uniq = new Map<object, THREE.Texture>();
    tex = s.frames.map((f) => {
      let t = uniq.get(f);
      if (!t) {
        t = pixTexture(f.data, f.w, f.h, { flip: true, mips: false });
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        uniq.set(f, t);
      }
      return t;
    });
    cache.set(s, tex);
  }
  return tex;
}

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
  const frames = framesOf(s);
  const mat = lit({ map: frames[0], sprite: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = opts.shadow ?? !opts.flat;
  mesh.receiveShadow = true;
  let last = -1;
  return {
    mesh,
    frames,
    tick(t: number) {
      const i = Math.floor(t * 8) % frames.length;
      if (i !== last) {
        mat.map = frames[i];
        last = i;
      }
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
