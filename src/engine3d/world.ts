import * as THREE from 'three';
import { makeWalkSet, viewFor } from '../art/folkWalk';
import type { Pix } from '../art/pix';
import { type FurnishedRoom, type RoomSet, furnishHouse } from '../content/furnish';
import {
  barkTex, doorTex, floorTex, groundChunkPainter, leafTex, plasterTex, roofUnderTex, shingleTex, shutterTex, sodTex, stoneTex, thatchTex,
  tileTex, timberTex, windowGlowTex, windowTex,
} from '../art/textures3d';
import { folkOf } from '../art/folk';
import { mapNamed } from '../content/maps';
import { PERSON_KINDS } from '../content/people';
import { HERO_PERSON, streamingFilamentWorld } from '../content/spike3d';
import type { PersonSpec } from '../core/persons';
import type { CastMember, CompiledMap, MapEvent } from '../core/world3d/mapgen';
import type { Place } from '../core/world3d/behave';
import type { AspectId, HexFilaments } from '../core/filaments';
import { type FSource, FilamentField, HEARTH_FIRE, TORCH_FIRE } from '../core/world3d/filaments3d';
import { CHUNK, type ChunkTerrain, TerrainStore, chunkKey, chunksNear } from '../core/world3d/chunks';
import { type Environment3D, environment } from '../core/world3d/environment3d';
import { Rng } from '../core/rng';
import type { HouseMaterial } from '../core/world3d/house';
import { type BuiltHouse, type Layout, type PlacedTree, furnitureObstacles, houseAt, houseBox, houseOuterBox, houseToLocal, houseToWorld, houseWalls, levelWalls, sightWalls } from '../core/world3d/layout';
import { Explored } from '../core/world3d/explored';
import { PlacedIndex } from '../core/world3d/placed';
import { footprints } from '../core/world3d/roomplan';
import { type HouseEntry, HouseIndex } from '../core/world3d/houses';
import type { MeshData } from '../core/world3d/mesh';
import { LAUNDRY_HANG, type PlacedProp } from '../core/world3d/props';
import type { ThingMaterial } from '../core/world3d/things';
import { THINGS } from '../content/things';
import { cloudDrift, cloudThreshold } from '../core/world3d/sky';
import { type Actor, Walking, newActor } from '../core/world3d/actors';
import { type Clock, type Mind, newMind, stepMind } from '../core/world3d/behave';
import { BEHAVIOURS } from '../content/behaviours';
import { NavGrid, type P2, type Shape, shapeDist } from '../core/world3d/space';
import { type Ground3D, groundHeight, lakeDist, splatAt } from '../core/world3d/terrain';
import { TEXELS_PER_M } from '../core/world3d/tiers';
import type { Clump } from '../core/world3d/tree';
import { fbm } from '../core/noise';
import { VIEW_YAW } from '../core/world3d/view';
import { Weather } from '../core/world3d/weather';
import { type Flame, makeFlame, makeOrb } from './fire';
import { EXPLORED_WINDOW, type LitOpts, SEE_SLOTS, WORLD, exploredTexture, lit, pixTexture, shellOf, sightTexture } from './materials';
import { SCORCH_SIZE, scorchImage } from '../core/world3d/scorch';
import { RAYS, type SightLight, type VisionSpec, angleGap, castSight, lightReach, litSeenAt, seenAt, turnToward, visibleLights, visionOf } from '../core/world3d/vision';
import { Leaves } from './leaves';
import { Rain } from './rain';
import { type Chimney, Smoke } from './smoke';
import { type SpriteCard, type WalkCard, blobShadow, spriteCard, walkCard } from './sprites';
import { type Heat, makeFloorHeat, makeHeat } from './heat';
import { type Water, makeWater } from './water';

/**
 * The M0 spike world: builds the scene from the content and the generators,
 * then runs it (weather, light, the walking villager, the cut-away).
 */

export const YAW = VIEW_YAW;
/** About 39°: ground is squashed to ~0.63, as in the old hex art (20 px rows on 32 px tiles). */
export const PITCH = 0.68;
const CAM_DIST = 60;
/** The wind sweeps mist clear over this many metres each side of the view's focus, with a soft edge of this many. */
const MIST_REACH = 40;
const MIST_SOFT = 12;

export interface WorldSettings {
  shells: number;
  lights: number;
  shadowMap: number;
}

const tex = (p: Pix, flip = true, ppm: number | undefined = TEXELS_PER_M): THREE.DataTexture => pixTexture(p.data, p.w, p.h, { flip, ppm });

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

interface CutPart {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  /** Fades while the viewer's storey is at or below this. */
  level: number;
  /** The back wall: also fades up to this storey when the house faces away from the camera (-1: not a back wall). */
  away: number;
  /** 0 shown, 1 gone; eases. */
  t: number;
}

/** A stroll, metres a second. */
const HERO_SPEED = 1.6;

/** Someone who goes from room to room of a house on every storey, by the stairs, and out again (see `core/world3d/actors.ts`). */
/** Someone from the map's cast, on screen: their card, and their mind (where they are, what they are doing). */
interface CastCard {
  who: CastMember;
  card: WalkCard;
  blob: THREE.Mesh;
  mind: Mind;
}

/** People farther than this from both the view and the hero wait (a big map does not run everyone), metres. */
const MIND_REACH = 140;

const byDistance = (a: { d: number }, b: { d: number }): number => a.d - b.d;

/** A person's walking card, drawn from their kinds. */
const personCard = (p: PersonSpec): WalkCard => walkCard(makeWalkSet(folkOf(PERSON_KINDS.resolve(p).look, p.seed ?? 1)), PITCH);
/** How far the ray of light reaches, metres. */
const RAY_LENGTH = 9;

/** How long a lightning bolt stays on screen, seconds. */
const BOLT_LIFE = 0.5;

interface Torch {
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

/** What a resident chunk holds on the GPU. */
interface LoadedChunk {
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

/** What stands in a loaded chunk (trees, props, torch posts), kept so it can be taken down when the chunk leaves. */
interface Standing {
  /** Houses that stand in the chunk (by the chunk their centre is in). */
  houses: HouseInst[];
  objects: THREE.Object3D[];
  shells: Shell[];
  torches: Torch[];
}

interface Shell {
  mesh: THREE.Mesh;
  layer: number;
  /** The house whose cut-away hides this shell (null for trees and the like). */
  cutOf: HouseInst | null;
}

export interface Person {
  id: string;
  card: WalkCard;
  /** Cuts a see-through oval in whatever (trees) stands between them and the camera. False for the hidden. */
  reveals: boolean;
}

/** One placed house on the GPU, with its own cut-away. */
interface HouseInst {
  built: BuiltHouse;
  /** Materials this house made for itself (the fading parts), let go when it is taken down. */
  mats: THREE.Material[];
  /** Its sprites, its hearth's light, and the shells of its roof. */
  cards: SpriteCard[];
  hearth: Torch | null;
  /** Where its hearth burns, in the world (a light seen from far). */
  hearthAt: P2 | null;
  /** Where its smoke leaves, if it has a fire to make it. */
  chimney: Chimney | null;
  shells: Shell[];
  group: THREE.Group;
  /** The rooms' furniture cards: only shown when the roof is lifted (and only the storey being looked at), or their tops show through the roof. */
  furniture: THREE.Object3D[];
  /** The storey each furniture card stands on. */
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

export class SpikeWorld {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 160);
  readonly weather = new Weather();
  readonly focus = new THREE.Vector3(0, 0.5, 1);
  readonly camPix = new THREE.Vector2();
  ppm = 21;
  private sun = new THREE.DirectionalLight(0xffffff, 2);
  private hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  private fog = new THREE.Fog(0xcccccc, 80, 200);
  readonly ground: Ground3D;
  readonly store: TerrainStore;
  private chunks = new Map<string, LoadedChunk>();
  /** What the world is like right now (sky, wind, clouds): the one interface the rules and the renderer read. */
  env!: Environment3D;
  private grassCount = 0;
  /** How strongly each aspect of magic flows, by cell: read by position (see `core/world3d/filaments3d.ts`). */
  field!: FilamentField;
  /** Fires that belong to the built world (hearth, door torch), as sources for the field. */
  private fires: FSource[] = [];
  /** Which aspect the heat map shows, if any. */
  private heatAspect: AspectId | null = null;
  private heatT = 0;
  private chunkBuilds = 0;
  /** What is placed in the world (see `core/world3d/layout.ts`). */
  readonly layout: Layout;
  /** Trees, props and torch posts by chunk (the layout's, and any the map makes as it goes). */
  readonly placed: PlacedIndex;
  /** Every house of the map, by chunk: made when something comes near (see `core/world3d/houses.ts`). */
  readonly houseIndex: HouseIndex<FurnishedRoom[]>;
  /** Walking for everyone: paths, stairs, steering (see `core/world3d/actors.ts`). */
  readonly moves: Walking;
  /** The houses that are standing now (those in resident chunks); they come and go as chunks stream. */
  readonly houses: HouseInst[] = [];
  private shells: Shell[] = [];
  private torches: Torch[] = [];
  /** Dark point lights that stand in for the torches that are not near, so the count of lights never changes (see `update`). */
  private spares: THREE.PointLight[] = [];

  /**
   * Vision (metres from the view's focus): the world greys from `inner` and is black at `outer`; chunks beyond are not
   * built or animated. `outer` 0 turns it off. Set by tier from the page.
   */
  vision = { inner: 0, outer: 0 };
  /** The hero's Alertness attribute: how far and how wide they see (see `core/world3d/vision.ts`). */
  alertness = 10;
  /** The shape of the hero's sight now, and the rays cast from their eye over the ground. */
  spec: VisionSpec = visionOf({ alertness: 10 });
  readonly rays = new Float32Array(RAYS);
  /** The way the hero faces, radians (atan2(z, x)), eased toward the way they walk. */
  facing = Math.PI / 2;
  /** Torches and fires that can be made out from far away (see `refreshLights`), and how far that is now. */
  private sightLights: SightLight[] = [];
  private lightCands: { x: number; z: number; radius: number }[] = [];
  private lightsAt: { x: number; z: number; f: number; night: number; at: number } | null = null;
  private lightsSeen = new Set<string>();
  lightRange = 0;
  private castAt: { x: number; z: number; range: number; house: string | null; level: number } | null = null;
  private tmpV = new THREE.Vector3();
  /**
   * Where and when lightning falls. Seeded (by the map), since a strike leaves a scorch that the filament field reads:
   * rule state never comes from `Math.random`. Its state is a plain number, so it can go into a save.
   */
  readonly skyRng: Rng;
  private tmpC1 = new THREE.Color();
  private tmpC2 = new THREE.Color();
  private bgColor = new THREE.Color();
  private windNow = { x: 0, z: 0 };
  /** The torches nearest the view first, kept between frames (see `update`). */
  private torchOrder: { t: Torch; d: number }[] = [];
  /** The people who reveal themselves, nearest the view first, kept between frames (see `updateSee`). */
  private seeOrder: Person[] = [];
  private seeV = new THREE.Vector3();
  /** Where the hero has been (seen within the vision radius): drawn grey where it is out of sight now. */
  readonly explored = new Explored();
  private markedAt: { x: number; z: number; f: number; t: number } | null = null;
  private exploredWin = { ox: 0, oz: 0, dirty: true };

  setVision(inner: number, outer: number): void {
    this.vision = { inner, outer };
  }

  /** Forget everything seen (for testing). */
  forgetMap(): void {
    this.explored.clear();
    this.markedAt = null;
    this.lightsSeen.clear();
    this.exploredWin.dirty = true;
  }

  /** Is chunk (i, j) worth having: seen before, or inside the hero's sight now? (With vision off, always.) */
  private worthLoading(i: number, j: number): boolean {
    if (this.vision.outer <= 0 || this.explored.chunkSeen(i, j)) return true;
    const h = this.hero;
    const dx = Math.max(i * CHUNK - h.x, 0, h.x - (i + 1) * CHUNK), dz = Math.max(j * CHUNK - h.z, 0, h.z - (j + 1) * CHUNK);
    if (Math.hypot(dx, dz) <= this.vision.outer + 6) return true;
    // The ground round a flame that is in view is drawn, so it must be built.
    for (const l of this.sightLights) {
      const lx = Math.max(i * CHUNK - l.x, 0, l.x - (i + 1) * CHUNK), lz = Math.max(j * CHUNK - l.z, 0, l.z - (j + 1) * CHUNK);
      if (Math.hypot(lx, lz) <= l.radius + 2) return true;
    }
    return false;
  }

  /** What stops the eye near the hero: trunks and boulders, other houses whole, and the walls of the house they stand in. */
  private blockers(range: number): Shape[] {
    const h = this.hero;
    const out: Shape[] = [...this.placed.sightNear(h.x - range, h.z - range, h.x + range, h.z + range)];
    // (Asked of the index, not of the standing houses: sight reaches past what has been stood up.)
    for (const l of this.houseIndex.liteNear(h.x - range, h.z - range, h.x + range, h.z + range)) out.push(...(l.built.place.id === h.house ? [...houseWalls(l.built, h.level === 0), ...sightWalls(l.built, h.level)] : [l.box]));
    return out;
  }

  /** Cast the rays again if the eye moved, the range changed or the hero stepped through a door. */
  private castRays(): void {
    const h = this.hero, range = this.spec.range;
    const c = this.castAt;
    if (c && c.range === range && c.house === h.house && c.level === h.level && Math.hypot(h.x - c.x, h.z - c.z) < 0.02) return;
    castSight({ x: h.x, z: h.z }, range, this.blockers(range), this.rays, 0.7);
    this.castAt = { x: h.x, z: h.z, range, house: h.house, level: h.level };
    const data = sightTexture.image.data as Uint16Array;
    for (let i = 0; i < RAYS; i++) data[i] = THREE.DataUtils.toHalfFloat(Math.min(1, this.rays[i] / range));
    sightTexture.needsUpdate = true;
    this.markedAt = null; // what is seen has changed
  }

  /** How clearly the hero sees a point on the ground, 0..1 (with vision off, fully). */
  seen(x: number, z: number): number {
    if (this.vision.outer <= 0) return 1;
    return Math.max(seenAt(this.hero, this.facing, this.spec, this.rays, x, z), litSeenAt(this.sightLights, x, z));
  }

  /**
   * The torches and fires in view: asked for from the chunks within reach (rarely: when the hero has gone a few
   * metres or the light has changed), then checked against the cone and the solid things whenever the hero has
   * moved or turned. The patches they light are drawn and remembered however far away they are.
   */
  private refreshLights(night: number): void {
    const h = this.hero, c = this.lightsAt;
    const moved = !c || Math.hypot(h.x - c.x, h.z - c.z) >= 0.4 || angleGap(this.facing, c.f) > 0.12 || Math.abs(night - c.night) > 0.05;
    if (!moved && this.time - c.at < 1) return;
    const reach = Math.min(lightReach(this.spec, night), 110);
    this.lightRange = reach;
    const dayK = 0.25 + 0.75 * night; // by day a flame lights little
    const spots = this.lightCands;
    if (!c || Math.hypot(h.x - c.x, h.z - c.z) >= 3 || this.time - c.at >= 1) {
      spots.length = 0;
      for (let j = Math.floor((h.z - reach) / CHUNK); j <= Math.floor((h.z + reach) / CHUNK); j++) {
        for (let i = Math.floor((h.x - reach) / CHUNK); i <= Math.floor((h.x + reach) / CHUNK); i++) {
          for (const p of this.placed.chunk(i, j).props) if (THINGS.get(p.kind).flame) spots.push({ x: p.x, z: p.z, radius: 6.5 * dayK });
        }
      }
      for (const f of this.fires) if (f.kind === 'fire') spots.push({ x: f.x, z: f.z, radius: 6.5 * dayK });
      for (const hs of this.houses) if (hs.hearthAt) spots.push({ x: hs.hearthAt.x, z: hs.hearthAt.z, radius: 6.5 * dayK });
      for (const k of this.camps) spots.push({ x: k.p.x, z: k.p.z, radius: 9 * dayK });
    }
    const blockers = this.blockers(reach);
    this.sightLights = visibleLights(h, this.facing, this.spec, night, spots, blockers, 6);
    // What was seen by flame light is remembered like anything else seen.
    for (const l of this.sightLights) {
      const key = `${Math.round(l.x)},${Math.round(l.z)}`;
      if (this.lightsSeen.has(key)) continue;
      this.lightsSeen.add(key);
      if (this.explored.markWhere(l.x, l.z, l.radius * 0.8, () => true) > 0) this.exploredWin.dirty = true;
    }
    const slots = WORLD.uLights.value;
    slots.forEach((s, i) => {
      const l = this.sightLights[i];
      if (l) s.set(l.x, l.z, l.radius, l.strength);
      else s.set(0, 0, 0, 0);
    });
    this.lightsAt = { x: h.x, z: h.z, f: this.facing, night, at: this.time };
  }

  /** Record what the hero can see, and keep the window the shader reads centred on the view. */
  private stepExplored(): void {
    const v = this.vision;
    if (v.outer <= 0) return;
    const h = this.hero, m = this.markedAt;
    const turned = m ? angleGap(this.facing, m.f) : 1;
    if (!m || Math.hypot(h.x - m.x, h.z - m.z) >= 2 || (turned > 0.25 && this.time - m.t > 0.15)) {
      // The cells the eye reaches (their centres in the cone or close by, and in the clear) are remembered.
      if (this.explored.markWhere(h.x, h.z, this.spec.range * 0.95, (x, z) => this.seen(x, z) > 0.5) > 0) this.exploredWin.dirty = true;
      this.markedAt = { x: h.x, z: h.z, f: this.facing, t: this.time };
    }
    const half = EXPLORED_WINDOW / 2, w = this.exploredWin;
    const cx = Math.floor(this.focus.x), cz = Math.floor(this.focus.z);
    if (w.dirty || Math.abs(cx - (w.ox + half)) > 24 || Math.abs(cz - (w.oz + half)) > 24) {
      w.ox = Math.floor((cx - half) / 8) * 8;
      w.oz = Math.floor((cz - half) / 8) * 8;
      this.explored.fill(exploredTexture.image.data as Uint8Array, EXPLORED_WINDOW, w.ox, w.oz);
      exploredTexture.needsUpdate = true;
      WORLD.uExploredBox.value.set(w.ox, w.oz, EXPLORED_WINDOW, 0);
      w.dirty = false;
    }
  }

  /** For testing: how many times faster than a stroll (1.6 m/s) the hero walks. */
  speedMul = 2;
  /** The way the hero last walked (unit-ish, world x/z): the ray of light points along it. */
  get heroDir(): { x: number; z: number } {
    return this.hero.dir;
  }

  set heroDir(d: { x: number; z: number }) {
    this.hero.dir = d;
  }

  // --- test controls: lightning and campfires ---
  /** Storm weather throws bolts by itself (off: only `strike()` does). */
  autoBolts = true;
  /** The flash of the current bolt: one light that is always in the scene (adding lights at run time would recompile every shader). */
  private boltLight = new THREE.PointLight(0xcfe0ff, 0, 40, 1.5);
  /** Where lightning has struck: the burnt ground it left (kept to a few; the oldest is cleared). */
  private scorches: { x: number; z: number; mesh: THREE.Mesh }[] = [];
  private bolt: { group: THREE.Group; age: number; repeats: number[] } | null = null;
  private camps: { p: PlacedProp; st: Standing; smoke: Chimney }[] = [];
  private windowMats: THREE.MeshLambertMaterial[] = [];
  private water: Water | null;
  private rain = new Rain(1400);
  private smoke = new Smoke(24);
  private smokeSeen = new Set<string>();
  private leafSpots: { x: number; y: number; z: number; r: number }[] = [];
  private leafSpotsAt = -9;

  /** The crowns that can shed leaves near the view (worked out twice a second, from the chunks the view touches). */
  private leafTrees(): { x: number; y: number; z: number; r: number }[] {
    if (this.time - this.leafSpotsAt < 0.5) return this.leafSpots;
    this.leafSpotsAt = this.time;
    const reach = Math.max(this.camera.right, this.camera.top) * 1.2 + 6;
    const out: { x: number; y: number; z: number; r: number }[] = [];
    for (let j = Math.floor((this.focus.z - reach) / CHUNK); j <= Math.floor((this.focus.z + reach) / CHUNK); j++) {
      for (let i = Math.floor((this.focus.x - reach) / CHUNK); i <= Math.floor((this.focus.x + reach) / CHUNK); i++) {
        for (const t of this.placed.chunk(i, j).trees) {
          // Broadleaves shed; pines and dead trees hold (or have) nothing to lose: their kind has no crown to shed from.
          const crown = THINGS.get(t.kind ?? 'oak').tree?.crown;
          if (crown) out.push({ x: t.x, y: groundHeight(this.ground, t.x, t.z) + crown.y, z: t.z, r: crown.r });
        }
      }
    }
    return (this.leafSpots = out);
  }
  private leaves = new Leaves(96);
  /**
   * The people in the world. Anyone with `reveals` gets a see-through oval cut in the trees
   * between them and the camera; leave it off for someone who should stay hidden.
   */
  readonly people: Person[] = [];
  /** The map's people, each following their schedule (see `stepCast`). */
  private cast: CastCard[] = [];
  private places: Record<string, Place> = {};
  private mapEvents: MapEvent[] = [];
  /** Events started (true) or stopped (false) by hand, over what the map's hours say. */
  private eventsByHand = new Map<string, boolean>();
  private sprites: SpriteCard[] = [];
  /** The invisible navigation grid the hero walks on. */
  readonly nav: NavGrid;
  /** The hero: where they stand (metres), the house and storey they are on, the walk in hand. */
  readonly hero: Actor = newActor(0, 0);
  readonly heroCard!: WalkCard;
  private heroBlob!: THREE.Mesh;
  /** The keys: how far right and how far up the screen the hero is being steered (-1..1 each). Set by the page. */
  input = { right: 0, up: 0 };
  private steering = false;
  /** How far the view is lifted for an upper storey, metres. */
  private focusLift = 0;
  private marker: THREE.Mesh;
  /** The camera follows the hero while it walks, until the player drags the view. */
  follow = false;
  private wet = 0;
  /** How full the hollows are with rain, 0..1 (`WORLD.uPool`). */
  private pool = 0;
  /** Mist asked for, 0..1 (0 leaves it to the weather), and the eased value in use. */
  private mist = 0;
  private mistNow = 0;
  /** How much of the view the wind has swept clear of mist, 0..1, and the way it sweeps (xz, unit). */
  private mistBlow = 0;
  private mistDir = new THREE.Vector2(1, 0);
  private mistTint: THREE.Color | null = null;
  private mistTintK = 1;

  /**
   * Call up mist over the whole view: 0 is only what the weather gives, 1 is a wall of it a few metres out.
   * `tint` (sRGB hex) colours it instead of the sky's fog (a spell's haze); `tintK` how strongly. It eases in and out.
   */
  setMist(amount: number, tint?: number | null, tintK = 1): void {
    this.mist = Math.min(1, Math.max(0, amount));
    this.mistTint = tint == null ? null : new THREE.Color().setHex(tint, THREE.SRGBColorSpace);
    this.mistTintK = tintK;
  }

  get mistAmount(): number {
    return this.mist;
  }
  private time = 0;
  /** Real minutes for a whole day; 0 stops the clock. */
  dayMinutes = 0;
  private cloudOff = new THREE.Vector2();
  settings: WorldSettings;

  constructor(settings: WorldSettings, grassCount: number, map: Pick<CompiledMap, 'ground' | 'layout' | 'hero' | 'cast' | 'places' | 'events'> & Partial<Pick<CompiledMap, 'placed'>> = mapNamed('spike')) {
    this.settings = settings;
    const { ground, layout } = map;
    const g = ground;
    this.ground = ground;
    this.skyRng = Rng.fromSeed(`sky ${ground.seed}`);
    this.hero.x = map.hero[0];
    this.hero.z = map.hero[1];
    this.focus.set(map.hero[0], 0.5, map.hero[1]);
    this.store = new TerrainStore(ground, 0.5);
    this.grassCount = grassCount;
    this.scene.fog = this.fog;
    this.camera.layers.set(0);

    // Light: sky and bounce, the sun with a soft shadow map that follows the view.
    this.scene.add(this.hemi);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 2;
    this.sun.shadow.camera.layers.enable(1);
    this.setShadowMap(settings.shadowMap);
    this.scene.add(this.sun, this.sun.target, this.boltLight, this.rayLight, this.rayLight.target);
    for (let i = 0; i < 16; i++) {
      const spare = new THREE.PointLight(0xffffff, 0, 1);
      spare.visible = false;
      this.spares.push(spare);
      this.scene.add(spare);
    }

    // Ground chunks stream in once the view is sized (see `frame`); until then the exact height function stands in.
    this.layout = layout;
    // Each room is furnished by rules (see `content/furnish.ts`) when something first comes near its house; what stands
    // on the floor blocks feet, and what is in it (the hearth, books, pictures) feeds the filament field.
    this.houseIndex = new HouseIndex<FurnishedRoom[]>(layout.houses, (b) => {
      const rooms = furnishHouse(b.model, (b.place.room ?? 'home') as RoomSet, b.place.spec.seed);
      const sources: FSource[] = [];
      for (const room of rooms) {
        const fire = room.plan.pieces.filter((p) => p.fire).pop();
        if (fire) {
          const w = houseToWorld(b.place, fire.x, fire.z + 0.2);
          sources.push({ x: w.x, z: w.z, kind: 'fire', weight: HEARTH_FIRE });
        }
        for (const s of room.sources) {
          const w = houseToWorld(b.place, s.x, s.z);
          sources.push({ x: w.x, z: w.z, kind: s.kind, weight: s.weight });
        }
      }
      // The ground floor's walls, partitions and furniture block the ground's walking; the storeys above have grids of their own.
      const ground = rooms.filter((r) => r.level === 0);
      return { room: rooms, shapes: [...levelWalls(b, 0), ...furnitureObstacles(b, ground.flatMap((r) => footprints(r.plan)))], sources };
    }, THINGS);
    const houseIndex = this.houseIndex;
    // Feet: the houses' walls and furniture block (held whole, in an index), and so do the trunks, posts and props the
    // placed index knows by chunk, so the ground is asked only about what is near; so does the water.
    this.placed = map.placed ?? new PlacedIndex(layout, THINGS);
    const placed = this.placed;
    this.nav = new NavGrid(g.size, { near: (x0, z0, x1, z1) => [...houseIndex.shapesNear(x0, z0, x1, z1), ...placed.near(x0, z0, x1, z1)] }, { radius: 0.2, blocked: (x, z) => lakeDist(g, x, z) < 0.2 });
    // Walking holds houses by id and asks the index (not what is standing), so a house streaming out changes nothing for the people in it.
    this.moves = new Walking(this.nav, g.size, {
      holding: (x, z) => houseIndex.houseContaining(x, z, -0.1)?.built ?? null,
      byId: (id) => {
        const p = houseIndex.byId(id);
        return p ? houseIndex.lite(p).built : null;
      },
      furniture: (b, level) => houseIndex.entry(b.place).room.filter((r) => r.level === level).flatMap((r) => footprints(r.plan)),
    });

    // The houses stand up as their chunk streams in (see `fillChunk`).
    // Water and torches; trees, props and torch posts stand up as their chunk streams in (see `fillChunk`).
    this.water = makeWater(g);
    if (this.water) this.scene.add(this.water.mesh);
    this.scene.add(this.rain.lines);
    this.scene.add(this.smoke.mesh);
    this.scene.add(this.rain.splashes);
    this.scene.add(this.leaves.mesh);

    // The map's people, each with a mind that follows their schedule (see `stepCast`).
    this.places = map.places;
    this.mapEvents = map.events;
    for (const who of map.cast) {
      const card = personCard(who), blob = blobShadow(0.32);
      card.mesh.visible = blob.visible = false;
      this.cast.push({ who, card, blob, mind: newMind(who.id, who.start[0], who.start[1], who.seed ?? 1, who.slot, who.home) });
      this.people.push({ id: who.id, card, reveals: true });
      this.scene.add(card.mesh, blob);
      this.sprites.push(card);
    }
    // The hero. Tap the ground and they walk there.
    this.heroCard = personCard(HERO_PERSON);
    this.people.push({ id: 'hero', card: this.heroCard, reveals: true });
    this.heroBlob = blobShadow(0.32);
    this.heroCard.mesh.rotation.y = YAW;
    this.placeHero();
    this.scene.add(this.heroCard.mesh, this.heroBlob);
    this.sprites.push(this.heroCard);
    const ring = new THREE.RingGeometry(0.22, 0.32, 16);
    ring.rotateX(-Math.PI / 2);
    this.marker = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.8, depthWrite: false }));
    this.marker.visible = false;
    this.marker.renderOrder = 3;
    this.scene.add(this.marker);

    this.weather.setWind(2, 1);
    this.weather.setHour(12);
    this.field = new FilamentField(streamingFilamentWorld(g, placed, houseIndex, () => this.fieldExtras()));
  }

  /** The fixed sources that are not placed things: house fires, the door torch, campfires lit by hand, ground burnt by lightning. */
  private fieldExtras(): FSource[] {
    return [
      ...this.fires,
      ...this.camps.flatMap((c) => THINGS.source(c.p) ?? []),
      ...this.scorches.map((c): FSource => ({ x: c.x, z: c.z, kind: 'burnt' })),
    ];
  }

  private houseGlow: THREE.DataTexture | null = null;
  /** Materials every house shares (the cut parts get their own copies). */
  private houseMats = new Map<HouseMaterial, { mat: THREE.MeshLambertMaterial; opts: LitOpts }>();

  private houseMatOpts(m: HouseMaterial): LitOpts {
    this.houseGlow ??= tex(windowGlowTex(), true, undefined);
    const glow = this.houseGlow;
    const maps: Record<HouseMaterial, () => LitOpts> = {
      stone: () => ({ map: tex(stoneTex(3)), ao: true, wettable: true }),
      plaster: () => ({ map: tex(plasterTex(5)), ao: true, wettable: true }),
      timber: () => ({ map: tex(timberTex(6)), ao: true, wettable: true }),
      roof: () => ({ map: tex(thatchTex(8)), ao: true, wettable: true }),
      shingle: () => ({ map: tex(shingleTex(14)), ao: true, wettable: true }),
      tile: () => ({ map: tex(tileTex(15)), ao: true, wettable: true }),
      sod: () => ({ map: tex(sodTex(16)), ao: true, wettable: true }),
      roofUnder: () => ({ map: tex(roofUnderTex(9)), ao: true }),
      door: () => ({ map: tex(doorTex(10), true, undefined), ao: true }),
      window: () => ({ map: tex(windowTex(), true, undefined), ao: true, emissiveMap: glow, emissive: 0x000000 }),
      shutter: () => ({ map: tex(shutterTex(11), true, undefined), ao: true }),
      floor: () => ({ map: tex(floorTex(12)), ao: true }),
    };
    return maps[m]();
  }

  /** A house material: shared, or (for the parts the cut-away fades with a dither) its own, noted in `own` to be let go. */
  private houseMat(m: HouseMaterial, cut: boolean, own: THREE.Material[]): { mat: THREE.MeshLambertMaterial; opts: LitOpts } {
    let s = this.houseMats.get(m);
    if (!s) {
      // Houses get the see-through oval too: a person behind one shows through it, as behind a tree.
      const opts: LitOpts = { ...this.houseMatOpts(m), seeThrough: true };
      s = { mat: lit(opts), opts };
      this.houseMats.set(m, s);
      if (m === 'window') this.windowMats.push(s.mat);
    }
    if (!cut) return s;
    const mat = lit(s.opts);
    mat.alphaHash = true;
    own.push(mat);
    if (m === 'window') this.windowMats.push(mat);
    return { mat, opts: s.opts };
  }

  /**
   * Every house look (each material, whole and fading) on a tiny box, so the renderer can build all their shaders
   * before the first frame: a shader built when a new kind of house first streams in is a stall. Call `compile`
   * on the result's `group` (it is in the scene), then `done()`.
   */
  warmHouses(): { group: THREE.Group; done: () => void } {
    const group = new THREE.Group(), own: THREE.Material[] = [];
    const kinds: HouseMaterial[] = ['stone', 'plaster', 'timber', 'roof', 'shingle', 'tile', 'sod', 'roofUnder', 'door', 'window', 'shutter', 'floor'];
    for (const m of kinds) {
      for (const cut of [false, true]) {
        const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
        const { mat, opts } = this.houseMat(m, cut, own);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        mesh.castShadow = !cut;
        mesh.position.copy(this.focus);
        group.add(mesh);
        if (m === 'roof') this.addShells(mesh, opts, { density: 0.5, tint: 1.12, step: 0.06 }, null, []);
      }
    }
    this.scene.add(group);
    return {
      group,
      done: () => {
        this.scene.remove(group);
        group.traverse((o) => ((o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined)?.dispose());
        for (const m of own) m.dispose();
        for (const m of own) {
          const i = this.windowMats.indexOf(m as THREE.MeshLambertMaterial);
          if (i >= 0) this.windowMats.splice(i, 1);
        }
        // (The shells the warm-up made are let go too.)
        this.shells = this.shells.filter((s) => s.mesh.parent !== group);
      },
    };
  }

  /** The material of every shadow-only twin (they are drawn only into the shadow map): one for all, never let go. */
  private readonly shadowOnly = new THREE.MeshBasicMaterial();

  /** Stand a house up in the world: its model, its furniture cards, its hearth's light. It belongs to the chunk `st`. */
  private standHouse(entry: HouseEntry<FurnishedRoom[]>, st: Standing): void {
    const { built, room: rooms } = entry;
    const h = built.place, model = built.model;
    const inst: HouseInst = { built, mats: [], cards: [], hearth: null, hearthAt: null, chimney: null, shells: [], group: new THREE.Group(), furniture: [], furnLevel: [], cut: [], box: entry.box, floorHeat: null, cutT: 0, open: false, view: 0 };
    const matFor = (m: HouseMaterial, cut: boolean): { mat: THREE.MeshLambertMaterial; opts: LitOpts } => this.houseMat(m, cut, inst.mats);
    for (const p of model.parts) {
      const geo = geometryOf(p.mesh);
      const { mat, opts } = matFor(p.material, p.cut);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true;
      mesh.castShadow = !p.cut;
      inst.group.add(mesh);
      if (p.cut) {
        inst.cut.push({ mesh, level: p.level ?? 0, away: p.away ?? -1, t: 0 });
        // The roof keeps shading the room when it is cut away: a shadow-only twin on layer 1.
        const proxy = new THREE.Mesh(geo, this.shadowOnly);
        proxy.layers.set(1);
        proxy.castShadow = true;
        inst.group.add(proxy);
      }
      if (p.material === 'roof') this.addShells(mesh, opts, { density: 0.5, tint: 1.12, step: 0.06 }, p.cut ? inst : null, inst.shells);
    }
    // Furniture: the solver's plan (`content/furnish.ts`), as sprites on the floor.
    let fire: { x: number; z: number; level: number } | null = null;
    for (const room of rooms) {
      const floorY = model.levels[room.level].floorY;
      for (const it of room.plan.pieces) {
        const prop = room.props.get(it.id);
        if (!prop) continue;
        const flat = it.kind === 'flat';
        // Everything follows the house's alignment cross (see roomplan.ts): the card is turned with the house,
        // stretched sideways a little to keep one art pixel to one screen pixel.
        const card = spriteCard(prop, PITCH, { flat, shadow: false });
        card.mesh.position.set(it.x, floorY + 0.02 + it.lift, it.z);
        card.mesh.rotation.y = 0;
        if (!flat) card.mesh.scale.x = 1 / Math.cos(YAW - h.rot);
        inst.group.add(card.mesh);
        inst.furniture.push(card.mesh);
        inst.furnLevel.push(room.level);
        inst.cards.push(card);
        this.sprites.push(card);
        if (it.fire) fire = { x: it.x, z: it.z, level: room.level };
      }
    }
    // The hearth's (or oven's, or forge's) glow, if the room has one.
    if (fire) {
      const hearth = new THREE.PointLight(0xff9a48, 4, 6, 2);
      hearth.visible = false; // (a light that is switched on counts in every shader: the pool in `update` decides which shine)
      hearth.position.set(fire.x, model.levels[fire.level].floorY + 0.55, fire.z + 0.2);
      inst.group.add(hearth);
      inst.hearth = { light: hearth, flame: new THREE.Mesh(), base: 4, seed: 3 + Math.round(h.x * 0.37 + h.z * 0.11) % 40 };
      this.torches.push(inst.hearth);
      inst.hearthAt = houseToWorld(h, hearth.position.x, hearth.position.z);
    }
    // (What the room gives off to the filaments is the index's: it feeds the field whether or not the house is standing.)

    const y = groundHeight(this.ground, h.x, h.z) - 0.05;
    if (fire) {
      const c = houseToWorld(h, model.smoke[0], model.smoke[2]);
      inst.chimney = { x: c.x, y: y + model.smoke[1], z: c.z, seed: Math.round(h.x * 0.91 + h.z * 0.53) % 97 };
    }
    inst.group.position.set(h.x, y, h.z);
    inst.group.rotation.y = h.rot;
    this.scene.add(inst.group);
    this.houses.push(inst);
    st.houses.push(inst);
    if (this.heatAspect) this.floorHeatFor(inst);
  }

  /** The heat map's paint on a standing house's floor. */
  private floorHeatFor(hs: HouseInst): void {
    const { place, model } = hs.built;
    hs.floorHeat = makeFloorHeat(model.room, model.floorY + 0.03, (x, z) => houseToWorld(place, x, z));
    hs.group.add(hs.floorHeat.mesh);
  }

  /** Take a house down when its chunk leaves. */
  private dropHouse(hs: HouseInst): void {
    this.scene.remove(hs.group);
    hs.group.traverse((o) => {
      const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      if (g && !g.userData.shared) g.dispose();
    });
    hs.floorHeat?.dispose();
    for (const m of hs.mats) {
      m.dispose();
      const i = this.windowMats.indexOf(m as THREE.MeshLambertMaterial);
      if (i >= 0) this.windowMats.splice(i, 1);
    }
    for (const c of hs.cards) this.sprites.splice(this.sprites.indexOf(c), 1);
    if (hs.hearth) this.torches.splice(this.torches.indexOf(hs.hearth), 1);
    for (const s of hs.shells) this.shells.splice(this.shells.indexOf(s), 1);
    this.houses.splice(this.houses.indexOf(hs), 1);
    if (this.wasIn === hs) this.wasIn = null;
  }

  /** Two shells: `step` metres out, then twice that, each sparser than the last. */
  private addShells(base: THREE.Mesh, opts: LitOpts, s: { density: number; tint: number; step: number }, cutOf: HouseInst | null, collect?: Shell[]): void {
    for (const layer of [1, 2]) {
      // One shell material per look (the material it grows from, and the layer), shared by every thing that has it.
      const key = `${(base.material as THREE.Material).uuid}:${layer}:${s.density}:${s.step}`;
      let mat = this.shellMats.get(key);
      if (!mat) {
        mat = shellOf(base.material as THREE.MeshLambertMaterial, opts, {
          layer, offset: s.step * layer, density: s.density / (layer * layer), tint: layer === 1 ? s.tint : s.tint * 1.08,
        });
        this.shellMats.set(key, mat);
      }
      const m = new THREE.Mesh(base.geometry, mat);
      m.position.copy(base.position);
      m.rotation.copy(base.rotation);
      m.scale.copy(base.scale);
      m.receiveShadow = true;
      base.parent ? base.parent.add(m) : base.add(m);
      const shell = { mesh: m, layer, cutOf };
      this.shells.push(shell);
      collect?.push(shell);
    }
  }

  private shellMats = new Map<string, THREE.MeshLambertMaterial>();
  /** Tree geometry by kind and seed: built once, shared by every tree that looks like it (never disposed). */
  private treeGeos = new Map<string, { wood: THREE.BufferGeometry; leaves: THREE.BufferGeometry | null }>();

  private barkMat: THREE.MeshLambertMaterial | null = null;
  /** Leaf materials by tint (0: the broadleaf green). */
  private leafMats = new Map<number, { mat: THREE.MeshLambertMaterial; opts: LitOpts }>();

  private buildTree(place: PlacedTree, st: Standing): void {
    const kind = place.kind ?? 'oak', look = THINGS.get(kind).tree;
    if (!look) return;
    const key = `${kind}:${place.seed}`;
    let geo = this.treeGeos.get(key);
    if (!geo) {
      const t = look.model(place.seed);
      geo = { wood: geometryOf(t.wood), leaves: t.clumps.length ? lumpGeometry(t.clumps, t.height, 1) : null }; // a dead tree has no leaves
      geo.wood.userData.shared = true;
      if (geo.leaves) geo.leaves.userData.shared = true;
      this.treeGeos.set(key, geo);
    }
    const group = new THREE.Group();
    // Bark and leaf textures are painted once and shared by every tree.
    this.barkMat ??= lit({ map: tex(barkTex(4)), ao: true, wettable: true, seeThrough: true });
    const wood = new THREE.Mesh(geo.wood, this.barkMat);
    wood.castShadow = wood.receiveShadow = true;
    group.add(wood);
    group.position.set(place.x, this.store.heightAt(place.x, place.z), place.z);
    this.scene.add(group);
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
    this.addShells(leaves, leaf.opts, { density: 0.55, tint: 1.18, step: 0.12 }, null, st.shells);
  }

  private stoneMat: THREE.MeshLambertMaterial | null = null;
  private logMat: THREE.MeshLambertMaterial | null = null;
  private shrubMat: THREE.MeshLambertMaterial | null = null;
  private clothMats = new Map<string, THREE.MeshLambertMaterial>();
  private plank: THREE.MeshLambertMaterial | null = null;
  private hayM: THREE.MeshLambertMaterial | null = null;

  /** Sawn timber for gates, palisades and stalls. */
  private plankMat(): THREE.MeshLambertMaterial {
    return (this.plank ??= lit({ map: tex(timberTex(6)), ao: true, wettable: true, seeThrough: true }));
  }

  private hayMat(): THREE.MeshLambertMaterial {
    return (this.hayM ??= lit({ map: tex(thatchTex(8)), ao: true, wettable: true, seeThrough: true }));
  }

  /** Cloth in a flat colour, shared by colour; `hang` swings from the top (a line of washing). */
  private clothMat(colour: number, hang: boolean): THREE.MeshLambertMaterial {
    const key = `${colour}:${hang}`;
    let mat = this.clothMats.get(key);
    if (!mat) {
      mat = lit({ map: tex(plasterTex(5)), color: colour, ao: true, wettable: true, ...(hang ? { sway: { from: LAUNDRY_HANG.top, amount: 0.22, hang: true } } : {}) });
      this.clothMats.set(key, mat);
    }
    return mat;
  }
  private wellWater: THREE.MeshLambertMaterial | null = null;

  /** The material a part of a thing is drawn with (see `ThingMaterial`); made once, shared by everything drawn with it. */
  private thingMat(m: ThingMaterial, colour = 0): THREE.MeshLambertMaterial {
    switch (m) {
      case 'bark': return (this.logMat ??= lit({ map: tex(barkTex(4)), ao: true, wettable: true, seeThrough: true }));
      case 'stone': return (this.stoneMat ??= lit({ map: tex(stoneTex(3)), ao: true, wettable: true, seeThrough: true }));
      case 'plank': return this.plankMat();
      case 'hay': return this.hayMat();
      case 'water': return (this.wellWater ??= new THREE.MeshLambertMaterial({ color: 0x2f6a8a, emissive: 0x0b2434 }));
      case 'cloth': return this.clothMat(colour, false);
      case 'clothHang': return this.clothMat(colour, true); // the cloth swings from the line
      // Bushes are low, so they sway from the ground up (trees keep their trunks still), and nobody hides behind them.
      case 'bush': return (this.shrubMat ??= lit({ map: tex(leafTex(5)), ao: true, sway: { from: 0, amount: 0.05 }, seeThrough: true }));
    }
  }

  /** A placed thing, drawn as its kind says (`content/things/kinds/`), standing on the ground where it is placed. */
  private buildProp(p: PlacedProp, st: Standing, y = this.store.heightAt(p.x, p.z)): void {
    const group = new THREE.Group();
    const kind = THINGS.get(p.kind), parts = THINGS.parts(p);
    for (const part of parts.meshes) {
      const m = new THREE.Mesh(geometryOf(part.mesh), this.thingMat(part.material, part.colour));
      // (Water lies flat in its ring: it takes shadow, it casts none.)
      m.castShadow = part.material !== 'water';
      m.receiveShadow = true;
      group.add(m);
    }
    if (parts.lumps) {
      const { lumps, material } = parts.lumps;
      const m = new THREE.Mesh(lumpGeometry(lumps.clumps, lumps.height, 1), this.thingMat(material));
      m.castShadow = m.receiveShadow = true;
      group.add(m);
    }
    group.scale.setScalar(p.size ?? 1);
    group.rotation.y = p.rot ?? 0;
    group.position.set(p.x, y - (kind.sink ?? 0), p.z);
    this.scene.add(group);
    st.objects.push(group);
    if (kind.flame) this.placeTorch(p.x, y + kind.flame.y * (p.size ?? 1), p.z, st, kind.flame);
  }

  private grassGeo: THREE.BufferGeometry | null = null;
  private grassMat: THREE.MeshLambertMaterial | null = null;

  /** A tuft: three thin blades crossed, dark at the root, light at the tip. Shared by every chunk. */
  private grassParts(): { geo: THREE.BufferGeometry; mat: THREE.MeshLambertMaterial } {
    if (!this.grassGeo || !this.grassMat) {
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
      this.grassGeo = geo;
      this.grassMat = lit({ ao: true, sway: { from: 0, amount: 0.3 } });
    }
    return { geo: this.grassGeo, mat: this.grassMat };
  }

  /** The tufts of one chunk, seeded by the chunk so a reload plants the same grass. */
  private buildGrass(c: ChunkTerrain): THREE.InstancedMesh | null {
    // Tier grass is a count for a 64 m patch; a chunk gets its area's share.
    const count = Math.round((this.grassCount * CHUNK * CHUNK) / (64 * 64));
    if (count <= 0) return null;
    const { geo, mat } = this.grassParts();
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const rng = Rng.fromSeed(91 + c.i * 7919 + c.j * 104729);
    const g = this.ground;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const tint = new THREE.Color();
    const half = g.size / 2;
    const nearHouses = this.houseIndex.liteNear(c.x0, c.z0, c.x0 + CHUNK, c.z0 + CHUNK);
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
      p.set(x, this.store.heightAt(x, z) - 0.02, z);
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
    return mesh;
  }

  /** Build one chunk's ground mesh, painted texture and grass, and add it to the scene. */
  private loadChunk(i: number, j: number): void {
    const c = this.store.ensure(i, j);
    // The painting is the slow part (about 100 ms), so it is done a few ms a frame: a flat green stands in until it is finished.
    this.groundHold ??= pixTexture(new Uint8ClampedArray([62, 92, 42, 255]), 1, 1, { flip: false });
    const mesh = new THREE.Mesh(geometryOf(c.mesh), lit({ map: this.groundHold, ao: true, wettable: true, puddles: true }));
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    const grass = this.buildGrass(c);
    if (grass) {
      grass.count = Math.min(grass.userData.full as number, this.grassLimit(grass));
      this.scene.add(grass);
    }
    const standing: Standing = { houses: [], objects: [], shells: [], torches: [] };
    const lc: LoadedChunk = { id: c, ground: mesh, grass, heat: null, standing, painter: groundChunkPainter(this.ground, i, j) };
    this.paintQueue.push(lc);
    this.chunks.set(chunkKey(i, j), lc);
    this.fillChunk(i, j, lc);
    this.syncHeat(lc);
    this.chunkBuilds++;
  }

  private forgetT = 3;

  /**
   * Let go of what is made for ground far from the view: the furnished rooms of houses and the generated trees, props
   * and posts of chunks. They are made again, the same, if the hero comes back; what is on the screen is untouched.
   */
  private forgetFar(): number {
    const f = this.focus, keep = this.viewRadius() + Math.max(60, this.lightRange);
    const near = (x: number, z: number, r: number): boolean => Math.hypot(x - f.x, z - f.z) < r;
    const stood = new Set(this.houses.map((h) => h.built.place));
    // (Whoever walks keeps the ground round them: the hero, and the people going their rounds.)
    const walkers = [this.hero, ...this.cast.map((c) => c.mind.actor)];
    const held = (x: number, z: number, r: number): boolean => near(x, z, r) || walkers.some((a) => Math.hypot(x - a.x, z - a.z) < r);
    const a = this.houseIndex.forget((p) => stood.has(p) || held(p.x, p.z, keep));
    const b = this.placed.forget((i, j) => near((i + 0.5) * CHUNK, (j + 0.5) * CHUNK, keep + CHUNK) || this.chunks.has(chunkKey(i, j)));
    this.nav.forget((x, z) => held(x, z, keep));
    this.field.forget((x, z) => held(x, z, keep));
    return a + b;
  }

  /** What is held for far-off ground, for the stats and the tests. */
  get held(): { furnished: number; generated: number } {
    return { furnished: this.houseIndex.made, generated: this.placed.generatedChunks };
  }

  private groundHold: THREE.DataTexture | null = null;
  private paintQueue: LoadedChunk[] = [];

  /** Paint the grounds of loaded chunks for up to `budgetMs`, the nearest the view's centre first; a finished one gets its texture. */
  private pumpPaint(budgetMs: number): void {
    const t0 = performance.now();
    while (this.paintQueue.length && performance.now() - t0 < budgetMs) {
      const f = this.focus;
      let k = 0, best = Infinity;
      this.paintQueue.forEach((q, n) => {
        const d = Math.hypot(q.id.x0 + CHUNK / 2 - f.x, q.id.z0 + CHUNK / 2 - f.z);
        if (d < best) { best = d; k = n; }
      });
      const lc = this.paintQueue[k];
      if (lc.dead || !lc.painter) {
        this.paintQueue.splice(k, 1);
        continue;
      }
      if (!lc.painter.step(Math.max(0.5, budgetMs - (performance.now() - t0)))) continue;
      const n = Math.round(CHUNK * TEXELS_PER_M);
      const map = pixTexture(lc.painter.pix.data, n, n, { flip: false });
      map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
      // Mesh UVs are world metres; this chunk's texture covers x0..x0+CHUNK.
      map.repeat.set(1 / CHUNK, 1 / CHUNK);
      map.offset.set(-lc.id.x0 / CHUNK, -lc.id.z0 / CHUNK);
      (lc.ground.material as THREE.MeshLambertMaterial).map = map;
      lc.painter = undefined;
      this.paintQueue.splice(k, 1);
    }
  }

  /** Work left to do for chunks that have loaded: one tree, prop or post at a time, spread over frames. */
  private fillQueue: { lc: LoadedChunk; run: () => void }[] = [];

  /** Queue what the placed index says is in chunk (i, j): trees, props, torch posts (built by `pumpFill`). */
  private fillChunk(i: number, j: number, lc: LoadedChunk): void {
    const content = this.placed.chunk(i, j), st = lc.standing;
    for (const t of content.trees) this.fillQueue.push({ lc, run: () => this.buildTree(t, st) });
    for (const p of content.props) this.fillQueue.push({ lc, run: () => this.buildProp(p, st) });
    for (const place of this.houseIndex.inChunk(i, j)) this.fillQueue.push({ lc, run: () => this.standHouse(this.houseIndex.entry(place), st) });
  }

  /** Do queued chunk work for up to `budgetMs`, so a chunk streaming in costs a few frames of a little, not one long one. */
  private pumpFill(budgetMs: number): void {
    const t0 = performance.now();
    let n = 0;
    while (n < this.fillQueue.length && performance.now() - t0 < budgetMs) {
      const job = this.fillQueue[n++];
      if (!job.lc.dead) job.run();
    }
    this.fillQueue.splice(0, n);
  }

  /** Take down what a chunk held. Geometry shared between things (the tree looks) stays. */
  private emptyChunk(st: Standing): void {
    for (const hs of st.houses) this.dropHouse(hs);
    st.houses.length = 0;
    for (const o of st.objects) {
      this.scene.remove(o);
      o.traverse((c) => {
        const g = (c as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
        if (g && !g.userData.shared) g.dispose();
      });
    }
    for (const t of st.torches) {
      this.torches.splice(this.torches.indexOf(t), 1);
      t.dispose?.();
    }
    for (const s of st.shells) this.shells.splice(this.shells.indexOf(s), 1);
    st.objects.length = st.shells.length = st.torches.length = 0;
  }

  private unloadChunk(key: string): void {
    const lc = this.chunks.get(key);
    if (!lc) return;
    this.scene.remove(lc.ground);
    lc.ground.geometry.dispose();
    const mat = lc.ground.material as THREE.MeshLambertMaterial;
    if (mat.map !== this.groundHold) mat.map?.dispose();
    mat.dispose();
    if (lc.heat) {
      this.scene.remove(lc.heat.mesh);
      lc.heat.dispose();
    }
    if (lc.grass) {
      this.scene.remove(lc.grass);
      lc.grass.dispose();
    }
    lc.dead = true;
    this.emptyChunk(lc.standing);
    this.chunks.delete(key);
    this.store.drop(lc.id.i, lc.id.j);
  }

  /** Metres from the focus out to the edge of what the view can show, plus a margin. */
  viewRadius(): number {
    const hw = this.camera.right, hh = this.camera.top;
    // Up the screen the ground is foreshortened by sin(pitch).
    return Math.hypot(hw, hh / Math.sin(PITCH)) + 6;
  }

  /**
   * Keep the chunks near the view resident. Builds at most one per call (a
   * chunk costs a texture paint), nearest first; drops those well outside.
   */
  private streamChunks(all = false): void {
    // Only what has been seen, or can be seen now, is built (with vision on); the rest of the view stays black.
    const r = this.viewRadius();
    const want = chunksNear(this.ground, this.focus.x, this.focus.z, r).filter((c) => this.worthLoading(c.i, c.j));
    for (const id of want) {
      if (this.chunks.has(chunkKey(id.i, id.j))) continue;
      this.loadChunk(id.i, id.j);
      if (!all) break;
    }
    // Hysteresis: a chunk is dropped only well past the load radius.
    const keep = new Set(chunksNear(this.ground, this.focus.x, this.focus.z, r + CHUNK * 0.75).filter((c) => this.worthLoading(c.i, c.j)).map((c) => chunkKey(c.i, c.j)));
    for (const k of [...this.chunks.keys()]) if (!keep.has(k)) this.unloadChunk(k);
  }

  /** Show the heat map of one aspect over the ground (null hides it). */
  showFilaments(a: AspectId | null): void {
    this.heatAspect = a;
    for (const lc of this.chunks.values()) this.syncHeat(lc);
    // The room inside each house shows it on its floor.
    for (const hs of this.houses) {
      if (a && !hs.floorHeat) {
        this.floorHeatFor(hs);
      } else if (!a && hs.floorHeat) {
        hs.group.remove(hs.floorHeat.mesh);
        hs.floorHeat.dispose();
        hs.floorHeat = null;
      }
    }
    this.heatT = 0;
  }

  get shownAspect(): AspectId | null {
    return this.heatAspect;
  }

  private syncHeat(lc: LoadedChunk): void {
    if (this.heatAspect && !lc.heat) {
      lc.heat = makeHeat(lc.id, lc.ground.geometry);
      this.scene.add(lc.heat.mesh);
    } else if (!this.heatAspect && lc.heat) {
      this.scene.remove(lc.heat.mesh);
      lc.heat.dispose();
      lc.heat = null;
    }
  }

  /** Tell the field what the weather and the living are doing now. */
  private feedField(): void {
    const env = this.env;
    // (The clouds count as moved once they have drifted a couple of metres: until then the readings are kept.)
    const cloudKey = `${Math.round(this.cloudOff.x / 2)},${Math.round(this.cloudOff.y / 2)}`;
    this.field.setConditions({ env: this.weather.env(), isClouded: (x, z) => env.cloudShadow(x, z) > 0.5, sunDir: env.sunDir, cloudKey });
    this.field.setMovers([
      { x: this.hero.x, z: this.hero.z, kind: 'friend' },
      ...this.cast.map((c) => ({ x: c.mind.actor.x, z: c.mind.actor.z, kind: 'friend' as const })),
      ...this.magicLightSources(),
    ]);
  }

  /** What the filaments are at the hero's feet. */
  heroReading(): HexFilaments {
    return this.field.readAt(this.hero.x, this.hero.z);
  }

  get chunkCount(): number {
    return this.chunks.size;
  }

  /** Chunks built over the page's life (a streaming counter for the stats and tests). */
  get chunksBuilt(): number {
    return this.chunkBuilds;
  }

  private grassLimit(m: THREE.InstancedMesh): number {
    return Math.round((m.userData.full as number) * this.grassShare);
  }

  private grassShare = 1;

  /** A flame with its light (on a bracket, or on a thing that carries one); into `st` when it belongs to a chunk. */
  private placeTorch(x: number, y: number, z: number, st: Standing | null, look: { size?: number; count?: number; power?: number; lightY?: number } = {}): void {
    const power = look.power ?? 9;
    const fx = makeFlame(look.size ?? 0.42, look.count ?? 10, this.torchSeed);
    fx.object.position.set(x, y + 0.02, z);
    this.scene.add(fx.object);
    const light = new THREE.PointLight(0xffa458, power, 11, 2);
    light.visible = false; // (the pool in `update` decides which shine: a light that is on counts in every shader)
    light.position.set(x, y + (look.lightY ?? 0.3), z);
    this.scene.add(light);
    const torch: Torch = { light, flame: fx.object, tick: fx.tick, base: power, seed: this.torchSeed * 7 / 11 + 1, dispose: fx.dispose };
    this.torchSeed++;
    this.torches.push(torch);
    if (st) {
      st.objects.push(fx.object, light);
      st.torches.push(torch);
    }
  }

  private torchSeed = 0;

  setShadowMap(size: number): void {
    const sh = this.sun.shadow;
    if (sh.mapSize.x === size && sh.map) return;
    sh.mapSize.set(size, size);
    sh.map?.dispose();
    sh.map = null as unknown as THREE.WebGLRenderTarget;
  }

  /** Tier grass count (for a 64 m patch); chunks show that share of the tufts they hold. */
  setGrass(count: number): void {
    this.grassShare = this.grassCount > 0 ? Math.min(1, count / this.grassCount) : 0;
    for (const c of this.chunks.values()) if (c.grass) c.grass.count = Math.round((c.grass.userData.full as number) * this.grassShare);
  }

  /** Size the camera for a low-res target of rw × rh pixels at the current zoom. */
  frame(rw: number, rh: number): void {
    const hw = rw / 2 / this.ppm, hh = rh / 2 / this.ppm;
    Object.assign(this.camera, { left: -hw, right: hw, top: hh, bottom: -hh });
    this.camera.updateProjectionMatrix();
    const span = Math.max(hw, hh) * 1.15 + 3;
    const c = this.sun.shadow.camera;
    Object.assign(c, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 90 });
    c.updateProjectionMatrix();
    // The first sizing builds every chunk the view needs; later ones stream a chunk per frame.
    const first = !this.framed;
    this.streamChunks(first);
    this.framed = true;
    if (first) {
      this.pumpPaint(Infinity);
      this.pumpFill(Infinity);
    } // the first view is built whole; later chunks fill in a little each frame
  }

  private framed = false;

  /** Screen-space pan (rendered pixels) to world movement on the ground. */
  pan(dxPx: number, dyPx: number): void {
    this.follow = false;
    const px = 1 / this.ppm;
    const right = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW));
    const fwd = new THREE.Vector3(-Math.sin(YAW), 0, -Math.cos(YAW));
    // Moving up the screen covers more ground (the view is foreshortened by sin(pitch)).
    this.focus.addScaledVector(right, -dxPx * px).addScaledVector(fwd, (dyPx * px) / Math.sin(PITCH));
    const lim = this.ground.size / 2 - 4;
    this.focus.x = Math.max(-lim, Math.min(lim, this.focus.x));
    this.focus.z = Math.max(-lim, Math.min(lim, this.focus.z));
  }

  // (Houses go in and out of the API by their map id: `houses` is only what stands now, and its order changes as chunks stream.)

  /** The id of the house under the pointer, if any (nearest hit). */
  pick(ndcX: number, ndcY: number): string | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    let best: string | null = null, bestD = Infinity;
    for (const hs of this.houses) {
      const hit = ray.intersectObject(hs.group, true)[0];
      if (hit && hit.distance < bestD) {
        bestD = hit.distance;
        best = hs.built.place.id;
      }
    }
    return best;
  }

  /**
   * The house a tap on the ground means (its id): the one whose footprint (porch included) the tapped ground point lies
   * in. A roof that only covers ground behind the house does not count, so the hero can walk round the back.
   */
  houseTapped(ndcX: number, ndcY: number): string | null {
    const g = this.groundAt(ndcX, ndcY);
    if (!g) return null;
    const i = houseAt(this.houses.map((h) => h.built), this.houses.map((h) => houseOuterBox(h.built)), g.x, g.z, 0);
    return i >= 0 ? this.houses[i].built.place.id : null;
  }

  /** The house the hero is in, else the standing one nearest the view's focus. */
  private activeHouse(): HouseInst | null {
    const h = this.heroHouse();
    if (h) return this.standingOf(h);
    let best: HouseInst | null = null, bestD = Infinity;
    for (const hs of this.houses) {
      const d = Math.hypot(hs.built.place.x - this.focus.x, hs.built.place.z - this.focus.z);
      if (d < bestD) {
        bestD = d;
        best = hs;
      }
    }
    return best;
  }

  /** Is any roof lifted? Setting it lifts the active house's roof, or lowers every one. */
  get inside(): boolean {
    return this.houses.some((h) => h.open);
  }

  set inside(on: boolean) {
    if (!on) for (const h of this.houses) h.open = false;
    else {
      const h = this.activeHouse();
      if (h) h.open = true;
    }
  }

  /** Lift or lower one house's roof by hand (dev), if it is standing. */
  toggleRoof(id: string): void {
    const h = this.standingOf(id);
    if (h) h.open = !h.open;
  }

  /** Where a tap on the screen (ndc) lands on the ground; null if it points at the sky. */
  groundAt(ndcX: number, ndcY: number): P2 | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    let y = 0.35;
    // The ground is not flat: intersect, read the height there, and try again.
    for (let k = 0; k < 3; k++) {
      plane.constant = -y;
      if (!ray.ray.intersectPlane(plane, hit)) return null;
      y = this.store.heightAt(hit.x, hit.z);
    }
    return { x: hit.x, z: hit.z };
  }

  /**
   * Where a tap lands. Indoors on an upper floor that is the floor you stand on (the ground under it is a house away),
   * and tapping the stairs there means the other storey; anywhere else it is the ground.
   */
  tapPoint(ndcX: number, ndcY: number): { x: number; z: number; level?: number } | null {
    const hero = this.hero, hb = this.moves.house(hero);
    if (hb) {
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
      const m = hb.model, gy = this.houseBaseY(hb);
      const at = (y: number): THREE.Vector3 | null => ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -(gy + y)), new THREE.Vector3());
      // Stairs: a tap on or near a flight (the steps are drawn lower than the floor, so ask at the heights along it too)
      // goes up it from the floor it starts on, down it from the floor it comes up to, and on from half way as asked.
      const lvl = hero.stair ? -1 : hero.level;
      for (const [si, s] of m.stairs.entries()) {
        const up = s.from === lvl, down = s.to === lvl, mid = hero.stair?.i === si;
        if (!up && !down && !mid) continue;
        const y0 = m.levels[s.from].floorY, y1 = m.levels[s.to].floorY;
        for (const y of [y0, (y0 + y1) / 2, y1]) {
          const hit = at(y);
          if (!hit) continue;
          const l = houseToLocal(hb.place, hit.x, hit.z);
          const near = 0.45;
          if (l.x > s.rect.x0 - near && l.x < s.rect.x1 + near && l.z > s.rect.z0 - near && l.z < s.rect.z1 + near) {
            // Half way up: the tap says which way by where it is along the flight.
            const goUp = mid ? l.x > (s.rect.x0 + s.rect.x1) / 2 : up;
            return { x: hit.x, z: hit.z, level: goUp ? s.to : s.from };
          }
        }
      }
      if (hero.level > 0 && !hero.stair) {
        const hit = at(m.levels[hero.level].floorY);
        if (hit && shapeDist(houseBox(hb), hit.x, hit.z) < 0) return { x: hit.x, z: hit.z, level: hero.level };
      }
    }
    const g = this.groundAt(ndcX, ndcY);
    return g ? { ...g } : null;
  }

  /** What the stairs buttons should offer: up, down, or neither (nothing to climb here). */
  get stairsHint(): { up: boolean; down: boolean } {
    return this.moves.stairsHint(this.hero);
  }

  /** Where a house stands on the ground (what its local y = 0 is in the world). */
  private houseBaseY(b: BuiltHouse): number {
    return groundHeight(this.ground, b.place.x, b.place.z) - 0.05;
  }

  /** The standing copy of a house, if it is standing. */
  private standingOf(id: string | null): HouseInst | null {
    return id ? this.houses.find((h) => h.built.place.id === id) ?? null : null;
  }

  /**
   * Walk the hero to a point: path-find round the house, the tree and the lake, up and down stairs if the point is
   * on another storey (`level`; by default the one the hero is on if it is in the same house, else the ground
   * floor). Returns the metres to walk, or null if there is no way.
   */
  walkTo(x: number, z: number, level?: number): number | null {
    const metres = this.moves.walkTo(this.hero, x, z, level);
    if (metres === null) return null;
    this.follow = true;
    const legs = this.hero.legs, end = legs[legs.length - 1];
    if (end.kind !== 'walk') return 0;
    const e = end.path[end.path.length - 1];
    const b = end.house ? this.moves.byId(end.house) : null;
    const gy = b ? this.houseBaseY(b) + b.model.levels[end.level].floorY : this.store.heightAt(e.x, e.z);
    this.marker.position.set(e.x, gy + 0.04, e.z);
    this.marker.visible = true;
    return metres;
  }

  /** Go up (+1) or down (-1) the stairs of the house the hero is in, to the next storey. Null if there is none that way. */
  climb(dir: 1 | -1): number | null {
    const p = this.moves.climbTarget(this.hero, dir);
    return p ? this.walkTo(p.x, p.z, p.level) : null;
  }

  /** The storey the hero is on in the house they are in (0 outdoors and on the ground floor). */
  get heroLevel(): number {
    return this.hero.level;
  }

  get walking(): boolean {
    return this.hero.legs.length > 0;
  }

  /** Where someone's feet are: on their storey's floor (or the stair under them) in a house, else on the ground. */
  private footY(a: Actor): number {
    const b = this.moves.house(a);
    if (!b) return this.store.heightAt(a.x, a.z);
    const lv = b.model.levels;
    return this.houseBaseY(b) + (a.foot ?? lv[Math.min(a.level, lv.length - 1)].floorY);
  }

  private placeHero(lift = 0): void {
    this.moves.settle(this.hero); // (tests move the hero by hand)
    const y = this.footY(this.hero);
    this.heroCard.mesh.position.set(this.hero.x, y + lift, this.hero.z);
    this.heroBlob.position.set(this.hero.x, y + 0.03, this.hero.z);
  }

  /** The id of the house the hero is inside (standing or not), or null. */
  heroHouse(): string | null {
    return this.houseIndex.houseContaining(this.hero.x, this.hero.z, -0.1)?.built.place.id ?? null;
  }

  get heroIndoors(): boolean {
    return this.heroHouse() !== null;
  }

  private wasIn: HouseInst | null = null;

  /** Walk to the middle of a house's doorway, just inside (the map's first house by default). Null if there is no such house or no way there. */
  walkIn(id = this.layout.houses[0]?.id): number | null {
    const place = id === undefined ? undefined : this.houseIndex.byId(id);
    if (!place) return null;
    const b = this.houseIndex.lite(place).built;
    const p = houseToWorld(b.place, b.model.door[0], b.model.door[2] - 0.9);
    return this.walkTo(p.x, p.z);
  }

  /**
   * Steering by keys (WASD, arrows): the hero walks where the keys point, stopped by walls and furniture like a tapped walk,
   * and cancels any walk in hand. At the end of a flight walking into it takes the hero on to the stairs, and on the stairs
   * the keys go up or down them, as far as they like. Returns true while the keys are held.
   */
  private steer(dt: number): boolean {
    const { right, up } = this.input;
    const mag = Math.hypot(right, up);
    if (mag < 0.1) {
      if (this.steering) {
        this.steering = false;
        this.faceWalker(this.heroCard, this.heroDir.x, this.heroDir.z, false, 0);
      }
      return false;
    }
    this.steering = true;
    this.marker.visible = false;
    this.follow = true;
    const sY = Math.sin(YAW), cY = Math.cos(YAW);
    // Screen up is away from the camera, screen right is along the camera's right.
    const wx = (up * -sY + right * cY) / mag, wz = (up * -cY + right * -sY) / mag;
    const speed = HERO_SPEED * this.speedMul;
    const pose = this.moves.steer(this.hero, wx, wz, speed * dt);
    this.placeHero();
    if (pose) this.faceWalker(this.heroCard, pose.dx, pose.dz, pose.moving, speed);
    return true;
  }

  private stepHero(dt: number): void {
    const h = this.hero;
    this.moves.settle(h);
    // Crossing a threshold opens that house's cut-away and closes the one left behind.
    const now = this.standingOf(h.house);
    if (now !== this.wasIn) {
      if (this.wasIn) this.wasIn.open = false;
      if (now) now.open = true;
      this.wasIn = now;
    }
    if (now) now.view = h.level;
    // The view follows the storey: up when the hero is upstairs, back down when not.
    const b = this.moves.house(h);
    const lift = b ? this.footY(h) - this.houseBaseY(b) - b.model.floorY : 0;
    this.focusLift += (lift - this.focusLift) * (1 - Math.exp(-dt / 0.3));
    if (this.steer(dt)) return;
    if (!h.legs.length) return;
    const speed = HERO_SPEED * this.speedMul;
    const pose = this.moves.step(h, dt, speed);
    this.placeHero();
    if (pose) this.faceWalker(this.heroCard, pose.dx, pose.dz, pose.moving, speed);
    if (!h.legs.length) this.marker.visible = false;
  }

  /**
   * Show the view that matches the way a person walks (front, back or profile) and
   * their step. A left-facing profile is the right-facing art on a card turned round,
   * which keeps its lit side toward the camera.
   */
  private faceWalker(card: WalkCard, dirX: number, dirZ: number, moving: boolean, speed: number): void {
    const m = card.mesh;
    const wasLeft = Math.cos(m.rotation.y - YAW) < 0;
    const v = viewFor(dirX, dirZ, YAW, card.view, wasLeft);
    card.pose(v.view, moving, speed);
    m.rotation.y = v.left ? YAW + Math.PI : YAW;
  }

  private placeCamera(): void {
    const dir = new THREE.Vector3(Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH));
    const R = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW));
    const U = new THREE.Vector3(-Math.sin(PITCH) * Math.sin(YAW), Math.cos(PITCH), -Math.sin(PITCH) * Math.cos(YAW));
    // Snap the view to whole rendered pixels, so textures do not swim when panning.
    const px = 1 / this.ppm;
    const tr = this.focus.dot(R), tu = this.focus.dot(U);
    const ir = Math.round(tr / px), iu = Math.round(tu / px);
    const target = this.focus.clone().addScaledVector(R, ir * px - tr).addScaledVector(U, iu * px - tu);
    this.camPix.set(ir, iu);
    this.camera.position.copy(target).addScaledVector(dir, CAM_DIST);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
    WORLD.uCamPix.value.copy(this.camPix);
    WORLD.uPixWorld.value = px;

    // The sun's shadow box follows the view, snapped to whole shadow texels.
    const s = this.sunDir;
    const lx = new THREE.Vector3(0, 1, 0).cross(s).normalize();
    const ly = s.clone().cross(lx);
    const c = this.sun.shadow.camera;
    const texel = (c.right - c.left) / this.sun.shadow.mapSize.x;
    const st = target.clone();
    const ax = st.dot(lx), ay = st.dot(ly);
    st.addScaledVector(lx, Math.round(ax / texel) * texel - ax).addScaledVector(ly, Math.round(ay / texel) * texel - ay);
    this.sun.target.position.copy(st);
    this.sun.position.copy(st).addScaledVector(s, 45);
    this.sun.target.updateMatrixWorld();
  }

  private sunDir = new THREE.Vector3(0, 1, 0);

  /** Tell the shaders where the people who reveal themselves are (view space), nearest the view first. */
  private updateSee(): void {
    const slots = WORLD.uSee.value;
    const f = this.focus;
    const near = this.seeOrder;
    near.length = 0;
    for (const p of this.people) if (p.reveals) near.push(p);
    const d = (p: Person): number => Math.hypot(p.card.mesh.position.x - f.x, p.card.mesh.position.z - f.z);
    if (near.length > SEE_SLOTS) near.sort((a, b) => d(a) - d(b));
    const v = this.seeV;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i], p = i < SEE_SLOTS ? near[i] : undefined;
      if (!p) {
        s.set(0, 0, 0, 0);
        continue;
      }
      // The oval is centred on the chest.
      v.copy(p.card.mesh.position);
      v.y += 0.9;
      v.applyMatrix4(this.camera.matrixWorldInverse);
      s.set(v.x, v.y, -v.z, 1);
    }
  }

  /**
   * A lightning bolt: a jagged streak from the sky to the ground (near the view unless a spot is given), the sky
   * flashing twice, and a hard white light where it lands. Works in any weather, so it can be tested on a clear day.
   */
  strike(at?: { x: number; z: number }, rnd: () => number = () => this.skyRng.next()): { x: number; z: number } {
    this.clearBolt();
    const a = rnd() * Math.PI * 2, r = 4 + rnd() * 9;
    const x = at?.x ?? this.focus.x + Math.cos(a) * r, z = at?.z ?? this.focus.z + Math.sin(a) * r;
    const y = this.store.heightAt(x, z);
    const top = y + 48;
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xf2f6ff, fog: false });
    // Walk down in steps, wandering sideways less and less, so the streak lands where it was aimed.
    const pts: THREE.Vector3[] = [];
    const N = 14;
    for (let i = 0; i <= N; i++) {
      const k = i / N, wander = (1 - k) * 9 * (i === 0 || i === N ? 0.4 : 1);
      pts.push(new THREE.Vector3(x + (rnd() - 0.5) * wander, top + (y - top) * k, z + (rnd() - 0.5) * wander));
    }
    pts[N].set(x, y, z);
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < N; i++) {
      const d = new THREE.Vector3().subVectors(pts[i + 1], pts[i]);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1, 0.16), mat);
      seg.scale.y = d.length();
      seg.position.copy(pts[i]).addScaledVector(d, 0.5);
      seg.quaternion.setFromUnitVectors(up, d.normalize());
      group.add(seg);
    }
    this.scene.add(group);
    this.scorch(x, z, rnd);
    this.bolt = { group, age: 0, repeats: [0.14, 0.3] };
    this.boltLight.position.set(x, y + 3, z);
    this.weather.flash = 1;
    return { x, z };
  }

  /** A burnt, fern-scarred patch where the bolt landed. It is ash to the filament field too. */
  private scorch(x: number, z: number, rnd: () => number): void {
    const img = scorchImage(rnd);
    const map = pixTexture(img.data, img.size, img.size, { mips: false });
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    const geo = new THREE.PlaneGeometry(SCORCH_SIZE, SCORCH_SIZE);
    geo.rotateX(-Math.PI / 2);
    // Lie on the highest ground under the patch, so a slope does not bury it.
    const r = SCORCH_SIZE * 0.4;
    const y = Math.max(...[[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]].map(([dx, dz]) => this.store.heightAt(x + dx, z + dz)));
    const mat = lit({ map, sprite: true });
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + 0.03, z);
    mesh.rotation.y = rnd() * Math.PI * 2;
    mesh.renderOrder = 1;
    this.scene.add(mesh);
    this.scorches.push({ x, z, mesh });
    while (this.scorches.length > 10) {
      const old = this.scorches.shift()!;
      this.scene.remove(old.mesh);
      old.mesh.geometry.dispose();
      (old.mesh.material as THREE.Material).dispose();
    }
    this.syncFires();
  }

  private clearBolt(): void {
    if (!this.bolt) return;
    this.scene.remove(this.bolt.group);
    this.bolt.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    // (Every segment shares the one material.)
    ((this.bolt.group.children[0] as THREE.Mesh | undefined)?.material as THREE.Material | undefined)?.dispose();
    this.bolt = null;
    this.boltLight.intensity = 0;
  }

  /** The bolt lives a third of a second; the sky flashes again as it flickers. */
  private stepBolt(dt: number): void {
    const b = this.bolt;
    if (!b) return;
    b.age += dt;
    if (b.repeats.length && b.age >= b.repeats[0]) {
      b.repeats.shift();
      this.weather.flash = Math.max(this.weather.flash, 0.7);
    }
    if (b.age > BOLT_LIFE) return this.clearBolt();
    // Flicker: the streak blinks while the light dies away.
    b.group.visible = b.age < 0.15 || Math.floor(b.age * 40) % 3 !== 0;
    this.boltLight.intensity = 120 * Math.max(0, 1 - b.age / BOLT_LIFE);
  }

  /** Light a campfire beside the hero (it is a fire for the filament field too). Returns false when there are too many. */
  lightFire(): boolean {
    if (this.camps.length >= 6) return false;
    // A placed thing of the kind `campfire`, built like any other, at the hero's height (they may be upstairs).
    const p: PlacedProp = { kind: 'campfire', x: this.hero.x + 0.9, z: this.hero.z + 0.2, seed: this.camps.length };
    const y = this.heroCard.mesh.position.y;
    const st: Standing = { houses: [], objects: [], shells: [], torches: [] };
    this.buildProp(p, st, y);
    const smoke = THINGS.get(p.kind).smoke;
    this.camps.push({ p, st, smoke: { x: p.x, y: y + (smoke?.y ?? 0.9), z: p.z, seed: 40 + this.camps.length * 11 } });
    this.syncFires();
    return true;
  }

  /** Put out every campfire that was lit by hand. */
  douseFires(): void {
    for (const c of this.camps) this.emptyChunk(c.st);
    this.camps = [];
    this.syncFires();
  }

  get campfires(): number {
    return this.camps.length;
  }

  // --- magic lights: an orb that floats beside the hero, and a ray like a lantern's beam ---
  // Adding a light the shaders were not built for freezes the game while every one is rebuilt, so neither light is new:
  // the orb takes a place in the pool of point lights (the nearest few shine, the rest do not, as with torches), and the
  // ray's spot light is always in the scene, dark until it is raised.
  private orb: { group: THREE.Group; torch: Torch; fx: Flame } | null = null;
  private ray: { group: THREE.Group; beam: THREE.Mesh } | null = null;
  /** The torch in the hero's hand, if they carry one: a flame and a light that go where they go, and sight is the better for it. */
  private hand: { fx: Flame; torch: Torch } | null = null;

  get torchOn(): boolean {
    return this.hand !== null;
  }

  /** Take up (or put out) a torch in the hand. */
  toggleTorch(): void {
    if (this.hand) {
      this.scene.remove(this.hand.fx.object, this.hand.torch.light);
      this.torches.splice(this.torches.indexOf(this.hand.torch), 1);
      this.hand.fx.dispose();
      this.hand = null;
      return;
    }
    const fx = makeFlame(0.34, 10, 77);
    const light = new THREE.PointLight(0xffa458, 9, 11, 2);
    this.scene.add(fx.object, light);
    const torch: Torch = { light, flame: fx.object, tick: fx.tick, base: 9, seed: 31 };
    this.torches.push(torch);
    this.hand = { fx, torch };
  }
  private rayLight = new THREE.SpotLight(0xfff1cc, 0, 24, 0.42, 0.55, 1.1);

  get orbOn(): boolean {
    return this.orb !== null;
  }

  get rayOn(): boolean {
    return this.ray !== null;
  }

  /** Call up (or dismiss) a ball of cool light that follows the hero. */
  toggleOrb(): void {
    if (this.orb) {
      this.scene.remove(this.orb.group);
      this.torches.splice(this.torches.indexOf(this.orb.torch), 1);
      this.orb.fx.dispose();
      this.orb = null;
      return;
    }
    const group = new THREE.Group();
    const fx = makeOrb(1.8);
    group.add(fx.object);
    const light = new THREE.PointLight(0xa8dcff, 14, 15, 1.6);
    group.add(light);
    this.scene.add(group);
    // (Its flame is a stand-in: the pool scales a torch's flame with its flicker, and the orb should not stretch.)
    const torch: Torch = { light, flame: new THREE.Object3D(), tick: (t) => fx.tick(t), base: 14, seed: 5, always: true };
    this.torches.push(torch);
    this.orb = { group, torch, fx };
  }

  /** Raise (or lower) a beam of light from the hero's hand along the way they face, like a lantern's. */
  toggleRay(): void {
    if (this.ray) {
      this.scene.remove(this.ray.group);
      this.rayLight.intensity = 0;
      this.ray.beam.geometry.dispose();
      (this.ray.beam.material as THREE.Material).dispose();
      this.ray = null;
      return;
    }
    const group = new THREE.Group();
    // The visible beam: a faint additive cone, pointing from the apex (the hand) outward along +z in its own frame.
    const len = RAY_LENGTH;
    const cone = new THREE.ConeGeometry(Math.tan(0.42) * len * 0.8, len, 16, 1, true);
    cone.translate(0, -len / 2, 0); // apex at the origin, opening toward -y
    cone.rotateX(-Math.PI / 2); // ... now opening toward +z
    const beam = new THREE.Mesh(cone, new THREE.MeshBasicMaterial({ color: 0xfff1cc, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    beam.renderOrder = 2;
    group.add(beam);
    this.scene.add(group);
    this.ray = { group, beam };
  }

  /** The light the orb and the ray add to the field, for the next reading: they are filaments of light. */
  magicLightSources(): FSource[] {
    const out: FSource[] = [];
    if (this.orb) out.push({ x: this.orb.group.position.x, z: this.orb.group.position.z, kind: 'light', weight: 1 });
    if (this.hand) out.push({ x: this.hand.fx.object.position.x, z: this.hand.fx.object.position.z, kind: 'fire', weight: TORCH_FIRE });
    if (this.ray) {
      const hp = this.heroCard.mesh.position, dl = Math.hypot(this.heroDir.x, this.heroDir.z) || 1;
      for (const s of [1.5, 3.5, 5.5, 7.5]) out.push({ x: hp.x + (this.heroDir.x / dl) * s, z: hp.z + (this.heroDir.z / dl) * s, kind: 'light', weight: 0.6 });
    }
    return out;
  }

  private stepMagicLights(): void {
    const hp = this.heroCard.mesh.position;
    if (this.hand) {
      // Held out a little in front, at about the height of a hand.
      const dl = Math.hypot(this.heroDir.x, this.heroDir.z) || 1;
      const x = hp.x + (this.heroDir.x / dl) * 0.4, z = hp.z + (this.heroDir.z / dl) * 0.4;
      this.hand.fx.object.position.set(x, hp.y + 1.05, z);
      this.hand.torch.light.position.set(x, hp.y + 1.35, z);
    }
    if (this.orb) {
      // Floats at the hero's shoulder, bobbing, a little behind the way they are going.
      const bob = Math.sin(this.time * 2.1) * 0.12;
      this.orb.group.position.set(hp.x - this.heroDir.x * 0.4 + 0.5, hp.y + 1.9 + bob, hp.z - this.heroDir.z * 0.4 - 0.3);
    }
    if (this.ray) {
      const dl = Math.hypot(this.heroDir.x, this.heroDir.z) || 1;
      const dx = this.heroDir.x / dl, dz = this.heroDir.z / dl;
      const from = new THREE.Vector3(hp.x + dx * 0.35, hp.y + 1.15, hp.z + dz * 0.35);
      const to = new THREE.Vector3(hp.x + dx * RAY_LENGTH, hp.y + 0.2, hp.z + dz * RAY_LENGTH);
      this.ray.group.position.copy(from);
      this.rayLight.position.copy(from);
      this.rayLight.target.position.copy(to);
      this.rayLight.target.updateMatrixWorld();
      this.rayLight.intensity = 60;
      this.ray.group.updateMatrixWorld(true);
      this.ray.beam.lookAt(to); // +z of the cone toward the far end
      // The beam breathes a little.
      (this.ray.beam.material as THREE.MeshBasicMaterial).opacity = 0.065 + 0.015 * Math.sin(this.time * 9);
    }
  }

  private syncFires(): void {
    this.field.setSources([]); // the field asks `fieldExtras` again
  }

  update(dtMs: number): void {
    const dt = Math.min(0.1, dtMs / 1000);
    this.time += dt;
    const w = this.weather;
    if (this.dayMinutes > 0) w.advance((dt * 24) / (this.dayMinutes * 60));
    w.update(dtMs);
    if (this.autoBolts && w.sky === 'storm' && this.skyRng.next() < dt / 5) this.strike();
    this.stepBolt(dt);
    this.stepMagicLights();
    // The clouds drift downwind; the offset is part of the environment so the rules can ask the same field.
    const drift = cloudDrift(w.windForce);
    this.cloudOff.x += w.wx * drift * dt;
    this.cloudOff.y += w.wy * drift * dt;
    const env = environment(w, { x: this.cloudOff.x, z: this.cloudOff.y });
    this.env = env;
    // (Colours are written into ones kept for it: nothing new is made each frame, which a phone feels as collection pauses.)
    const lin = (out: THREE.Color, c: number[]): THREE.Color => out.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);

    this.sunDir.set(...env.sunDir);
    lin(this.sun.color, env.sunColor);
    this.sun.intensity = env.sunIntensity;
    lin(this.hemi.color, env.skyTop);
    lin(this.hemi.groundColor, env.groundBounce);
    this.hemi.intensity = env.ambient;
    lin(this.fog.color, env.fog);
    // Mist: what is asked for (`setMist`, for magic and scenes) or what the weather gives by itself (rain), whichever is thicker,
    // eased so it rolls in and out. It thickens the distance fog and lies low on the ground.
    // The wind as the world feels it: as set up to a stiff breeze (force 3), then it climbs fast, so force 6 is a gale.
    const wk = w.wind <= 0.6 ? 1 : (0.6 + (w.wind - 0.6) * 2.8) / w.wind;
    const wx = w.windX * wk, wz = w.windY * wk, gale = w.wind * wk;
    const wantMist = Math.max(this.mist, 0.3 * Math.min(1, w.rain));
    this.mistNow += (wantMist - this.mistNow) * (1 - Math.exp(-dt / 2.5));
    // Wind blows mist away: a clear patch opens on the upwind side and sweeps downwind across the view (`uMistBlow`), the
    // faster the harder it blows, until nothing is left by about force 4. The ask stays; the mist comes back when the wind drops.
    const blowWant = Math.min(1, Math.max(0, (w.wind - 0.25) / 0.55));
    this.mistBlow += (blowWant - this.mistBlow) * (1 - Math.exp(-dt / (6 - 3 * blowWant)));
    if (w.wind > 0.05) this.mistDir.set(w.wx, w.wy).normalize();
    const reach = MIST_REACH + MIST_SOFT;
    WORLD.uMistBlow.value.set(this.mistDir.x, this.mistDir.y, THREE.MathUtils.lerp(-reach, reach, this.mistBlow), MIST_SOFT);
    const m = this.mistNow;
    const mFog = m * (1 - this.mistBlow);
    this.fog.near = CAM_DIST + THREE.MathUtils.lerp(env.fogNear - 30, -6, mFog);
    this.fog.far = CAM_DIST + THREE.MathUtils.lerp(env.fogFar, 22, mFog);
    WORLD.uMist.value.set(m, 2.2 + m * 1.6, groundHeight(this.ground, this.focus.x, this.focus.z), this.mistTint ? this.mistTintK : 0);
    WORLD.uMistAt.value.set(this.focus.x, this.focus.z);
    if (this.mistTint) WORLD.uMistColor.value.set(this.mistTint.r, this.mistTint.g, this.mistTint.b);
    // With vision on, what lies past it is black, not sky.
    this.scene.background = this.bgColor.copy(this.fog.color).multiplyScalar(this.vision.outer > 0 ? 0.05 : 1);
    // Sight is the hero's, not the camera's: a cone ahead, a circle round, the dark shortening it, solid things in the way.
    if (this.vision.outer > 0) {
      this.facing = turnToward(this.facing, Math.atan2(this.heroDir.z, this.heroDir.x), 7 * dt);
      this.spec = visionOf({ alertness: this.alertness, night: env.night, cap: this.vision.outer, light: this.orb || this.hand ? 1 : 0 });
      this.castRays();
      this.refreshLights(env.night);
      const sp = this.spec;
      WORLD.uVision.value.set(this.hero.x, this.hero.z, sp.range * 0.55, sp.range);
      WORLD.uSight.value.set(this.facing, sp.fov / 2, sp.edge, sp.near);
      WORLD.uSightBack.value = sp.back;
      this.stepExplored();
    } else {
      WORLD.uVision.value.set(0, 0, 0, 0);
    }

    // World uniforms: time, clouds, wetness, wind.
    WORLD.uTime.value = this.time;
    WORLD.uCloud.value.set(cloudThreshold(env.cloudCover), 0.55 * (1 - env.night * 0.7), this.cloudOff.x, this.cloudOff.y);
    this.wet += (env.wetness - this.wet) * (1 - Math.exp(-dt / (env.wetness > 0.5 ? 6 : 25)));
    WORLD.uWet.value = this.wet;
    // Hollows fill slowly (steady rain takes minutes to leave pools, a storm about a minute and a half) and drain slower still.
    const downpour = Math.max(0, w.rain - 0.15);
    this.pool = Math.min(1, Math.max(0, this.pool + (downpour > 0 ? (downpour * dt) / 80 : -dt / 240)));
    WORLD.uPool.value = this.pool;
    WORLD.uWind.value.set(wx, wz, gale);
    WORLD.uGale.value = gale;
    WORLD.uDrift.value.x += wx * dt * 0.6;
    WORLD.uDrift.value.y += wz * dt * 0.6;

    // Torches flicker; real point lights only for the nearest few.
    // (Distances are measured once each, not inside the sort: a sort asks for them n log n times, and each ask made a vector.)
    const far = this.vision.outer > 0 ? Math.max(this.vision.outer, this.lightRange) + 8 : Infinity;
    // (The order is kept between frames and sorted in place; a torch's distance is written into its own slot.)
    const order = this.torchOrder;
    while (order.length < this.torches.length) order.push({ t: this.torches[0], d: 0 });
    order.length = this.torches.length;
    this.torches.forEach((t, i) => {
      order[i].t = t;
      order[i].d = t.light.getWorldPosition(this.tmpV).distanceTo(this.focus);
    });
    order.sort(byDistance);
    let shining = 0;
    this.windNow.x = wx;
    this.windNow.z = wz;
    for (let i = 0; i < order.length; i++) {
      const { t, d } = order[i];
      t.light.visible = i < this.settings.lights && d < far;
      if (t.light.visible) shining++;
      if (d > far) continue; // out of sight is out of mind: not animated
      const f = 0.82 + 0.18 * Math.sin(this.time * 11 + t.seed) * Math.sin(this.time * 7.3 + t.seed * 2);
      t.light.intensity = t.base * f * (t.always ? 1 : 0.35 + 0.65 * env.night);
      t.flame.scale.set(1, 0.85 + f * 0.3, 1);
      t.tick?.(this.time, this.windNow);
    }
    // The number of lights in the scene is part of every shader: when it changes, every material is compiled again (a
    // stall of a second on a phone). So it never changes: dark spares make up whatever the torches in view do not.
    this.spares.forEach((l, i) => { l.visible = i < this.settings.lights - shining; });
    for (const m of this.windowMats) m.emissive.setScalar(env.night * 1.4);

    // The cut-away fades the roof and the front wall with a dither.
    // (Each cut part has its own storey: it goes when the viewer is on that storey or below it.)
    const cutK = 1 - Math.exp(-dt / 0.12);
    for (const hs of this.houses) {
      hs.cutT += ((hs.open ? 1 : 0) - hs.cutT) * cutK;
      // Does the house's back face the camera? (The camera is toward (sin YAW, cos YAW); the house's local z is its front.)
      const away = Math.sin(YAW) * Math.sin(hs.built.place.rot) + Math.cos(YAW) * Math.cos(hs.built.place.rot) < 0;
      for (const c of hs.cut) {
        const gone = hs.open && (hs.view <= c.level || (away && hs.view <= c.away));
        c.t += ((gone ? 1 : 0) - c.t) * cutK;
        c.mesh.material.opacity = 1 - c.t;
        c.mesh.visible = c.t < 0.98;
      }
      hs.furniture.forEach((f, i) => { f.visible = hs.cutT > 0.02 && hs.furnLevel[i] === hs.view; });
    }
    for (const s of this.shells) s.mesh.visible = s.layer <= this.settings.shells && (!s.cutOf || s.cutOf.cutT < 0.3);

    this.stepCast(dt);
    this.stepHero(dt);
    this.focus.y = 0.5 + this.focusLift;
    if (this.follow) {
      const k = 1 - Math.exp(-dt / 0.25);
      this.focus.x += (this.hero.x - this.focus.x) * k;
      this.focus.z += (this.hero.z - this.focus.z) * k;
    }
    for (const s of this.sprites) s.tick(this.time);

    this.placeCamera();
    this.updateSee();
    this.streamChunks();
    this.pumpFill(3);
    this.pumpPaint(4);
    this.forgetT -= dt;
    if (this.forgetT <= 0) {
      this.forgetT = 3;
      this.forgetFar();
    }
    // The heat map and the reading follow the weather and the living, twice a second.
    this.heatT -= dt;
    if (this.heatT <= 0) {
      this.heatT = 0.5;
      this.feedField();
      if (this.heatAspect) {
        for (const lc of this.chunks.values()) lc.heat?.paint(this.field, this.heatAspect);
        for (const hs of this.houses) hs.floorHeat?.paint(this.field, this.heatAspect);
      }
    }
    const span = Math.max(this.camera.right, this.camera.top) * 1.1;
    const groundAt = (x: number, z: number): number => groundHeight(this.ground, x, z);
    this.rain.update(dt, w.rain, this.focus, span, { x: wx, z: wz }, env.ambient * 0.6 + env.sunIntensity * 0.15 + w.flash, groundAt);
    this.leaves.update(dt, this.time, gale, this.focus, span, { x: wx, z: wz }, 1 - env.night * 0.7, groundAt, this.leafTrees(), (x, z) => this.seen(x, z) > 0.3);
    // Chimney smoke: the nearest chimneys in sight (a smoking chimney is a long way to see, but not through the dark).
    const sm: { c: Chimney; d: number }[] = [];
    for (const hs of this.houses) {
      const c = hs.chimney;
      if (!c) continue;
      const d = Math.hypot(c.x - this.focus.x, c.z - this.focus.z);
      if (d >= 60) continue;
      // Once a chimney has been seen its smoke stays (it is remembered, like the ground); one never seen shows nothing.
      const key = `${c.x},${c.z}`;
      if (this.vision.outer > 0 && !this.smokeSeen.has(key)) {
        if (this.seen(c.x, c.z) <= 0.25) continue;
        this.smokeSeen.add(key);
      }
      sm.push({ c, d });
    }
    // A campfire smokes too (the hero lit it, so it is in view); doused, its smoke thins away rather than cutting off.
    for (const k of this.camps) sm.push({ c: k.smoke, d: Math.hypot(k.p.x - this.focus.x, k.p.z - this.focus.z) });
    sm.sort((a, b) => a.d - b.d);
    this.smoke.update(this.time, sm.map((s) => s.c), { x: wx, z: wz }, 1 - env.night * 0.8, 1 - Math.min(1, w.rain) * 0.5);
    if (this.water) {
      const b = this.water.bounds;
      this.water.mesh.visible = this.vision.outer <= 0 || Math.hypot(this.focus.x - b.x, this.focus.z - b.z) < b.r + this.vision.outer;
    }
    if (this.water) this.water.light(this.sun.color, this.sun.intensity, lin(this.tmpC1, env.skyHorizon), this.tmpC2.copy(this.hemi.color).multiplyScalar(env.ambient * 0.5), env.night);
  }

  /** What time it is and what is going on, for people's schedules: the map's events by the hour, and those started or stopped by hand. */
  get clock(): Clock {
    const w = this.weather;
    const hour = w.hour ?? (w.time === 'night' ? 0 : w.time === 'dusk' ? 18.5 : 12);
    const events = new Set<string>();
    for (const e of this.mapEvents) {
      if (!e.hours) continue;
      const [a, b] = e.hours;
      if (a <= b ? hour >= a && hour < b : hour >= a || hour < b) events.add(e.id);
    }
    for (const [id, on] of this.eventsByHand) {
      if (on) events.add(id);
      else events.delete(id);
    }
    return { hour, events };
  }

  /** Start an event by hand (a script, a test): everyone whose schedule asks for it reacts. It runs until `endEvent`. */
  startEvent(id: string): void {
    this.eventsByHand.set(id, true);
  }

  /** Stop an event by hand (even inside its hours); `clearEvent` gives it back to the map's hours. */
  endEvent(id: string): void {
    this.eventsByHand.set(id, false);
  }

  clearEvent(id: string): void {
    this.eventsByHand.delete(id);
  }

  /** What each of the map's people is doing now (for tests and the debug hook): their schedule line and where they are. */
  get minds(): { id: string; doing: string | null; x: number; z: number; house: string | null; shown: boolean }[] {
    return this.cast.map((c) => ({
      id: c.who.id, doing: c.mind.entry >= 0 ? c.who.does[c.mind.entry].do : null,
      x: c.mind.actor.x, z: c.mind.actor.z, house: c.mind.actor.house, shown: c.card.mesh.visible,
    }));
  }

  /**
   * The map's people follow their schedules (`core/world3d/behave.ts`): the line whose `when` holds is what they do,
   * by a behaviour from `content/behaviours`. Someone far from both the view and the hero waits. Someone is drawn only
   * when the hero could see them: outdoors by sight, indoors when the hero is in the same house on the same storey.
   */
  private stepCast(dt: number): void {
    const sees = (x: number, z: number): boolean => this.vision.outer <= 0 || this.seen(x, z) >= 0.25;
    const ctx = { walking: this.moves, places: this.places, clock: this.clock };
    for (const c of this.cast) {
      const a = c.mind.actor;
      const far = Math.hypot(a.x - this.focus.x, a.z - this.focus.z) > MIND_REACH && Math.hypot(a.x - this.hero.x, a.z - this.hero.z) > MIND_REACH;
      if (far) {
        c.card.mesh.visible = c.blob.visible = false;
        continue;
      }
      const pose = stepMind(c.mind, c.who.does, BEHAVIOURS, ctx, dt);
      const y = this.footY(a);
      this.faceWalker(c.card, pose.dx, pose.dz, pose.moving, 1.1);
      c.card.mesh.position.set(a.x, y, a.z);
      c.blob.position.set(a.x, y + 0.03, a.z);
      // (Indoors the roof is lifted only while the hero is in there, on the storey they look at.)
      const hs = a.house ? this.standingOf(a.house) : null;
      const shown = a.house ? !!hs && hs.open && hs.view === a.level : sees(a.x, a.z);
      c.card.mesh.visible = c.blob.visible = shown;
    }
  }
}

/** Lumpy balls for leaf clumps and boulders: a noisy icosphere per clump, merged. `detail` is the subdivision. */
function lumpGeometry(clumps: Clump[], _height: number, detail: number): THREE.BufferGeometry {
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
