import * as THREE from 'three';
import type { Pix } from '../art/pix';
import { type FurnishedRoom, furnishHouse, roomKindOf } from '../content/furnish';
import {
  barkTex, doorTex, floorTex, groundChunkPainter, leafTex, plasterTex, roofUnderTex, shingleTex, shutterTex, sodTex, stoneTex, thatchTex,
  tileTex, timberTex, windowGlowTex, windowTex,
} from '../art/textures3d';
import { mapNamed } from '../content/maps';
import { FACETS, PERSON_KINDS } from '../content/people';
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
import { type StatesJSON, ThingStates, pieceId, placedId } from '../core/world3d/state';
import { type ActResult, type ActTarget, type ActWorld, type Doer, type Offer, type Spot, offers, perform, thingName } from '../core/world3d/actions';
import { ACTIONS } from '../content/actions';
import { type RolledSheet, sheetDice, unitsDice } from '../core/npcsheet';
import type { Roll } from '../core/dice';
import { type Cares, type LeadStatus, type LeadsState, giveLead, leadStatus, studied } from '../core/world3d/leads';
import { LEADS } from '../content/leads';
import { HEARD_FOR, type Noise, type Senses, type SightRoll, type Where, canSee, fadeSenses, hears, lastHeard, newSenses, noteHeard, rollSight, sightBoost, sightDue } from '../core/world3d/perceive';
import { LOAN_HOURS, type TalkCase, type TalkMemory, type TalkPerson, type TalkResult, newTalkMemory, talk } from '../core/world3d/talk';
import { type Visitor, disposition } from '../core/skillweb';
import {
  type ActKind, type AnswerStep, type CultureDef, type HeroLook, type Standing as HeroStanding, type Welcome, type WhoToThem, type Wrong, answerFor, answerLines,
  fadeStanding, giveLeave, hasLeave, mayDo, meet, moodsFromScale, newStanding, regardOf, shiftRegard, sizeUp, talkOntoScale, weightOf, withinHours,
} from '../core/world3d/standing';
import { type CarryState, type Loose, type LooseSpot, type Stage, actOfStage, newCarry, returnedRegard, stageOf, stray, turnedHalf, wealthOf, worthOf } from '../core/world3d/carry';
import { temperOf } from '../content/people/temper';
import { cultureOf } from '../content/cultures';
import { personName } from '../content/people/naming';
import { LIBRARY } from '../content/skillweb';
import { PlacedIndex } from '../core/world3d/placed';
import { footprints } from '../core/world3d/roomplan';
import { type HouseEntry, HouseIndex } from '../core/world3d/houses';
import type { PlacedProp } from '../core/world3d/props';
import { THINGS } from '../content/things';
import { modelOf } from '../core/world3d/things';
import { type Injuries, recoverFatigue } from '../core/damage';
import { REST_SPEED } from '../core/difficulty';
import { cloudDrift, cloudThreshold } from '../core/world3d/sky';
import { type Actor, Walking, newActor } from '../core/world3d/actors';
import { type Acts, type Answers, type Clock, type Mind, fadeAnswer, newMind, stepMind, walkOn } from '../core/world3d/behave';
import { BEHAVIOURS } from '../content/behaviours';
import { NavGrid, type P2, type Shape, shapeDist } from '../core/world3d/space';
import { type Ground3D, groundHeight, lakeDist, splatAt } from '../core/world3d/terrain';
import { TEXELS_PER_M } from '../core/world3d/tiers';
import type { Clump } from '../core/world3d/tree';
import { fbm } from '../core/noise';
import { VIEW_YAW, facesCamera, wrapAngle } from '../core/world3d/view';
import type { WallSide } from '../core/world3d/house';
import { Weather } from '../core/world3d/weather';
import { type Flame, makeFlame, makeOrb } from './fire';
import { EXPLORED_WINDOW, type LitOpts, SEE_SLOTS, WORLD, exploredTexture, lit, pixTexture, shellOf, sightTexture } from './materials';
import { SCORCH_SIZE, scorchImage } from '../core/world3d/scorch';
import { RAYS, type SightLight, type VisionSpec, angleGap, castSight, lightReach, litSeenAt, seenAt, turnToward, visibleLights, visionOf } from '../core/world3d/vision';
import { Leaves } from './leaves';
import { Rain } from './rain';
import { type Chimney, Smoke } from './smoke';
import { blobShadow } from './shadow';
import { type BodyRig, makeBodyRig } from './body';
import { geometryOf, thingGroup, thingMaterial } from './things';
import { bodySpecOf } from '../content/people/bodies';
import { type FightPose, IDLE, IDLE_SECONDS, SIT, WALK, carrying, fightPose, wielding } from '../content/people/poses';
import { orderly } from '../content/people/order';
import { buildBody } from '../core/world3d/body';
import { cyclePose } from '../core/world3d/pose';
import { type Heat, makeFloorHeat, makeHeat } from './heat';
import { type Water, makeWater } from './water';

/**
 * The M0 spike world: builds the scene from the content and the generators,
 * then runs it (weather, light, the walking villager, the cut-away).
 */

/** How fast the view turns while a turn button or key is held, radians a second (about 80°). */
const TURN_SPEED = 1.4;
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

export { geometryOf };

interface CutPart {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  /** Fades while the viewer's storey is at or below this. */
  level: number;
  /** An outer wall's side: it also fades up to storey `facing` while that side faces the camera. */
  side: WallSide | null;
  facing: number;
  /** 0 shown, 1 gone; eases. */
  t: number;
}

/** A stroll, metres a second. */
const HERO_SPEED = 1.6;
/** How fast the hero walks with something held in both hands (plan B3b): a share of their pace. */
const CARRY_PACE = 0.7;
/** On easy, the eye or question mark floats over anyone within this of the hero who noticed them, seen or not (Q43), metres. */
const MARK_REACH = 30;
/** How far in front of the hero a thing is put down, metres, past half its depth. */
const PUT_DOWN_AHEAD = 0.3;
/** A held thing is shrunk to at most this long, metres; its foot is held this high and this far ahead, as shares of the body's height. */
const HELD_SIZE = 0.7;
const HELD_Y = 0.4;
const HELD_AHEAD = 0.1;
/** How near a found thing must be for someone to notice it lying out of place and bring it home, metres. */
const TIDY_REACH = 10;
/** How far a carried thing has gone from home, in order. */
const STAGE_RANK: Record<Stage, number> = { home: 0, room: 1, out: 2 };

/** Someone who goes from room to room of a house on every storey, by the stairs, and out again (see `core/world3d/actors.ts`). */
/** Someone from the map's cast, on screen: their figure, and their mind (where they are, what they are doing). */
interface CastCard {
  who: CastMember;
  fig: Figure;
  blob: THREE.Mesh;
  mind: Mind;
  /** The way they face (radians, atan2(z, x)): where their eyes look (plan B5). */
  facing: number;
  /** On easy, what they notice of the hero, over their head: an eye (they see you), a question (they heard something). */
  mark: THREE.Sprite;
}

/** How close two people stand to talk of the hero, metres (plan B3c). */
const MEET_DIST = 2.5;
/** How often the map's people look and listen, seconds. */
const PERCEIVE_EVERY = 0.25;
/** The hero's footsteps: heard this far by an ordinary ear, metres; one every so many metres walked. */
const STEPS_LOUD = 5;
const STEP_EVERY = 0.8;
/** A noise heard shows its question mark (on easy) for its first 8 seconds: while it has more than this left. */
const HEARD_SHOWN = HEARD_FOR - 8;

/** The marks over people's heads (on easy): drawn per pixel, 12 × 12. */
function markTexture(kind: 'eye' | 'heard'): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 12;
  const g = c.getContext('2d')!;
  const px = (x: number, y: number, col: string): void => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const rows = kind === 'eye'
    ? ['', '', '   ######   ', ' ##wwwwww## ', '#wwww##wwww#', '#www#pp#www#', '#wwww##wwww#', ' ##wwwwww## ', '   ######   ']
    : ['    ####    ', '   #yyyy#   ', '  #yy##yy#  ', '   ## #yy#  ', '     #yy#   ', '    #yy#    ', '    #yy#    ', '     ##     ', '    #yy#    ', '    #yy#    ', '     ##     '];
  const col: Record<string, string> = { '#': '#1b1410', w: '#f4ecd6', p: '#2a62c9', y: '#ffd24a' };
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (col[ch]) px(x, y, col[ch]); }));
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * A person on screen: an anchor where they stand (the rules place it and say whether it is shown), carrying their 3D
 * body (`core/world3d/body.ts`), which turns the way they face and walks while they move (`stepFigures`).
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

/** People farther than this from both the view and the hero wait (a big map does not run everyone), metres. */
const MIND_REACH = 140;

const byDistance = (a: { d: number }, b: { d: number }): number => a.d - b.d;

/** A person's figure: their body, built from their kinds, on an anchor. */
function personFigure(p: PersonSpec, yaw: number): Figure {
  const rig = makeBodyRig(buildBody(bodySpecOf(PERSON_KINDS.resolve(p), p.seed ?? 1)));
  const place = new THREE.Group();
  place.add(rig.group);
  return { place, rig, yaw, want: yaw, moving: false, phase: 0, still: 1, lastX: 0, lastZ: 0 };
}
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

/** What a thing's group says about itself, for a tap (`userData.thing`). */
interface Tagged {
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

interface Shell {
  mesh: THREE.Mesh;
  layer: number;
  /** The house whose cut-away hides this shell (null for trees and the like). */
  cutOf: HouseInst | null;
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

/** One placed house on the GPU, with its own cut-away. */
interface HouseInst {
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
  /** The states of placed things that differ from their kind's start (a hearth put out): what the save keeps (`core/world3d/state.ts`). */
  readonly states = new ThingStates(THINGS);
  /** Flags the world remembers (set by actions' outcomes; quests later). Saved. */
  flags: Record<string, boolean> = {};
  /** The flames of placed fires standing now, by thing id, so a torch put out goes dark (and lights again). */
  private placedFires = new Map<string, { kind: string; torch: Torch }>();
  /** Flames that are out: hidden whatever else would show them. */
  private outFlames = new Set<THREE.Object3D>();
  /** Where the hero sits, while they sit (the verb `sit`): the seat's top and which way they face; the spot they stood on. */
  private seated: { x: number; z: number; y: number; floor: number; yaw: number; from: P2 } | null = null;
  /** The last few things done in the world, by anyone (for tests now; for witnesses later, B3c). */
  readonly recentActs: { who: string; offer: string; target: string | null; skill: string | null; success: boolean; hour: number }[] = [];
  /** Rolls made by actions (the hero's and the people's). */
  private actRng = Rng.fromSeed(Date.now() >>> 0);
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

  /** What stops the eye near someone (the hero unless said): trunks and boulders, other houses whole, and the walls of the house they stand in. */
  private blockers(range: number, h: Actor = this.hero): Shape[] {
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
   * between them and the camera; today that is only the hero (the director, 2026-10-31).
   */
  readonly people: Person[] = [];
  /** The map's people, each following their schedule (see `stepCast`). */
  private cast: CastCard[] = [];
  private readonly markMats = {
    eye: new THREE.SpriteMaterial({ map: markTexture('eye'), depthTest: false, transparent: true }),
    heard: new THREE.SpriteMaterial({ map: markTexture('heard'), depthTest: false, transparent: true }),
  };
  /**
   * Perception (plan B5, `core/world3d/perceive.ts`). The hero's senses: their sight roll (rolled on entering the map
   * and every six world hours; `rerollSight` for waking). Their Alertness is `alertness`; darkvision 0..1 is `darkSight`.
   */
  readonly heroSenses: Senses = newSenses();
  darkSight = 0;
  /** Told of every sight roll made (the hero's and the people's), for the page to show on easy. */
  onSightRoll: ((who: string, roll: Roll, sight: SightRoll) => void) | null = null;
  /** Show over people's heads what they notice of the hero (on easy). */
  showSenses = false;
  /**
   * Owners, the scale and consequences (plan B3c, `core/world3d/standing.ts`): what each of the map's people thinks of
   * the hero, and the leave they gave. Saved. How the place weighs what is done in it is `culture` (the map's).
   */
  standing: HeroStanding = newStanding();
  /** What the hero holds and where moved things lie (plan B3b, `core/world3d/carry.ts`). Saved. */
  carry: CarryState = newCarry();
  /** Loose things drawn now, by id: in a standing house's group (`inst`), or out of doors. */
  private readonly looseDrawn = new Map<string, { g: THREE.Object3D; inst: HouseInst | null }>();
  /** The models of what is held, in the arms of whoever holds it (`hero`, or one of the map's people), by their id. */
  private readonly heldGs = new Map<string, THREE.Object3D>();
  /** Who holds something in the right hand (a sword), not in both arms. */
  private readonly inHand = new Set<string>();
  /** A fight going on (plan B8a): who is in it. While it lasts the world waits: the clock, and everyone else stands. */
  private fighting: Set<string> | null = null;
  /** How each fighter stands, and since when (`time`): on guard, swinging, down, dead (`content/people/poses.ts`). */
  private readonly fightPoses = new Map<string, { pose: FightPose; t: number }>();
  /** What fights left on people (the hero too), by id: their injuries (`core/damage.ts`). Saved. */
  private hurt: Record<string, Injuries> = {};
  /** World minutes for one point of fatigue back (the difficulty's; the page sets it). */
  restMinutes = 2;
  /** Real seconds gathered toward the next fatigue recovery step (it runs a few times a second, not every frame). */
  private restIn = 0;
  /** How far what the hero holds has gone from home, and who has already answered it (person ids). */
  private carryStage: Stage = 'home';
  private readonly sawCarry = new Set<string>();
  readonly culture: CultureDef;
  /** Who the hero is, as the people see them (their people, their facets): how cold or warm a witness starts. The page sets it. */
  heroWho: Visitor = {};
  /** Told when one of the map's people says something to the hero unasked (a guard come to see), for the page to show. */
  onSpeak: ((who: string, name: string, text: string) => void) | null = null;
  /** Told something the hero should know that no one says (a loan fell due), for the page to show. */
  onNote: ((text: string) => void) | null = null;
  /** When two people last talked of the hero (world hours), by the pair: word passes once an hour at most. */
  private readonly metAt = new Map<string, number>();
  private perceiveIn = 0;
  private stepFrom: P2 | null = null;
  private places: Record<string, Place> = {};
  private mapEvents: MapEvent[] = [];
  /** Events started (true) or stopped (false) by hand, over what the map's hours say. */
  private eventsByHand = new Map<string, boolean>();
  /** The invisible navigation grid the hero walks on. */
  readonly nav: NavGrid;
  /** The hero: where they stand (metres), the house and storey they are on, the walk in hand. */
  readonly hero: Actor = newActor(0, 0);
  readonly heroFig!: Figure;
  private heroBlob!: THREE.Mesh;
  /** The keys: how far right and how far up the screen the hero is being steered (-1..1 each). Set by the page. */
  input = { right: 0, up: 0 };
  private steering = false;
  /** How far the view is lifted for an upper storey, metres. */
  private focusLift = 0;
  private marker: THREE.Mesh;
  /** The camera follows the hero while it walks, until the player drags the view. */
  follow = false;
  /** The view's turn about the vertical, radians (see `core/world3d/view.ts`). Turn it with `turn` or `turnInput`. */
  yaw = VIEW_YAW;
  /** Held turn buttons or keys: -1 turns the world anticlockwise on screen, 1 clockwise. Set by the page. */
  turnInput = 0;
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

  constructor(settings: WorldSettings, grassCount: number, map: Pick<CompiledMap, 'ground' | 'layout' | 'hero' | 'cast' | 'places' | 'events'> & Partial<Pick<CompiledMap, 'placed' | 'culture'>> = mapNamed('spike')) {
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
    // Placed things that carry a lead give it to whoever looks at them (plan B11).
    for (const p of layout.props) if (p.lead) this.propLeads.set(placedId(p), p.lead);
    // Each room is furnished by rules (see `content/furnish.ts`) when something first comes near its house; what stands
    // on the floor blocks feet, and what is in it (the hearth, books, pictures) feeds the filament field.
    this.houseIndex = new HouseIndex<FurnishedRoom[]>(layout.houses, (b) => {
      const rooms = furnishHouse(b.model, b.place.room ?? 'home', b.place.spec.seed, b.place.spec.plan);
      const sources: FSource[] = [];
      rooms.forEach((room, ri) => {
        const fire = room.plan.pieces.filter((p) => p.fire).pop();
        if (fire) {
          const w = houseToWorld(b.place, fire.x, fire.z + 0.2);
          // It gives fire to the field only while it is lit (the field asks `this.states`; see `gives` below).
          sources.push({ x: w.x, z: w.z, kind: 'fire', weight: HEARTH_FIRE, of: { id: pieceId(b.place.id, ri, fire.id), kind: room.models.get(fire.id)!.kind } });
        }
        for (const s of room.sources) {
          const w = houseToWorld(b.place, s.x, s.z);
          sources.push({ x: w.x, z: w.z, kind: s.kind, weight: s.weight });
        }
      });
      // The ground floor's walls and partitions block the ground's walking (its furniture is asked each time, as it can be
      // moved: `furnitureRects`); the storeys above have grids of their own.
      return { room: rooms, shapes: levelWalls(b, 0), sources };
    }, THINGS);
    const houseIndex = this.houseIndex;
    // Feet: the houses' walls and furniture block (held whole, in an index), and so do the trunks, posts and props the
    // placed index knows by chunk, and loose things lying out of doors, so the ground is asked only about what is near;
    // so does the water.
    this.placed = map.placed ?? new PlacedIndex(layout, THINGS);
    const placed = this.placed;
    this.nav = new NavGrid(g.size, {
      near: (x0, z0, x1, z1) => [
        ...houseIndex.shapesNear(x0, z0, x1, z1),
        ...houseIndex.near(x0, z0, x1, z1).flatMap((e) => furnitureObstacles(e.built, this.furnitureRects(e.built, 0))),
        ...placed.near(x0, z0, x1, z1),
        ...this.looseOutdoors(x0, z0, x1, z1),
      ],
    }, { radius: 0.2, blocked: (x, z) => lakeDist(g, x, z) < 0.2 });
    // Walking holds houses by id and asks the index (not what is standing), so a house streaming out changes nothing for the people in it.
    this.moves = new Walking(this.nav, g.size, {
      holding: (x, z) => houseIndex.houseContaining(x, z, -0.1)?.built ?? null,
      byId: (id) => {
        const p = houseIndex.byId(id);
        return p ? houseIndex.lite(p).built : null;
      },
      furniture: (b, level) => this.furnitureRects(b, level),
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
    // Everyone answers what the hero does wrong as the place's culture says: its lines go at the top of every day (B3c).
    this.culture = cultureOf(map.culture);
    // (Answering a wrong comes first; then bringing a found thing home, B3b; then their own day.)
    const answering = [...answerLines(this.culture), { when: { tidying: true }, do: 'tidy' }];
    for (const one of map.cast) {
      const who = { ...one, does: [...answering, ...one.does] };
      const fig = personFigure(who, this.yaw), blob = blobShadow(0.32);
      fig.place.visible = blob.visible = false;
      const mark = new THREE.Sprite(this.markMats.eye);
      mark.scale.set(0.8, 0.8, 1);
      mark.renderOrder = 6;
      mark.visible = false;
      this.scene.add(mark);
      const mind = newMind(who.id, who.start[0], who.start[1], who.seed ?? 1, who.slot, who.home);
      this.cast.push({ who, fig, blob, mind, facing: Math.atan2(mind.actor.dir.z, mind.actor.dir.x), mark });
      // Only the hero shows through what stands in front of them: anyone else behind a tree or a wall is hidden by it.
      this.people.push({ id: who.id, spec: who, fig, reveals: false });
      this.scene.add(fig.place, blob);
    }
    // The hero. Tap the ground and they walk there.
    this.heroFig = personFigure(HERO_PERSON, this.yaw);
    this.people.push({ id: 'hero', spec: HERO_PERSON, fig: this.heroFig, reveals: true });
    this.heroBlob = blobShadow(0.32);
    this.placeHero();
    this.scene.add(this.heroFig.place, this.heroBlob);
    const ring = new THREE.RingGeometry(0.22, 0.32, 16);
    ring.rotateX(-Math.PI / 2);
    this.marker = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.8, depthWrite: false }));
    this.marker.visible = false;
    this.marker.renderOrder = 3;
    this.scene.add(this.marker);

    this.weather.setWind(2, 1);
    this.weather.setHour(12);
    // A source that comes from a placed thing gives only while the thing says so (a hearth put out gives no fire).
    const gives = (s: FSource): boolean => this.fireLit(s.of);
    this.field = new FilamentField(streamingFilamentWorld(g, placed, houseIndex, () => this.fieldExtras(), gives));
    // A thing's state changed: what stands redraws, and the field reads its sources again.
    this.states.on((c) => {
      for (const hs of this.houses) if (hs.fireOf?.id === c.id) this.showFire(hs);
      this.showPlacedFire(c.id);
      this.syncFires();
    });
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

  /** Stand a house up in the world: its model, its furniture, its hearth's light. It belongs to the chunk `st`. */
  private standHouse(entry: HouseEntry<FurnishedRoom[]>, st: Standing): void {
    const { built, room: rooms } = entry;
    const h = built.place, model = built.model;
    const inst: HouseInst = { built, mats: [], hearth: null, fireOf: null, fireSpots: null, hearthAt: null, chimney: null, shells: [], group: new THREE.Group(), furniture: [], furnLevel: [], cut: [], box: entry.box, floorHeat: null, cutT: 0, open: false, view: 0 };
    const matFor = (m: HouseMaterial, cut: boolean): { mat: THREE.MeshLambertMaterial; opts: LitOpts } => this.houseMat(m, cut, inst.mats);
    for (const p of model.parts) {
      const geo = geometryOf(p.mesh);
      const { mat, opts } = matFor(p.material, p.cut);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true;
      mesh.castShadow = !p.cut;
      inst.group.add(mesh);
      if (p.cut) {
        inst.cut.push({ mesh, level: p.level ?? -1, side: p.side ?? null, facing: p.facing ?? -1, t: 0 });
        // The roof keeps shading the room when it is cut away: a shadow-only twin on layer 1.
        const proxy = new THREE.Mesh(geo, this.shadowOnly);
        proxy.layers.set(1);
        proxy.castShadow = true;
        inst.group.add(proxy);
      }
      if (p.material === 'roof') this.addShells(mesh, opts, { density: 0.5, tint: 1.12, step: 0.06 }, p.cut ? inst : null, inst.shells);
    }
    // Furniture: the solver's plan (`content/furnish.ts`): each piece a model (`content/things/models/`), turned to face out from its wall.
    let fire = null as { x: number; z: number; level: number } | null;
    rooms.forEach((room, ri) => {
      const floorY = model.levels[room.level].floorY;
      for (const it of room.plan.pieces) {
        const mp = room.models.get(it.id);
        // (A piece once moved is loose: drawn where it lies now, below, not where the plan put it.)
        if (!mp || this.carry.loose[pieceId(h.id, ri, it.id)]) continue;
        const g = thingGroup(THINGS.get(mp.kind).furniture!.model.draw(mp.seed, mp.variant));
        g.position.set(it.x, floorY + it.lift, it.z);
        g.rotation.y = it.rot;
        // What a tap on it means (`thingAt`): this piece, in this house, on this storey.
        g.userData.thing = { id: pieceId(h.id, ri, it.id), kind: mp.kind, house: h.id, level: room.level, rot: h.rot + it.rot } satisfies Tagged;
        inst.group.add(g);
        inst.furniture.push(g);
        inst.furnLevel.push(room.level);
        if (it.fire) {
          fire = { x: it.x, z: it.z, level: room.level };
          inst.fireOf = { id: pieceId(h.id, ri, it.id), kind: mp.kind };
        }
      }
    });
    // The hearth's (or oven's, or forge's) glow, if the room has one.
    if (fire) {
      const hearth = new THREE.PointLight(0xff9a48, 4, 6, 2);
      hearth.visible = false; // (a light that is switched on counts in every shader: the pool in `update` decides which shine)
      hearth.position.set(fire.x, model.levels[fire.level].floorY + 0.55, fire.z + 0.2);
      inst.group.add(hearth);
      inst.hearth = { light: hearth, flame: new THREE.Mesh(), base: 4, seed: 3 + Math.round(h.x * 0.37 + h.z * 0.11) % 40 };
    }
    // (What the room gives off to the filaments is the index's: it feeds the field whether or not the house is standing.)

    const y = groundHeight(this.ground, h.x, h.z) - 0.05;
    if (fire && inst.hearth) {
      const c = houseToWorld(h, model.smoke[0], model.smoke[2]);
      inst.fireSpots = {
        hearthAt: houseToWorld(h, inst.hearth.light.position.x, inst.hearth.light.position.z),
        chimney: { x: c.x, y: y + model.smoke[1], z: c.z, seed: Math.round(h.x * 0.91 + h.z * 0.53) % 97 },
      };
    }
    this.showFire(inst);
    inst.group.position.set(h.x, y, h.z);
    inst.group.rotation.y = h.rot;
    this.scene.add(inst.group);
    this.houses.push(inst);
    for (const [id, l] of Object.entries(this.carry.loose)) if (l.at?.house === h.id) this.drawLoose(id, l);
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
    if (hs.hearth && this.torches.includes(hs.hearth)) this.torches.splice(this.torches.indexOf(hs.hearth), 1);
    for (const s of hs.shells) this.shells.splice(this.shells.indexOf(s), 1);
    this.houses.splice(this.houses.indexOf(hs), 1);
    if (this.wasIn === hs) this.wasIn = null;
    // (Loose things lying in it went with its group; they're drawn again when it stands.)
    for (const [id, d] of this.looseDrawn) if (d.inst === hs) this.looseDrawn.delete(id);
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
    // A tap on the trunk means the tree (not the crown: it hangs over ground you want to walk to).
    group.userData.thing = { id: placedId({ kind, x: place.x, z: place.z }), kind, house: null, level: 0, rot: 0, pick: wood, exact: true } satisfies Tagged;
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

  /** A placed thing, drawn as its kind says (`content/things/kinds/`), standing on the ground where it is placed. */
  private buildProp(p: PlacedProp, st: Standing, y = this.store.heightAt(p.x, p.z)): void {
    // (Something the map laid here that has been picked up since is drawn where it is now: `drawLoose`.)
    if (this.carry.loose[placedId(p)]) return;
    const kind = THINGS.get(p.kind), parts = THINGS.parts(p);
    const group = thingGroup(parts);
    if (parts.lumps) {
      const { lumps, material } = parts.lumps;
      const m = new THREE.Mesh(lumpGeometry(lumps.clumps, lumps.height, 1), thingMaterial(material));
      m.castShadow = m.receiveShadow = true;
      group.add(m);
    }
    group.scale.setScalar(p.size ?? 1);
    group.rotation.y = p.rot ?? 0;
    group.position.set(p.x, y - (kind.sink ?? 0), p.z);
    this.scene.add(group);
    st.objects.push(group);
    const torch = kind.flame ? this.placeTorch(p.x, y + kind.flame.y * (p.size ?? 1), p.z, st, kind.flame) : null;
    if (p.on) {
      this.fixedTo.set(group, p.on);
      if (torch) this.fixedTo.set(torch.flame, p.on);
    }
    const id = placedId(p);
    group.userData.thing = { id, kind: p.kind, house: null, level: 0, rot: p.rot ?? 0 } satisfies Tagged;
    // A flame that can be put out follows its thing's `lit` state.
    if (torch && kind.states?.lit) {
      this.placedFires.set(id, { kind: p.kind, torch });
      this.showPlacedFire(id);
    }
  }

  /** A placed fire (a torch, a campfire) as its `lit` state says: lit, its flame burns and its light is in the pool; out, neither. */
  private showPlacedFire(id: string): void {
    const f = this.placedFires.get(id);
    if (!f) return;
    const lit = this.fireLit({ id, kind: f.kind });
    const listed = this.torches.includes(f.torch);
    if (lit && !listed) this.torches.push(f.torch);
    if (!lit && listed) {
      this.torches.splice(this.torches.indexOf(f.torch), 1);
      f.torch.light.visible = false;
    }
    if (lit) this.outFlames.delete(f.torch.flame);
    else this.outFlames.add(f.torch.flame);
    f.torch.flame.visible = lit;
  }

  /** Things fixed to a house (a door torch, its flame), by the house's id: hidden while the hero is inside it (see `update`). */
  private fixedTo = new Map<THREE.Object3D, string>();

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
      this.fixedTo.delete(o);
      o.traverse((c) => {
        const g = (c as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
        if (g && !g.userData.shared) g.dispose();
      });
    }
    for (const t of st.torches) {
      // (A torch that is out is not in the pool.)
      const i = this.torches.indexOf(t);
      if (i >= 0) this.torches.splice(i, 1);
      this.outFlames.delete(t.flame);
      t.dispose?.();
    }
    for (const [id, f] of this.placedFires) if (st.torches.includes(f.torch)) this.placedFires.delete(id);
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
  private placeTorch(x: number, y: number, z: number, st: Standing | null, look: { size?: number; count?: number; power?: number; lightY?: number } = {}): Torch {
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
    return torch;
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
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
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
    this.heroFig.place.position.set(this.hero.x, y + lift, this.hero.z);
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
        this.faceWalker(this.heroFig, this.heroDir.x, this.heroDir.z, false);
      }
      return false;
    }
    this.steering = true;
    this.marker.visible = false;
    this.follow = true;
    const sY = Math.sin(this.yaw), cY = Math.cos(this.yaw);
    // Screen up is away from the camera, screen right is along the camera's right.
    const wx = (up * -sY + right * cY) / mag, wz = (up * -cY + right * -sY) / mag;
    const speed = HERO_SPEED * this.speedMul * this.carryPace;
    const pose = this.moves.steer(this.hero, wx, wz, speed * dt);
    this.placeHero();
    if (pose) this.faceWalker(this.heroFig, pose.dx, pose.dz, pose.moving);
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
    // Walking (or being moved) gets the hero up off a seat, back on their feet where they stood.
    if (this.seated && (h.legs.length || Math.hypot(h.x - this.seated.from.x, h.z - this.seated.from.z) > 0.05)) {
      this.seated = null;
      this.placeHero();
    }
    if (this.steer(dt)) return;
    if (!h.legs.length) return;
    const speed = HERO_SPEED * this.speedMul * this.carryPace;
    const pose = this.moves.step(h, dt, speed);
    this.placeHero();
    if (pose) this.faceWalker(this.heroFig, pose.dx, pose.dz, pose.moving);
    if (!h.legs.length) this.marker.visible = false;
  }

  /** A person faces the way they go (a standing still direction keeps the last), and walks or stands. */
  private faceWalker(fig: Figure, dirX: number, dirZ: number, moving: boolean): void {
    if (Math.hypot(dirX, dirZ) > 1e-6) fig.want = Math.atan2(dirX, dirZ);
    fig.moving = moving;
  }

  private placeCamera(): void {
    const yaw = this.yaw;
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(yaw) * Math.cos(PITCH));
    const R = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const U = new THREE.Vector3(-Math.sin(PITCH) * Math.sin(yaw), Math.cos(PITCH), -Math.sin(PITCH) * Math.cos(yaw));
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
    const d = (p: Person): number => Math.hypot(p.fig.place.position.x - f.x, p.fig.place.position.z - f.z);
    if (near.length > SEE_SLOTS) near.sort((a, b) => d(a) - d(b));
    const v = this.seeV;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i], p = i < SEE_SLOTS ? near[i] : undefined;
      if (!p) {
        s.set(0, 0, 0, 0);
        continue;
      }
      // The oval is centred on the chest.
      v.copy(p.fig.place.position);
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
    const y = this.heroFig.place.position.y;
    const st: Standing = { houses: [], objects: [], shells: [], torches: [] };
    this.buildProp(p, st, y);
    const smoke = THINGS.get(p.kind).smoke;
    this.camps.push({ p, st, smoke: { x: p.x, y: y + (smoke?.y ?? 0.9), z: p.z, seed: 40 + this.camps.length * 11 } });
    this.syncFires();
    return true;
  }

  /** Is this thing burning? (A thing whose kind cannot be lit or out always is.) */
  private fireLit(of: { id: string; kind: string } | null | undefined): boolean {
    return !of || !this.states.has(of.kind, 'lit') || this.states.get(of.id, of.kind, 'lit') === true;
  }

  /** A standing house's hearth as its fire's `lit` state says: lit, it glows, smokes and lights the room round it; out, none of these. */
  private showFire(hs: HouseInst): void {
    const lit = this.fireLit(hs.fireOf);
    hs.hearthAt = lit ? hs.fireSpots?.hearthAt ?? null : null;
    hs.chimney = lit ? hs.fireSpots?.chimney ?? null : null;
    if (!hs.hearth) return;
    const listed = this.torches.includes(hs.hearth);
    if (lit && !listed) this.torches.push(hs.hearth);
    if (!lit && listed) {
      this.torches.splice(this.torches.indexOf(hs.hearth), 1);
      hs.hearth.light.visible = false;
    }
  }

  /** The house fires near the hero (standing houses, within `r` metres), nearest first: their ids and kinds, and whether each is lit. */
  firesNear(r = 25): { id: string; kind: string; house: string; lit: boolean; d: number }[] {
    const out: { id: string; kind: string; house: string; lit: boolean; d: number }[] = [];
    for (const hs of this.houses) {
      if (!hs.fireOf || !hs.fireSpots) continue;
      const d = Math.hypot(hs.fireSpots.hearthAt.x - this.hero.x, hs.fireSpots.hearthAt.z - this.hero.z);
      if (d <= r && this.states.has(hs.fireOf.kind, 'lit')) out.push({ ...hs.fireOf, house: hs.built.place.id, lit: this.fireLit(hs.fireOf), d });
    }
    return out.sort((a, b) => a.d - b.d);
  }

  // --- actions (plan B3a): what a tap on a thing means, and doing things through the frame (`core/world3d/actions.ts`) ---

  /**
   * What a tap points at: a thing, the hero (`'hero'`: the spot they stand on), or nothing. What is right under the
   * finger wins, the nearer first (the hero on a stool, or the hearth behind them); then the hero within `slack`
   * (screen units, x and y) of their middle; then a thing within `slack` of its middle, so a thin torch is easy to hit
   * on a phone. Indoors only the furniture of the hero's house on the storey in view counts, outdoors what stands in
   * sight; a house nearer than the thing (its wall in front) means nothing.
   */
  tapped(ndcX: number, ndcY: number, slack: { x: number; y: number }): ActTarget | 'hero' | { person: string } | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const exact = this.thingAt(ndcX, ndcY, null);
    const onHero = ray.intersectObject(this.heroFig.place, true)[0];
    // Someone of the map, drawn now (seen), right under the finger, or near it.
    let person: { id: string; d: number } | null = null;
    for (const c of this.cast) {
      if (!c.fig.place.visible) continue;
      const h = ray.intersectObject(c.fig.place, true)[0];
      if (h && (!person || h.distance < person.d)) person = { id: c.who.id, d: h.distance };
    }
    const nearest = Math.min(onHero?.distance ?? Infinity, exact?.d ?? Infinity, person?.d ?? Infinity);
    if (nearest < Infinity) {
      if (onHero && onHero.distance === nearest) return 'hero';
      if (person && person.d === nearest) return { person: person.id };
      return exact!.t;
    }
    if (this.heroTapped(ndcX, ndcY, slack)) return 'hero';
    const v = new THREE.Vector3();
    for (const c of this.cast) {
      if (!c.fig.place.visible) continue;
      c.fig.place.getWorldPosition(v);
      v.y += 0.8;
      v.project(this.camera);
      if (Math.hypot((v.x - ndcX) / slack.x, (v.y - ndcY) / slack.y) < 1) return { person: c.who.id };
    }
    return this.thingAt(ndcX, ndcY, slack)?.t ?? null;
  }

  // --- talking (plan B3d) ---

  /** Who the hero is talking to: they stop and face the hero until the talk ends. */
  talkingWith: string | null = null;
  /** What the people of this map remember of the hero (`core/world3d/talk.ts`). Saved. */
  talkMemory: TalkMemory = newTalkMemory();

  /** Where someone of the map stands, and their storey and house, as a spot; null if no one is called that. */
  personSpot(id: string): Spot | null {
    const c = this.cast.find((x) => x.who.id === id);
    if (!c) return null;
    const a = c.mind.actor;
    return { x: a.x, z: a.z, level: a.level, house: a.house };
  }

  /** Someone of the map as the talk rules see them: their name, people and facets. */
  talkPerson(id: string): TalkPerson | null {
    const c = this.cast.find((x) => x.who.id === id);
    if (!c) return null;
    const r = PERSON_KINDS.resolve(c.who);
    // Their work: the calling they carry (its name), and what their kinds say about it.
    const calling = r.facets.station && r.facets.station !== 'station' ? FACETS[r.facets.station]?.label : undefined;
    const about = r.chain.map((k) => PERSON_KINDS.def(k)?.about).filter(Boolean).pop();
    return {
      id, name: personName(r.chain, `${id}:${c.who.seed ?? 0}`), kind: r.facets.people ?? 'human', tags: r.chain,
      ...(calling ? { work: { calling, ...(about ? { about } : {}) } } : {}),
      ...(c.who.home ? { home: c.who.home } : {}),
      ...(c.who.home && this.houseWelcome(c.who.home)?.ask ? { leaveAsk: this.houseWelcome(c.who.home)!.ask } : {}),
    };
  }

  /**
   * A close-up of someone's head and shoulders, from in front of their face, rendered from the world as it is (their
   * own body, lit where they stand): `px` square, as sRGB pixels, rows top first. Null if they aren't standing here.
   */
  portrait(renderer: THREE.WebGLRenderer, id: string, px: number): Uint8ClampedArray | null {
    const c = this.cast.find((x) => x.who.id === id);
    if (!c) return null;
    const f = c.fig;
    // Aim between the shoulders and the crown, from the body's own joints (not what it holds: a spear held upright
    // reaches far above the head); from the way the body really faces.
    f.place.updateMatrixWorld(true);
    const J = f.rig.model.joints, H = f.rig.model.height;
    const shoulders = J.root.at[1] + J.spine.at[1] + J.neck.at[1];
    const at = f.place.getWorldPosition(new THREE.Vector3());
    const headH = Math.max(0.15, (H - shoulders) * 0.8);
    const aim = new THREE.Vector3(at.x, at.y + shoulders + (H - shoulders) * 0.4, at.z);
    const q = f.rig.group.getWorldQuaternion(new THREE.Quaternion());
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q).setY(0).normalize();
    const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
    // Head and shoulders fill the frame; a little to one side and above, so the face reads as a face.
    const fov = 26, dist = (headH * 1.6) / Math.tan((fov * Math.PI) / 360);
    const cam = new THREE.PerspectiveCamera(fov, 1, 0.05, 40);
    cam.position.copy(aim).addScaledVector(fwd, dist).addScaledVector(side, dist * 0.18).add(new THREE.Vector3(0, dist * 0.12, 0));
    cam.lookAt(aim);
    const rt = new THREE.WebGLRenderTarget(px, px, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    // (The hero stands where the camera looks from: out of the shot.)
    const was = f.place.visible, heroWas = this.heroFig.place.visible;
    f.place.visible = true;
    this.heroFig.place.visible = false;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.render(this.scene, cam);
    const buf = new Uint8Array(px * px * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, px, px, buf);
    renderer.setRenderTarget(prev);
    f.place.visible = was;
    this.heroFig.place.visible = heroWas;
    rt.dispose();
    // Linear light to sRGB, and the rows the right way up.
    const out = new Uint8ClampedArray(px * px * 4);
    const toS = (v: number): number => {
      const l = v / 255;
      return 255 * (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055);
    };
    for (let y = 0; y < px; y++) {
      for (let x = 0; x < px; x++) {
        const i = ((px - 1 - y) * px + x) * 4, o = (y * px + x) * 4;
        out[o] = toS(buf[i]);
        out[o + 1] = toS(buf[i + 1]);
        out[o + 2] = toS(buf[i + 2]);
        out[o + 3] = 255;
      }
    }
    return out;
  }

  /** Try something on someone, as the hero (their sheet is the page's): through the talk rules, kept in their memory. */
  talkTo(offer: string, id: string, doer: Doer, hero: Visitor): TalkResult {
    const p = this.talkPerson(id);
    if (!p) return { done: false, reason: 'No one is there.', hidden: false, success: false, lines: [] };
    const c = this.talkCase(hero, id);
    const before = c.memory.social[id]?.mood ?? 0;
    const r = talk(offer, p, doer, c, this.actRng);
    // What it did to their mood goes onto their scale (scaled by the roll's advantages), and leave given is kept.
    talkOntoScale(this.standing, id, before, c.memory.social[id]?.mood ?? 0, r.roll?.advantages ?? 0);
    if (r.leave) giveLeave(this.standing, r.leave, this.worldHours);
    // The ways to take through talk (B3b): lent until tomorrow, given back, given to keep; a failed threat answered.
    const l = (r.borrow ?? r.giveBack ?? r.given) ? this.carry.loose[(r.borrow ?? r.giveBack ?? r.given)!] : null;
    if (l && r.borrow) l.loan = this.worldHours + LOAN_HOURS;
    if (l && r.given) {
      l.mine = true;
      delete l.loan;
    }
    if (l && r.giveBack) {
      shiftRegard(this.standing, id, returnedRegard(regardOf(this.standing, id), l.loan !== undefined));
      this.sendHome(r.giveBack);
    }
    const card = r.answer ? this.cast.find((x) => x.who.id === id) : null;
    const step = card ? answerFor(regardOf(this.standing, id), this.culture, this.whoToThem(card)) : null;
    const says = card && step ? this.startAnswer(card, step) : null;
    if (says) r.lines.push({ text: `${p.name}: "${says}"`, tone: 'bad' });
    if (r.done) {
      this.recentActs.push({ who: doer.id, offer, target: id, skill: r.skill ?? null, success: r.success, hour: this.weather.hour ?? 0 });
      if (this.recentActs.length > 30) this.recentActs.shift();
    }
    return r;
  }

  /** What a talk is about: the hero, the world's flags, the memory, the library, the hero's leads. */
  talkCase(hero: Visitor, person?: string): TalkCase {
    // (The talk rules read each person's mood: a band of the view they hold, B3c.)
    moodsFromScale(this.talkMemory.social, this.standing);
    // What the hero holds, if it is a household's and not given to them (B3b); and whether this person fears them.
    const id = this.carry.held, l = id ? this.carry.loose[id] : null, kind = l ? THINGS.get(l.kind) : null;
    const holding = id && l && kind && l.home.house && !l.mine
      ? { id, name: thingName(kind), house: l.home.house, loan: l.loan ?? null, worth: worthOf('take', kind.value ?? 0, kind.importance ?? 0, this.houseWealth(l.home.house), this.culture) }
      : undefined;
    const card = person ? this.cast.find((c) => c.who.id === person) : null;
    const who = card ? this.whoToThem(card) : null;
    return {
      hero, flags: this.flags, memory: this.talkMemory, library: LIBRARY, leads: { state: this.leads, defs: LEADS, hours: this.worldHours },
      hasLeave: (house) => hasLeave(this.standing, house, this.worldHours),
      ...(holding ? { holding } : {}),
      ...(who ? { nerve: { afraid: who.afraid, bold: who.bold } } : {}),
    };
  }

  // --- owners, the scale and consequences (plan B3c, `core/world3d/standing.ts`) ---

  /** The room at a spot in a house: its number in the house, and its kind (the inn's taproom, a guest room); null outdoors. */
  private roomAt(at: Spot): { n: number; kind: string } | null {
    const place = at.house ? this.houseIndex.byId(at.house) : null;
    if (!place) return null;
    const rooms = this.houseIndex.entry(place).room;
    const p = houseToLocal(place, at.x, at.z);
    let best: { n: number; d: number } | null = null;
    rooms.forEach((r, n) => {
      if (r.level !== at.level) return;
      const q = r.room.rect;
      // (Outside every rect, on a wall or a stair: the nearest room.)
      const d = Math.hypot(Math.max(q.x0 - p.x, 0, p.x - q.x1), Math.max(q.z0 - p.z, 0, p.z - q.z1));
      if (!best || d < best.d) best = { n, d };
    });
    if (!best) return null;
    const n = (best as { n: number }).n;
    return { n, kind: roomKindOf(rooms[n].room.role, place.room ?? 'home', place.spec.plan) };
  }

  /** What the room at a spot welcomes without asking (its kind says: an inn's taproom, sit down, 6 to 24; its guest rooms nothing). */
  private welcomeAt(at: Spot): Welcome | null {
    const r = this.roomAt(at);
    return r && THINGS.has(r.kind) ? THINGS.get(r.kind).welcome ?? null : null;
  }

  /** What a house's main room welcomes (how leave is asked there: a room for the night at the inn). */
  private houseWelcome(house: string): Welcome | null {
    const room = this.layout.houses.find((h) => h.id === house)?.room ?? 'home';
    return THINGS.has(room) ? THINGS.get(room).welcome ?? null : null;
  }

  /** How the hero looks to people (physique, fearsome marks, weapons shown) and their rank: the page sets it from the sheet. */
  heroLook: HeroLook = { physique: 10, marks: 0, weapons: 0, tags: [] };

  /** Who the hero is to one of the map's people: how their people see yours, rank, whether they're afraid or bold. */
  private whoToThem(c: CastCard): WhoToThem {
    const p = this.talkPerson(c.who.id);
    const relation = p ? disposition({ kind: p.kind, tags: p.tags }, this.heroWho, LIBRARY).v : 0;
    return sizeUp(this.heroLook, { physique: c.who.sheet?.attrs.Kroppsbyggnad ?? 10, temper: temperOf(p?.tags ?? []) }, relation, this.culture);
  }

  /** Who the hero is to someone (for tests and the debug hook). */
  whoTo(id: string): WhoToThem | null {
    const c = this.cast.find((x) => x.who.id === id);
    return c ? this.whoToThem(c) : null;
  }

  /**
   * Whose a spot is, for the page to say (plan B3c): the town's, or a house's (its household by name, the kind of room,
   * whether it is open to anyone now, whether the hero has leave); null in the wild.
   */
  whoseAt(at: Spot): { town: true } | { house: string; members: string[]; room: string | null; open: [number, number] | null; leave: boolean } | null {
    if (!at.house) return this.acting.view.housesNear(at.x, at.z, 20) >= 3 ? { town: true } : null;
    const w = this.welcomeAt(at);
    return {
      house: at.house,
      members: this.cast.filter((c) => c.who.home === at.house).map((c) => this.talkPerson(c.who.id)?.name ?? c.who.id),
      room: this.roomAt(at)?.kind ?? null,
      open: w && w.acts.includes('enter') && withinHours(this.weather.hour ?? 12, w.hours) ? w.hours : null,
      leave: hasLeave(this.standing, at.house, this.worldHours),
    };
  }

  /** Told when the hero steps into another room or out of doors (for the page to say whose it is). */
  onEnterPlace: ((at: Spot) => void) | null = null;
  /** The room the hero is in now (house/storey/room), and who has already seen them there while they weren't welcome. */
  private placeKey: string | null = null;
  private readonly sawTrespass = new Set<string>();

  /**
   * Being where you aren't welcome is a wrong too (`enter`): whoever sees the hero in a room that isn't open to them,
   * once a visit. Stepping into another room is told to the page. Run when people look.
   */
  private checkTrespass(): void {
    const at = this.heroSpot(), room = this.roomAt(at);
    const key = at.house && room ? `${at.house}/${at.level}/${room.n}` : null;
    if (key !== this.placeKey) {
      const was = this.placeKey;
      this.placeKey = key;
      this.sawTrespass.clear();
      // (Out of one house's door or into another: not every step round the street.)
      if (key !== null || was !== null) this.onEnterPlace?.(at);
    }
    if (!at.house || !key) return;
    if (mayDo({ owner: { house: at.house }, act: 'enter', member: false, leave: hasLeave(this.standing, at.house, this.worldHours), welcome: this.welcomeAt(at), hour: this.weather.hour ?? 12, culture: this.culture })) return;
    const seen = this.witness([{ act: 'enter', owner: { house: at.house } }], (c) => !this.sawTrespass.has(c.who.id));
    for (const s of seen) {
      this.sawTrespass.add(s.id);
      if (s.says) this.onSpeak?.(s.id, s.name, s.says);
    }
  }

  /** Someone starts answering the hero: the behaviour the culture says, for a while; the line they say, if any. */
  private startAnswer(c: CastCard, step: AnswerStep): string | null {
    c.mind.answer = { id: step.id, left: step.for };
    const says = step.says ?? [];
    return says.length ? says[Math.floor(this.actRng.next() * says.length)] : null;
  }

  /**
   * The hero did wrong (the owner gate said so): everyone who sees the hero now thinks less of them, the owner most,
   * and answers as the culture says for where their view now stands. Returns who saw it, by how much, and what they said.
   */
  private witness(wrongs: readonly Wrong[], only?: (c: CastCard) => boolean): { id: string; name: string; by: number; says: string | null }[] {
    const out: { id: string; name: string; by: number; says: string | null }[] = [];
    for (const c of this.cast) {
      if (!c.mind.senses.sees.includes('hero') || (only && !only(c))) continue;
      let by = 0;
      for (const w of wrongs) by += weightOf(w, this.culture, 'house' in w.owner && c.who.home === w.owner.house);
      if (by <= 0) continue;
      const now = shiftRegard(this.standing, c.who.id, -by);
      const step = answerFor(now, this.culture, this.whoToThem(c));
      const says = step ? this.startAnswer(c, step) : null;
      out.push({ id: c.who.id, name: this.talkPerson(c.who.id)?.name ?? c.who.id, by: Math.round(by), says });
    }
    return out;
  }

  /** What someone thinks of the hero now (for the page on easy, tests and the debug hook). */
  regardOf(id: string): number {
    return regardOf(this.standing, id);
  }

  /** What each of the map's people is answering now (for tests and the debug hook). */
  get answers(): { id: string; answer: string | null }[] {
    return this.cast.map((c) => ({ id: c.who.id, answer: c.mind.answer?.id ?? null }));
  }

  /** Fetching help and handing it over (the `fetch` behaviour): the guard, else the nearest neighbour. */
  private readonly answerHooks: Answers = {
    helperFor: (mind, calling) => {
      const me = mind.actor;
      let best: { id: string; d: number; fits: boolean } | null = null;
      for (const c of this.cast) {
        if (c.mind === mind) continue;
        const fits = PERSON_KINDS.resolve(c.who).chain.includes(calling);
        const d = Math.hypot(c.mind.actor.x - me.x, c.mind.actor.z - me.z);
        if (!best || (fits && !best.fits) || (fits === best.fits && d < best.d)) best = { id: c.who.id, d, fits };
      }
      return best?.id ?? null;
    },
    handOver: (mind, helper) => {
      const c = this.cast.find((x) => x.who.id === helper);
      if (!c) return;
      // The one fetched takes the fetcher's word for it, nearly in full.
      const told = Math.round(regardOf(this.standing, mind.id) * 0.8);
      if (told < regardOf(this.standing, helper)) shiftRegard(this.standing, helper, told - regardOf(this.standing, helper));
      delete mind.answer;
      const says = this.startAnswer(c, this.culture.fetched);
      if (says) this.onSpeak?.(helper, this.talkPerson(helper)?.name ?? helper, says);
    },
  };

  /** People standing together talk of the hero (once an hour a pair): word spreads, good or bad. */
  private gossip(): void {
    const near = this.cast.filter((c) => Math.hypot(c.mind.actor.x - this.hero.x, c.mind.actor.z - this.hero.z) <= MIND_REACH);
    for (let i = 0; i < near.length; i++) {
      for (let j = i + 1; j < near.length; j++) {
        const a = near[i].mind.actor, b = near[j].mind.actor;
        if (a.house !== b.house || (a.house !== null && a.level !== b.level) || Math.hypot(a.x - b.x, a.z - b.z) > MEET_DIST) continue;
        const key = `${near[i].who.id}|${near[j].who.id}`;
        if (this.worldHours - (this.metAt.get(key) ?? -Infinity) < 1) continue;
        this.metAt.set(key, this.worldHours);
        meet(this.standing, near[i].who.id, near[j].who.id);
      }
    }
  }

  // --- leads (plan B11, `core/world3d/leads.ts`): what the hero knows that gives a reason to act ---

  /** The leads the hero has. Saved. */
  leads: LeadsState = {};
  /** Placed things that carry a lead, by thing id. */
  private readonly propLeads = new Map<string, string>();

  /** Give the hero a lead; its title if it is new to them, else null. */
  giveLead(id: string): string | null {
    return giveLead(this.leads, LEADS, id, this.worldHours) ? LEADS[id].title : null;
  }

  /**
   * The hero looks at a thing (taps it): if it carries a lead, they get it (if they hadn't). The lead's title, what it
   * says of the thing (its first line, to show as the look), and whether it was new; null for a thing with no lead.
   */
  lookAt(t: ActTarget): { title: string; look: string; added: boolean } | null {
    const id = this.propLeads.get(t.id);
    if (!id || !LEADS[id]) return null;
    const added = this.giveLead(id) !== null;
    return { title: LEADS[id].title, look: LEADS[id].know, added };
  }

  /** The journal: every lead the hero has, newest first, with what they know, where it stands, and who might care. */
  get journal(): { id: string; title: string; lines: string[]; status: LeadStatus; cares: Cares[] }[] {
    return Object.entries(this.leads)
      .filter(([id]) => LEADS[id])
      .sort((a, b) => b[1].at - a[1].at)
      // (Who might care: those whose answer has not been heard yet.)
      .map(([id, r]) => ({ id, title: LEADS[id].title, lines: [...r.lines], status: leadStatus(LEADS[id], r, this.flags), cares: LEADS[id].answers.filter((_, i) => !r.heard.includes(i)).map((a) => a.who) }));
  }

  /** A person's name as the journal shows "who might care" (one of the map's people), or null. */
  personNamed(id: string): string | null {
    return this.talkPerson(id)?.name ?? null;
  }

  /** The thing a tap points at: right on it (`slack` null), or else within `slack` of its middle; and how far along the ray. */
  private thingAt(ndcX: number, ndcY: number, slack: { x: number; y: number } | null): { t: ActTarget; d: number } | null {
    const inHouse = this.standingOf(this.hero.house);
    const groups: THREE.Object3D[] = [];
    if (inHouse) groups.push(...inHouse.furniture.filter((f) => f.visible));
    else {
      for (const d of this.looseDrawn.values()) if (!d.inst) groups.push(d.g);
      for (const lc of this.chunks.values()) for (const o of lc.standing.objects) if (o.userData.thing) groups.push(o);
      for (const c of this.camps) groups.push(...c.st.objects.filter((o) => o.userData.thing));
    }
    const seenAt = (o: THREE.Object3D): boolean => inHouse !== null || this.seen(o.position.x, o.position.z) >= 0.25;
    const tagged = groups.filter((g) => g.visible && seenAt(g));
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    let best: { g: THREE.Object3D; d: number } | null = null;
    for (const g of tagged) {
      const tag = g.userData.thing as Tagged;
      const hit = ray.intersectObject(tag.pick ?? g, true).find((h) => h.object.visible);
      if (hit && (!best || hit.distance < best.d)) best = { g, d: hit.distance };
    }
    if (best && !inHouse) {
      // A house in front hides it.
      for (const hs of this.houses) {
        const h = ray.intersectObject(hs.group, true).find((x) => x.object.visible);
        if (h && h.distance < best.d - 0.3) return null;
      }
    }
    if (!best && slack) {
      // Near misses: the closest middle on screen within the slack.
      const box = new THREE.Box3(), v = new THREE.Vector3();
      let bestE = 1;
      for (const g of tagged) {
        if ((g.userData.thing as Tagged).exact) continue;
        box.setFromObject(g).getCenter(v).project(this.camera);
        const e = Math.hypot((v.x - ndcX) / slack.x, (v.y - ndcY) / slack.y);
        if (e < bestE) {
          bestE = e;
          best = { g, d: 0 };
        }
      }
    }
    return best ? { t: this.targetOf(best.g), d: best.d } : null;
  }

  /** A tagged group as something to act on, where it stands in the world now. */
  private targetOf(g: THREE.Object3D): ActTarget {
    const tag = g.userData.thing as Tagged, at = g.getWorldPosition(new THREE.Vector3());
    return { id: tag.id, kind: tag.kind, x: at.x, z: at.z, level: tag.level, house: tag.house, rot: tag.rot };
  }

  /** Does a tap point at the hero (within `slack` of their middle on screen)? */
  private heroTapped(ndcX: number, ndcY: number, slack: { x: number; y: number }): boolean {
    const v = this.heroFig.place.getWorldPosition(new THREE.Vector3());
    v.y += 0.8;
    v.project(this.camera);
    return Math.hypot((v.x - ndcX) / slack.x, (v.y - ndcY) / slack.y) < 1;
  }

  /** Where the hero stands, as the rules see a spot. */
  heroSpot(): Spot {
    return { x: this.hero.x, z: this.hero.z, level: this.hero.level, house: this.heroHouse() };
  }

  /** How far the hero is from a thing, metres; Infinity if it is on another storey or in another house. */
  reachTo(t: Spot): number {
    const h = this.heroSpot();
    if (h.house !== t.house || (t.house !== null && h.level !== t.level)) return Infinity;
    return Math.hypot(t.x - h.x, t.z - h.z);
  }

  /** What actions may read and change: the things' states, the world's flags, the weather and the houses. */
  private get acting(): ActWorld {
    const w = this.weather, idx = this.houseIndex;
    return {
      things: THINGS, states: this.states, flags: this.flags, rng: this.actRng, library: LIBRARY, leads: this.leads,
      owners: {
        culture: this.culture,
        members: (house) => this.cast.filter((c) => c.who.home === house).map((c) => c.who.id),
        welcome: (at) => this.welcomeAt(at),
        leave: (doer, house) => doer === 'hero' && hasLeave(this.standing, house, this.worldHours),
        wealth: (house) => this.houseWealth(house),
      },
      holding: (doer) => (doer === 'hero' ? this.holding : null),
      leadStudy: (t) => {
        const id = this.propLeads.get(t.id), def = id ? LEADS[id] : undefined, rec = id ? this.leads[id] : undefined;
        return id && def?.study && rec && !rec.studied ? { lead: id, study: def.study } : null;
      },
      view: {
        rain: w.rain, hour: w.hour ?? 12,
        watchers: this.cast.filter((c) => c.mind.senses.sees.includes('hero')).length,
        housesNear: (x, z, r) => idx.liteNear(x - r, z - r, x + r, z + r).filter((e) => Math.hypot(e.built.place.x - x, e.built.place.z - z) <= r).length,
      },
    };
  }

  /** What can be tried on a thing, or (null) on the spot the doer stands on. */
  offersFor(target: ActTarget | null, doer: Doer): Offer[] {
    return offers(target, target ?? this.heroSpot(), doer, this.acting, ACTIONS);
  }

  /**
   * Do an offer through the frame, as `doer`, and carry out what needs the world: for the hero the clock moves on by
   * what it took, a campfire is built, they sit. Returns what happened, for the page to show (the roll, the lines).
   */
  act(offer: string, target: ActTarget | null, doer: Doer, at: Spot = target ?? this.heroSpot()): ActResult {
    const r = perform(offer, target, at, doer, this.acting, ACTIONS);
    if (r.done) {
      this.recentActs.push({ who: doer.id, offer, target: target?.id ?? null, skill: r.skill ?? null, success: r.success ?? true, hour: this.weather.hour ?? 0 });
      if (this.recentActs.length > 30) this.recentActs.shift();
    }
    const hero = doer.id === 'hero';
    for (const e of r.events) {
      if (e.kind === 'time' && hero && this.weather.hour !== null) this.weather.advance(e.minutes / 60);
      else if (e.kind === 'make' && e.thing === 'campfire') this.lightFire();
      else if (e.kind === 'sit' && hero) this.sitHero(e.target);
      else if (e.kind === 'carry' && hero) this.pickUp(e.target, e.hidden);
      else if (e.kind === 'putdown' && hero) this.putDown();
      else if (e.kind === 'noise') this.makeNoise({ ...e.at, loud: e.loud, kind: e.sound, by: doer.id });
    }
    // A wrong by the hero is answered by whoever saw it (B3c); what the map's people do wrong waits for them to be watched too.
    if (hero && r.wrongs?.length) {
      const seen = this.witness(r.wrongs);
      for (const s of seen) if (s.says) r.events.push({ kind: 'say', line: { text: `${s.name}: "${s.says}"`, tone: 'bad' } });
      if (seen.length) r.events.push({ kind: 'seen', by: seen.map(({ id, name, by }) => ({ id, name, by })) });
    }
    // A lead given is the hero's (someone else learning something waits for what people know).
    if (hero) {
      for (const e of [...r.events]) {
        if (e.kind === 'learn') {
          // What the study taught goes into the lead, true or not: you can't tell which.
          const got = studied(this.leads, LEADS, e.lead, e.truth, this.worldHours);
          for (const text of got?.lines ?? []) r.events.push({ kind: 'say', line: { text } });
          if (got?.next) r.events.push({ kind: 'lead', lead: got.next }, { kind: 'say', line: { text: `Lead added: ${LEADS[got.next].title}.`, tone: 'good' } });
        }
        const title = e.kind === 'lead' ? this.giveLead(e.lead) : null;
        if (title) r.events.push({ kind: 'say', line: { text: `Lead added: ${title}.`, tone: 'good' } });
      }
    }
    return r;
  }

  // --- perception (plan B5): sight rolls, who sees whom, noises heard ---

  /** World time in hours, counting days (for "every six hours"). */
  get worldHours(): number {
    const w = this.weather;
    return w.day * 24 + (w.hour ?? 12);
  }

  /** Roll the hero's sight again now (entering a map, six hours on, waking): Alertness against 8. */
  rerollSight(): SightRoll {
    const { roll, sight } = rollSight(unitsDice(this.alertness), this.actRng, 'Sight');
    this.heroSenses.sight = sight;
    this.heroSenses.rolledAt = this.worldHours;
    this.castAt = null;
    this.onSightRoll?.('hero', roll, sight);
    return sight;
  }

  /** Set the hero's sight as if just rolled (for tests: plain sight, whatever the dice would say). */
  holdSight(sight: SightRoll): void {
    this.heroSenses.sight = { ...sight };
    this.heroSenses.rolledAt = this.worldHours;
    this.castAt = null;
  }

  /** A sound in the world: everyone near enough to hear it (and not the one who made it) notes it. */
  makeNoise(n: Noise): void {
    for (const c of this.cast) {
      const a = c.mind.actor;
      if (c.who.id === n.by || Math.hypot(a.x - this.hero.x, a.z - this.hero.z) > MIND_REACH) continue;
      if (hears(this.whereOf(a), c.who.sheet?.attrs.Vaksamhet ?? 10, n)) noteHeard(c.mind.senses, n);
    }
  }

  private whereOf(a: Actor): Where {
    return { x: a.x, z: a.z, house: a.house, level: a.stair ? 0 : a.level };
  }

  /** The hero's footsteps, a soft noise every few steps (not while sitting). */
  private stepFootsteps(): void {
    const h = this.hero, f = this.stepFrom;
    if (!f || this.seated) {
      this.stepFrom = { x: h.x, z: h.z };
      return;
    }
    if (Math.hypot(h.x - f.x, h.z - f.z) < STEP_EVERY) return;
    this.stepFrom = { x: h.x, z: h.z };
    this.makeNoise({ ...this.whereOf(h), loud: STEPS_LOUD, kind: 'steps', by: 'hero' });
  }

  /** What each of the map's people notices (for tests and the debug hook): their sight, whom they see, what they heard. */
  get senses(): { id: string; sight: SightRoll; sees: string[]; heard: string[] }[] {
    return this.cast.map((c) => ({ id: c.who.id, sight: { ...c.mind.senses.sight }, sees: [...c.mind.senses.sees], heard: c.mind.senses.heard.map((h) => h.kind) }));
  }

  /** One of the map's people looks (their sight rolled when due; the hero seen or not) and lets what they heard fade. */
  private perceive(c: CastCard, dt: number, night: number): void {
    const s = c.mind.senses, a = c.mind.actor, sheet = c.who.sheet;
    if (sightDue(s, this.worldHours)) {
      const rng = new Rng(c.mind.rng);
      const { roll, sight } = rollSight(sheet ? sheetDice(sheet, 'attr:Vaksamhet') : unitsDice(10), rng, 'Sight');
      c.mind.rng = rng.seed;
      s.sight = sight;
      s.rolledAt = this.worldHours;
      this.onSightRoll?.(c.who.id, roll, sight);
    }
    fadeSenses(s, dt);
    const spec = visionOf({ alertness: sheet?.attrs.Vaksamhet ?? 10, night, boost: sightBoost(s.sight), darkSight: Math.min(1, (sheet?.skills['F:Mörkersyn'] ?? 0) / 12) });
    const me = this.whereOf(a), hero = this.whereOf(this.hero);
    // (A carried light is made out at most three times plain range: `lightReach`.)
    const near = Math.hypot(hero.x - me.x, hero.z - me.z) <= spec.range * 3;
    const sees = near && canSee(me, c.facing, spec, hero, this.blockers(Math.min(spec.range * 3, 110), a), night, !!(this.orb || this.hand));
    s.sees = sees ? ['hero'] : [];
  }

  /** What the map's people may do to things: their behaviours act through the same frame as the hero, rolling with their own sheets (plan B4). */
  private readonly acts: Acts = {
    fireOf: (house) => this.fireOf(house),
    lit: (t) => this.fireLit(t),
    act: (mind, offer, t) => this.act(offer, t, this.doerOf(mind.id)),
    // Bringing found things home (the behaviour `tidy`, plan B3b).
    thingAt: (id) => this.whereLoose(id),
    thingHome: (id) => {
      const h = this.carry.loose[id]?.home;
      return h ? { x: h.x, z: h.z, house: h.house, level: h.level } : null;
    },
    lift: (mind, id) => {
      const l = this.carry.loose[id];
      if (!l?.at || l.by || this.carry.held === id) return false;
      this.feetChanged(l.at);
      this.undraw(id);
      l.at = null;
      l.by = mind.id;
      this.showHeld();
      return true;
    },
    putHome: (mind, id) => {
      if (this.carry.loose[id]?.by === mind.id) this.sendHome(id);
    },
  };

  /** Someone in the map as a doer: they roll what their sheet says (nothing, for someone with no sheet). */
  /** Someone's own character sheet (plan B4), their gear in it; null for no one of that name. */
  sheetOf(id: string): RolledSheet | null {
    return this.cast.find((c) => c.who.id === id)?.who.sheet ?? null;
  }

  doerOf(id: string): Doer {
    const sheet = this.cast.find((c) => c.who.id === id)?.who.sheet ?? null;
    return { id, dice: (skill) => (sheet ? sheetDice(sheet, skill) : { n: 0, mod: 0 }), load: sheet?.load ?? 0 };
  }

  /** Set the hero down on a seat: on its top, facing the way it faces, until they walk. */
  private sitHero(t: ActTarget): void {
    const seat = THINGS.get(t.kind).seat;
    if (seat === undefined) return;
    const b = t.house ? this.moves.byId(t.house) : null;
    const floor = b ? this.houseBaseY(b) + b.model.levels[t.level].floorY : this.store.heightAt(t.x, t.z);
    this.seated = { x: t.x, z: t.z, y: floor + seat, floor, yaw: t.rot ?? 0, from: { x: this.hero.x, z: this.hero.z } };
  }

  get sitting(): boolean {
    return this.seated !== null;
  }

  /** A house's fire (its hearth, oven or forge) as something to act on, whether or not the house stands now; null if it has none. */
  fireOf(id: string): ActTarget | null {
    const place = this.houseIndex.byId(id);
    if (!place) return null;
    const e = this.houseIndex.entry(place);
    let out: ActTarget | null = null;
    e.room.forEach((room, ri) => {
      for (const it of room.plan.pieces) {
        const mp = room.models.get(it.id);
        if (!it.fire || !mp) continue;
        const w = houseToWorld(e.built.place, it.x, it.z);
        // (The last fire in the house is its fire, as `standHouse` reads it.)
        out = { id: pieceId(id, ri, it.id), kind: mp.kind, x: w.x, z: w.z, level: room.level, house: id, rot: e.built.place.rot + it.rot };
      }
    });
    return out;
  }

  // --- fights (plan B8a; the rules are `core/combat.ts`, the page runs the rounds: `src/spike3d/fight.ts`) ---

  /**
   * A fight begins between these people (`hero` among them): the clock stops and everyone else stands where they are
   * until it ends. The rules decide each round; the world only walks the fighters, holds their weapons and poses them.
   */
  beginFight(ids: string[]): void {
    this.fighting = new Set(ids);
    this.talkingWith = null;
    for (const id of ids) if (this.canStand(id)) this.fightPoses.set(id, { pose: 'guard', t: this.time });
  }

  /** The fight is over: the world goes on. Those left lying stay down. */
  endFight(): void {
    for (const id of this.fighting ?? []) if (this.fightPoses.get(id)?.pose === 'guard' || this.fightPoses.get(id)?.pose === 'swing') this.fightPoses.delete(id);
    this.fighting = null;
  }

  get inFight(): boolean {
    return this.fighting !== null;
  }

  /** Not knocked out, dying or dead (after a fight). */
  private canStand(id: string): boolean {
    const i = this.hurt[id];
    return !i || (!i.out && !i.dead && !i.dying);
  }

  /** What fights have done to someone (`hero` too); null if nothing yet. */
  injuriesOf(id: string): Injuries | null {
    return this.hurt[id] ? structuredClone(this.hurt[id]) : null;
  }

  /** Someone's injuries after a round: kept (and saved), and they lie down if knocked out, dying or dead. */
  setInjuries(id: string, i: Injuries): void {
    this.hurt[id] = structuredClone(i);
    const lying = i.dead ? 'dead' : i.out || i.dying ? 'down' : null;
    if (lying) this.fightPoses.set(id, { pose: lying, t: this.time });
    else if (this.fightPoses.get(id)?.pose === 'down') this.fightPoses.set(id, { pose: 'guard', t: this.time });
    if (lying) {
      const c = this.cast.find((x) => x.who.id === id);
      if (c) c.mind.actor.legs = [];
      if (id === 'hero') this.hero.legs = [];
    }
  }

  /**
   * Time heals fatigue (Q49): outside a fight, everyone hurt gets a point back every `restMinutes` world minutes,
   * faster when the hero sits; the knocked out get up when it's all gone. With the clock stopped, a real second
   * counts as a world minute so it still comes back.
   */
  private recover(dt: number): void {
    this.restIn += dt;
    if (this.restIn < 0.25) return;
    const secs = this.restIn;
    this.restIn = 0;
    const minutes = this.dayMinutes > 0 ? (secs * 24) / this.dayMinutes : secs;
    for (const [id, i] of Object.entries(this.hurt)) {
      if (i.dead || (i.fatigue <= 0 && !i.out)) continue;
      const per = this.restMinutes / (id === 'hero' && this.seated ? REST_SPEED : 1);
      const next = recoverFatigue(i, minutes, per);
      if (next === i) continue;
      this.hurt[id] = next;
      if (i.out && !next.out) this.fightPoses.delete(id); // up again
    }
  }

  /** A fighter swings (the rules said they strike): the pose plays once and settles back on guard. */
  swing(id: string): void {
    if (this.canStand(id)) this.fightPoses.set(id, { pose: 'swing', t: this.time });
  }

  /** Where a fighter stands now (the hero or one of the map's people). */
  fighterAt(id: string): { x: number; z: number } | null {
    if (id === 'hero') return { x: this.hero.x, z: this.hero.z };
    const a = this.cast.find((c) => c.who.id === id)?.mind.actor;
    return a ? { x: a.x, z: a.z } : null;
  }

  /** Walk a fighter to a spot (the rules said how far they go this round); the paths go round pillars and walls. */
  moveFighter(id: string, x: number, z: number): void {
    if (id === 'hero') {
      this.walkTo(x, z);
      return;
    }
    const a = this.cast.find((c) => c.who.id === id)?.mind.actor;
    if (a) this.moves.walkTo(a, x, z);
  }

  /** Is a fighter still on their way? */
  fighterMoving(id: string): boolean {
    if (id === 'hero') return this.walking;
    return !!this.cast.find((c) => c.who.id === id)?.mind.actor.legs.length;
  }

  /** One of the map's people in a fight: walk where the rules sent them, else face the nearest other fighter; lie still if down. */
  private fightStep(c: CastCard, dt: number): { dx: number; dz: number; moving: boolean } {
    const a = c.mind.actor;
    if (!this.canStand(c.who.id) || !this.fighting?.has(c.who.id)) return { dx: a.dir.x, dz: a.dir.z, moving: false };
    const going = walkOn(c.mind, this.moves, dt, 1.6);
    if (going) return going;
    let foe: { x: number; z: number } | null = null, best = Infinity;
    for (const id of this.fighting) {
      if (id === c.who.id) continue;
      const p = this.fighterAt(id);
      const d = p ? Math.hypot(p.x - a.x, p.z - a.z) : Infinity;
      if (p && d < best) { best = d; foe = p; }
    }
    return foe ? { dx: foe.x - a.x, dz: foe.z - a.z, moving: false } : { dx: a.dir.x, dz: a.dir.z, moving: false };
  }

  /** The weapon someone holds (a loose thing's id and kind): the hero's held thing if it is one, a person's wielded one. */
  wieldedBy(who: string): { id: string; kind: string } | null {
    if (who === 'hero') {
      const id = this.carry.held, l = id ? this.carry.loose[id] : null;
      return id && l && !this.carry.hidden ? { id, kind: l.kind } : null;
    }
    for (const [id, l] of Object.entries(this.carry.loose)) if (l.wield === who) return { id, kind: l.kind };
    return null;
  }

  /**
   * One of the map's people draws their own weapon (a kind of thing, from their sheet's gear) for a fight: it is a loose
   * thing from now on, theirs, held in their hand, and saved. Already drawn, or lost (lying somewhere), nothing changes.
   */
  drawWeapon(who: string, kind: string): string | null {
    const id = `${who}:weapon`;
    if (this.carry.loose[id]) return this.carry.loose[id].wield === who ? id : null;
    const a = this.cast.find((c) => c.who.id === who)?.mind.actor;
    if (!a || !THINGS.has(kind)) return null;
    this.carry.loose[id] = { kind, seed: 1, home: { x: a.x, z: a.z, level: 0, house: null, rot: 0, room: null }, at: null, wield: who };
    this.showHeld();
    return id;
  }

  /** What kind a loose thing (or one the map laid) is, by its id. */
  thingKind(id: string): string | null {
    return this.carry.loose[id]?.kind ?? this.layout.props.find((p) => placedId(p) === id)?.kind ?? null;
  }

  /** Weapons lying on the ground outdoors within `r` metres of a spot: moved ones where they lie, and the map's own not yet touched. */
  weaponsLying(x: number, z: number, r: number): { id: string; kind: string; x: number; z: number }[] {
    const out: { id: string; kind: string; x: number; z: number }[] = [];
    const near = (px: number, pz: number) => Math.hypot(px - x, pz - z) <= r;
    for (const [id, l] of Object.entries(this.carry.loose)) if (l.at && !l.at.house && THINGS.get(l.kind).weapon && near(l.at.x, l.at.z)) out.push({ id, kind: l.kind, x: l.at.x, z: l.at.z });
    for (const p of this.layout.props) {
      const id = placedId(p);
      if (!this.carry.loose[id] && THINGS.has(p.kind) && THINGS.get(p.kind).weapon && near(p.x, p.z)) out.push({ id, kind: p.kind, x: p.x, z: p.z });
    }
    return out;
  }

  /** What someone holds falls to the ground at a spot (a blow made them drop it, or they fell). */
  dropAt(who: string, id: string, x: number, z: number): void {
    const l = this.carry.loose[id];
    if (!l) return;
    if (who === 'hero' && this.carry.held === id) {
      this.carry.held = null;
      this.carry.hidden = false;
    }
    if (l.wield === who) delete l.wield;
    l.at = { x, z, level: 0, house: null, rot: Math.atan2(x - (this.fighterAt(who)?.x ?? x), z - (this.fighterAt(who)?.z ?? z)) };
    this.showHeld();
    this.drawLoose(id, l);
  }

  /** Someone takes up a thing lying near them as their weapon (a side action in a fight): it leaves the ground for their hand. */
  takeUp(who: string, id: string): void {
    let l = this.carry.loose[id];
    if (!l) {
      // Something the map laid there, never moved yet.
      const p = this.layout.props.find((q) => placedId(q) === id);
      if (!p) return;
      l = this.carry.loose[id] = { kind: p.kind, seed: p.seed ?? 0, home: { x: p.x, z: p.z, level: 0, house: null, rot: p.rot ?? 0, room: null }, at: null };
      this.removePiece(id);
    } else {
      if (!l.at) return;
      this.undraw(id);
      l.at = null;
    }
    if (who === 'hero') {
      this.carry.held = id;
      this.carry.hidden = false;
    } else l.wield = who;
    this.showHeld();
  }

  // --- taking and carrying (plan B3b, `core/world3d/carry.ts`) ---

  /** How fast the hero walks: something held in both hands slows them. */
  private get carryPace(): number {
    return this.carry.held && !this.carry.hidden && !this.inHand.has('hero') ? CARRY_PACE : 1;
  }

  /** What the hero holds (its kind), or null. */
  get holding(): string | null {
    const id = this.carry.held;
    return id ? this.carry.loose[id]?.kind ?? null : null;
  }

  /** How well off a household is, from its people's facets (rich, poor). */
  private houseWealth(house: string) {
    return wealthOf(this.cast.filter((c) => c.who.home === house).flatMap((c) => this.talkPerson(c.who.id)?.tags ?? []));
  }

  /**
   * A thing to pick up, as a loose thing: one already moved, a piece of furniture (its model's seed and variant, and its
   * home), or something the map laid outdoors that has a model (a sword on the sand; its home is the wild, no one's).
   */
  private looseOf(t: ActTarget): Loose | null {
    const have = this.carry.loose[t.id];
    if (have) return have;
    if (t.house === null) {
      const p = this.layout.props.find((q) => placedId(q) === t.id);
      if (!p || !modelOf(THINGS.get(p.kind))) return null;
      return { kind: p.kind, seed: p.seed ?? 0, home: { x: p.x, z: p.z, level: 0, house: null, rot: p.rot ?? 0, room: null }, at: null };
    }
    const [house, ri, piece] = t.id.split('/');
    const place = house && piece ? this.houseIndex.byId(house) : null;
    const mp = place ? this.houseIndex.entry(place).room[Number(ri)]?.models.get(piece) : undefined;
    if (!mp) return null;
    return { kind: t.kind, seed: mp.seed, ...(mp.variant ? { variant: mp.variant } : {}), home: { x: t.x, z: t.z, level: t.level, house: t.house, rot: t.rot ?? 0, room: Number(ri) }, at: null };
  }

  /** Where the hero is, as how far a carried thing has gone asks it. */
  private carryStageNow(l: Loose): Stage {
    const at = this.heroSpot();
    return stageOf(l.home, { house: at.house, room: at.house ? this.roomAt(at)?.n ?? null : null });
  }

  /** The hero picks a thing up: it leaves where it was and is held (in their arms, or out of sight). */
  private pickUp(t: ActTarget, hidden: boolean): boolean {
    const l = this.looseOf(t);
    if (!l || l.by) return false;
    this.feetChanged(l.at ?? l.home);
    l.at = null;
    this.carry.loose[t.id] = l;
    this.carry.held = t.id;
    this.carry.hidden = hidden;
    this.sawCarry.clear();
    this.carryStage = this.carryStageNow(l);
    this.undraw(t.id);
    this.removePiece(t.id);
    this.showHeld();
    return true;
  }

  /** The hero puts down what they hold, just in front of them, turned the way they face. */
  private putDown(): boolean {
    const id = this.carry.held, l = id ? this.carry.loose[id] : null;
    if (!id || !l) return false;
    const yaw = this.heroFig.want, s = this.heroSpot();
    // (Far enough ahead that the hero isn't standing in it once it stops feet.)
    const ahead = PUT_DOWN_AHEAD + (modelOf(THINGS.get(l.kind))?.d ?? 0) / 2;
    l.at = { x: s.x + Math.sin(yaw) * ahead, z: s.z + Math.cos(yaw) * ahead, level: s.level, house: s.house, rot: yaw };
    this.carry.held = null;
    this.carry.hidden = false;
    this.showHeld();
    this.drawLoose(id, l);
    this.feetChanged(l.at);
    return true;
  }

  /** A thing goes back where it belongs (given back, or brought home by someone): drawn there, in no one's hands. */
  private sendHome(id: string): void {
    const l = this.carry.loose[id];
    if (!l) return;
    if (this.carry.held === id) {
      this.carry.held = null;
      this.carry.hidden = false;
    }
    delete l.by;
    delete l.loan;
    this.feetChanged(l.at);
    l.at = { x: l.home.x, z: l.home.z, level: l.home.level, house: l.home.house, rot: l.home.rot };
    this.showHeld();
    this.drawLoose(id, l);
    this.feetChanged(l.at);
  }

  /** Draw a loose thing where it lies: in its house's group (if the house stands now), or on the ground. */
  private drawLoose(id: string, l: Loose): void {
    this.undraw(id);
    const at: LooseSpot | null = l.at, model = modelOf(THINGS.get(l.kind));
    if (!at || !model) return;
    const g = thingGroup(model.draw(l.seed, l.variant));
    g.userData.thing = { id, kind: l.kind, house: at.house, level: at.level, rot: at.rot } satisfies Tagged;
    if (at.house) {
      const inst = this.houses.find((hs) => hs.built.place.id === at.house);
      if (!inst) return;
      const h = inst.built.place, p = houseToLocal(h, at.x, at.z);
      g.position.set(p.x, inst.built.model.levels[at.level]?.floorY ?? 0, p.z);
      g.rotation.y = at.rot - h.rot;
      inst.group.add(g);
      inst.furniture.push(g);
      inst.furnLevel.push(at.level);
      this.looseDrawn.set(id, { g, inst });
    } else {
      g.position.set(at.x, this.store.heightAt(at.x, at.z), at.z);
      g.rotation.y = at.rot;
      this.scene.add(g);
      this.looseDrawn.set(id, { g, inst: null });
    }
  }

  /** Take a drawn piece of furniture out of the world (and out of its house's list). */
  private dropPiece(g: THREE.Object3D, inst: HouseInst | null): void {
    g.removeFromParent();
    if (inst) {
      const i = inst.furniture.indexOf(g);
      if (i >= 0) {
        inst.furniture.splice(i, 1);
        inst.furnLevel.splice(i, 1);
      }
    }
    g.traverse((o) => {
      const geo = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      if (geo && !geo.userData.shared) geo.dispose();
    });
  }

  private undraw(id: string): void {
    const d = this.looseDrawn.get(id);
    if (!d) return;
    this.looseDrawn.delete(id);
    this.dropPiece(d.g, d.inst);
  }

  /** The piece as the room's plan placed it, if its house stands now (once moved, it is drawn as a loose thing instead). */
  private removePiece(id: string): void {
    for (const hs of this.houses) {
      const g = hs.furniture.find((f) => (f.userData.thing as Tagged | undefined)?.id === id);
      if (g) this.dropPiece(g, hs);
    }
    // (Or something the map laid outdoors, as its chunk stood it up.)
    for (const lc of this.chunks.values()) {
      const objs = lc.standing.objects, i = objs.findIndex((o) => (o.userData.thing as Tagged | undefined)?.id === id && !this.isLoose(o));
      if (i >= 0) this.dropPiece(objs.splice(i, 1)[0], null);
    }
  }

  /** Is this drawn group a loose thing (drawn where it lies now), not the map's own placing of it? */
  private isLoose(g: THREE.Object3D): boolean {
    for (const d of this.looseDrawn.values()) if (d.g === g) return true;
    return false;
  }

  /** The figure of the hero or one of the map's people. */
  private figureOf(id: string): Figure | null {
    return id === 'hero' ? this.heroFig : this.cast.find((c) => c.who.id === id)?.fig ?? null;
  }

  /** Who holds what, openly: the hero (unless out of sight), the map's people carrying found things home, and their weapons. */
  private holds(): Map<string, Loose> {
    const out = new Map<string, Loose>();
    const id = this.carry.held, l = id ? this.carry.loose[id] : null;
    if (l && !this.carry.hidden) out.set('hero', l);
    for (const x of Object.values(this.carry.loose)) {
      if (x.by) out.set(x.by, x);
      if (x.wield) out.set(x.wield, x);
    }
    return out;
  }

  /**
   * What is held: something with a grip (a sword) in the right hand, at the hand's grip, the blade out along the
   * forearm's front; anything else in the holders' arms (the carrying pose: `stepFigures`), in front of the chest,
   * smaller than life so the body still shows.
   */
  private showHeld(): void {
    for (const g of this.heldGs.values()) this.dropPiece(g, null);
    this.heldGs.clear();
    this.inHand.clear();
    for (const [who, l] of this.holds()) {
      const model = modelOf(THINGS.get(l.kind)), fig = this.figureOf(who);
      if (!model || !fig) continue;
      const g = thingGroup(model.draw(l.seed, l.variant));
      if (model.grip !== undefined) {
        // The model's length (x) out along the forearm's front (z), its up (y) to the side (x).
        const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
        g.quaternion.setFromRotationMatrix(m);
        g.position.copy(new THREE.Vector3(model.grip, 0.02, 0).applyMatrix4(m).negate());
        fig.rig.hand.add(g);
        this.inHand.add(who);
      } else {
        const s = Math.min(1, HELD_SIZE / Math.max(model.w, model.d)), H = fig.rig.model.height;
        g.scale.setScalar(s);
        g.position.set(0, HELD_Y * H, HELD_AHEAD * H + (model.d * s) / 2);
        fig.rig.group.add(g);
      }
      this.heldGs.set(who, g);
    }
  }

  /** The floor footprints of a house's furniture on a storey, house-local, for walking: the plan's pieces not moved, and loose things lying there. */
  private furnitureRects(b: BuiltHouse, level: number): { x: number; z: number; hw: number; hd: number }[] {
    const out: { x: number; z: number; hw: number; hd: number }[] = [];
    this.houseIndex.entry(b.place).room.forEach((r, ri) => {
      if (r.level !== level) return;
      for (const f of footprints(r.plan)) if (!this.carry.loose[pieceId(b.place.id, ri, f.id)]) out.push(f);
    });
    for (const l of Object.values(this.carry.loose)) {
      const model = modelOf(THINGS.get(l.kind));
      if (!model || l.at?.house !== b.place.id || l.at.level !== level) continue;
      const p = houseToLocal(b.place, l.at.x, l.at.z);
      out.push({ x: p.x, z: p.z, ...turnedHalf(model.w, model.d, l.at.rot - b.place.rot) });
    }
    return out;
  }

  /** Loose things lying out of doors in a rectangle, as what stops feet. */
  private looseOutdoors(x0: number, z0: number, x1: number, z1: number): Shape[] {
    const out: Shape[] = [];
    for (const l of Object.values(this.carry.loose)) {
      const at = l.at, model = modelOf(THINGS.get(l.kind));
      if (!at || at.house || !model || at.x < x0 - 2 || at.x > x1 + 2 || at.z < z0 - 2 || at.z > z1 + 2) continue;
      out.push({ kind: 'box', x: at.x, z: at.z, hw: model.w / 2, hd: model.d / 2, rot: at.rot });
    }
    return out;
  }

  /** A thing left a spot or came to one: walking there is worked out again (the ground's grid there, a house's upper storeys). */
  private feetChanged(at: { x: number; z: number; house: string | null; level: number } | null): void {
    if (!at) return;
    if (at.house && at.level > 0) this.moves.forgetHouse(at.house);
    else this.nav.invalidate(at.x - 1.5, at.z - 1.5, at.x + 1.5, at.z + 1.5);
  }

  /** Everything loose drawn again from `carry` (a loaded game): the plan's pieces that moved go, the loose ones come. */
  private redrawLoose(): void {
    for (const id of [...this.looseDrawn.keys()]) this.undraw(id);
    // (Walking is worked out again everywhere: what stops feet may lie elsewhere now.)
    this.nav.forget(() => false);
    for (const [id, l] of Object.entries(this.carry.loose)) {
      // Someone was carrying it home when the game was saved: it got there.
      if (l.by) {
        delete l.by;
        l.at = { x: l.home.x, z: l.home.z, level: l.home.level, house: l.home.house, rot: l.home.rot };
      }
      for (const h of [l.home.house, l.at?.house]) if (h) this.moves.forgetHouse(h);
      this.removePiece(id);
      this.drawLoose(id, l);
    }
    this.showHeld();
    const id = this.carry.held, l = id ? this.carry.loose[id] : null;
    this.carryStage = l ? this.carryStageNow(l) : 'home';
    this.sawCarry.clear();
  }

  /**
   * What the hero carries openly, as people see it (run when people look): carried out of its room is *move*, out of
   * its house *take*, for whoever sees it cross; once it is out, its household know it whenever they see it with you.
   * Something held out of sight is never noticed. Lines said go to the page.
   */
  private checkCarry(): void {
    const id = this.carry.held, l = id ? this.carry.loose[id] : null;
    if (!id || !l || this.carry.hidden || !l.home.house || l.mine) return;
    const house = l.home.house, kind = THINGS.get(l.kind);
    const stage = this.carryStageNow(l), was = this.carryStage;
    this.carryStage = stage;
    // (Lent to you: no wrong until it is due.)
    const lent = l.loan !== undefined && this.worldHours < l.loan;
    const wrongs = (act: ActKind): Wrong[] =>
      lent || mayDo({ owner: { house }, act, member: false, leave: hasLeave(this.standing, house, this.worldHours), welcome: null, hour: this.weather.hour ?? 12, culture: this.culture })
        ? []
        : [{ act, owner: { house }, worth: worthOf(act, kind.value ?? 0, kind.importance ?? 0, this.houseWealth(house), this.culture) }];
    const answer = (act: ActKind, only: (c: CastCard) => boolean, fallback: string | null): void => {
      const ws = wrongs(act);
      if (!ws.length) return;
      for (const s of this.witness(ws, (c) => only(c) && !this.sawCarry.has(`${c.who.id}:${stage}`))) {
        this.sawCarry.add(`${s.id}:${stage}`);
        const says = s.says ?? fallback;
        if (says) this.onSpeak?.(s.id, s.name, says);
      }
    };
    const act = actOfStage(stage);
    if (act && STAGE_RANK[stage] > STAGE_RANK[was]) answer(act, () => true, null);
    if (stage === 'out') answer('take', (c) => c.who.home === house, `That's our ${thingName(kind)}!`);
  }

  /** Where a loose thing is now: where it lies, or where whoever holds it stands. */
  private whereLoose(id: string): { x: number; z: number; house: string | null; level: number } | null {
    const l = this.carry.loose[id];
    if (!l) return null;
    if (l.at) return l.at;
    if (this.carry.held === id) return this.heroSpot();
    const m = l.by ? this.cast.find((c) => c.who.id === l.by)?.mind.actor : null;
    return m ? { x: m.x, z: m.z, house: m.house, level: m.stair ? 0 : m.level } : null;
  }

  /**
   * A loan falls due: if the thing isn't home by then, its household know it was kept, seen or not, and think of it
   * as taken (B3b). Back home in time, the loan just ends. Lines said go to the page.
   */
  private checkLoans(): void {
    for (const [id, l] of Object.entries(this.carry.loose)) {
      if (l.loan === undefined || this.worldHours < l.loan || !l.home.house) continue;
      delete l.loan;
      const at = this.whereLoose(id);
      const home = at && stageOf(l.home, { house: at.house, room: at.house ? this.roomAt(at)?.n ?? null : null }) === 'home';
      if (home) continue;
      const kind = THINGS.get(l.kind), house = l.home.house;
      const w: Wrong = { act: 'take', owner: { house }, worth: worthOf('take', kind.value ?? 0, kind.importance ?? 0, this.houseWealth(house), this.culture) };
      for (const c of this.cast.filter((x) => x.who.home === house)) shiftRegard(this.standing, c.who.id, -weightOf(w, this.culture, true));
      this.onNote?.(`The ${thingName(kind)} you borrowed was due back. Its owners count it as taken.`);
      // (It's theirs again in their minds now: carried openly, they know it.)
      this.sawCarry.clear();
      if (this.carry.held === id) this.carryStage = 'home';
    }
  }

  /**
   * Someone near a thing lying out of place brings it home: its own household always, anyone who likes order
   * (`content/people/order.ts`) whatever its household. Run when people look; they set about it by the behaviour `tidy`.
   */
  private findStrays(): void {
    const loose = Object.entries(this.carry.loose).filter(([, l]) => l.at && stray(l, { house: l.at.house, room: l.at.house ? this.roomAt(l.at)?.n ?? null : null }));
    if (!loose.length) return;
    const busy = new Set(this.cast.flatMap((c) => (c.mind.tidy ? [c.mind.tidy.thing] : [])));
    for (const c of this.cast) {
      const a = c.mind.actor;
      if (c.mind.tidy || c.mind.answer || this.talkingWith === c.who.id) continue;
      const tidy = orderly(PERSON_KINDS.resolve(c.who).chain);
      for (const [id, l] of loose) {
        const at = l.at!;
        if (busy.has(id) || (!tidy && c.who.home !== l.home.house)) continue;
        if (at.house !== a.house || (at.house !== null && at.level !== a.level) || Math.hypot(at.x - a.x, at.z - a.z) > TIDY_REACH) continue;
        c.mind.tidy = { thing: id };
        busy.add(id);
        break;
      }
    }
  }

  /** Put the hero down at a spot (a loaded game): on storey `level` if the spot is in a house that has one. */
  placeHeroAt(x: number, z: number, level = 0): void {
    const h = this.hero;
    h.x = x;
    h.z = z;
    h.legs = [];
    h.house = null;
    h.level = 0;
    h.foot = null;
    h.stair = null;
    this.moves.settle(h);
    const b = this.moves.house(h);
    if (b && level > 0 && level < b.model.levels.length) h.level = level;
    this.focus.x = x;
    this.focus.z = z;
    this.placeHero();
  }

  /** What the save keeps of the world (the page adds the map and writes it: `core/world3d/save.ts`). */
  saveState(): { hour: number; hero: { x: number; z: number; level: number }; explored: Record<string, string>; things: StatesJSON; flags: Record<string, boolean>; talk: TalkMemory; leads: LeadsState; standing: HeroStanding; carry: CarryState; hurt: Record<string, Injuries> } {
    const h = this.hero;
    return { hour: this.weather.hour ?? 12, hero: { x: h.x, z: h.z, level: h.stair ? 0 : h.level }, explored: this.explored.toJSON(), things: this.states.toJSON(), flags: { ...this.flags }, talk: structuredClone(this.talkMemory), leads: structuredClone(this.leads), standing: structuredClone(this.standing), carry: structuredClone(this.carry), hurt: structuredClone(this.hurt) };
  }

  /** Take a save back: the clock, the hero, what was seen, the things' states, what they know, what was moved. */
  loadState(s: { hour: number; hero: { x: number; z: number; level: number }; explored: Record<string, string>; things: StatesJSON; flags?: Record<string, boolean>; talk?: TalkMemory; leads?: LeadsState; standing?: HeroStanding; carry?: CarryState; hurt?: Record<string, Injuries> }): void {
    this.flags = { ...s.flags };
    // What fights left: those knocked out or killed lie where they fell (B8a).
    this.hurt = s.hurt ? structuredClone(s.hurt) : {};
    this.fightPoses.clear();
    for (const [id, i] of Object.entries(this.hurt)) if (i.dead || i.out || i.dying) this.fightPoses.set(id, { pose: i.dead ? 'dead' : 'down', t: 0 });
    this.carry = s.carry ? structuredClone(s.carry) : newCarry();
    this.standing = s.standing ? structuredClone(s.standing) : newStanding();
    this.talkMemory = s.talk ? structuredClone(s.talk) : newTalkMemory();
    this.leads = s.leads ? structuredClone(s.leads) : {};
    this.weather.setHour(s.hour);
    this.heroSenses.rolledAt = null; // (back in the map: sight is rolled again)
    this.explored.assign(s.explored);
    this.exploredWin.dirty = true;
    this.states.assign(s.things);
    this.placeHeroAt(s.hero.x, s.hero.z, s.hero.level);
    this.redrawLoose();
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
      const hp = this.heroFig.place.position, dl = Math.hypot(this.heroDir.x, this.heroDir.z) || 1;
      for (const s of [1.5, 3.5, 5.5, 7.5]) out.push({ x: hp.x + (this.heroDir.x / dl) * s, z: hp.z + (this.heroDir.z / dl) * s, kind: 'light', weight: 0.6 });
    }
    return out;
  }

  private stepMagicLights(): void {
    const hp = this.heroFig.place.position;
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

  /** Each person's body turns the way they go and walks while they move (the walk's loop follows the ground covered). */
  private stepFigures(dt: number): void {
    for (const p of this.people) {
      const f = p.fig, at = f.place.position;
      if (!f.place.visible) continue;
      const dx = at.x - f.lastX, dz = at.z - f.lastZ, d = Math.hypot(dx, dz);
      f.lastX = at.x;
      f.lastZ = at.z;
      // A jump (a load, a teleport) is not a step.
      if (d > 0.001 && d < 1) {
        f.want = Math.atan2(dx, dz);
        f.phase += d / f.rig.model.stride;
        f.still = 0;
      } else f.still += dt;
      // The hero on a seat: set down so the hips rest on it, facing the way it faces.
      const seat = p.id === 'hero' ? this.seated : null;
      if (seat) {
        f.place.position.set(seat.x, seat.y + 0.04 - f.rig.model.joints.root.at[1], seat.z);
        f.lastX = seat.x;
        f.lastZ = seat.z;
        f.want = seat.yaw;
        f.still = 1;
        this.heroBlob.position.set(seat.x, seat.floor + 0.03, seat.z);
      }
      f.yaw += wrapAngle(f.want - f.yaw) * (1 - Math.exp(-dt / 0.08));
      f.rig.group.rotation.y = f.yaw;
      const legs = seat ? cyclePose(SIT, this.time / IDLE_SECONDS) : f.still < 0.15 ? cyclePose(WALK, f.phase) : cyclePose(IDLE, this.time / IDLE_SECONDS);
      // Holding something: the arms carry it, or the right hand holds it up (a sword), whatever the legs do (B3b, B8a).
      const pose = this.inHand.has(p.id) ? wielding(legs) : this.heldGs.has(p.id) ? carrying(legs) : legs;
      // In a fight, or left lying after one: on guard, a swing, or laid on their back (B8a).
      const fp = this.fightPoses.get(p.id);
      const lying = fp?.pose === 'down' || fp?.pose === 'dead';
      f.rig.group.rotation.order = 'YXZ';
      f.rig.group.rotation.x = lying ? -Math.PI / 2 : 0;
      f.rig.group.position.y = lying ? 0.12 : 0;
      f.rig.pose(fp ? fightPose(pose, fp.pose, this.time - fp.t) : pose);
      f.rig.setShells(Math.min(2, this.settings.shells));
    }
  }

  /** Turn the view by `rad` (positive: the world turns clockwise on screen), round what it looks at. */
  turn(rad: number): void {
    this.yaw = wrapAngle(this.yaw + rad);
  }

  update(dtMs: number): void {
    const dt = Math.min(0.1, dtMs / 1000);
    this.time += dt;
    if (this.turnInput) this.turn(this.turnInput * TURN_SPEED * dt);
    const w = this.weather;
    if (this.dayMinutes > 0 && !this.fighting) w.advance((dt * 24) / (this.dayMinutes * 60));
    if (!this.fighting) this.recover(dt);
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
    // Sight is rolled (plan B5): on entering the map, and every six world hours.
    if (sightDue(this.heroSenses, this.worldHours)) this.rerollSight();
    if (this.vision.outer > 0) {
      this.facing = turnToward(this.facing, Math.atan2(this.heroDir.z, this.heroDir.x), 7 * dt);
      this.spec = visionOf({ alertness: this.alertness, night: env.night, cap: this.vision.outer, light: this.orb || this.hand ? 1 : 0, boost: sightBoost(this.heroSenses.sight), darkSight: this.darkSight });
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
      // The outer walls that face the camera go (from any side); the far ones stay.
      for (const c of hs.cut) {
        const gone = hs.open && (hs.view <= c.level || (c.side !== null && hs.view <= c.facing && facesCamera(c.side, hs.built.place.rot, this.yaw)));
        c.t += ((gone ? 1 : 0) - c.t) * cutK;
        c.mesh.material.opacity = 1 - c.t;
        c.mesh.visible = c.t < 0.98;
      }
      hs.furniture.forEach((f, i) => { f.visible = hs.cutT > 0.02 && hs.furnLevel[i] === hs.view; });
    }
    for (const s of this.shells) s.mesh.visible = s.layer <= this.settings.shells && (!s.cutOf || s.cutOf.cutT < 0.3);
    // What is fixed to the outside of the house the hero is in (its door torch) goes with the cut-away: not logical, but the room reads better.
    for (const [o, id] of this.fixedTo) o.visible = !this.outFlames.has(o) && !this.houses.some((hs) => hs.open && hs.built.place.id === id);

    this.stepCast(dt, env.night);
    this.stepHero(dt);
    this.stepFootsteps();
    this.focus.y = 0.5 + this.focusLift;
    if (this.follow) {
      const k = 1 - Math.exp(-dt / 0.25);
      this.focus.x += (this.hero.x - this.focus.x) * k;
      this.focus.z += (this.hero.z - this.focus.z) * k;
    }
    this.stepFigures(dt);

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
      // Not the smoke of the house the hero is in: it would hang over the cut-away room (it thins away rather than cutting off).
      if (!c || hs.open) continue;
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
    for (const k of this.camps) if (this.fireLit({ id: placedId(k.p), kind: k.p.kind })) sm.push({ c: k.smoke, d: Math.hypot(k.p.x - this.focus.x, k.p.z - this.focus.z) });
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
      x: c.mind.actor.x, z: c.mind.actor.z, house: c.mind.actor.house, shown: c.fig.place.visible,
    }));
  }

  /**
   * The map's people follow their schedules (`core/world3d/behave.ts`): the line whose `when` holds is what they do,
   * by a behaviour from `content/behaviours`. Someone far from both the view and the hero waits. Someone is drawn only
   * when the hero could see them: outdoors by sight, indoors when the hero is in the same house on the same storey.
   */
  private stepCast(dt: number, night: number): void {
    const sees = (x: number, z: number): boolean => this.vision.outer <= 0 || this.seen(x, z) >= 0.25;
    const whereIs = (id: string): { x: number; z: number; house: string | null; level: number } | null => {
      if (id === 'hero') return { x: this.hero.x, z: this.hero.z, house: this.hero.house, level: this.hero.stair ? 0 : this.hero.level };
      const o = this.cast.find((x) => x.who.id === id);
      return o ? { x: o.mind.actor.x, z: o.mind.actor.z, house: o.mind.actor.house, level: o.mind.actor.level } : null;
    };
    const ctx = { walking: this.moves, places: this.places, clock: this.clock, acts: this.acts, whereIs, answers: this.answerHooks };
    // (People look and listen a few times a second, not every frame.)
    this.perceiveIn -= dt;
    // (While a fight lasts, no one looks about or gossips: the world waits.)
    const look = this.perceiveIn <= 0 && !this.fighting;
    if (look) {
      this.perceiveIn = PERCEIVE_EVERY;
      this.gossip();
      this.checkTrespass();
      this.checkCarry();
      this.checkLoans();
      this.findStrays();
      // (Views fade back toward nothing, a little each world day: Q44.)
      fadeStanding(this.standing, this.weather.day, this.culture);
    }
    for (const c of this.cast) {
      const a = c.mind.actor;
      const far = Math.hypot(a.x - this.focus.x, a.z - this.focus.z) > MIND_REACH && Math.hypot(a.x - this.hero.x, a.z - this.hero.z) > MIND_REACH;
      if (far) {
        c.fig.place.visible = c.blob.visible = c.mark.visible = false;
        continue;
      }
      if (look) this.perceive(c, PERCEIVE_EVERY, night);
      fadeAnswer(c.mind, dt);
      // Someone the hero is talking to stands and faces them; their day waits until the talk ends.
      const pose = this.fighting || this.hurt[c.who.id]?.out || this.hurt[c.who.id]?.dead
        ? this.fightStep(c, dt)
        : c.who.id === this.talkingWith
          ? { dx: this.hero.x - a.x, dz: this.hero.z - a.z, moving: false }
          : stepMind(c.mind, c.who.does, BEHAVIOURS, ctx, dt);
      if (Math.abs(pose.dx) + Math.abs(pose.dz) > 1e-6) c.facing = turnToward(c.facing, Math.atan2(pose.dz, pose.dx), 7 * dt);
      const y = this.footY(a);
      this.faceWalker(c.fig, pose.dx, pose.dz, pose.moving);
      c.fig.place.position.set(a.x, y, a.z);
      c.blob.position.set(a.x, y + 0.03, a.z);
      // (Indoors the roof is lifted only while the hero is in there, on the storey they look at.)
      const hs = a.house ? this.standingOf(a.house) : null;
      const shown = a.house ? !!hs && hs.open && hs.view === a.level : sees(a.x, a.z);
      c.fig.place.visible = c.blob.visible = shown;
      // On easy: an eye over whoever sees the hero, a question mark over whoever heard something lately. Over anyone
      // near, even someone the hero can't see (in the dark, behind a wall): just the mark, floating (Q43).
      const s = c.mind.senses, heard = lastHeard(s, 'any');
      const near = shown || Math.hypot(a.x - this.hero.x, a.z - this.hero.z) <= MARK_REACH;
      const mark = !this.showSenses || !near ? null : s.sees.includes('hero') ? this.markMats.eye : heard && heard.left > HEARD_SHOWN ? this.markMats.heard : null;
      c.mark.visible = mark !== null;
      if (mark) {
        c.mark.material = mark;
        c.mark.position.set(a.x, y + 2.4, a.z);
      }
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
