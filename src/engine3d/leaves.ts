import * as THREE from 'three';

/**
 * Leaves the wind tears off the trees: they start in a crown near the view, are carried downwind, tumble and sink,
 * and are gone when they land. More come off the harder it blows (nothing below a stiff breeze); with no trees near,
 * nothing flies. One instanced draw, a fixed pool of slots.
 */

const COLOURS = [0x6f8f3a, 0x8aa14a, 0xb89a3c, 0xa8683a, 0x58763a].map((c) => new THREE.Color(c));

export interface Crown {
  x: number;
  y: number;
  z: number;
  /** Radius the leaves leave from, metres. */
  r: number;
}

export class Leaves {
  readonly mesh: THREE.InstancedMesh;
  private p: Float32Array;
  private v: Float32Array;
  private alive: Uint8Array;
  private dummy = new THREE.Object3D();
  private shown = 0;

  constructor(private max = 96) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.02, 0.07), new THREE.MeshBasicMaterial({ fog: false }), max);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.p = new Float32Array(max * 3);
    this.v = new Float32Array(max * 3);
    this.alive = new Uint8Array(max);
    for (let i = 0; i < max; i++) this.mesh.setColorAt(i, COLOURS[i % COLOURS.length]);
  }

  /**
   * @param force how hard the wind blows as the world feels it (`uGale`): leaves start at about 0.3, a gale is over 2
   * @param light 0..1, brightness of the day, so they do not glow at night
   * @param crowns the broadleaf crowns near the view
   */
  update(dt: number, t: number, force: number, focus: THREE.Vector3, span: number, wind: { x: number; z: number }, light: number, groundAt: (x: number, z: number) => number, crowns: readonly Crown[], seen: (x: number, z: number) => boolean = () => true): void {
    const allowed = Math.floor(this.max * Math.min(1, Math.max(0, (force - 0.3) / 1.2)));
    const len = Math.hypot(wind.x, wind.z) || 1;
    const dx = wind.x / len, dz = wind.z / len;
    // How fast the air moves (m/s): a breeze ambles, a gale throws them.
    const speed = 1.5 + force * 4.5;
    const rnd = Math.random;
    // Gusts: the rate of leaving comes in waves.
    const gust = 0.55 + 0.45 * Math.sin(t * 0.8) * Math.sin(t * 0.37 + 1);
    let any = false;
    for (let i = 0; i < this.max; i++) {
      const o = i * 3;
      if (!this.alive[i]) {
        if (i < allowed && crowns.length && rnd() < dt * 1.2 * gust) {
          const c = crowns[Math.floor(rnd() * crowns.length)];
          const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * c.r;
          this.p[o] = c.x + Math.cos(a) * d;
          this.p[o + 1] = c.y + (rnd() - 0.5) * 1.4;
          this.p[o + 2] = c.z + Math.sin(a) * d;
          this.v[o] = dx * speed * 0.2;
          this.v[o + 1] = 0.4;
          this.v[o + 2] = dz * speed * 0.2;
          this.alive[i] = 1;
        } else {
          this.dummy.scale.setScalar(0.0001);
          this.dummy.updateMatrix();
          this.mesh.setMatrixAt(i, this.dummy.matrix);
          continue;
        }
      }
      any = true;
      // The air takes hold of it (not all at once), with a flutter across the wind.
      const k = Math.min(1, dt * 1.6);
      const flutter = Math.sin(t * 2.1 + i * 1.7) * 0.35 * speed * 0.3;
      this.v[o] += (dx * speed * (0.8 + 0.4 * gust) - dz * flutter - this.v[o]) * k;
      this.v[o + 2] += (dz * speed * (0.8 + 0.4 * gust) + dx * flutter - this.v[o + 2]) * k;
      // Tumbling up and down on the gusts, sinking overall.
      this.v[o + 1] += ((Math.sin(t * 2.7 + i * 0.7) * (0.5 + force * 0.5)) - 0.45 - this.v[o + 1]) * k;
      this.p[o] += this.v[o] * dt;
      this.p[o + 1] += this.v[o + 1] * dt;
      this.p[o + 2] += this.v[o + 2] * dt;
      const out = Math.abs(this.p[o] - focus.x) > span * 1.4 || Math.abs(this.p[o + 2] - focus.z) > span * 1.4;
      if (this.p[o + 1] < groundAt(this.p[o], this.p[o + 2]) + 0.04 || out) {
        this.alive[i] = 0;
        this.dummy.scale.setScalar(0.0001);
      } else this.dummy.scale.setScalar(seen(this.p[o], this.p[o + 2]) ? 1 : 0.0001); // what the hero cannot see is not drawn
      this.dummy.position.set(this.p[o], this.p[o + 1], this.p[o + 2]);
      this.dummy.rotation.set(t * 3 + i, t * 2.1 + i * 2, t * 2.7);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.shown = any ? this.max : 0;
    this.mesh.count = this.shown;
    this.mesh.instanceMatrix.needsUpdate = true;
    (this.mesh.material as THREE.MeshBasicMaterial).color.setScalar(0.3 + 0.7 * light);
    this.mesh.visible = any;
  }
}
