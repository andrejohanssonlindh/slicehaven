import * as THREE from 'three';
import { THINGS } from '../../content/things';
import type { Environment3D } from '../../core/world3d/environment3d';
import { type FSource, TORCH_FIRE } from '../../core/world3d/filaments3d';
import type { PlacedProp } from '../../core/world3d/props';
import { placedId } from '../../core/world3d/state';
import { type Flame, makeFlame, makeOrb } from '../fire';
import type { Chimney } from '../smoke';
import { type Standing, type Torch, newStanding } from './types';
import type { SpikeWorld } from './index';

/**
 * Fire and light (plan B1, B3a): every flame with its light (torches, hearths, campfires, the magic lights), of which
 * only the nearest few really shine. The number of lights in the scene is part of every shader, and a change recompiles
 * them all (a stall of a second on a phone), so it never changes: dark spares make up the rest. A fire that can be put
 * out follows its thing's `lit` state.
 */

/** How far the ray of light reaches, metres. */
const RAY_LENGTH = 9;
/** At most this many campfires lit by hand. */
const MAX_CAMPS = 6;

const byDistance = (a: { d: number }, b: { d: number }): number => a.d - b.d;

export class Lights {
  /** Every flame that may shine now; the nearest few do (`step`). */
  readonly torches: Torch[] = [];
  /** Dark point lights that stand in for the torches that are not near, so the count of lights never changes. */
  private readonly spares: THREE.PointLight[] = [];
  /** The torches nearest the view first, kept between frames. */
  private torchOrder: { t: Torch; d: number }[] = [];
  private torchSeed = 0;
  private tmpV = new THREE.Vector3();
  private windNow = { x: 0, z: 0 };
  /** The flames of placed fires standing now, by thing id, so a torch put out goes dark (and lights again). */
  readonly placedFires = new Map<string, { kind: string; torch: Torch }>();
  /** Flames that are out: hidden whatever else would show them. */
  readonly outFlames = new Set<THREE.Object3D>();
  /** Campfires lit by hand (a placed thing of the kind `campfire`, with what it stood up and where its smoke rises). */
  camps: { p: PlacedProp; st: Standing; smoke: Chimney }[] = [];
  // Magic lights. Adding a light the shaders were not built for freezes the game while every one is rebuilt, so neither
  // is new: the orb takes a place in the pool of point lights (the nearest few shine, the rest do not, as with torches),
  // and the ray's spot light is always in the scene, dark until it is raised.
  private orb: { group: THREE.Group; torch: Torch; fx: Flame } | null = null;
  private ray: { group: THREE.Group; beam: THREE.Mesh } | null = null;
  /** The torch in the hero's hand, if they carry one: a flame and a light that go where they go, and sight is the better for it. */
  private hand: { fx: Flame; torch: Torch } | null = null;
  private readonly rayLight = new THREE.SpotLight(0xfff1cc, 0, 24, 0.42, 0.55, 1.1);

  constructor(private readonly w: SpikeWorld) {
    w.scene.add(this.rayLight, this.rayLight.target);
    for (let i = 0; i < 16; i++) {
      const spare = new THREE.PointLight(0xffffff, 0, 1);
      spare.visible = false;
      this.spares.push(spare);
      w.scene.add(spare);
    }
  }

  /** Take a torch out of the pool (it no longer shines). */
  unlist(t: Torch): void {
    const i = this.torches.indexOf(t);
    if (i >= 0) this.torches.splice(i, 1);
  }

  /** Put a torch in the pool, or take it out (dark), as `lit` says. */
  list(t: Torch, lit: boolean): void {
    const listed = this.torches.includes(t);
    if (lit && !listed) this.torches.push(t);
    if (!lit && listed) {
      this.unlist(t);
      t.light.visible = false;
    }
  }

  /** A flame with its light (on a bracket, or on a thing that carries one); into `st` when it belongs to a chunk. */
  placeTorch(x: number, y: number, z: number, st: Standing | null, look: { size?: number; count?: number; power?: number; lightY?: number } = {}): Torch {
    const scene = this.w.scene;
    const power = look.power ?? 9;
    const fx = makeFlame(look.size ?? 0.42, look.count ?? 10, this.torchSeed);
    fx.object.position.set(x, y + 0.02, z);
    scene.add(fx.object);
    const light = new THREE.PointLight(0xffa458, power, 11, 2);
    light.visible = false; // (the pool in `step` decides which shine: a light that is on counts in every shader)
    light.position.set(x, y + (look.lightY ?? 0.3), z);
    scene.add(light);
    const torch: Torch = { light, flame: fx.object, tick: fx.tick, base: power, seed: this.torchSeed * 7 / 11 + 1, dispose: fx.dispose };
    this.torchSeed++;
    this.torches.push(torch);
    if (st) {
      st.objects.push(fx.object, light);
      st.torches.push(torch);
    }
    return torch;
  }

  /** Let go of the torches a chunk (or a campfire) stood up. */
  dropTorches(st: Standing): void {
    for (const t of st.torches) {
      // (A torch that is out is not in the pool.)
      this.unlist(t);
      this.outFlames.delete(t.flame);
      t.dispose?.();
    }
    for (const [id, f] of this.placedFires) if (st.torches.includes(f.torch)) this.placedFires.delete(id);
  }

  /** Is this thing burning? (A thing whose kind cannot be lit or out always is.) */
  fireLit(of: { id: string; kind: string } | null | undefined): boolean {
    const states = this.w.states;
    return !of || !states.has(of.kind, 'lit') || states.get(of.id, of.kind, 'lit') === true;
  }

  /** A placed fire (a torch, a campfire) that follows its `lit` state from now on. */
  addPlacedFire(id: string, kind: string, torch: Torch): void {
    this.placedFires.set(id, { kind, torch });
    this.showPlacedFire(id);
  }

  /** A placed fire as its `lit` state says: lit, its flame burns and its light is in the pool; out, neither. */
  showPlacedFire(id: string): void {
    const f = this.placedFires.get(id);
    if (!f) return;
    const lit = this.fireLit({ id, kind: f.kind });
    this.list(f.torch, lit);
    if (lit) this.outFlames.delete(f.torch.flame);
    else this.outFlames.add(f.torch.flame);
    f.torch.flame.visible = lit;
  }

  /** The filament field reads its sources again (a fire lit or put out, a campfire, a scorch). */
  syncFires(): void {
    this.w.field.setSources([]); // the field asks the world's extras again
  }

  /** Light a campfire beside the hero (it is a fire for the filament field too). Returns false when there are too many. */
  lightFire(): boolean {
    const w = this.w;
    if (this.camps.length >= MAX_CAMPS) return false;
    // A placed thing of the kind `campfire`, built like any other, at the hero's height (they may be upstairs).
    const p: PlacedProp = { kind: 'campfire', x: w.hero.x + 0.9, z: w.hero.z + 0.2, seed: this.camps.length };
    const y = w.heroFig.place.position.y;
    const st = newStanding();
    w.props.build(p, st, y);
    const smoke = THINGS.get(p.kind).smoke;
    this.camps.push({ p, st, smoke: { x: p.x, y: y + (smoke?.y ?? 0.9), z: p.z, seed: 40 + this.camps.length * 11 } });
    this.syncFires();
    return true;
  }

  /** Put out every campfire that was lit by hand. */
  douseFires(): void {
    for (const c of this.camps) this.w.streaming.takeDown(c.st);
    this.camps = [];
    this.syncFires();
  }

  get campfires(): number {
    return this.camps.length;
  }

  /** What the campfires stood up that can be tapped. */
  campObjects(): THREE.Object3D[] {
    return this.camps.flatMap((c) => c.st.objects.filter((o) => o.userData.thing));
  }

  /** The campfires as sources for the filament field. */
  campSources(): FSource[] {
    return this.camps.flatMap((c) => THINGS.source(c.p) ?? []);
  }

  /** The smoke of the campfires that burn, with how far each is from the view. */
  campSmoke(): { c: Chimney; d: number }[] {
    const f = this.w.focus;
    return this.camps.filter((k) => this.fireLit({ id: placedId(k.p), kind: k.p.kind })).map((k) => ({ c: k.smoke, d: Math.hypot(k.p.x - f.x, k.p.z - f.z) }));
  }

  /** Does the hero carry a light (the orb or a torch), as those who might see them from afar ask? */
  get carried(): boolean {
    return !!(this.orb || this.hand);
  }

  get torchOn(): boolean {
    return this.hand !== null;
  }

  get orbOn(): boolean {
    return this.orb !== null;
  }

  get rayOn(): boolean {
    return this.ray !== null;
  }

  /** Take up (or put out) a torch in the hand. */
  toggleTorch(): void {
    const scene = this.w.scene;
    if (this.hand) {
      scene.remove(this.hand.fx.object, this.hand.torch.light);
      this.unlist(this.hand.torch);
      this.hand.fx.dispose();
      this.hand = null;
      return;
    }
    const fx = makeFlame(0.34, 10, 77);
    const light = new THREE.PointLight(0xffa458, 9, 11, 2);
    scene.add(fx.object, light);
    const torch: Torch = { light, flame: fx.object, tick: fx.tick, base: 9, seed: 31 };
    this.torches.push(torch);
    this.hand = { fx, torch };
  }

  /** Call up (or dismiss) a ball of cool light that follows the hero. */
  toggleOrb(): void {
    const scene = this.w.scene;
    if (this.orb) {
      scene.remove(this.orb.group);
      this.unlist(this.orb.torch);
      this.orb.fx.dispose();
      this.orb = null;
      return;
    }
    const group = new THREE.Group();
    const fx = makeOrb(1.8);
    group.add(fx.object);
    const light = new THREE.PointLight(0xa8dcff, 14, 15, 1.6);
    group.add(light);
    scene.add(group);
    // (Its flame is a stand-in: the pool scales a torch's flame with its flicker, and the orb should not stretch.)
    const torch: Torch = { light, flame: new THREE.Object3D(), tick: (t) => fx.tick(t), base: 14, seed: 5, always: true };
    this.torches.push(torch);
    this.orb = { group, torch, fx };
  }

  /** Raise (or lower) a beam of light from the hero's hand along the way they face, like a lantern's. */
  toggleRay(): void {
    const scene = this.w.scene;
    if (this.ray) {
      scene.remove(this.ray.group);
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
    scene.add(group);
    this.ray = { group, beam };
  }

  /** The light the orb and the ray add to the field, for the next reading: they are filaments of light. */
  magicLightSources(): FSource[] {
    const out: FSource[] = [];
    const dir = this.w.hero.dir;
    if (this.orb) out.push({ x: this.orb.group.position.x, z: this.orb.group.position.z, kind: 'light', weight: 1 });
    if (this.hand) out.push({ x: this.hand.fx.object.position.x, z: this.hand.fx.object.position.z, kind: 'fire', weight: TORCH_FIRE });
    if (this.ray) {
      const hp = this.w.heroFig.place.position, dl = Math.hypot(dir.x, dir.z) || 1;
      for (const s of [1.5, 3.5, 5.5, 7.5]) out.push({ x: hp.x + (dir.x / dl) * s, z: hp.z + (dir.z / dl) * s, kind: 'light', weight: 0.6 });
    }
    return out;
  }

  /** The magic lights and the torch in hand follow the hero. */
  stepCarried(): void {
    const w = this.w, hp = w.heroFig.place.position, dir = w.hero.dir, time = w.time;
    if (this.hand) {
      // Held out a little in front, at about the height of a hand.
      const dl = Math.hypot(dir.x, dir.z) || 1;
      const x = hp.x + (dir.x / dl) * 0.4, z = hp.z + (dir.z / dl) * 0.4;
      this.hand.fx.object.position.set(x, hp.y + 1.05, z);
      this.hand.torch.light.position.set(x, hp.y + 1.35, z);
    }
    if (this.orb) {
      // Floats at the hero's shoulder, bobbing, a little behind the way they are going.
      const bob = Math.sin(time * 2.1) * 0.12;
      this.orb.group.position.set(hp.x - dir.x * 0.4 + 0.5, hp.y + 1.9 + bob, hp.z - dir.z * 0.4 - 0.3);
    }
    if (this.ray) {
      const dl = Math.hypot(dir.x, dir.z) || 1;
      const dx = dir.x / dl, dz = dir.z / dl;
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
      (this.ray.beam.material as THREE.MeshBasicMaterial).opacity = 0.065 + 0.015 * Math.sin(time * 9);
    }
  }

  /**
   * Torches flicker; real point lights only for the nearest few (and none past what can be seen), the spares dark.
   * (Distances are measured once each, not inside the sort, and the order is kept between frames and sorted in place:
   * nothing new is made each frame.)
   */
  step(env: Environment3D, wind: { x: number; z: number }): void {
    const w = this.w, time = w.time, lights = w.settings.lights;
    const far = w.vision.outer > 0 ? Math.max(w.vision.outer, w.sight.lightRange) + 8 : Infinity;
    const order = this.torchOrder;
    while (order.length < this.torches.length) order.push({ t: this.torches[0], d: 0 });
    order.length = this.torches.length;
    this.torches.forEach((t, i) => {
      order[i].t = t;
      order[i].d = t.light.getWorldPosition(this.tmpV).distanceTo(w.focus);
    });
    order.sort(byDistance);
    let shining = 0;
    this.windNow.x = wind.x;
    this.windNow.z = wind.z;
    for (let i = 0; i < order.length; i++) {
      const { t, d } = order[i];
      t.light.visible = i < lights && d < far;
      if (t.light.visible) shining++;
      if (d > far) continue; // out of sight is out of mind: not animated
      const f = 0.82 + 0.18 * Math.sin(time * 11 + t.seed) * Math.sin(time * 7.3 + t.seed * 2);
      t.light.intensity = t.base * f * (t.always ? 1 : 0.35 + 0.65 * env.night);
      t.flame.scale.set(1, 0.85 + f * 0.3, 1);
      t.tick?.(time, this.windNow);
    }
    this.spares.forEach((l, i) => { l.visible = i < lights - shining; });
  }
}
