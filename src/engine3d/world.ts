import * as THREE from 'three';
import { makeFolk } from '../art/folk';
import {
  makeBasket, makeBucketBroom, makeClutter, makeCloakPegs, makeCookhearth, makeFootlocker, makeHanging, makeKeg,
  makePallet, makeRagRug, makeRoughShelf, makeSacks, makeStool3, makeStrawBits, makeTrestleTable,
} from '../art/humble';
import type { Pix } from '../art/pix';
import type { Sprite } from '../art/props';
import {
  barkTex, doorTex, floorTex, groundChunkTex, leafTex, plasterTex, roofUnderTex, shutterTex, stoneTex, thatchTex,
  timberTex, windowGlowTex, windowTex,
} from '../art/textures3d';
import { PEOPLE } from '../content/village/folk';
import { SPIKE_GROUND, SPIKE_HERO, SPIKE_HOUSE, SPIKE_TORCHES, SPIKE_TREE, SPIKE_WALK, spikeFilamentWorld, spikeHouseBox, spikeObstacles } from '../content/spike3d';
import type { AspectId, HexFilaments } from '../core/filaments';
import { type FSource, FilamentField } from '../core/world3d/filaments3d';
import { CHUNK, type ChunkTerrain, TerrainStore, chunkKey, chunksNear } from '../core/world3d/chunks';
import { type Environment3D, environment } from '../core/world3d/environment3d';
import { Rng } from '../core/rng';
import { type HouseMaterial, type HouseModel, buildHouse } from '../core/world3d/house';
import type { MeshData } from '../core/world3d/mesh';
import { cloudDrift, cloudThreshold } from '../core/world3d/sky';
import { NavGrid, type P2, type Shape, findPath, followPath, pathLength, shapeDist } from '../core/world3d/space';
import { type Ground3D, groundHeight, lakeDist, splatAt } from '../core/world3d/terrain';
import { TEXELS_PER_M } from '../core/world3d/tiers';
import { buildTree } from '../core/world3d/tree';
import { fbm } from '../core/noise';
import { Weather } from '../engine/weather';
import { type LitOpts, WORLD, lit, pixTexture, shellOf } from './materials';
import { Rain } from './rain';
import { type SpriteCard, blobShadow, spriteCard } from './sprites';
import { type Heat, makeFloorHeat, makeHeat } from './heat';
import { type Water, makeWater } from './water';

/**
 * The M0 spike world: builds the scene from the content and the generators,
 * then runs it (weather, light, the walking villager, the cut-away).
 */

export const YAW = 0.42;
/** About 39°: ground is squashed to ~0.63, as in the old hex art (20 px rows on 32 px tiles). */
export const PITCH = 0.68;
const CAM_DIST = 60;

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
  g.setIndex(m.indices);
  return g;
}

interface CutPart {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
}

interface Torch {
  light: THREE.PointLight;
  flame: THREE.Mesh;
  base: number;
  seed: number;
}

/** What a resident chunk holds on the GPU. */
interface LoadedChunk {
  id: ChunkTerrain;
  ground: THREE.Mesh;
  grass: THREE.InstancedMesh | null;
  heat: Heat | null;
}

interface Shell {
  mesh: THREE.Mesh;
  layer: number;
  cut: boolean;
}

export class SpikeWorld {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 160);
  readonly weather = new Weather(1, 1);
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
  private floorHeat: Heat | null = null;
  private chunkBuilds = 0;
  readonly house = new THREE.Group();
  private model: HouseModel;
  private cut: CutPart[] = [];
  private shells: Shell[] = [];
  private torches: Torch[] = [];
  private windowMats: THREE.MeshLambertMaterial[] = [];
  private water: Water | null;
  private rain = new Rain(1400);
  private walker: SpriteCard;
  private walkerBlob: THREE.Mesh;
  private walkS = 0;
  private sprites: SpriteCard[] = [];
  /** The invisible navigation grid the hero walks on. */
  readonly nav: NavGrid;
  /** Where the hero stands, metres. */
  readonly hero: P2 = { x: SPIKE_HERO[0], z: SPIKE_HERO[1] };
  private houseBox!: Shape;
  private heroCard!: SpriteCard;
  private heroBlob!: THREE.Mesh;
  private path: P2[] | null = null;
  private pathS = 0;
  private marker: THREE.Mesh;
  /** The camera follows the hero while it walks, until the player drags the view. */
  follow = false;
  /** Cut-away: 0 closed, 1 open; eases toward `inside`. */
  inside = false;
  private cutT = 0;
  private wet = 0;
  private time = 0;
  private cloudOff = new THREE.Vector2();
  settings: WorldSettings;

  constructor(settings: WorldSettings, grassCount: number, ground: Ground3D = SPIKE_GROUND) {
    this.settings = settings;
    const g = ground;
    this.ground = ground;
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
    this.scene.add(this.sun, this.sun.target);

    // Ground chunks stream in once the view is sized (see `frame`); until then the exact height function stands in.
    this.model = buildHouse(SPIKE_HOUSE.spec);
    this.houseBox = spikeHouseBox(this.model.footprint);
    // Feet: the house, trunk and posts block; so does the water.
    this.nav = new NavGrid(g.size, spikeObstacles(this.model.footprint, this.model.door[0]), { radius: 0.2, blocked: (x, z) => lakeDist(g, x, z) < 0.2 });

    // The house.
    this.buildHouse();

    // Tree, grass, water, torches, people.
    this.buildTree();
    this.water = makeWater(g);
    if (this.water) this.scene.add(this.water.mesh);
    this.buildTorches();
    this.scene.add(this.rain.lines);

    this.walker = spriteCard(makeFolk(PEOPLE.baker), PITCH);
    this.walkerBlob = blobShadow(0.32);
    this.scene.add(this.walker.mesh, this.walkerBlob);
    this.sprites.push(this.walker);
    // The hero: the farmer by the door. Tap the ground and they walk there.
    this.heroCard = spriteCard(makeFolk(PEOPLE.farmer), PITCH);
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
    this.field = new FilamentField(spikeFilamentWorld(g, this.model.footprint, this.fires));
  }

  /** House-local (x, z) to world. */
  private toWorld(x: number, z: number): { x: number; z: number } {
    const c = Math.cos(SPIKE_HOUSE.rot), s = Math.sin(SPIKE_HOUSE.rot);
    return { x: SPIKE_HOUSE.x + x * c + z * s, z: SPIKE_HOUSE.z - x * s + z * c };
  }

  private buildHouse(): void {
    const h = SPIKE_HOUSE;
    const glow = tex(windowGlowTex(), true, undefined);
    const maps: Record<HouseMaterial, () => LitOpts> = {
      stone: () => ({ map: tex(stoneTex(3)), ao: true, wettable: true }),
      plaster: () => ({ map: tex(plasterTex(5)), ao: true, wettable: true }),
      timber: () => ({ map: tex(timberTex(6)), ao: true, wettable: true }),
      roof: () => ({ map: tex(thatchTex(8)), ao: true, wettable: true }),
      roofUnder: () => ({ map: tex(roofUnderTex(9)), ao: true }),
      door: () => ({ map: tex(doorTex(10), true, undefined), ao: true }),
      window: () => ({ map: tex(windowTex(), true, undefined), ao: true, emissiveMap: glow, emissive: 0x000000 }),
      shutter: () => ({ map: tex(shutterTex(11), true, undefined), ao: true }),
      floor: () => ({ map: tex(floorTex(12)), ao: true }),
    };
    const shared = new Map<HouseMaterial, { mat: THREE.MeshLambertMaterial; opts: LitOpts }>();
    const matFor = (m: HouseMaterial, cut: boolean): { mat: THREE.MeshLambertMaterial; opts: LitOpts } => {
      let s = shared.get(m);
      if (!s) {
        const opts = maps[m]();
        s = { mat: lit(opts), opts };
        shared.set(m, s);
        if (m === 'window') this.windowMats.push(s.mat);
      }
      if (!cut) return s;
      // Cut parts fade with a dither (alpha hash), so each needs its own material.
      const mat = lit(s.opts);
      mat.alphaHash = true;
      if (m === 'window') this.windowMats.push(mat);
      return { mat, opts: s.opts };
    };
    for (const p of this.model.parts) {
      const geo = geometryOf(p.mesh);
      const { mat, opts } = matFor(p.material, p.cut);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true;
      mesh.castShadow = !p.cut;
      this.house.add(mesh);
      if (p.cut) {
        this.cut.push({ mesh });
        // The roof keeps shading the room when it is cut away: a shadow-only twin on layer 1.
        const proxy = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
        proxy.layers.set(1);
        proxy.castShadow = true;
        this.house.add(proxy);
      }
      if (p.material === 'roof') this.addShells(mesh, opts, { density: 0.5, tint: 1.12, step: 0.06 }, p.cut);
    }
    // Furniture: the humble set, as sprites on the earth floor. u across, d from the front wall to the back.
    const items: { s: Sprite; u: number; d: number; lift?: number; flat?: boolean }[] = [
      { s: makeRagRug(), u: 0.5, d: 0.38, flat: true },
      { s: makeStrawBits(), u: 0.3, d: 0.62, flat: true },
      { s: makePallet(), u: 0.2, d: 0.86 },
      { s: makeCookhearth(), u: 0.8, d: 0.95 },
      { s: makeRoughShelf(), u: 0.46, d: 0.99, lift: 22 },
      { s: makeCloakPegs(), u: 0.64, d: 0.99, lift: 4 },
      { s: makeHanging(), u: 0.26, d: 0.99, lift: 14 },
      { s: makeBucketBroom(), u: 0.06, d: 0.78 },
      { s: makeFootlocker(), u: 0.07, d: 0.5 },
      { s: makeBasket(), u: 0.2, d: 0.2 },
      { s: makeTrestleTable(), u: 0.5, d: 0.5 },
      { s: makeStool3(), u: 0.34, d: 0.32 },
      { s: makeStool3(7), u: 0.66, d: 0.4 },
      { s: makeClutter(), u: 0.5, d: 0.12, flat: true },
      { s: makeKeg(), u: 0.92, d: 0.5 },
      { s: makeSacks(), u: 0.9, d: 0.16 },
    ];
    const r = this.model.room;
    for (const it of items) {
      const card = spriteCard(it.s, PITCH, { flat: it.flat, shadow: false });
      const x = r.x0 + it.u * (r.x1 - r.x0), z = r.z1 - it.d * (r.z1 - r.z0);
      card.mesh.position.set(x, this.model.floorY + 0.02 + (it.lift ?? 0) / TEXELS_PER_M, z);
      card.mesh.rotation.y = YAW - h.rot;
      this.house.add(card.mesh);
      this.sprites.push(card);
    }
    // The hearth's glow.
    const hearth = new THREE.PointLight(0xff9a48, 4, 6, 2);
    hearth.position.set(r.x0 + 0.8 * (r.x1 - r.x0), this.model.floorY + 0.55, r.z1 - 0.88 * (r.z1 - r.z0));
    this.house.add(hearth);
    this.torches.push({ light: hearth, flame: new THREE.Mesh(), base: 4, seed: 3 });
    const hf = this.toWorld(hearth.position.x, hearth.position.z);
    this.fires.push({ x: hf.x, z: hf.z, kind: 'fire', weight: 1 });

    const y = groundHeight(this.ground, h.x, h.z) - 0.05;
    this.house.position.set(h.x, y, h.z);
    this.house.rotation.y = h.rot;
    this.scene.add(this.house);
  }

  /** Two shells: `step` metres out, then twice that, each sparser than the last. */
  private addShells(base: THREE.Mesh, opts: LitOpts, s: { density: number; tint: number; step: number }, cut: boolean): void {
    for (const layer of [1, 2]) {
      const mat = shellOf(base.material as THREE.MeshLambertMaterial, opts, {
        layer, offset: s.step * layer, density: s.density / (layer * layer), tint: layer === 1 ? s.tint : s.tint * 1.08,
      });
      const m = new THREE.Mesh(base.geometry, mat);
      m.position.copy(base.position);
      m.rotation.copy(base.rotation);
      m.scale.copy(base.scale);
      m.receiveShadow = true;
      base.parent ? base.parent.add(m) : base.add(m);
      this.shells.push({ mesh: m, layer, cut });
    }
  }

  private buildTree(): void {
    const t = buildTree(SPIKE_TREE.seed);
    const group = new THREE.Group();
    const wood = new THREE.Mesh(geometryOf(t.wood), lit({ map: tex(barkTex(4)), ao: true, wettable: true }));
    wood.castShadow = wood.receiveShadow = true;
    group.add(wood);
    const parts: THREE.BufferGeometry[] = [];
    t.clumps.forEach((c, i) => {
      const geo = new THREE.IcosahedronGeometry(1, 2);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const nrm = new Float32Array(pos.count * 3), uv = new Float32Array(pos.count * 2), col = new Float32Array(pos.count * 3);
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
        const lump = 1 + (fbm(x * 1.7 + i * 3, z * 1.7 + y, 41 + i) - 0.5) * 0.45;
        const px = x * c.r[0] * lump, py = y * c.r[1] * lump, pz = z * c.r[2] * lump;
        pos.setXYZ(k, px + c.at[0], py + c.at[1], pz + c.at[2]);
        const n = new THREE.Vector3(x / c.r[0], y / c.r[1], z / c.r[2]).normalize();
        nrm.set([n.x, n.y, n.z], k * 3);
        uv.set([px + pz * 0.6 + i * 1.3, py], k * 2);
        const ao = 0.5 + 0.5 * Math.max(0, n.y * 0.5 + 0.5) * Math.min(1, (py + c.at[1]) / t.height + 0.35);
        col.set([ao, ao, ao], k * 3);
      }
      geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      parts.push(geo);
    });
    const merged = mergeAll(parts);
    const leafOpts: LitOpts = { map: tex(leafTex(5)), ao: true, sway: { from: 2.5, amount: 0.018 } };
    const leaves = new THREE.Mesh(merged, lit(leafOpts));
    leaves.castShadow = leaves.receiveShadow = true;
    group.add(leaves);
    const gx = SPIKE_TREE.x, gz = SPIKE_TREE.z;
    group.position.set(gx, this.store.heightAt(gx, gz), gz);
    this.scene.add(group);
    this.addShells(leaves, leafOpts, { density: 0.55, tint: 1.18, step: 0.12 }, false);
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
    let n = 0;
    for (let tries = 0; n < count && tries < count * 20; tries++) {
      const x = c.x0 + rng.next() * CHUNK, z = c.z0 + rng.next() * CHUNK;
      if (Math.abs(x) > half * 0.95 || Math.abs(z) > half * 0.95) continue;
      const sp = splatAt(g, x, z);
      if (sp.road > 0.3 || sp.mud > 0.3 || sp.shore > 0.2) continue;
      const hl = this.model.footprint, l = this.toLocal(x, z);
      if (l.x > hl.x0 - 0.3 && l.x < hl.x1 + 0.3 && l.z > hl.z0 - 0.3 && l.z < hl.z1 + 0.3) continue;
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
    const map = pixTexture(groundChunkTex(this.ground, i, j).data, Math.round(CHUNK * TEXELS_PER_M), Math.round(CHUNK * TEXELS_PER_M), { flip: false });
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    // Mesh UVs are world metres; this chunk's texture covers x0..x0+CHUNK.
    map.repeat.set(1 / CHUNK, 1 / CHUNK);
    map.offset.set(-c.x0 / CHUNK, -c.z0 / CHUNK);
    const mesh = new THREE.Mesh(geometryOf(c.mesh), lit({ map, ao: true, wettable: true }));
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    const grass = this.buildGrass(c);
    if (grass) {
      grass.count = Math.min(grass.userData.full as number, this.grassLimit(grass));
      this.scene.add(grass);
    }
    const lc: LoadedChunk = { id: c, ground: mesh, grass, heat: null };
    this.chunks.set(chunkKey(i, j), lc);
    this.syncHeat(lc);
    this.chunkBuilds++;
  }

  private unloadChunk(key: string): void {
    const lc = this.chunks.get(key);
    if (!lc) return;
    this.scene.remove(lc.ground);
    lc.ground.geometry.dispose();
    const mat = lc.ground.material as THREE.MeshLambertMaterial;
    mat.map?.dispose();
    mat.dispose();
    if (lc.heat) {
      this.scene.remove(lc.heat.mesh);
      lc.heat.dispose();
    }
    if (lc.grass) {
      this.scene.remove(lc.grass);
      lc.grass.dispose();
    }
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
    const r = this.viewRadius();
    const want = chunksNear(this.ground, this.focus.x, this.focus.z, r);
    for (const id of want) {
      if (this.chunks.has(chunkKey(id.i, id.j))) continue;
      this.loadChunk(id.i, id.j);
      if (!all) break;
    }
    // Hysteresis: a chunk is dropped only well past the load radius.
    const keep = new Set(chunksNear(this.ground, this.focus.x, this.focus.z, r + CHUNK * 0.75).map((c) => chunkKey(c.i, c.j)));
    for (const k of [...this.chunks.keys()]) if (!keep.has(k)) this.unloadChunk(k);
  }

  /** Show the heat map of one aspect over the ground (null hides it). */
  showFilaments(a: AspectId | null): void {
    this.heatAspect = a;
    for (const lc of this.chunks.values()) this.syncHeat(lc);
    // The room inside the house shows it on its floor.
    if (a && !this.floorHeat) {
      this.floorHeat = makeFloorHeat(this.model.room, this.model.floorY + 0.03, (x, z) => this.toWorld(x, z));
      this.house.add(this.floorHeat.mesh);
    } else if (!a && this.floorHeat) {
      this.house.remove(this.floorHeat.mesh);
      this.floorHeat.dispose();
      this.floorHeat = null;
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
    this.field.setConditions({ env: this.weather.env(), isClouded: (x, z) => env.cloudShadow(x, z) > 0.5, sunDir: env.sunDir });
    this.field.setMovers([
      { x: this.hero.x, z: this.hero.z, kind: 'friend' },
      { x: this.walker.mesh.position.x, z: this.walker.mesh.position.z, kind: 'friend' },
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

  private toLocal(x: number, z: number): { x: number; z: number } {
    const dx = x - SPIKE_HOUSE.x, dz = z - SPIKE_HOUSE.z;
    const c = Math.cos(SPIKE_HOUSE.rot), s = Math.sin(SPIKE_HOUSE.rot);
    return { x: dx * c - dz * s, z: dx * s + dz * c };
  }

  private buildTorches(): void {
    const postMat = lit({ map: tex(timberTex(21)) });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb040 });
    const place = (x: number, y: number, z: number, post: boolean): void => {
      if (post) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.9, 0.14), postMat);
        p.position.set(x, y - 0.95, z);
        p.castShadow = true;
        this.scene.add(p);
      }
      const flame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), flameMat);
      flame.position.set(x, y + 0.12, z);
      this.scene.add(flame);
      const light = new THREE.PointLight(0xffa458, 9, 11, 2);
      light.position.set(x, y + 0.3, z);
      this.scene.add(light);
      this.torches.push({ light, flame, base: 9, seed: this.torches.length * 7 + 1 });
    };
    for (const [x, z] of SPIKE_TORCHES) place(x, this.store.heightAt(x, z) + 1.9, z, true);
    // On a bracket beside the door.
    const d = this.model.door;
    const w = this.toWorld(d[0] + 0.95, d[2] + 0.25);
    place(w.x, this.house.position.y + this.model.floorY + 1.85, w.z, false);
    this.fires.push({ x: w.x, z: w.z, kind: 'fire', weight: 1 });
  }

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
    this.streamChunks(!this.framed);
    this.framed = true;
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

  pick(ndcX: number, ndcY: number): 'house' | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hit = ray.intersectObject(this.house, true)[0];
    return hit ? 'house' : null;
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

  /** Walk the hero to a point: path-find round the house, the tree and the lake. Returns the metres to walk, or null if there is no way. */
  walkTo(x: number, z: number): number | null {
    const path = findPath(this.nav, this.hero, { x, z });
    if (!path) return null;
    this.path = path;
    this.pathS = 0;
    this.follow = true;
    const end = path[path.length - 1];
    this.marker.position.set(end.x, this.store.heightAt(end.x, end.z) + 0.04, end.z);
    this.marker.visible = true;
    return pathLength(path);
  }

  get walking(): boolean {
    return this.path !== null;
  }

  private placeHero(lift = 0): void {
    // Indoors the hero stands on the room's floor, not the ground.
    const y = this.heroIndoors ? this.house.position.y + this.model.floorY : this.store.heightAt(this.hero.x, this.hero.z);
    this.heroCard.mesh.position.set(this.hero.x, y + lift, this.hero.z);
    this.heroBlob.position.set(this.hero.x, y + 0.03, this.hero.z);
  }

  get heroIndoors(): boolean {
    return shapeDist(this.houseBox, this.hero.x, this.hero.z) < -0.1;
  }

  private wasIndoors = false;

  /** Walk to the middle of the doorway, just inside. */
  walkIn(): number | null {
    const p = this.toWorld(this.model.door[0], this.model.door[2] - 0.9);
    return this.walkTo(p.x, p.z);
  }

  private stepHero(dt: number): void {
    // Crossing the threshold opens or closes the cut-away.
    const inside = this.heroIndoors;
    if (inside !== this.wasIndoors) {
      this.wasIndoors = inside;
      this.inside = inside;
    }
    if (!this.path) return;
    this.pathS += dt * 1.6;
    const p = followPath(this.path, this.pathS);
    this.hero.x = p.x;
    this.hero.z = p.z;
    this.placeHero(Math.abs(Math.sin(this.time * 9)) * 0.03);
    this.faceScreen(this.heroCard.mesh, p.dx, p.dz);
    if (p.done) {
      this.path = null;
      this.marker.visible = false;
      this.placeHero();
    }
  }

  /** Turn a front-view card toward the way it walks: left on screen mirrors it (see the note on the walker). */
  private faceScreen(m: THREE.Object3D, dirX: number, dirZ: number): void {
    const screenRight = dirX * Math.cos(YAW) - dirZ * Math.sin(YAW);
    if (Math.abs(screenRight) > 0.05) m.rotation.y = screenRight < 0 ? YAW + Math.PI : YAW;
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

  update(dtMs: number): void {
    const dt = Math.min(0.1, dtMs / 1000);
    this.time += dt;
    const w = this.weather;
    w.update(dtMs);
    if (w.sky === 'storm' && Math.random() < dt / 5) w.flash = 1;
    // The clouds drift downwind; the offset is part of the environment so the rules can ask the same field.
    const drift = cloudDrift(w.windForce);
    this.cloudOff.x += w.wx * drift * dt;
    this.cloudOff.y += w.wy * drift * dt;
    const env = environment(w, { x: this.cloudOff.x, z: this.cloudOff.y });
    this.env = env;
    const lin = (c: number[]): THREE.Color => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);

    this.sunDir.set(...env.sunDir);
    this.sun.color.copy(lin(env.sunColor));
    this.sun.intensity = env.sunIntensity;
    this.hemi.color.copy(lin(env.skyTop));
    this.hemi.groundColor.copy(lin(env.groundBounce));
    this.hemi.intensity = env.ambient;
    const fogC = lin(env.fog);
    this.fog.color.copy(fogC);
    this.fog.near = CAM_DIST + env.fogNear - 30;
    this.fog.far = CAM_DIST + env.fogFar;
    this.scene.background = fogC;

    // World uniforms: time, clouds, wetness, wind.
    WORLD.uTime.value = this.time;
    WORLD.uCloud.value.set(cloudThreshold(env.cloudCover), 0.72 * (1 - env.night * 0.7), this.cloudOff.x, this.cloudOff.y);
    this.wet += (env.wetness - this.wet) * (1 - Math.exp(-dt / (env.wetness > 0.5 ? 6 : 25)));
    WORLD.uWet.value = this.wet;
    WORLD.uWind.value.set(w.windX, w.windY, w.wind);

    // Torches flicker; real point lights only for the nearest few.
    const order = [...this.torches].sort((a, b) => a.light.getWorldPosition(new THREE.Vector3()).distanceTo(this.focus) - b.light.getWorldPosition(new THREE.Vector3()).distanceTo(this.focus));
    order.forEach((t, i) => {
      t.light.visible = i < this.settings.lights;
      const f = 0.82 + 0.18 * Math.sin(this.time * 11 + t.seed) * Math.sin(this.time * 7.3 + t.seed * 2);
      t.light.intensity = t.base * f * (0.35 + 0.65 * env.night);
      t.flame.scale.set(1, 0.8 + f * 0.4, 1);
    });
    for (const m of this.windowMats) m.emissive.setScalar(env.night * 1.4);

    // The cut-away fades the roof and the front wall with a dither.
    this.cutT += ((this.inside ? 1 : 0) - this.cutT) * (1 - Math.exp(-dt / 0.12));
    for (const c of this.cut) {
      c.mesh.material.opacity = 1 - this.cutT;
      c.mesh.visible = this.cutT < 0.98;
    }
    for (const s of this.shells) s.mesh.visible = s.layer <= this.settings.shells && (!s.cut || this.cutT < 0.3);

    // The villager walks the road, there and back.
    this.walkVillager(dt);
    this.stepHero(dt);
    if (this.follow) {
      const k = 1 - Math.exp(-dt / 0.25);
      this.focus.x += (this.hero.x - this.focus.x) * k;
      this.focus.z += (this.hero.z - this.focus.z) * k;
    }
    for (const s of this.sprites) s.tick(this.time);

    this.placeCamera();
    this.streamChunks();
    // The heat map and the reading follow the weather and the living, twice a second.
    this.heatT -= dt;
    if (this.heatT <= 0) {
      this.heatT = 0.5;
      this.feedField();
      if (this.heatAspect) {
        for (const lc of this.chunks.values()) lc.heat?.paint(this.field, this.heatAspect);
        this.floorHeat?.paint(this.field, this.heatAspect);
      }
    }
    const span = Math.max(this.camera.right, this.camera.top) * 1.1;
    this.rain.update(dt, w.rain, this.focus, span, { x: w.windX, z: w.windY }, env.ambient * 0.6 + env.sunIntensity * 0.15 + w.flash);
    if (this.water) this.water.light(this.sun.color, this.sun.intensity, lin(env.skyHorizon), this.hemi.color.clone().multiplyScalar(env.ambient * 0.5), env.night);
  }

  private walkVillager(dt: number): void {
    const pts = SPIKE_WALK;
    const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    const total = lens.reduce((a, b) => a + b, 0);
    this.walkS = (this.walkS + dt * 1.1) % (total * 2);
    const back = this.walkS > total;
    let s = back ? total * 2 - this.walkS : this.walkS;
    let i = 0;
    while (i < lens.length - 1 && s > lens[i]) s -= lens[i++];
    const a = pts[i], b = pts[i + 1], k = s / lens[i];
    const x = a[0] + (b[0] - a[0]) * k, z = a[1] + (b[1] - a[1]) * k;
    const y = this.store.heightAt(x, z);
    const m = this.walker.mesh;
    m.position.set(x, y + Math.abs(Math.sin(this.time * 9)) * 0.03, z);
    // Facing: the art only has a front view for now, so walking left mirrors it. Turning the
    // double-sided card round mirrors it and keeps its lit side toward the camera.
    const dirX = (b[0] - a[0]) * (back ? -1 : 1), dirZ = (b[1] - a[1]) * (back ? -1 : 1);
    this.faceScreen(m, dirX, dirZ);
    this.walkerBlob.position.set(x, y + 0.03, z);
  }
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
