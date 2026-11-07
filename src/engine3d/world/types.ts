import type * as THREE from 'three';
import type { PersonSpec } from '../../core/persons';
import type { CastMember } from '../../core/world3d/mapgen';
import type { Mind } from '../../core/world3d/behave';
import type { ChunkTerrain } from '../../core/world3d/chunks';
import type { BuiltHouse } from '../../core/world3d/layout';
import type { WallSide } from '../../core/world3d/house';
import type { P2, Shape } from '../../core/world3d/space';
import type { BodyRig } from '../body';
import type { Chimney } from '../smoke';
import type { Heat } from '../heat';

/**
 * The shapes the world's parts pass between them (see `./index.ts`): what stands on the GPU (houses, chunks, torches),
 * and the people on screen. Plain records; the parts that own them say what they mean.
 */

export interface WorldSettings {
  shells: number;
  lights: number;
  shadowMap: number;
}

/** A flame with its light: a torch, a hearth, a campfire, a magic light. Only the nearest few shine (see `lights.ts`). */
export interface Torch {
  light: THREE.PointLight;
  flame: THREE.Object3D;
  /** Moves the flame's bits (see fire.ts), if it has any. */
  tick?: (t: number, wind: { x: number; z: number }) => void;
  /** Shines by day as by night (magic), instead of fading with the daylight. */
  always?: boolean;
  base: number;
  seed: number;
  /** Lets go of the flame's geometry and material when the torch is taken down. */
  dispose?: () => void;
}

/** What stands in a loaded chunk (trees, props, torch posts), kept so it can be taken down when the chunk leaves. */
export interface Standing {
  /** Houses that stand in the chunk (by the chunk their centre is in). */
  houses: HouseInst[];
  objects: THREE.Object3D[];
  shells: Shell[];
  torches: Torch[];
}

/** A new, empty `Standing`. */
export const newStanding = (): Standing => ({ houses: [], objects: [], shells: [], torches: [] });

/** What a resident chunk holds on the GPU. */
export interface LoadedChunk {
  id: ChunkTerrain;
  ground: THREE.Mesh;
  grass: THREE.InstancedMesh | null;
  heat: Heat | null;
  /** The chunk's trees, props and torch posts. */
  standing: Standing;
  /** The ground's painting, while it is still being done in slices (until then a flat green stands in). */
  painter?: { pix: { data: Uint8ClampedArray }; step(budgetMs: number): boolean };
  /** Unloaded: queued work for it is dropped. */
  dead?: boolean;
}

/** What a thing's group says about itself, for a tap (`userData.thing`). */
export interface Tagged {
  id: string;
  kind: string;
  /** The house it stands in (furniture), or null outdoors. */
  house: string | null;
  level: number;
  /** Which way it faces in the world. */
  rot: number;
  /** Only this part counts as the thing (a tree's trunk), not the whole group. */
  pick?: THREE.Object3D;
  /** Only a tap right on it counts (no slack round it). */
  exact?: boolean;
}

/** A layer of fur grown out from a mesh (thatch, leaves): shown up to the settings' count. */
export interface Shell {
  mesh: THREE.Mesh;
  layer: number;
  /** The house whose cut-away hides this shell (null for trees and the like). */
  cutOf: HouseInst | null;
}

/** A part of a house the cut-away fades (the roof, a storey's front wall). */
export interface CutPart {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  /** Fades while the viewer's storey is at or below this. */
  level: number;
  /** An outer wall's side: it also fades up to storey `facing` while that side faces the camera. */
  side: WallSide | null;
  facing: number;
  /** 0 shown, 1 gone; eases. */
  t: number;
}

/** One placed house on the GPU, with its own cut-away. */
export interface HouseInst {
  built: BuiltHouse;
  /** Materials this house made for itself (the fading parts), let go when it is taken down. */
  mats: THREE.Material[];
  /** Its hearth's light. */
  hearth: Torch | null;
  /** The placed fire that light and smoke come from (a piece of furniture), whose `lit` state they follow; null if it has none. */
  fireOf: { id: string; kind: string } | null;
  /** Where its hearth burns and where its smoke leaves, whether or not it is lit now (`hearthAt` and `chimney` are null while it is out). */
  fireSpots: { hearthAt: P2; chimney: Chimney } | null;
  /** Where its hearth burns, in the world (a light seen from far). */
  hearthAt: P2 | null;
  /** Where its smoke leaves, if it has a fire to make it. */
  chimney: Chimney | null;
  shells: Shell[];
  group: THREE.Group;
  /** The rooms' furniture: only shown when the roof is lifted (and only the storey being looked at), or its tops show through the roof. */
  furniture: THREE.Object3D[];
  /** The storey each piece of furniture stands on. */
  furnLevel: number[];
  cut: CutPart[];
  box: Shape;
  floorHeat: Heat | null;
  /** Cut-away: 0 closed, 1 open; eases toward `open`. */
  cutT: number;
  open: boolean;
  /** The storey looked into while open (the hero's). */
  view: number;
}

/**
 * A person on screen: an anchor where they stand (the rules place it and say whether it is shown), carrying their 3D
 * body (`core/world3d/body.ts`), which turns the way they face and walks while they move (`figures.ts`).
 */
export interface Figure {
  place: THREE.Group;
  rig: BodyRig;
  /** The way the body faces (as `rotation.y`), and the way it is turning toward. */
  yaw: number;
  want: number;
  /** Walking now, how far through the walk's loop, and how long since the last step (seconds). */
  moving: boolean;
  phase: number;
  still: number;
  /** Where the anchor was last frame (the walk's loop follows the ground covered). */
  lastX: number;
  lastZ: number;
}

export interface Person {
  id: string;
  /** Who they are (their body is built from it). */
  spec: PersonSpec;
  /** Where they stand, whether they are drawn, and their body. */
  fig: Figure;
  /** Cuts a see-through oval in whatever (trees) stands between them and the camera. False for the hidden. */
  reveals: boolean;
}

/** Someone from the map's cast, on screen: their figure, and their mind (where they are, what they are doing). */
export interface CastCard {
  who: CastMember;
  fig: Figure;
  blob: THREE.Mesh;
  mind: Mind;
  /** The way they face (radians, atan2(z, x)): where their eyes look (plan B5). */
  facing: number;
  /** On easy, what they notice of the hero, over their head: an eye (they see you), a question (they heard something). */
  mark: THREE.Sprite;
}

/** People farther than this from both the view and the hero wait (a big map does not run everyone), metres. */
export const MIND_REACH = 140;
