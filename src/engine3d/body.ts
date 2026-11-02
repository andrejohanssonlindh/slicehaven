import * as THREE from 'three';
import type { BodyModel, BodyPart } from '../core/world3d/body';
import { JOINTS, type Joint, type Pose } from '../core/world3d/pose';
import { lit, shellOf } from './materials';

/**
 * A body on screen (`core/world3d/body.ts`): one skinned mesh on a skeleton of the body's joints (every vertex follows
 * the one bone its part hangs from, colour in the vertices), and one or two shells over the cloth and hair for the
 * ragged pixel edge, on the same skeleton. Three draw calls a person, however many parts. `pose` turns the bones; the
 * caller places and turns `group` (its feet at the origin, facing +z).
 */

/** The shells over cloth and hair: how far out (metres), how sparse, how much darker. */
export const BODY_SHELLS = [
  { layer: 1, offset: 0.022, density: 0.55, tint: 1.0 },
  { layer: 2, offset: 0.04, density: 0.22, tint: 0.88 },
];

const OPTS = { ao: true, wettable: true } as const;
let shared: { base: THREE.MeshLambertMaterial; shells: THREE.MeshLambertMaterial[] } | null = null;

/** One material for every body (colours are in the vertices), and its shells. */
function materials(): { base: THREE.MeshLambertMaterial; shells: THREE.MeshLambertMaterial[] } {
  if (!shared) {
    const base = lit(OPTS);
    shared = { base, shells: BODY_SHELLS.map((s) => shellOf(base, OPTS, s)) };
  }
  return shared;
}

/** Where each joint sits at rest, in body space (the skeleton has no turns at rest, so the offsets add up). */
function restPositions(model: BodyModel): Record<Joint, THREE.Vector3> {
  const out = {} as Record<Joint, THREE.Vector3>;
  for (const j of JOINTS) {
    const p = new THREE.Vector3();
    for (let k: Joint | null = j; k; k = model.joints[k].parent) p.add(new THREE.Vector3(...model.joints[k].at));
    out[j] = p;
  }
  return out;
}

/** Parts merged into one skinned geometry: positions in body space, each vertex bound wholly to its part's joint. */
function geometry(parts: BodyPart[], rest: Record<Joint, THREE.Vector3>): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], col: number[] = [], idx: number[] = [], bone: number[] = [], weight: number[] = [];
  const c = new THREE.Color();
  for (const p of parts) {
    c.set(p.colour); // sRGB in, linear out
    const base = pos.length / 3, o = rest[p.joint], b = JOINTS.indexOf(p.joint);
    const P = p.mesh.positions;
    for (let i = 0; i < P.length; i += 3) {
      pos.push(P[i] + o.x, P[i + 1] + o.y, P[i + 2] + o.z);
      bone.push(b, 0, 0, 0);
      weight.push(1, 0, 0, 0);
    }
    nor.push(...p.mesh.normals);
    for (const a of p.mesh.ao) col.push(c.r * a, c.g * a, c.b * a);
    for (const i of p.mesh.indices) idx.push(base + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(bone, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weight, 4));
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
  const bones = JOINTS.map(() => new THREE.Bone());
  JOINTS.forEach((j, i) => {
    const at = model.joints[j].at;
    bones[i].position.set(at[0], at[1], at[2]);
    const parent = model.joints[j].parent;
    if (parent) bones[JOINTS.indexOf(parent)].add(bones[i]);
  });
  const root = bones[JOINTS.indexOf('root')];
  const rootY = root.position.y;
  group.add(root);
  group.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const rest = restPositions(model);
  const geos: THREE.BufferGeometry[] = [];
  const skinned = (geo: THREE.BufferGeometry, mat: THREE.Material): THREE.SkinnedMesh => {
    geos.push(geo);
    const m = new THREE.SkinnedMesh(geo, mat);
    m.bind(skeleton);
    // The body moves within a box about its height: cull by that, not by the rest pose.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, model.height / 2, 0), model.height * 0.75);
    group.add(m);
    return m;
  };
  const solid = skinned(geometry(model.parts, rest), base);
  solid.castShadow = solid.receiveShadow = true;
  const fuzzy = model.parts.filter((p) => p.shell);
  const shellGeo = fuzzy.length ? geometry(fuzzy, rest) : null;
  const shellMeshes = shellGeo ? shells.map((mat) => { const s = skinned(shellGeo, mat); s.receiveShadow = true; return s; }) : [];
  return {
    group,
    model,
    pose(p: Pose) {
      JOINTS.forEach((j, i) => {
        const t = p.joints[j];
        bones[i].rotation.set(t?.[0] ?? 0, t?.[1] ?? 0, t?.[2] ?? 0);
      });
      root.position.y = rootY + (p.lift ?? 0) * model.height;
    },
    setShells(n: number) {
      shellMeshes.forEach((m, i) => { m.visible = i < n; });
    },
    dispose() {
      new Set(geos).forEach((g) => g.dispose());
      skeleton.dispose();
      group.removeFromParent();
    },
  };
}
