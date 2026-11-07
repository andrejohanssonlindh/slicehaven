import * as THREE from 'three';
import { CHUNK, type ChunkTerrain } from '../../core/world3d/chunks';
import { houseToLocal } from '../../core/world3d/layout';
import { splatAt } from '../../core/world3d/terrain';
import { Rng } from '../../core/rng';
import { lit } from '../materials';
import type { SpikeWorld } from './index';

/**
 * Grass: tufts scattered over each chunk (seeded by the chunk, so a reload plants the same grass), thicker where it
 * grows wild, none on roads, mud, the shore or under houses. The quality tier says how many show.
 */

export class Grass {
  private geo: THREE.BufferGeometry | null = null;
  private mat: THREE.MeshLambertMaterial | null = null;
  /** The share of each chunk's tufts shown (the tier's count against the one the world was made with). */
  private share = 1;

  /** `count`: tufts for a 64 m patch, as the world was made. */
  constructor(private readonly w: SpikeWorld, private readonly count: number) {}

  /** A tuft: three thin blades crossed, dark at the root, light at the tip. Shared by every chunk. */
  private parts(): { geo: THREE.BufferGeometry; mat: THREE.MeshLambertMaterial } {
    if (!this.geo || !this.mat) {
      const pos: number[] = [], col: number[] = [], nrm: number[] = [];
      for (let b = 0; b < 3; b++) {
        const a = (b / 3) * Math.PI + 0.3;
        const ca = Math.cos(a), sa = Math.sin(a);
        const lean = (b - 1) * 0.06, hgt = 0.28 + b * 0.06, w = 0.05;
        // Both windings, front-sided: a double-sided material would flip the up-normal on the back.
        pos.push(-ca * w, 0, -sa * w, ca * w, 0, sa * w, lean * ca, hgt, lean * sa);
        pos.push(ca * w, 0, sa * w, -ca * w, 0, -sa * w, lean * ca, hgt, lean * sa);
        for (let k = 0; k < 2; k++) col.push(0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 1.15, 1.15, 1.15);
        for (let k = 0; k < 6; k++) nrm.push(0, 1, 0);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      this.geo = geo;
      this.mat = lit({ ao: true, sway: { from: 0, amount: 0.3 } });
    }
    return { geo: this.geo, mat: this.mat };
  }

  /** The tufts of one chunk, as many shown as the tier says; null if there is no grass at all. */
  build(c: ChunkTerrain): THREE.InstancedMesh | null {
    const w = this.w;
    // Tier grass is a count for a 64 m patch; a chunk gets its area's share.
    const count = Math.round((this.count * CHUNK * CHUNK) / (64 * 64));
    if (count <= 0) return null;
    const { geo, mat } = this.parts();
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const rng = Rng.fromSeed(91 + c.i * 7919 + c.j * 104729);
    const g = w.ground;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const tint = new THREE.Color();
    const half = g.size / 2;
    const nearHouses = w.houseIndex.liteNear(c.x0, c.z0, c.x0 + CHUNK, c.z0 + CHUNK);
    let n = 0;
    for (let tries = 0; n < count && tries < count * 20; tries++) {
      const x = c.x0 + rng.next() * CHUNK, z = c.z0 + rng.next() * CHUNK;
      if (Math.abs(x) > half * 0.95 || Math.abs(z) > half * 0.95) continue;
      const sp = splatAt(g, x, z);
      if (sp.road > 0.3 || sp.mud > 0.3 || sp.shore > 0.2) continue;
      if (nearHouses.some((hs) => {
        const hl = hs.built.model.footprint, l = houseToLocal(hs.built.place, x, z);
        return l.x > hl.x0 - 0.3 && l.x < hl.x1 + 0.3 && l.z > hl.z0 - 0.3 && l.z < hl.z1 + 0.3;
      })) continue;
      // Thicker where the grass grows wild.
      if (rng.next() > 0.35 + sp.wild * 0.65) continue;
      p.set(x, w.store.heightAt(x, z) - 0.02, z);
      q.setFromAxisAngle(up, rng.next() * Math.PI * 2);
      const k = 0.7 + rng.next() * 0.6 + sp.wild * 0.6;
      s.set(k, k, k);
      mesh.setMatrixAt(n, m.compose(p, q, s));
      mesh.setColorAt(n, tint.setHSL(0.23 + rng.next() * 0.06, 0.5, 0.3 + rng.next() * 0.16, THREE.SRGBColorSpace));
      n++;
    }
    mesh.count = n;
    mesh.userData.full = n;
    mesh.receiveShadow = true;
    // The tufts are spread over the whole chunk; cull by the chunk's box, not the one tuft geometry.
    mesh.frustumCulled = false;
    mesh.count = this.shown(mesh);
    return mesh;
  }

  /** How many of a chunk's tufts show at the tier's share. */
  private shown(m: THREE.InstancedMesh): number {
    return Math.round((m.userData.full as number) * this.share);
  }

  /** Tier grass count (for a 64 m patch); chunks show that share of the tufts they hold. */
  setCount(count: number): void {
    this.share = this.count > 0 ? Math.min(1, count / this.count) : 0;
    for (const c of this.w.chunks.values()) if (c.grass) c.grass.count = this.shown(c.grass);
  }
}
