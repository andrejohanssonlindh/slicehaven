import * as THREE from 'three';
import { barkTex, leafTex, plasterTex, stoneTex, thatchTex, timberTex } from '../art/textures3d';
import type { Pix } from '../art/pix';
import type { MeshData } from '../core/world3d/mesh';
import { LAUNDRY_HANG } from '../core/world3d/props';
import type { ThingMaterial, ThingParts } from '../core/world3d/things';
import { TEXELS_PER_M } from '../core/world3d/tiers';
import { lit, pixTexture } from './materials';

/**
 * Drawing a kind of thing's meshes (`ThingParts`): the material for each `ThingMaterial`, made once and shared by every
 * page and everything drawn with it, and the group of meshes for one thing. The world and the model gallery both use it.
 */

const tex = (p: Pix): THREE.DataTexture => pixTexture(p.data, p.w, p.h, { flip: true, ppm: TEXELS_PER_M });

/** Mesh data to a GPU geometry; the ambient occlusion goes in the colour attribute. */
export function geometryOf(m: MeshData): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(m.positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(m.normals, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(m.uvs, 2));
  const c = new Float32Array(m.ao.length * 3);
  m.ao.forEach((a, i) => c.set([a, a, a], i * 3));
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  if (m.hollow) g.setAttribute('aHollow', new THREE.Float32BufferAttribute(m.hollow, 1));
  g.setIndex(m.indices);
  return g;
}

const mats = new Map<string, THREE.MeshLambertMaterial>();
const once = (key: string, make: () => THREE.MeshLambertMaterial): THREE.MeshLambertMaterial => {
  let m = mats.get(key);
  if (!m) mats.set(key, (m = make()));
  return m;
};

/** The material a part of a thing is drawn with (see `ThingMaterial`); `colour` (sRGB hex) tints cloth and metal. */
export function thingMaterial(m: ThingMaterial, colour = 0): THREE.MeshLambertMaterial {
  switch (m) {
    case 'bark': return once('bark', () => lit({ map: tex(barkTex(4)), ao: true, wettable: true, seeThrough: true }));
    case 'stone': return once('stone', () => lit({ map: tex(stoneTex(3)), ao: true, wettable: true, seeThrough: true }));
    case 'plank': return once('plank', () => lit({ map: tex(timberTex(6)), ao: true, wettable: true, seeThrough: true }));
    case 'hay': return once('hay', () => lit({ map: tex(thatchTex(8)), ao: true, wettable: true, seeThrough: true }));
    case 'water': return once('water', () => new THREE.MeshLambertMaterial({ color: 0x2f6a8a, emissive: 0x0b2434 }));
    case 'cloth': return once(`cloth:${colour}`, () => lit({ map: tex(plasterTex(5)), color: colour, ao: true, wettable: true }));
    // The cloth swings from the line.
    case 'clothHang': return once(`hang:${colour}`, () => lit({ map: tex(plasterTex(5)), color: colour, ao: true, wettable: true, sway: { from: LAUNDRY_HANG.top, amount: 0.22, hang: true } }));
    // Bushes are low, so they sway from the ground up (trees keep their trunks still), and nobody hides behind them.
    case 'bush': return once('bush', () => lit({ map: tex(leafTex(5)), ao: true, sway: { from: 0, amount: 0.05 }, seeThrough: true }));
    // Worked metal: dark iron unless a colour is given (brass, copper).
    case 'iron': return once(`iron:${colour}`, () => lit({ color: colour || 0x4a4e58, ao: true, wettable: true }));
  }
}

/** A thing's meshes as one group (not its lumps: the world draws those with its own lump geometry). */
export function thingGroup(parts: ThingParts): THREE.Group {
  const group = new THREE.Group();
  for (const part of parts.meshes) {
    const m = new THREE.Mesh(geometryOf(part.mesh), thingMaterial(part.material, part.colour));
    // (Water lies flat in its ring: it takes shadow, it casts none.)
    m.castShadow = part.material !== 'water';
    m.receiveShadow = true;
    group.add(m);
  }
  return group;
}
