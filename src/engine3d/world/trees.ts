import * as THREE from 'three';
import { THINGS } from '../../content/things';
import type { PlacedTree } from '../../core/world3d/layout';
import { placedId } from '../../core/world3d/state';
import type { Clump } from '../../core/world3d/tree';
import { fbm } from '../../core/noise';
import { barkTex, leafTex } from '../../art/textures3d';
import { type LitOpts, lit } from '../materials';
import { geometryOf } from '../things';
import { tex } from './tex';
import type { Standing, Tagged } from './types';
import type { SpikeWorld } from './index';

/**
 * Trees (`tree` on a kind: `content/things/kinds/tree.ts`): a trunk and its crown of leaf clumps, each kind and seed
 * built once and shared by every tree that looks like it. The crown grows shells and sways; a tap on the trunk means
 * the tree. Boulders and other lumpy props use the same clumps (`lumpGeometry`).
 */

export class Trees {
  /** Tree geometry by kind and seed: built once, shared by every tree that looks like it (never disposed). */
  private geos = new Map<string, { wood: THREE.BufferGeometry; leaves: THREE.BufferGeometry | null }>();
  private barkMat: THREE.MeshLambertMaterial | null = null;
  /** Leaf materials by tint (0: the broadleaf green). */
  private leafMats = new Map<number, { mat: THREE.MeshLambertMaterial; opts: LitOpts }>();

  constructor(private readonly w: SpikeWorld) {}

  /** Stand a tree up where it is placed, as part of the chunk `st`. */
  build(place: PlacedTree, st: Standing): void {
    const w = this.w;
    const kind = place.kind ?? 'oak', look = THINGS.get(kind).tree;
    if (!look) return;
    const key = `${kind}:${place.seed}`;
    let geo = this.geos.get(key);
    if (!geo) {
      const t = look.model(place.seed);
      geo = { wood: geometryOf(t.wood), leaves: t.clumps.length ? lumpGeometry(t.clumps, 1) : null }; // a dead tree has no leaves
      geo.wood.userData.shared = true;
      if (geo.leaves) geo.leaves.userData.shared = true;
      this.geos.set(key, geo);
    }
    const group = new THREE.Group();
    // Bark and leaf textures are painted once and shared by every tree.
    this.barkMat ??= lit({ map: tex(barkTex(4)), ao: true, wettable: true, seeThrough: true });
    const wood = new THREE.Mesh(geo.wood, this.barkMat);
    wood.castShadow = wood.receiveShadow = true;
    group.add(wood);
    // A tap on the trunk means the tree (not the crown: it hangs over ground you want to walk to).
    group.userData.thing = { id: placedId({ kind, x: place.x, z: place.z }), kind, house: null, level: 0, rot: 0, pick: wood, exact: true } satisfies Tagged;
    group.position.set(place.x, w.store.heightAt(place.x, place.z), place.z);
    w.scene.add(group);
    st.objects.push(group);
    if (!geo.leaves) return;
    // The crown in its kind's colour (a pine's is darker and bluer than a broadleaf's).
    const tint = look.leafTint ?? 0;
    if (!this.leafMats.has(0)) {
      const green: LitOpts = { map: tex(leafTex(5)), ao: true, sway: { from: 2.5, amount: 0.018 }, seeThrough: true };
      this.leafMats.set(0, { mat: lit(green), opts: green });
    }
    let leaf = this.leafMats.get(tint);
    if (!leaf) {
      const opts: LitOpts = { ...this.leafMats.get(0)!.opts, color: tint };
      this.leafMats.set(tint, (leaf = { mat: lit(opts), opts }));
    }
    const leaves = new THREE.Mesh(geo.leaves, leaf.mat);
    leaves.castShadow = leaves.receiveShadow = true;
    group.add(leaves);
    w.shells.add(leaves, leaf.opts, { density: 0.55, tint: 1.18, step: 0.12 }, null, st.shells);
  }
}

/** Lumpy balls for leaf clumps and boulders: a noisy icosphere per clump, merged. `detail` is the subdivision. */
export function lumpGeometry(clumps: Clump[], detail: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  clumps.forEach((c, i) => {
    const geo = new THREE.IcosahedronGeometry(1, detail);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const nrm = new Float32Array(pos.count * 3), uv = new Float32Array(pos.count * 2), col = new Float32Array(pos.count * 3);
    const tone = c.tone ?? 0.5;
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      const lump = 1 + (fbm(x * 1.7 + i * 3, z * 1.7 + y, 41 + i) - 0.5) * 0.3;
      const px = x * c.r[0] * lump, py = y * c.r[1] * lump, pz = z * c.r[2] * lump;
      pos.setXYZ(k, px + c.at[0], py + c.at[1], pz + c.at[2]);
      // Pixels in the leaf texture are the cluster's own: mapped round it, not smeared down it.
      uv.set([px * 1.0 + pz * 0.55 + i * 1.3, py * 0.8 - pz * 0.35], k * 2);
    }
    // Flat faces: each facet of a cluster is one tone, so a cluster reads as a chunky clump with hard-lit sides.
    // The shade is the cluster's tone (light on top and out, dark under and in) times how much the facet faces up.
    for (let f = 0; f < pos.count; f += 3) {
      const a = new THREE.Vector3(pos.getX(f), pos.getY(f), pos.getZ(f));
      const b = new THREE.Vector3(pos.getX(f + 1), pos.getY(f + 1), pos.getZ(f + 1));
      const d = new THREE.Vector3(pos.getX(f + 2), pos.getY(f + 2), pos.getZ(f + 2));
      const n = b.clone().sub(a).cross(d.clone().sub(a)).normalize();
      const mid = a.clone().add(b).add(d).multiplyScalar(1 / 3).sub(new THREE.Vector3(c.at[0], c.at[1], c.at[2]));
      if (n.dot(mid) < 0) n.negate(); // outward
      const up = n.y * 0.5 + 0.5;
      const ao = (0.42 + 0.7 * tone) * (0.55 + 0.6 * up);
      for (let v = 0; v < 3; v++) {
        nrm.set([n.x, n.y, n.z], (f + v) * 3);
        col.set([ao, ao, ao], (f + v) * 3);
      }
    }
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(geo);
  });
  return mergeAll(parts);
}

function mergeAll(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // Icosahedra are non-indexed; concatenate attribute arrays.
  const names = ['position', 'normal', 'uv', 'color'] as const;
  const out = new THREE.BufferGeometry();
  for (const n of names) {
    const size = geos[0].attributes[n].itemSize;
    const total = geos.reduce((a, g) => a + g.attributes[n].count * size, 0);
    const arr = new Float32Array(total);
    let o = 0;
    for (const g of geos) {
      arr.set(g.attributes[n].array as Float32Array, o);
      o += g.attributes[n].count * size;
    }
    out.setAttribute(n, new THREE.BufferAttribute(arr, size));
  }
  return out;
}
