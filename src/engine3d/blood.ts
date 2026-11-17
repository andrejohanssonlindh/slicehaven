import * as THREE from 'three';
import { lit } from './materials';

/**
 * Blood you can see (the director, 2026-11-17): drops that fall from a wound and the stains they leave where they
 * land. Two instanced meshes however many bleed: the drops in the air, and the stains (the oldest is reused when they
 * run out; each dries and shrinks away after a few minutes, and rain washes away those under the open sky). Looks
 * only: the rules keep the bleeding (`Injuries.bleed`), the caller says where it runs from and how fast. The stains go
 * into the save (`toJSON`).
 */

const DROPS = 64;
const STAINS = 220;
/** Seconds a stain lies before it has dried away, and how long the drying-away takes at the end. */
const STAIN_SECONDS = 240;
const STAIN_FADE = 30;
/** Drops a second at a bleeding rate of 1 (the rules' rate: fatigue a round). */
const DROPS_PER_RATE = 2.2;
const GRAVITY = 9.8;

/** How many times faster a stain under the open sky goes in a downpour (rain 1) than it dries. */
const RAIN_WASH = 30;

interface Drop { x: number; y: number; z: number; vx: number; vy: number; vz: number; floor: number; open: boolean; live: boolean }
interface Stain { x: number; y: number; z: number; r: number; turn: number; age: number; open: boolean; live: boolean }

/** A stain as it is saved: where, how big, how old (seconds), and whether it lies under the open sky (1) or a roof (0). */
export type SavedStain = [x: number, y: number, z: number, r: number, age: number, open: number];

export class Blood {
  readonly group = new THREE.Group();
  private readonly dropMesh: THREE.InstancedMesh;
  private readonly stainMesh: THREE.InstancedMesh;
  private readonly drops: Drop[] = [];
  private readonly stains: Stain[] = [];
  private nextDrop = 0;
  private nextStain = 0;
  /** Drops owed to each bleeder (a rate under one a frame adds up). */
  private readonly owed = new Map<string, number>();
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

  constructor() {
    this.dropMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 0.03, 0.022), lit({ color: '#8f1414' }), DROPS);
    // A stain is a flat, uneven patch just over the ground.
    const patch = lit({ color: '#5e0d0d' });
    patch.polygonOffset = true;
    patch.polygonOffsetFactor = -2;
    patch.polygonOffsetUnits = -2;
    this.stainMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 7), patch, STAINS);
    this.stainMesh.receiveShadow = true;
    for (const mesh of [this.dropMesh, this.stainMesh]) {
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.group.add(mesh);
    }
    for (let i = 0; i < DROPS; i++) this.drops.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, floor: 0, open: true, live: false });
    for (let i = 0; i < STAINS; i++) this.stains.push({ x: 0, y: 0, z: 0, r: 0, turn: 0, age: 0, open: true, live: false });
  }

  /**
   * Someone bleeds for `dt` seconds: from this point (world), at this rate, over a floor at this height, under the
   * open sky or not. `id` keeps their count, so a slow bleed still drips now and then.
   */
  bleed(id: string, from: THREE.Vector3, floor: number, rate: number, dt: number, open = true): void {
    let n = (this.owed.get(id) ?? Math.random()) + rate * DROPS_PER_RATE * dt;
    for (; n >= 1; n--) {
      const d = this.drops[this.nextDrop];
      this.nextDrop = (this.nextDrop + 1) % DROPS;
      const a = Math.random() * Math.PI * 2, out = Math.random() * 0.35;
      Object.assign(d, { x: from.x, y: from.y, z: from.z, vx: Math.cos(a) * out, vy: Math.random() * 0.4, vz: Math.sin(a) * out, floor, open, live: true });
    }
    this.owed.set(id, n);
  }

  /** A stain where something bled onto the ground (a drop landing; a body lying). */
  stain(x: number, y: number, z: number, r: number, open = true): void {
    // One landing on a fresh stain makes it bigger rather than a new one (a pool grows where someone stands or lies).
    for (const s of this.stains) {
      if (s.live && s.age < STAIN_SECONDS * 0.5 && Math.abs(s.y - y) < 0.05 && Math.hypot(s.x - x, s.z - z) < s.r) {
        s.r = Math.min(0.4, Math.sqrt(s.r * s.r + r * r * 0.6));
        s.age = 0;
        s.open = open;
        return;
      }
    }
    const s = this.stains[this.nextStain];
    this.nextStain = (this.nextStain + 1) % STAINS;
    Object.assign(s, { x, y, z, r, turn: Math.random() * Math.PI * 2, age: 0, open, live: true });
  }

  /** The stains as they lie, for the save. */
  toJSON(): SavedStain[] {
    const round = (v: number): number => Math.round(v * 100) / 100;
    return this.stains.filter((s) => s.live).map((s) => [round(s.x), round(s.y), round(s.z), round(s.r), Math.round(s.age), s.open ? 1 : 0]);
  }

  /** Stains from a save laid back (in place of what lies now). */
  fromJSON(saved: readonly SavedStain[]): void {
    this.clear();
    for (const [x, y, z, r, age, open] of saved.slice(-STAINS)) {
      const s = this.stains[this.nextStain];
      this.nextStain = (this.nextStain + 1) % STAINS;
      Object.assign(s, { x, y, z, r, turn: (x * 7.3 + z * 3.1) % (Math.PI * 2), age, open: open === 1, live: true });
    }
  }

  /** Drops fall and land; stains dry, and rain (0–1 and over) washes away those under the open sky. */
  step(dt: number, rain = 0): void {
    let n = 0;
    const one = new THREE.Vector3(1, 1, 1), at = new THREE.Vector3();
    for (const d of this.drops) {
      if (!d.live) continue;
      d.vy -= GRAVITY * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += d.vz * dt;
      if (d.y <= d.floor) {
        d.live = false;
        this.stain(d.x, d.floor + 0.012, d.z, 0.025 + Math.random() * 0.03, d.open);
        continue;
      }
      this.dropMesh.setMatrixAt(n++, this.m.compose(at.set(d.x, d.y, d.z), this.q.identity(), one));
    }
    this.dropMesh.count = n;
    this.dropMesh.instanceMatrix.needsUpdate = true;

    n = 0;
    const size = new THREE.Vector3(), spin = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (const s of this.stains) {
      if (!s.live) continue;
      s.age += dt * (s.open ? 1 + Math.min(1, Math.max(0, rain)) * RAIN_WASH : 1);
      if (s.age >= STAIN_SECONDS) { s.live = false; continue; }
      const k = Math.min(1, (STAIN_SECONDS - s.age) / STAIN_FADE) * Math.min(1, 0.4 + s.age * 3);
      // Uneven: a little longer one way than the other.
      size.set(s.r * k * 1.15, s.r * k * 0.85, 1);
      spin.setFromAxisAngle(up, s.turn).multiply(this.flat);
      this.stainMesh.setMatrixAt(n++, this.m.compose(at.set(s.x, s.y, s.z), spin, size));
    }
    this.stainMesh.count = n;
    this.stainMesh.instanceMatrix.needsUpdate = true;
  }

  /** How many stains lie about (tests). */
  get stainCount(): number {
    return this.stains.reduce((c, s) => c + (s.live ? 1 : 0), 0);
  }

  /** Everything gone (a new map, a new game). */
  clear(): void {
    for (const d of this.drops) d.live = false;
    for (const s of this.stains) s.live = false;
    this.owed.clear();
  }

  dispose(): void {
    for (const mesh of [this.dropMesh, this.stainMesh]) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.group.removeFromParent();
  }
}
