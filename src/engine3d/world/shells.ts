import * as THREE from 'three';
import { type LitOpts, shellOf } from '../materials';
import type { HouseInst, Shell } from './types';
import type { SpikeWorld } from './index';

/**
 * Shells: layers of fur grown out from a mesh (a thatched roof, a tree's crown), so it reads as tufted, not flat. Each
 * layer is sparser than the last; the settings say how many show. A house's shells hide while its cut-away is open.
 */

export class Shells {
  /** Every shell standing now. */
  list: Shell[] = [];
  /** One shell material per look (the material it grows from, the layer, the density), shared by every thing that has it. */
  private mats = new Map<string, THREE.MeshLambertMaterial>();

  constructor(private readonly w: SpikeWorld) {}

  /** Two shells: `step` metres out, then twice that, each sparser than the last. */
  add(base: THREE.Mesh, opts: LitOpts, s: { density: number; tint: number; step: number }, cutOf: HouseInst | null, collect?: Shell[]): void {
    for (const layer of [1, 2]) {
      const key = `${(base.material as THREE.Material).uuid}:${layer}:${s.density}:${s.step}`;
      let mat = this.mats.get(key);
      if (!mat) {
        mat = shellOf(base.material as THREE.MeshLambertMaterial, opts, {
          layer, offset: s.step * layer, density: s.density / (layer * layer), tint: layer === 1 ? s.tint : s.tint * 1.08,
        });
        this.mats.set(key, mat);
      }
      const m = new THREE.Mesh(base.geometry, mat);
      m.position.copy(base.position);
      m.rotation.copy(base.rotation);
      m.scale.copy(base.scale);
      m.receiveShadow = true;
      base.parent ? base.parent.add(m) : base.add(m);
      const shell = { mesh: m, layer, cutOf };
      this.list.push(shell);
      collect?.push(shell);
    }
  }

  /** Let go of these shells (their thing was taken down). */
  drop(shells: readonly Shell[]): void {
    for (const s of shells) {
      const i = this.list.indexOf(s);
      if (i >= 0) this.list.splice(i, 1);
    }
  }

  /** Show as many layers as the settings say, and none on a house whose cut-away is open. */
  step(): void {
    const n = this.w.settings.shells;
    for (const s of this.list) s.mesh.visible = s.layer <= n && (!s.cutOf || s.cutOf.cutT < 0.3);
  }
}
