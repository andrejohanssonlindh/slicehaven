import * as THREE from 'three';

/**
 * Chimney smoke: every standing chimney in range gets a short string of chunky grey cubes that rise, swell, lean with
 * the wind and thin out. One instanced draw for all of them; chimneys out of range or out of sight are not stepped.
 */

/** Puffs per chimney. */
const PUFFS = 7;
/** Seconds a puff takes from the chimney to gone. */
const LIFE = 5.5;
/** Seconds a chimney's smoke takes to build up or thin away when it comes into or goes out of the list. */
const FADE = 2.5;

export interface Chimney {
  x: number;
  y: number;
  z: number;
  /** Phase, so neighbours do not puff in step. */
  seed: number;
}

export class Smoke {
  readonly mesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private col = new THREE.Color();
  private lastT = 0;
  private fading = new Map<string, { ch: Chimney; p: number }>();

  constructor(private max = 24) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ fog: false }), max * PUFFS);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.renderOrder = 2;
  }

  /**
   * @param chimneys the ones to draw, nearest first (the rest of the budget is dropped)
   * @param wind drift, x and z (the weather's wind, 0..1 each way)
   * @param light 0..1, how bright the day is (smoke is dark grey at night)
   * @param strength 0..1, how much smoke (rain beats it down)
   */
  update(t: number, chimneys: Chimney[], wind: { x: number; z: number }, light: number, strength: number): void {
    const dt = Math.min(0.25, Math.max(0, t - this.lastT));
    this.lastT = t;
    // A chimney that drops out of the list (far, or its house is gone) lets its smoke thin away instead of cutting it.
    const wanted = new Set<string>();
    for (const ch of chimneys.slice(0, this.max)) {
      const key = `${ch.x},${ch.z}`;
      wanted.add(key);
      const e = this.fading.get(key);
      if (e) { e.ch = ch; e.p = Math.min(1, e.p + dt / FADE); } else this.fading.set(key, { ch, p: 0 });
    }
    for (const [key, e] of this.fading) {
      if (wanted.has(key)) continue;
      e.p -= dt / FADE;
      if (e.p <= 0) this.fading.delete(key);
    }
    const live = [...this.fading.values()].slice(0, this.max);
    let k = 0;
    const grey = 0.34 + 0.4 * light;
    for (const { ch, p } of live) {
      const presence = p * p * (3 - 2 * p);
      for (let i = 0; i < PUFFS; i++) {
        const age = ((t / LIFE + i / PUFFS + ch.seed * 0.137) % 1 + 1) % 1; // 0 at the chimney, 1 gone
        const rise = age * 2.6 * (0.7 + strength * 0.3);
        // The wind takes it further the older it is; a little wobble keeps it from a straight line.
        const lean = age * age * 2.4 + age * 0.4;
        const wob = Math.sin(t * 1.3 + i * 2.1 + ch.seed) * 0.05 * age;
        this.dummy.position.set(ch.x + wind.x * lean * 2 + wob, ch.y + rise, ch.z + wind.z * lean * 2 - wob);
        // Swells, then shrinks away at the end: no transparency, so it thins by size.
        const s = (0.1 + age * 0.34) * Math.min(1, (1 - age) * 3.5) * Math.max(0.15, strength) * presence;
        this.dummy.scale.setScalar(Math.max(0.0001, s));
        this.dummy.rotation.set(age * 2 + i, age * 3 + ch.seed, 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(k, this.dummy.matrix);
        const g = grey * (1 - age * 0.18) * (0.92 + 0.08 * ((i * 7 + ch.seed) % 3));
        this.mesh.setColorAt(k, this.col.setRGB(g, g * 1.01, g * 1.04));
        k++;
      }
    }
    this.mesh.count = k;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.visible = k > 0;
  }
}
