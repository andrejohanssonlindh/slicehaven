import * as THREE from 'three';
import { THINGS } from '../../content/things';
import type { FurnishedRoom } from '../../content/furnish';
import {
  doorTex, floorTex, plasterTex, roofUnderTex, shingleTex, shutterTex, sodTex, stoneTex, thatchTex, tileTex, timberTex, windowGlowTex, windowTex,
} from '../../art/textures3d';
import type { ActTarget } from '../../core/world3d/actions';
import type { HouseMaterial } from '../../core/world3d/house';
import type { HouseEntry } from '../../core/world3d/houses';
import { houseAt, houseOuterBox, houseToWorld } from '../../core/world3d/layout';
import { pieceId } from '../../core/world3d/state';
import { groundHeight } from '../../core/world3d/terrain';
import { facesCamera } from '../../core/world3d/view';
import { type LitOpts, lit } from '../materials';
import { makeFloorHeat } from '../heat';
import { geometryOf, thingGroup } from '../things';
import { tex } from './tex';
import type { HouseInst, Standing, Tagged } from './types';
import type { SpikeWorld } from './index';

/**
 * Houses on screen (the building kinds: `content/things/kinds/buildings.ts`, built by `core/world3d/house.ts`, furnished
 * by `content/furnish.ts`): each stands up when its chunk streams in, with its walls and roof in their materials, its
 * rooms' furniture (each piece its kind's model), and its hearth's light and smoke. The cut-away lifts the roof and
 * the walls facing the camera when the hero goes in, one storey at a time.
 */

/** Every material a house can be made of. */
const HOUSE_MATERIALS: HouseMaterial[] = ['stone', 'plaster', 'timber', 'roof', 'shingle', 'tile', 'sod', 'roofUnder', 'door', 'window', 'shutter', 'floor'];

export class Houses {
  private glow: THREE.DataTexture | null = null;
  /** Materials every house shares (the cut parts get their own copies). */
  private mats = new Map<HouseMaterial, { mat: THREE.MeshLambertMaterial; opts: LitOpts }>();
  /** Every window material: they glow at night. */
  private windowMats: THREE.MeshLambertMaterial[] = [];
  /** The material of every shadow-only twin (they are drawn only into the shadow map): one for all, never let go. */
  private readonly shadowOnly = new THREE.MeshBasicMaterial();

  constructor(private readonly w: SpikeWorld) {}

  private matOpts(m: HouseMaterial): LitOpts {
    this.glow ??= tex(windowGlowTex(), true, undefined);
    const glow = this.glow;
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
  private mat(m: HouseMaterial, cut: boolean, own: THREE.Material[]): { mat: THREE.MeshLambertMaterial; opts: LitOpts } {
    let s = this.mats.get(m);
    if (!s) {
      // Houses get the see-through oval too: a person behind one shows through it, as behind a tree.
      const opts: LitOpts = { ...this.matOpts(m), seeThrough: true };
      s = { mat: lit(opts), opts };
      this.mats.set(m, s);
      if (m === 'window') this.windowMats.push(s.mat);
    }
    if (!cut) return s;
    const mat = lit(s.opts);
    mat.alphaHash = true;
    own.push(mat);
    if (m === 'window') this.windowMats.push(mat);
    return { mat, opts: s.opts };
  }

  /** Let go of materials a house made for itself. */
  private dropMats(own: readonly THREE.Material[]): void {
    for (const m of own) {
      m.dispose();
      const i = this.windowMats.indexOf(m as THREE.MeshLambertMaterial);
      if (i >= 0) this.windowMats.splice(i, 1);
    }
  }

  /**
   * Every house look (each material, whole and fading) on a tiny box, so the renderer can build all their shaders
   * before the first frame: a shader built when a new kind of house first streams in is a stall. Call `compile`
   * on the result's `group` (it is in the scene), then `done()`.
   */
  warm(): { group: THREE.Group; done: () => void } {
    const w = this.w, group = new THREE.Group(), own: THREE.Material[] = [], shells: Standing['shells'] = [];
    for (const m of HOUSE_MATERIALS) {
      for (const cut of [false, true]) {
        const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
        const { mat, opts } = this.mat(m, cut, own);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        mesh.castShadow = !cut;
        mesh.position.copy(w.focus);
        group.add(mesh);
        if (m === 'roof') w.shells.add(mesh, opts, { density: 0.5, tint: 1.12, step: 0.06 }, null, shells);
      }
    }
    w.scene.add(group);
    return {
      group,
      done: () => {
        w.scene.remove(group);
        group.traverse((o) => ((o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined)?.dispose());
        this.dropMats(own);
        // (The shells the warm-up made are let go too.)
        w.shells.drop(shells);
      },
    };
  }

  /** Stand a house up in the world: its model, its furniture, its hearth's light. It belongs to the chunk `st`. */
  stand(entry: HouseEntry<FurnishedRoom[]>, st: Standing): void {
    const w = this.w;
    const { built, room: rooms } = entry;
    const h = built.place, model = built.model;
    const inst: HouseInst = { built, mats: [], hearth: null, fireOf: null, fireSpots: null, hearthAt: null, chimney: null, shells: [], group: new THREE.Group(), furniture: [], furnLevel: [], cut: [], box: entry.box, floorHeat: null, cutT: 0, open: false, view: 0 };
    for (const p of model.parts) {
      const geo = geometryOf(p.mesh);
      const { mat, opts } = this.mat(p.material, p.cut, inst.mats);
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
      if (p.material === 'roof') w.shells.add(mesh, opts, { density: 0.5, tint: 1.12, step: 0.06 }, p.cut ? inst : null, inst.shells);
    }
    // Furniture: the solver's plan (`content/furnish.ts`): each piece a model (`content/things/models/`), turned to face out from its wall.
    let fire = null as { x: number; z: number; level: number } | null;
    rooms.forEach((room, ri) => {
      const floorY = model.levels[room.level].floorY;
      for (const it of room.plan.pieces) {
        const mp = room.models.get(it.id);
        // (A piece once moved is loose: drawn where it lies now, below, not where the plan put it.)
        if (!mp || w.carry.loose[pieceId(h.id, ri, it.id)]) continue;
        const g = thingGroup(THINGS.get(mp.kind).furniture!.model.draw(mp.seed, mp.variant));
        g.position.set(it.x, floorY + it.lift, it.z);
        g.rotation.y = it.rot;
        // What a tap on it means (`Acting.tapped`): this piece, in this house, on this storey.
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
      hearth.visible = false; // (a light that is switched on counts in every shader: the pool in `Lights.step` decides which shine)
      hearth.position.set(fire.x, model.levels[fire.level].floorY + 0.55, fire.z + 0.2);
      inst.group.add(hearth);
      inst.hearth = { light: hearth, flame: new THREE.Mesh(), base: 4, seed: 3 + Math.round(h.x * 0.37 + h.z * 0.11) % 40 };
    }
    // (What the room gives off to the filaments is the index's: it feeds the field whether or not the house is standing.)
    const y = groundHeight(w.ground, h.x, h.z) - 0.05;
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
    w.scene.add(inst.group);
    w.houses.push(inst);
    for (const [id, l] of Object.entries(w.carry.loose)) if (l.at?.house === h.id) w.carrying.drawLoose(id, l);
    st.houses.push(inst);
    if (w.filaments.shownAspect) this.floorHeatFor(inst);
  }

  /** The heat map's paint on a standing house's floor. */
  floorHeatFor(hs: HouseInst): void {
    const { place, model } = hs.built;
    hs.floorHeat = makeFloorHeat(model.room, model.floorY + 0.03, (x, z) => houseToWorld(place, x, z));
    hs.group.add(hs.floorHeat.mesh);
  }

  /** Take the heat map's paint off a house's floor. */
  dropFloorHeat(hs: HouseInst): void {
    if (!hs.floorHeat) return;
    hs.group.remove(hs.floorHeat.mesh);
    hs.floorHeat.dispose();
    hs.floorHeat = null;
  }

  /** Take a house down when its chunk leaves. */
  drop(hs: HouseInst): void {
    const w = this.w;
    w.scene.remove(hs.group);
    hs.group.traverse((o) => {
      const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      if (g && !g.userData.shared) g.dispose();
    });
    hs.floorHeat?.dispose();
    this.dropMats(hs.mats);
    if (hs.hearth) w.lights.unlist(hs.hearth);
    w.shells.drop(hs.shells);
    w.houses.splice(w.houses.indexOf(hs), 1);
    w.houseLeft(hs);
    // (Loose things lying in it went with its group; they're drawn again when it stands.)
    w.carrying.forgetHouse(hs);
  }

  /** A standing house's hearth as its fire's `lit` state says: lit, it glows, smokes and lights the room round it; out, none of these. */
  showFire(hs: HouseInst): void {
    const lit = this.w.lights.fireLit(hs.fireOf);
    hs.hearthAt = lit ? hs.fireSpots?.hearthAt ?? null : null;
    hs.chimney = lit ? hs.fireSpots?.chimney ?? null : null;
    if (hs.hearth) this.w.lights.list(hs.hearth, lit);
  }

  /** The house fires near the hero (standing houses, within `r` metres), nearest first: their ids and kinds, and whether each is lit. */
  firesNear(r = 25): { id: string; kind: string; house: string; lit: boolean; d: number }[] {
    const w = this.w, out: { id: string; kind: string; house: string; lit: boolean; d: number }[] = [];
    for (const hs of w.houses) {
      if (!hs.fireOf || !hs.fireSpots) continue;
      const d = Math.hypot(hs.fireSpots.hearthAt.x - w.hero.x, hs.fireSpots.hearthAt.z - w.hero.z);
      if (d <= r && w.states.has(hs.fireOf.kind, 'lit')) out.push({ ...hs.fireOf, house: hs.built.place.id, lit: w.lights.fireLit(hs.fireOf), d });
    }
    return out.sort((a, b) => a.d - b.d);
  }

  /** A house's fire (its hearth, oven or forge) as something to act on, whether or not the house stands now; null if it has none. */
  fireOf(id: string): ActTarget | null {
    const idx = this.w.houseIndex;
    const place = idx.byId(id);
    if (!place) return null;
    const e = idx.entry(place);
    let out: ActTarget | null = null;
    e.room.forEach((room, ri) => {
      for (const it of room.plan.pieces) {
        const mp = room.models.get(it.id);
        if (!it.fire || !mp) continue;
        const at = houseToWorld(e.built.place, it.x, it.z);
        // (The last fire in the house is its fire, as `stand` reads it.)
        out = { id: pieceId(id, ri, it.id), kind: mp.kind, x: at.x, z: at.z, level: room.level, house: id, rot: e.built.place.rot + it.rot };
      }
    });
    return out;
  }

  /** The id of the house under the pointer, if any (nearest hit). */
  pick(ndcX: number, ndcY: number): string | null {
    const w = this.w;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), w.camera);
    let best: string | null = null, bestD = Infinity;
    for (const hs of w.houses) {
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
    const w = this.w;
    const g = w.groundAt(ndcX, ndcY);
    if (!g) return null;
    const i = houseAt(w.houses.map((h) => h.built), w.houses.map((h) => houseOuterBox(h.built)), g.x, g.z, 0);
    return i >= 0 ? w.houses[i].built.place.id : null;
  }

  /** The house the hero is in, else the standing one nearest the view's focus. */
  private active(): HouseInst | null {
    const w = this.w, h = w.heroHouse();
    if (h) return w.standingOf(h);
    let best: HouseInst | null = null, bestD = Infinity;
    for (const hs of w.houses) {
      const d = Math.hypot(hs.built.place.x - w.focus.x, hs.built.place.z - w.focus.z);
      if (d < bestD) {
        bestD = d;
        best = hs;
      }
    }
    return best;
  }

  /** Is any roof lifted? Setting it lifts the active house's roof, or lowers every one. */
  get inside(): boolean {
    return this.w.houses.some((h) => h.open);
  }

  set inside(on: boolean) {
    if (!on) for (const h of this.w.houses) h.open = false;
    else {
      const h = this.active();
      if (h) h.open = true;
    }
  }

  /** Lift or lower one house's roof by hand (dev), if it is standing. */
  toggleRoof(id: string): void {
    const h = this.w.standingOf(id);
    if (h) h.open = !h.open;
  }

  /**
   * Each frame: windows glow by night, and the cut-away fades the roof and the walls facing the camera with a dither
   * (each cut part has its own storey: it goes when the viewer is on that storey or below it); the furniture of the
   * storey looked into shows.
   */
  step(dt: number, night: number): void {
    const w = this.w;
    for (const m of this.windowMats) m.emissive.setScalar(night * 1.4);
    const cutK = 1 - Math.exp(-dt / 0.12);
    for (const hs of w.houses) {
      hs.cutT += ((hs.open ? 1 : 0) - hs.cutT) * cutK;
      // The outer walls that face the camera go (from any side); the far ones stay.
      for (const c of hs.cut) {
        const gone = hs.open && (hs.view <= c.level || (c.side !== null && hs.view <= c.facing && facesCamera(c.side, hs.built.place.rot, w.yaw)));
        c.t += ((gone ? 1 : 0) - c.t) * cutK;
        c.mesh.material.opacity = 1 - c.t;
        c.mesh.visible = c.t < 0.98;
      }
      hs.furniture.forEach((f, i) => { f.visible = hs.cutT > 0.02 && hs.furnLevel[i] === hs.view; });
    }
  }
}
