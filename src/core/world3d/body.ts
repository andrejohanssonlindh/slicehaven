import { type MeshData, type Vec3, addFace, addOrientedBox, emptyMesh, norm } from './mesh';
import type { Joint } from './pose';

/**
 * A person's body in 3D (plan item A2): a dozen low-poly parts on a small skeleton, dressed from the person's look.
 * Every person is built by this one function; what differs is the spec: the people's proportions (`BodyPlan`), the
 * height and girth from the people's typical size, and the clothes' colours. Pure: the engine turns the parts into
 * meshes and turns the joints to a pose (`pose.ts`).
 *
 * Body space: metres, the feet on y = 0, facing +z, the body's left at +x. Each part's mesh is in its joint's space.
 */

/** A people's proportions, as shares of the body's height unless said otherwise (`content/people/bodies.ts`). */
export interface BodyPlan {
  /** The head's height. A human is about 0.13 (seven and a half heads tall); a dwarf's or a missla's is bigger. */
  head: number;
  /** The head's width against a human's (1). */
  headW: number;
  /** How high the hips are (leg length). A human 0.5. */
  legs: number;
  shoulders: number;
  hips: number;
  /** Limb thickness. */
  limb: number;
  /** Arm length against a human's (1). */
  arm: number;
  /** Hands and feet against a human's (1). */
  hands: number;
  /** Eye size against a human's (1). */
  eyes: number;
  /** A jaw standing forward of the face, as a share of the head (the tirak's heavy jaw). */
  jaw?: number;
  /** Ears that rise to a point (elves). */
  pointedEars?: boolean;
  /** Claws at the fingertips. */
  claws?: boolean;
  /** Women of this people grow beards too. */
  beardedWomen?: boolean;
  /** Eyes of a colour of their own (the tirak's red), `#rrggbb`; dark otherwise. */
  eyeColour?: string;
}

export type HairStyle = 'short' | 'long' | 'bald' | 'bun' | 'kerchief' | 'hat' | 'helm' | 'hood';
export type Garment = 'shirt' | 'tunic' | 'dress' | 'robe';
export type Held = 'hoe' | 'staff' | 'spear' | 'hammer' | 'basket' | 'bucket' | 'stick';

/** Colours as `#rrggbb`. */
export interface BodyColours {
  skin: string;
  /** The skin's shadow tone (nose, stubble). */
  skinDark: string;
  hair: string;
  eyes: string;
  top: string;
  legs: string;
  boots: string;
  /** Hat, kerchief, hood or helm. */
  head?: string;
  apron?: string;
  vest?: string;
  cloak?: string;
  belt: string;
  wood: string;
  iron: string;
  straw: string;
}

/** Everything that makes one body: worked out from a person by `bodySpecOf` (`content/people/bodies.ts`). */
export interface BodySpec {
  /** Metres. */
  height: number;
  /** Width against a typical body of that people and height (from the weight), 1 typical. */
  girth: number;
  sex: 'f' | 'm';
  plan: BodyPlan;
  colours: BodyColours;
  style: HairStyle;
  beard?: 'full' | 'stubble';
  garment: Garment;
  sleeves: 'long' | 'rolled' | 'short';
  belt?: boolean;
  right?: Held;
  left?: Held;
}

export interface BodyPart {
  joint: Joint;
  /** `#rrggbb`. */
  colour: string;
  /** Cloth and hair get shells (the ragged pixel edge); skin and metal don't. */
  shell: boolean;
  mesh: MeshData;
}

export interface BodyModel {
  height: number;
  /** Each joint: its parent and where it sits in the parent's space at rest. */
  joints: Record<Joint, { parent: Joint | null; at: Vec3 }>;
  parts: BodyPart[];
  /** How far one loop of the walk carries the body, metres (two steps). */
  stride: number;
}

/**
 * A box narrowing from its bottom (`w0` × `d0`, full widths) to its top (`w1` × `d1`), centred on (cx, cz), between y0
 * and y1. `ao0`/`ao1` darken the bottom and top rings.
 */
export function addTaper(m: MeshData, cx: number, cz: number, y0: number, y1: number, w0: number, d0: number, w1: number, d1: number, ao0 = 1, ao1 = 1): void {
  const a = w0 / 2, b = d0 / 2, c = w1 / 2, d = d1 / 2;
  const B = (x: number, z: number): Vec3 => [cx + x, y0, cz + z];
  const T = (x: number, z: number): Vec3 => [cx + x, y1, cz + z];
  const side = [ao0, ao0, ao1, ao1];
  addFace(m, [B(-a, b), B(a, b), T(c, d), T(-c, d)], side);
  addFace(m, [B(a, -b), B(-a, -b), T(-c, -d), T(c, -d)], side);
  addFace(m, [B(a, b), B(a, -b), T(c, -d), T(c, d)], side);
  addFace(m, [B(-a, -b), B(-a, b), T(-c, d), T(-c, -d)], side);
  addFace(m, [T(-c, d), T(c, d), T(c, -d), T(-c, -d)], [ao1, ao1, ao1, ao1]);
  addFace(m, [B(-a, -b), B(a, -b), B(a, b), B(-a, b)], [ao0, ao0, ao0, ao0]);
}

/** A box between two corners (a straight `addTaper`). */
const box = (m: MeshData, min: Vec3, max: Vec3, ao0 = 1, ao1 = 1): void =>
  addTaper(m, (min[0] + max[0]) / 2, (min[2] + max[2]) / 2, min[1], max[1], max[0] - min[0], max[2] - min[2], max[0] - min[0], max[2] - min[2], ao0, ao1);

/** The long things a hand can hold: length (metres) and what sits on the end. */
const POLES: Partial<Record<Held, { len: number; head?: 'blade' | 'point' | 'hammer' }>> = {
  spear: { len: 2.0, head: 'point' },
  staff: { len: 1.7 },
  hoe: { len: 1.4, head: 'blade' },
  stick: { len: 1.0 },
  hammer: { len: 0.45, head: 'hammer' },
};

export function buildBody(s: BodySpec): BodyModel {
  const P = s.plan, H = s.height, g = s.girth, C = s.colours;
  const f = s.sex === 'f';
  const parts: BodyPart[] = [];
  const part = (joint: Joint, colour: string, shell: boolean): MeshData => {
    let p = parts.find((x) => x.joint === joint && x.colour === colour && x.shell === shell);
    if (!p) parts.push((p = { joint, colour, shell, mesh: emptyMesh() }));
    return p.mesh;
  };

  // --- landmarks ---
  const headH = P.head * H;
  const neckLen = 0.03 * H;
  const hipY = P.legs * H;
  const kneeY = hipY * 0.52;
  const shoulderY = H - headH - neckLen;
  const waistY = hipY + 0.07 * H;
  const shoulderW = P.shoulders * H * g * (f ? 0.92 : 1);
  const hipW = P.hips * H * g * (f ? 1.05 : 0.97);
  const limb = P.limb * H * Math.sqrt(g);
  const upper = 0.18 * H * P.arm, fore = 0.15 * H * P.arm, hand = 0.075 * H * P.hands;
  const thigh = hipY - kneeY, shin = kneeY - 0.04 * H;
  const footH = 0.04 * H, footL = 0.14 * H * P.hands;

  const joints: BodyModel['joints'] = {
    root: { parent: null, at: [0, hipY, 0] },
    spine: { parent: 'root', at: [0, waistY - hipY, 0] },
    neck: { parent: 'spine', at: [0, shoulderY - waistY, 0] },
    shoulderL: { parent: 'spine', at: [shoulderW / 2 - limb * 0.55, shoulderY - waistY - limb * 0.45, 0] },
    elbowL: { parent: 'shoulderL', at: [0, -upper, 0] },
    shoulderR: { parent: 'spine', at: [-(shoulderW / 2 - limb * 0.55), shoulderY - waistY - limb * 0.45, 0] },
    elbowR: { parent: 'shoulderR', at: [0, -upper, 0] },
    hipL: { parent: 'root', at: [hipW / 2 - limb * 0.75, 0, 0] },
    kneeL: { parent: 'hipL', at: [0, -thigh, 0] },
    hipR: { parent: 'root', at: [-(hipW / 2 - limb * 0.75), 0, 0] },
    kneeR: { parent: 'hipR', at: [0, -thigh, 0] },
  };

  // --- trunk ---
  const torsoTop = shoulderY - waistY + limb * 0.35;
  const tD0 = hipW * 0.58, tD1 = shoulderW * 0.5;
  // The chest is widest at the armpits; above them the shoulders slope in to the neck (no square corners up top).
  const chest = shoulderY - waistY - limb * 0.6;
  const trunk = (colour: string, shell: boolean, grow: number, from: number, to: number): void => {
    addTaper(part('spine', colour, shell), 0, 0, from, chest, hipW * 0.92 * grow, tD0 * grow, shoulderW * grow, tD1 * grow, 0.85, 1);
    addTaper(part('spine', colour, shell), 0, 0, chest - 0.001, to, shoulderW * grow, tD1 * grow, shoulderW * 0.6 * grow, tD1 * 0.85 * grow, 1, 1);
  };
  addTaper(part('root', C.legs, true), 0, 0, -0.05 * H, waistY - hipY, hipW, hipW * 0.6, hipW * 0.95, tD0, 0.7, 1);
  trunk(C.top, true, 1, 0, torsoTop);
  if (C.vest) trunk(C.vest, C.vest !== C.top, 1.06, 0.01 * H, torsoTop - limb * 0.15);
  if (s.belt) addTaper(part('root', C.belt, false), 0, 0, waistY - hipY - 0.018 * H, waistY - hipY + 0.012 * H, hipW * 1.0, hipW * 0.63, hipW * 0.99, tD0 * 1.06);
  if (C.cloak) {
    const zb = -tD1 / 2 - 0.02;
    addTaper(part('spine', C.cloak, true), 0, zb - 0.02, 0.22 * H - waistY, torsoTop, hipW * 1.4, 0.04, shoulderW * 1.08, 0.05, 0.75, 1);
  }

  // --- skirts: tunic, dress, robe hang from the waist ---
  const hem = { shirt: null, tunic: hipY - thigh * 0.45, dress: 0.14 * H, robe: 0.05 * H }[s.garment];
  if (hem !== null) addTaper(part('root', C.top, true), 0, 0, hem - hipY, waistY - hipY, hipW * (s.garment === 'tunic' ? 1.12 : 1.4), hipW * (s.garment === 'tunic' ? 0.72 : 0.95), hipW * 0.98, hipW * 0.62, 0.8, 1);
  if (C.apron) {
    const z = hipW * 0.32 + (hem !== null && s.garment !== 'tunic' ? hipW * 0.12 : 0);
    addTaper(part('root', C.apron, true), 0, z, Math.max(kneeY - 0.04 * H, 0.2 * H) - hipY, waistY - hipY, hipW * 0.95, 0.025, hipW * 0.85, 0.025, 0.85, 1);
    addTaper(part('spine', C.apron, true), 0, tD0 / 2 + 0.012, 0, torsoTop * 0.7, hipW * 0.85, 0.02, shoulderW * 0.6, 0.02);
  }

  // --- head ---
  const hw = headH * 0.78 * P.headW, hd = headH * 0.9;
  const hy0 = neckLen, hy1 = neckLen + headH;
  box(part('neck', C.skin, false), [-limb * 0.5, -limb * 0.3, -limb * 0.45], [limb * 0.5, neckLen + 0.01, limb * 0.45], 0.7, 1);
  box(part('neck', C.skin, false), [-hw / 2, hy0, -hd / 2], [hw / 2, hy1, hd / 2], 0.85, 1);
  const eye = Math.max(0.018, headH * 0.09 * P.eyes);
  for (const sx of [-1, 1]) {
    const ex = sx * hw * 0.22, ey = hy0 + headH * 0.56;
    box(part('neck', C.eyes, false), [ex - eye / 2, ey - eye / 2, hd / 2 - 0.004], [ex + eye / 2, ey + eye / 2, hd / 2 + 0.008]);
  }
  box(part('neck', C.skinDark, false), [-headH * 0.06, hy0 + headH * 0.36, hd / 2 - 0.005], [headH * 0.06, hy0 + headH * 0.5, hd / 2 + headH * 0.07]);
  if (P.jaw) box(part('neck', C.skin, false), [-hw * 0.38, hy0 - 0.01, hd / 2 - 0.02], [hw * 0.38, hy0 + headH * 0.32, hd / 2 + P.jaw * headH], 0.8, 1);
  if (P.pointedEars) {
    for (const sx of [-1, 1]) {
      const up = norm([sx * 0.45, 1, -0.35]);
      addOrientedBox(part('neck', C.skin, false), [sx * (hw / 2 + 0.012), hy0 + headH * 0.62, -hd * 0.05], [1, 0, 0], up, norm([0, 0.35, 1]), [0.012, headH * 0.22, headH * 0.08]);
    }
  }
  if (s.beard === 'full' && (!f || P.beardedWomen)) {
    box(part('neck', C.hair, true), [-hw * 0.42, hy0 - headH * 0.12, hd / 2 - 0.03], [hw * 0.42, hy0 + headH * 0.36, hd / 2 + 0.035], 0.8, 1);
  } else if (s.beard === 'stubble' && !f) {
    box(part('neck', C.skinDark, false), [-hw * 0.4, hy0, hd / 2 - 0.02], [hw * 0.4, hy0 + headH * 0.3, hd / 2 + 0.006]);
  }

  // --- hair and headwear ---
  const cap = (colour: string, shell: boolean, from: number, grow = 1.1, back = 0): void =>
    box(part('neck', colour, shell), [(-hw / 2) * grow, hy0 + headH * from, -hd / 2 * grow - back], [(hw / 2) * grow, hy1 + headH * 0.06 * grow, hd / 2 * (grow - 0.08) - back]);
  const headCloth = C.head ?? C.top;
  switch (s.style) {
    case 'short': cap(C.hair, true, 0.6); break;
    case 'long':
      cap(C.hair, true, 0.55);
      box(part('neck', C.hair, true), [-hw * 0.52, -0.05 * H, -hd / 2 - 0.03], [hw * 0.52, hy0 + headH * 0.8, -hd * 0.1]);
      break;
    case 'bun':
      cap(C.hair, true, 0.6);
      box(part('neck', C.hair, true), [-hw * 0.2, hy0 + headH * 0.65, -hd / 2 - headH * 0.25], [hw * 0.2, hy0 + headH * 0.95, -hd / 2 + 0.01]);
      break;
    case 'kerchief': cap(headCloth, true, 0.55, 1.12); break;
    case 'helm': cap(C.head ?? C.iron, false, 0.55, 1.14); break;
    case 'hood':
      cap(C.head ?? C.cloak ?? C.top, true, 0.1, 1.18, hd * 0.12);
      break;
    case 'hat': {
      cap(C.hair, true, 0.62);
      const brim = hw * 1.75;
      box(part('neck', headCloth, true), [-brim / 2, hy1 - headH * 0.12, -brim / 2], [brim / 2, hy1 - headH * 0.05, brim / 2]);
      addTaper(part('neck', headCloth, true), 0, 0, hy1 - headH * 0.08, hy1 + headH * 0.28, hw * 1.05, hd * 1.0, hw * 0.75, hd * 0.7);
      break;
    }
    case 'bald': break;
  }

  // --- arms ---
  for (const [sh, el, held] of [['shoulderL', 'elbowL', s.left], ['shoulderR', 'elbowR', s.right]] as const) {
    addTaper(part(sh, C.top, true), 0, 0, -upper - 0.01, limb * 0.4, limb * 0.85, limb * 0.85, limb * 1.05, limb * 1.0, 0.85, 1);
    const sleeve = s.sleeves === 'long' ? C.top : C.skin;
    addTaper(part(el, sleeve, sleeve === C.top), 0, 0, -fore, 0.01, limb * 0.72, limb * 0.72, limb * 0.85, limb * 0.85, 0.9, 1);
    if (s.sleeves === 'rolled') addTaper(part(el, C.top, true), 0, 0, -fore * 0.25, 0.02, limb * 0.95, limb * 0.95, limb * 0.92, limb * 0.92);
    const hw2 = limb * 0.8 * P.hands;
    box(part(el, C.skin, false), [-hw2 / 2, -fore - hand, -limb * 0.32], [hw2 / 2, -fore + 0.005, limb * 0.32], 0.85, 1);
    if (P.claws) {
      for (const dx of [-1, 0, 1]) box(part(el, '#e8dcc4', false), [dx * hw2 * 0.3 - 0.007, -fore - hand - 0.035, limb * 0.12], [dx * hw2 * 0.3 + 0.007, -fore - hand + 0.004, limb * 0.26]);
    }
    if (held) holdIn(part, el, held, -fore - hand * 0.55, limb, C);
  }

  // --- legs ---
  for (const [hp, kn] of [['hipL', 'kneeL'], ['hipR', 'kneeR']] as const) {
    addTaper(part(hp, C.legs, true), 0, 0, -thigh - 0.01, limb * 0.3, limb * 1.05, limb * 1.05, limb * 1.35, limb * 1.3, 0.85, 1);
    const bootTop = -shin * 0.42;
    addTaper(part(kn, C.legs, true), 0, 0, bootTop, 0.01, limb * 1.0, limb * 1.0, limb * 1.08, limb * 1.08, 0.9, 1);
    addTaper(part(kn, C.boots, false), 0, 0, -shin, bootTop + 0.01, limb * 1.0, limb * 1.0, limb * 1.06, limb * 1.06, 0.8, 1);
    box(part(kn, C.boots, false), [-limb * 0.55 * P.hands, -kneeY, -limb * 0.55], [limb * 0.55 * P.hands, -kneeY + footH, footL - limb * 0.55], 0.7, 1);
  }

  return { height: H, joints, parts, stride: 1.6 * hipY };
}

/** Something held upright in the hand (a pole with whatever is on its end), or hanging from it (a basket, a bucket). */
function holdIn(part: (j: Joint, c: string, sh: boolean) => MeshData, el: Joint, held: Held, y: number, limb: number, C: BodyColours): void {
  const z = limb * 0.1;
  const pole = POLES[held];
  if (pole) {
    const w = 0.035, y0 = y - pole.len * 0.32, y1 = y + pole.len * 0.68;
    box(part(el, C.wood, false), [-w / 2, y0, z - w / 2], [w / 2, y1, z + w / 2]);
    if (pole.head === 'point') addTaper(part(el, C.iron, false), 0, z, y1, y1 + 0.22, 0.05, 0.02, 0.005, 0.005);
    if (pole.head === 'blade') box(part(el, C.iron, false), [-0.02, y1 - 0.05, z], [0.02, y1 + 0.01, z + 0.2]);
    if (pole.head === 'hammer') box(part(el, C.iron, false), [-0.04, y1 - 0.06, z - 0.08], [0.04, y1 + 0.02, z + 0.08]);
    return;
  }
  const colour = held === 'basket' ? C.straw : C.wood;
  addTaper(part(el, colour, held === 'basket'), 0, z, y - 0.3, y - 0.05, 0.22, 0.2, 0.28, 0.24, 0.8, 1);
}
