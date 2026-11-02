import * as THREE from 'three';
import type { BodyModel } from '../core/world3d/body';
import type { MeshData } from '../core/world3d/mesh';
import { JOINTS, type Joint, type Pose } from '../core/world3d/pose';
import { lit, shellOf } from './materials';

/**
 * A body on screen (`core/world3d/body.ts`): a group per joint, the parts of each joint merged into one mesh (colour in
 * the vertices), and one or two shells over the cloth and hair for the ragged pixel edge. `pose` turns the joints;
 * the caller places and turns `group` (its feet at the origin, facing +z).
 */

/** The shells over cloth and hair: how far out (metres), how sparse, how much darker. Tunable from the gallery. */
export const BODY_SHELLS = [
  { layer: 1, offset: 0.022, density: 0.55, tint: 1.0 },
  { layer: 2, offset: 0.04, density: 0.22, tint: 0.88 },
];

const OPTS = { ao: true, wettable: true } as const;
let shared: { base: THREE.MeshLambertMaterial; shells: THREE.MeshLambertMaterial[]; key: string } | null = null;

/** One material for every body (colours are in the vertices), and its shells; remade when `BODY_SHELLS` changes. */
function materials(): { base: THREE.MeshLambertMaterial; shells: THREE.MeshLambertMaterial[] } {
  const key = JSON.stringify(BODY_SHELLS);
  if (shared?.key === key) return shared;
  const base = shared?.base ?? lit(OPTS);
  shared?.shells.forEach((m) => m.dispose());
  shared = { base, shells: BODY_SHELLS.map((s) => shellOf(base, OPTS, s)), key };
  return shared;
}

/** Merge parts into one geometry, each vertex coloured by its part's colour times its ambient occlusion. */
function geometry(parts: { colour: string; mesh: MeshData }[]): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], col: number[] = [], idx: number[] = [];
  const c = new THREE.Color();
  for (const p of parts) {
    c.set(p.colour); // sRGB in, linear out
    const base = pos.length / 3;
    pos.push(...p.mesh.positions);
    nor.push(...p.mesh.normals);
    for (const a of p.mesh.ao) col.push(c.r * a, c.g * a, c.b * a);
    for (const i of p.mesh.indices) idx.push(base + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

export interface BodyRig {
  /** Place and turn this; the feet are at its origin, the body faces its +z. */
  group: THREE.Group;
  model: BodyModel;
  pose(p: Pose): void;
  /** Show 0, 1 or 2 shell layers. */
  setShells(n: number): void;
  dispose(): void;
}

export function makeBodyRig(model: BodyModel): BodyRig {
  const { base, shells } = materials();
  const group = new THREE.Group();
  const nodes = {} as Record<Joint, THREE.Group>;
  const rest = {} as Record<Joint, THREE.Vector3>;
  for (const j of JOINTS) {
    const n = new THREE.Group();
    const at = model.joints[j].at;
    n.position.set(at[0], at[1], at[2]);
    rest[j] = n.position.clone();
    nodes[j] = n;
  }
  for (const j of JOINTS) {
    const parent = model.joints[j].parent;
    (parent ? nodes[parent] : group).add(nodes[j]);
  }
  const geos: THREE.BufferGeometry[] = [];
  const shellMeshes: THREE.Mesh[][] = [[], []];
  for (const j of JOINTS) {
    const mine = model.parts.filter((p) => p.joint === j);
    if (!mine.length) continue;
    const solid = geometry(mine);
    geos.push(solid);
    const m = new THREE.Mesh(solid, base);
    m.castShadow = true;
    m.receiveShadow = true;
    nodes[j].add(m);
    const fuzzy = mine.filter((p) => p.shell);
    if (!fuzzy.length) continue;
    const sg = geometry(fuzzy);
    geos.push(sg);
    shells.forEach((mat, i) => {
      const s = new THREE.Mesh(sg, mat);
      s.receiveShadow = true;
      nodes[j].add(s);
      shellMeshes[i].push(s);
    });
  }
  return {
    group,
    model,
    pose(p: Pose) {
      for (const j of JOINTS) {
        const t = p.joints[j];
        nodes[j].rotation.set(t?.[0] ?? 0, t?.[1] ?? 0, t?.[2] ?? 0);
      }
      nodes.root.position.y = rest.root.y + (p.lift ?? 0) * model.height;
    },
    setShells(n: number) {
      shellMeshes.forEach((list, i) => list.forEach((m) => { m.visible = i < n; }));
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      group.removeFromParent();
    },
  };
}
