import { Rng } from '../rng';
import { addTaper } from './body';
import { type MeshData, type Vec3, addBeam, addBox, addFace, addOrientedBox, emptyMesh } from './mesh';
import type { ThingMaterial, ThingParts } from './things';

/**
 * The kit for furniture models (`content/things/models/`, how-to in `director/design/models-authoring.md`): a model is
 * collected per material (and colour), then handed over as a kind's `ThingParts`. Pure, metres, y up, the model's front
 * toward +z. Everything here is a box underneath, so a model is cheap: aim for 50–300 triangles.
 */

export { addBox, addBeam, addOrientedBox, addTaper };
export type { Vec3 };

/** Collects a model's meshes by material: `m.mesh('plank')`, `m.mesh('cloth', 0x8a3a2a)`. */
export class ModelBuilder {
  private parts = new Map<string, { material: ThingMaterial; colour?: number; mesh: MeshData }>();

  mesh(material: ThingMaterial, colour?: number): MeshData {
    const key = `${material}:${colour ?? ''}`;
    let p = this.parts.get(key);
    if (!p) this.parts.set(key, (p = { material, ...(colour !== undefined ? { colour } : {}), mesh: emptyMesh() }));
    return p.mesh;
  }

  done(): ThingParts {
    return { meshes: [...this.parts.values()].filter((p) => p.mesh.indices.length > 0) };
  }
}

/**
 * A round thing standing upright: `sides` faces round from y0 to y1, radius r0 at the bottom and r1 at the top, on
 * (cx, cz). Capped at the top (and the bottom, unless it stands on something). Eight sides read as round at pixel size.
 */
export function addCylinder(m: MeshData, cx: number, cz: number, y0: number, y1: number, r0: number, r1: number, sides = 8, o: { top?: boolean; bottom?: boolean; ao0?: number; ao1?: number } = {}): void {
  const at = (k: number, y: number, r: number): Vec3 => {
    const a = (k / sides) * Math.PI * 2;
    return [cx + Math.sin(a) * r, y, cz + Math.cos(a) * r];
  };
  const ao0 = o.ao0 ?? 0.75, ao1 = o.ao1 ?? 1;
  for (let k = 0; k < sides; k++) addFace(m, [at(k, y0, r0), at(k + 1, y0, r0), at(k + 1, y1, r1), at(k, y1, r1)], [ao0, ao0, ao1, ao1]);
  if (o.top !== false) for (let k = 0; k < sides; k++) addFace(m, [[cx, y1, cz], at(k, y1, r1), at(k + 1, y1, r1)], [ao1, ao1, ao1]);
  if (o.bottom) for (let k = 0; k < sides; k++) addFace(m, [[cx, y0, cz], at(k + 1, y0, r0), at(k, y0, r0)], [ao0, ao0, ao0]);
}

/** Four square legs under a top of `w` × `d` (its corners), `h` tall, `t` thick, set in from the edges by `inset`. */
export function addLegs(m: MeshData, w: number, d: number, h: number, t = 0.06, inset = 0.05): void {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * (w / 2 - inset - t / 2), z = sz * (d / 2 - inset - t / 2);
      addBox(m, [x - t / 2, 0, z - t / 2], [x + t / 2, h, z + t / 2], { aoBottom: 0.6 });
    }
  }
}

/** A seeded random (0..1) for a model's own variety, from its seed and a salt: the same seed, the same model. */
export const vary = (seed: number, salt: number): number => Rng.fromSeed(`model:${seed}:${salt}`).next();
