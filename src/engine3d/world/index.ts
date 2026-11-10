import * as THREE from 'three';
import { type FurnishedRoom, furnishHouse } from '../../content/furnish';
import { mapNamed } from '../../content/maps';
import { HERO_PERSON, streamingFilamentWorld } from '../../content/spike3d';
import { THINGS } from '../../content/things';
import type { CompiledMap } from '../../core/world3d/mapgen';
import { type FSource, FilamentField, HEARTH_FIRE } from '../../core/world3d/filaments3d';
import { TerrainStore } from '../../core/world3d/chunks';
import type { Environment3D } from '../../core/world3d/environment3d';
import { Rng } from '../../core/rng';
import { type BuiltHouse, type Layout, furnitureObstacles, houseBox, houseToLocal, houseToWorld, levelWalls } from '../../core/world3d/layout';
import { Explored } from '../../core/world3d/explored';
import { type StatesJSON, ThingStates, pieceId } from '../../core/world3d/state';
import type { Spot } from '../../core/world3d/actions';
import type { Injuries } from '../../core/damage';
import type { LeadsState } from '../../core/world3d/leads';
import { sightBoost } from '../../core/world3d/perceive';
import type { Visitor } from '../../core/skillweb';
import { type CultureDef, type Standing as HeroStanding, newStanding } from '../../core/world3d/standing';
import { type CarryState, newCarry } from '../../core/world3d/carry';
import { type TalkMemory, newTalkMemory } from '../../core/world3d/talk';
import { cultureOf } from '../../content/cultures';
import { PlacedIndex } from '../../core/world3d/placed';
import { HouseIndex } from '../../core/world3d/houses';
import { type Actor, Walking, newActor } from '../../core/world3d/actors';
import { NavGrid, type P2, shapeDist } from '../../core/world3d/space';
import { type Ground3D, groundHeight, lakeDist } from '../../core/world3d/terrain';
import { VIEW_YAW, wrapAngle } from '../../core/world3d/view';
import { Weather } from '../../core/world3d/weather';
import { type VisionSpec, turnToward, visionOf } from '../../core/world3d/vision';
import { SEE_SLOTS, WORLD } from '../materials';
import { blobShadow } from '../shadow';
import { Acting } from './acting';
import { Carrying } from './carrying';
import { Pack } from './pack';
import { Fights } from './fights';
import { Figures, personFigure } from './figures';
import { Filaments } from './filaments';
import { Gear } from './gear';
import { Grass } from './grass';
import { Houses } from './houses';
import { Journal } from './journal';
import { Lights } from './lights';
import { Owners } from './owners';
import { Props } from './props';
import { Schedule } from './schedule';
import { Senses } from './senses';
import { Shells } from './shells';
import { Sight } from './sight';
import { CAM_DIST, Sky } from './sky';
import { Streaming } from './streaming';
import { Talking } from './talking';
import { Trees } from './trees';
import type { CastCard, Figure, HouseInst, LoadedChunk, Person, WorldSettings } from './types';

export type { Figure, Person, WorldSettings } from './types';

/**
 * The 3D world: the hub that holds what everything shares (the scene and camera, the map, the hero and the map's
 * people, the game state that is saved), walks the hero, runs the frame, and hands each area to its part, one file
 * each in this folder:
 *
 * - Drawing: `streaming.ts` (chunks round the view), `houses.ts`, `trees.ts`, `props.ts`, `grass.ts`, `shells.ts`,
 *   `lights.ts` (every flame and the pool of lights), `sky.ts` (sun, fog, mist, wind, lightning, rain, smoke),
 *   `sight.ts` (what the hero sees), `filaments.ts` (the field fed and shown), `figures.ts` (bodies and motions).
 * - Doing: `acting.ts` (taps and the action frame), `schedule.ts` (the people's day), `senses.ts` (seeing, hearing,
 *   noticing), `owners.ts` (whose things are, the scale), `talking.ts`, `journal.ts` (leads), `carrying.ts`,
 *   `gear.ts` (what is held), `pack.ts` (pockets and the pack), `fights.ts`.
 *
 * A part keeps its own working state; what is saved is plain data here (`saveState`). A part reaches the others
 * through the hub (`this.w.lights`). Rules stay in `core/`: a part only carries out what the rules say.
 */

/** How fast the view turns while a turn button or key is held, radians a second (about 80°). */
const TURN_SPEED = 1.4;
/** About 39°: ground is squashed to ~0.63, as in the old hex art (20 px rows on 32 px tiles). */
export const PITCH = 0.68;
/** A stroll, metres a second. */
const HERO_SPEED = 1.6;

/** What the save keeps of the world (the page adds the map and writes it: `core/world3d/save.ts`). */
export interface WorldState {
  hour: number;
  hero: { x: number; z: number; level: number };
  explored: Record<string, string>;
  things: StatesJSON;
  flags: Record<string, boolean>;
  talk: TalkMemory;
  leads: LeadsState;
  standing: HeroStanding;
  carry: CarryState;
  hurt: Record<string, Injuries>;
  noticed: { seen: string[]; tried: Record<string, number> };
}

export class SpikeWorld {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 160);
  readonly weather = new Weather();
  readonly focus = new THREE.Vector3(0, 0.5, 1);
  readonly camPix = new THREE.Vector2();
  ppm = 21;
  settings: WorldSettings;
  readonly ground: Ground3D;
  readonly store: TerrainStore;
  /** The chunks resident now, by key (see `streaming.ts`). */
  readonly chunks = new Map<string, LoadedChunk>();
  /** What the world is like right now (sky, wind, clouds): the one interface the rules and the renderer read. */
  env!: Environment3D;
  /** How strongly each aspect of magic flows, by cell: read by position (see `core/world3d/filaments3d.ts`). */
  readonly field: FilamentField;
  /** What is placed in the world (see `core/world3d/layout.ts`). */
  readonly layout: Layout;
  /** Trees, props and torch posts by chunk (the layout's, and any the map makes as it goes). */
  readonly placed: PlacedIndex;
  /** Every house of the map, by chunk: made when something comes near (see `core/world3d/houses.ts`). */
  readonly houseIndex: HouseIndex<FurnishedRoom[]>;
  /** Walking for everyone: paths, stairs, steering (see `core/world3d/actors.ts`). */
  readonly moves: Walking;
  /** The invisible navigation grid everyone walks on. */
  readonly nav: NavGrid;
  /** The houses that are standing now (those in resident chunks); they come and go as chunks stream. */
  readonly houses: HouseInst[] = [];
  /** How the place weighs what is done in it (the map's culture, B3c). */
  readonly culture: CultureDef;
  /**
   * Where and when lightning falls. Seeded (by the map), since a strike leaves a scorch that the filament field reads:
   * rule state never comes from `Math.random`. Its state is a plain number, so it can go into a save.
   */
  readonly skyRng: Rng;
  /** Rolls made by actions (the hero's and the people's). */
  readonly actRng = Rng.fromSeed(Date.now() >>> 0);
  /** Seconds since the world began (animation time). */
  time = 0;
  /** Real minutes for a whole day; 0 stops the clock. */
  dayMinutes = 0;

  // --- the people ---
  /**
   * The people in the world. Anyone with `reveals` gets a see-through oval cut in the trees between them and the
   * camera; today that is only the hero (the director, 2026-10-31).
   */
  readonly people: Person[] = [];
  /** The map's people, each following their schedule (`schedule.ts`). */
  readonly cast: CastCard[] = [];
  /** The hero: where they stand (metres), the house and storey they are on, the walk in hand. */
  readonly hero: Actor = newActor(0, 0);
  readonly heroFig: Figure;
  readonly heroBlob: THREE.Mesh;
  /** Who the hero is, as the people see them (their people, their facets): how cold or warm a witness starts. The page sets it. */
  heroWho: Visitor = {};
  /** The hero's Alertness attribute: how far and how wide they see (see `core/world3d/vision.ts`). */
  alertness = 10;
  /** The shape of the hero's sight now. */
  spec: VisionSpec = visionOf({ alertness: 10 });
  /** The way the hero faces, radians (atan2(z, x)), eased toward the way they walk. */
  facing = Math.PI / 2;
  /**
   * Vision (metres from the view's focus): the world greys from `inner` and is black at `outer`; chunks beyond are not
   * built or animated. `outer` 0 turns it off. Set by tier from the page.
   */
  vision = { inner: 0, outer: 0 };
  /** For testing: how many times faster than a stroll (1.6 m/s) the hero walks. */
  speedMul = 2;
  /** Where the hero sits, while they sit (the verb `sit`): the seat's top and which way they face; the spot they stood on. */
  seated: { x: number; z: number; y: number; floor: number; yaw: number; from: P2 } | null = null;
  /** The keys: how far right and how far up the screen the hero is being steered (-1..1 each). Set by the page. */
  input = { right: 0, up: 0 };
  /** Told when one of the map's people says something to the hero unasked (a guard come to see), for the page to show. */
  onSpeak: ((who: string, name: string, text: string) => void) | null = null;
  /** Told something the hero should know that no one says (a loan fell due), for the page to show. */
  onNote: ((text: string) => void) | null = null;

  // --- the view ---
  /** The camera follows the hero while it walks, until the player drags the view. */
  follow = false;
  /**
   * Where on the screen the followed spot sits (NDC, 0,0 the middle): a panel over part of the view moves it into what
   * is left (the fight panel at the bottom on a phone, at the side on a computer).
   */
  viewAim = { x: 0, y: 0 };
  /** The view's turn about the vertical, radians (see `core/world3d/view.ts`). Turn it with `turn` or `turnInput`. */
  yaw = VIEW_YAW;
  /** Held turn buttons or keys: -1 turns the world anticlockwise on screen, 1 clockwise. Set by the page. */
  turnInput = 0;
  /** A turn the view is easing towards (the fight's side-on view, B8g), or null. Turning by hand drops it. */
  yawWant: number | null = null;

  // --- what is saved (plain data; the parts read and change it) ---
  /** Where the hero has been (seen within the vision radius): drawn grey where it is out of sight now. */
  readonly explored = new Explored();
  /** The states of placed things that differ from their kind's start (a hearth put out): what the save keeps (`core/world3d/state.ts`). */
  readonly states = new ThingStates(THINGS);
  /** Flags the world remembers (set by actions' outcomes; quests later). */
  flags: Record<string, boolean> = {};
  /** What each of the map's people thinks of the hero, and the leave they gave (B3c, `owners.ts`). */
  standing: HeroStanding = newStanding();
  /** What the hero holds and where moved things lie (B3b, `carrying.ts`, `gear.ts`). */
  carry: CarryState = newCarry();
  /** What fights left on people (the hero too), by id: their injuries (`core/damage.ts`, `fights.ts`). */
  hurt: Record<string, Injuries> = {};
  /** What the people of this map remember of the hero (`core/world3d/talk.ts`). */
  talkMemory: TalkMemory = newTalkMemory();
  /** The leads the hero has (`journal.ts`). */
  leads: LeadsState = {};
  /** Things lying about the hero has noticed, and for the rest the difficulty they were last tried at (`senses.ts`). */
  noticed = new Set<string>();
  noticeTried: Record<string, number> = {};

  // --- the parts ---
  readonly figures = new Figures(this);
  readonly fights = new Fights(this);
  readonly gear = new Gear(this);
  readonly carrying = new Carrying(this);
  readonly pack = new Pack(this);
  readonly owners = new Owners(this);
  readonly talking = new Talking(this);
  readonly senses = new Senses(this);
  readonly acting = new Acting(this);
  readonly sight = new Sight(this);
  readonly shells = new Shells(this);
  readonly trees = new Trees(this);
  readonly props = new Props(this);
  readonly housing = new Houses(this);
  readonly streaming = new Streaming(this);
  readonly filaments = new Filaments(this);
  readonly sky: Sky;
  readonly lights: Lights;
  readonly grass: Grass;
  readonly journal: Journal;
  readonly schedule: Schedule;

  private steering = false;
  /** How far the view is lifted for an upper storey, metres. */
  private focusLift = 0;
  private marker: THREE.Mesh;
  /** The standing house the hero was in last frame (its cut-away is open). */
  private wasIn: HouseInst | null = null;
  private framed = false;
  /** The people who reveal themselves, nearest the view first, kept between frames (see `updateSee`). */
  private seeOrder: Person[] = [];
  private seeV = new THREE.Vector3();

  constructor(settings: WorldSettings, grassCount: number, map: Pick<CompiledMap, 'ground' | 'layout' | 'hero' | 'cast' | 'places' | 'events'> & Partial<Pick<CompiledMap, 'placed' | 'culture'>> = mapNamed('spike')) {
    this.settings = settings;
    const { ground, layout } = map;
    const g = ground;
    this.ground = ground;
    this.layout = layout;
    this.skyRng = Rng.fromSeed(`sky ${ground.seed}`);
    this.hero.x = map.hero[0];
    this.hero.z = map.hero[1];
    this.focus.set(map.hero[0], 0.5, map.hero[1]);
    this.store = new TerrainStore(ground, 0.5);
    this.camera.layers.set(0);
    // The sky (sun, fog, weather's effects) and the pool of lights; the ground's chunks stream in once the view is sized (`frame`).
    this.sky = new Sky(this, settings.shadowMap);
    this.lights = new Lights(this);
    this.grass = new Grass(this, grassCount);
    this.journal = new Journal(this);

    // Each room is furnished by rules (see `content/furnish.ts`) when something first comes near its house; what stands
    // on the floor blocks feet, and what is in it (the hearth, books, pictures) feeds the filament field.
    this.houseIndex = new HouseIndex<FurnishedRoom[]>(layout.houses, (b) => {
      const rooms = furnishHouse(b.model, b.place.room ?? 'home', b.place.spec.seed, b.place.spec.plan);
      const sources: FSource[] = [];
      rooms.forEach((room, ri) => {
        const fire = room.plan.pieces.filter((p) => p.fire).pop();
        if (fire) {
          const at = houseToWorld(b.place, fire.x, fire.z + 0.2);
          // It gives fire to the field only while it is lit (the field asks the things' states; see `gives` below).
          sources.push({ x: at.x, z: at.z, kind: 'fire', weight: HEARTH_FIRE, of: { id: pieceId(b.place.id, ri, fire.id), kind: room.models.get(fire.id)!.kind } });
        }
        for (const s of room.sources) {
          const at = houseToWorld(b.place, s.x, s.z);
          sources.push({ x: at.x, z: at.z, kind: s.kind, weight: s.weight });
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
        ...houseIndex.near(x0, z0, x1, z1).flatMap((e) => furnitureObstacles(e.built, this.carrying.furnitureRects(e.built, 0))),
        ...placed.near(x0, z0, x1, z1),
        ...this.carrying.looseOutdoors(x0, z0, x1, z1),
      ],
    }, { radius: 0.2, blocked: (x, z) => lakeDist(g, x, z) < 0.2 });
    // Walking holds houses by id and asks the index (not what is standing), so a house streaming out changes nothing for the people in it.
    this.moves = new Walking(this.nav, g.size, {
      holding: (x, z) => houseIndex.houseContaining(x, z, -0.1)?.built ?? null,
      byId: (id) => {
        const p = houseIndex.byId(id);
        return p ? houseIndex.lite(p).built : null;
      },
      furniture: (b, level) => this.carrying.furnitureRects(b, level),
    });

    // The map's people, each with a mind that follows their schedule. Everyone answers what the hero does wrong as the
    // place's culture says (B3c).
    this.culture = cultureOf(map.culture);
    this.schedule = new Schedule(this, map.places, map.events);
    this.schedule.addCast(map.cast);
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
    const gives = (s: FSource): boolean => this.lights.fireLit(s.of);
    this.field = new FilamentField(streamingFilamentWorld(g, placed, houseIndex, () => this.filaments.extras(), gives));
    // A thing's state changed: what stands redraws, and the field reads its sources again.
    this.states.on((c) => {
      for (const hs of this.houses) if (hs.fireOf?.id === c.id) this.housing.showFire(hs);
      this.lights.showPlacedFire(c.id);
      this.lights.syncFires();
    });
  }

  setVision(inner: number, outer: number): void {
    this.vision = { inner, outer };
  }

  /** The way the hero last walked (unit-ish, world x/z): the ray of light points along it. */
  get heroDir(): { x: number; z: number } {
    return this.hero.dir;
  }

  set heroDir(d: { x: number; z: number }) {
    this.hero.dir = d;
  }

  /** World time in hours, counting days (for "every six hours"). */
  get worldHours(): number {
    const w = this.weather;
    return w.day * 24 + (w.hour ?? 12);
  }

  // --- the view ---

  /** Metres from the focus out to the edge of what the view can show, plus a margin. */
  viewRadius(): number {
    const hw = this.camera.right, hh = this.camera.top;
    // Up the screen the ground is foreshortened by sin(pitch).
    return Math.hypot(hw, hh / Math.sin(PITCH)) + 6;
  }

  /** Size the camera for a low-res target of rw × rh pixels at the current zoom. */
  frame(rw: number, rh: number): void {
    const hw = rw / 2 / this.ppm, hh = rh / 2 / this.ppm;
    Object.assign(this.camera, { left: -hw, right: hw, top: hh, bottom: -hh });
    this.camera.updateProjectionMatrix();
    this.sky.frameShadow(Math.max(hw, hh) * 1.15 + 3);
    // The first sizing builds every chunk the view needs; later ones stream a chunk per frame.
    if (!this.framed) this.streaming.buildAll();
    else this.streaming.stream();
    this.framed = true;
  }

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

  /** Turn the view by `rad` (positive: the world turns clockwise on screen), round what it looks at. */
  turn(rad: number): void {
    this.yaw = wrapAngle(this.yaw + rad);
    this.yawWant = null;
  }

  /** Bring the view back onto the fight (or the hero) after the player panned away. */
  recentre(): void {
    this.follow = true;
  }

  /** Mark a spot on the ground (where the hero means to go this round), or hide the mark (null). */
  markSpot(at: { x: number; z: number } | null): void {
    if (!at) return void (this.marker.visible = false);
    this.marker.position.set(at.x, this.store.heightAt(at.x, at.z) + 0.04, at.z);
    this.marker.visible = true;
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
    this.sky.placeShadow(target);
  }

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

  // --- houses and where people stand ---

  /** Where a house stands on the ground (what its local y = 0 is in the world). */
  houseBaseY(b: BuiltHouse): number {
    return groundHeight(this.ground, b.place.x, b.place.z) - 0.05;
  }

  /** The standing copy of a house, if it is standing. */
  standingOf(id: string | null): HouseInst | null {
    return id ? this.houses.find((h) => h.built.place.id === id) ?? null : null;
  }

  /** A house was taken down (its chunk left). */
  houseLeft(hs: HouseInst): void {
    if (this.wasIn === hs) this.wasIn = null;
  }

  /** Where someone's feet are: on their storey's floor (or the stair under them) in a house, else on the ground. */
  footY(a: Actor): number {
    const b = this.moves.house(a);
    if (!b) return this.store.heightAt(a.x, a.z);
    const lv = b.model.levels;
    return this.houseBaseY(b) + (a.foot ?? lv[Math.min(a.level, lv.length - 1)].floorY);
  }

  // --- the hero ---

  /** What the stairs buttons should offer: up, down, or neither (nothing to climb here). */
  get stairsHint(): { up: boolean; down: boolean } {
    return this.moves.stairsHint(this.hero);
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

  get sitting(): boolean {
    return this.seated !== null;
  }

  /** The hero stops where they are (a tap on someone, a fight beginning: the director, walking on felt like a teleport). */
  stopHero(): void {
    if (!this.hero.legs.length) return;
    this.hero.legs = [];
    this.marker.visible = false;
    this.figures.faceWalker(this.heroFig, this.heroDir.x, this.heroDir.z, false);
    this.placeHero();
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

  /** Walk to the middle of a house's doorway, just inside (the map's first house by default). Null if there is no such house or no way there. */
  walkIn(id = this.layout.houses[0]?.id): number | null {
    const place = id === undefined ? undefined : this.houseIndex.byId(id);
    if (!place) return null;
    const b = this.houseIndex.lite(place).built;
    const p = houseToWorld(b.place, b.model.door[0], b.model.door[2] - 0.9);
    return this.walkTo(p.x, p.z);
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
        this.figures.faceWalker(this.heroFig, this.heroDir.x, this.heroDir.z, false);
      }
      return false;
    }
    this.steering = true;
    this.marker.visible = false;
    this.follow = true;
    const sY = Math.sin(this.yaw), cY = Math.cos(this.yaw);
    // Screen up is away from the camera, screen right is along the camera's right.
    const wx = (up * -sY + right * cY) / mag, wz = (up * -cY + right * -sY) / mag;
    const speed = HERO_SPEED * this.speedMul * this.carrying.pace;
    const pose = this.moves.steer(this.hero, wx, wz, speed * dt);
    this.placeHero();
    if (pose) this.figures.faceWalker(this.heroFig, pose.dx, pose.dz, pose.moving);
    return true;
  }

  private stepHero(dt: number): void {
    const h = this.hero, fights = this.fights;
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
    const speed = HERO_SPEED * this.speedMul * this.carrying.pace;
    const pose = this.moves.step(h, dt, speed);
    this.placeHero();
    const inFight = !!fights.fighting?.has('hero');
    if (pose) {
      const f = inFight ? fights.facing('hero', pose) : pose;
      this.figures.faceWalker(this.heroFig, f.dx, f.dz, pose.moving);
    }
    if (!h.legs.length) {
      this.marker.visible = false;
      // Stopped in a fight: turn to the foe.
      if (inFight) {
        const f = fights.facing('hero', { dx: 0, dz: 0, moving: false });
        this.figures.faceWalker(this.heroFig, f.dx, f.dz, false);
      }
    }
  }

  // --- the save ---

  /** What the save keeps of the world (the page adds the map and writes it: `core/world3d/save.ts`). */
  saveState(): WorldState {
    const h = this.hero;
    return {
      hour: this.weather.hour ?? 12, hero: { x: h.x, z: h.z, level: h.stair ? 0 : h.level }, explored: this.explored.toJSON(), things: this.states.toJSON(), flags: { ...this.flags },
      talk: structuredClone(this.talkMemory), leads: structuredClone(this.leads), standing: structuredClone(this.standing), carry: structuredClone(this.carry), hurt: structuredClone(this.hurt),
      noticed: { seen: [...this.noticed], tried: { ...this.noticeTried } },
    };
  }

  /** Take a save back: the clock, the hero, what was seen, the things' states, what they know, what was moved. */
  loadState(s: Partial<WorldState> & Pick<WorldState, 'hour' | 'hero' | 'explored' | 'things'>): void {
    this.flags = { ...s.flags };
    this.noticed = new Set(s.noticed?.seen ?? []);
    this.noticeTried = { ...s.noticed?.tried };
    // What fights left: those knocked out or killed lie where they fell (B8a).
    this.hurt = s.hurt ? structuredClone(s.hurt) : {};
    this.fights.layDown();
    this.carry = s.carry ? structuredClone(s.carry) : newCarry();
    this.standing = s.standing ? structuredClone(s.standing) : newStanding();
    this.talkMemory = s.talk ? structuredClone(s.talk) : newTalkMemory();
    this.leads = s.leads ? structuredClone(s.leads) : {};
    this.weather.setHour(s.hour);
    this.senses.hero.rolledAt = null; // (back in the map: sight is rolled again)
    this.explored.assign(s.explored);
    this.sight.refill();
    this.states.assign(s.things);
    this.placeHeroAt(s.hero.x, s.hero.z, s.hero.level);
    this.carrying.redraw();
  }

  // --- the frame ---

  update(dtMs: number): void {
    const dt = Math.min(0.1, dtMs / 1000);
    this.time += dt;
    if (this.turnInput) this.turn(this.turnInput * TURN_SPEED * dt);
    if (this.yawWant !== null) {
      const d = wrapAngle(this.yawWant - this.yaw);
      this.yaw = Math.abs(d) < 0.002 ? this.yawWant : wrapAngle(this.yaw + d * (1 - Math.exp(-dt / 0.25)));
      if (this.yaw === this.yawWant) this.yawWant = null;
    }
    const w = this.weather, inFight = this.fights.inFight;
    // (While a fight lasts the clock waits.)
    if (this.dayMinutes > 0 && !inFight) w.advance((dt * 24) / (this.dayMinutes * 60));
    if (!inFight) this.fights.recover(dt);
    w.update(dtMs);
    this.lights.stepCarried();
    const env = (this.env = this.sky.step(dt));
    // Sight is the hero's, not the camera's: a cone ahead, a circle round, the dark shortening it, solid things in the way.
    // Sight is rolled (plan B5): on entering the map, and every six world hours.
    this.senses.stepHero();
    if (this.vision.outer > 0) {
      this.facing = turnToward(this.facing, Math.atan2(this.heroDir.z, this.heroDir.x), 7 * dt);
      this.spec = visionOf({ alertness: this.alertness, night: env.night, cap: this.vision.outer, light: this.lights.carried ? 1 : 0, boost: sightBoost(this.senses.hero.sight), darkSight: this.senses.darkSight });
      this.sight.step(env.night);
      this.senses.stepNoticing();
    } else {
      WORLD.uVision.value.set(0, 0, 0, 0);
    }
    this.sky.stepUniforms(dt, env);
    this.lights.step(env, this.sky.wind);
    this.housing.step(dt, env.night);
    this.shells.step();
    this.props.step();

    this.schedule.step(dt, env.night);
    this.stepHero(dt);
    this.senses.stepFootsteps();
    this.focus.y = 0.5 + this.focusLift;
    if (this.follow) {
      // In a fight the view follows the middle of the fighters; the aim puts it where no panel covers it.
      const c = this.fights.centre() ?? this.hero;
      const R = { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) }, F = { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
      const ax = this.viewAim.x * this.camera.right, ay = (this.viewAim.y * this.camera.top) / Math.sin(PITCH);
      const tx = c.x - R.x * ax - F.x * ay, tz = c.z - R.z * ax - F.z * ay;
      const k = 1 - Math.exp(-dt / 0.25);
      this.focus.x += (tx - this.focus.x) * k;
      this.focus.z += (tz - this.focus.z) * k;
    }
    this.figures.step(dt);

    this.placeCamera();
    this.updateSee();
    this.streaming.step(dt);
    // The heat map and the reading follow the weather and the living, twice a second.
    this.filaments.step(dt);
    this.sky.stepEffects(dt, env);
  }
}
