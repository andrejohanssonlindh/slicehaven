import * as THREE from 'three';

/**
 * Leaves the wind has torn loose: a few dozen small flat bits that tumble across the view when it blows, and rest
 * (are not drawn) when the air is still. One instanced draw, recycled round the view's focus.
 */

const COLOURS = [0x6f8f3a, 0x8aa14a, 0xb89a3c, 0xa8683a, 0x58763a].map((c) => new THREE.Color(c));

export class Leaves {
  readonly mesh: THREE.InstancedMesh;
  private p: Float32Array;
  private v: Float32Array;
  private dummy = new THREE.Object3D();
  private live = 0;

  constructor(private max = 48) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.02, 0.07), new THREE.MeshBasicMaterial({ fog: false }), max);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.p = new Float32Array(max * 3);
    this.v = new Float32Array(max * 3);
    for (let i = 0; i < max; i++) this.mesh.setColorAt(i, COLOURS[i % COLOURS.length]);
  }

  /**
   * @param force 0..1, how hard the wind blows (nothing flies below about 0.3)
   * @param light 0..1, brightness of the day, so they do not glow at night
   */
  update(dt: number, t: number, force: number, focus: THREE.Vector3, span: number, wind: { x: number; z: number }, light: number, groundAt: (x: number, z: number) => number): void {
    const want = Math.floor(this.max * Math.min(1, Math.max(0, (force - 0.3) / 0.5)));
    const rnd = Math.random;
    const respawn = (i: number, anywhere: boolean): void => {
      const x = focus.x + (rnd() * 2 - 1) * span - (anywhere ? 0 : wind.x * span);
      const z = focus.z + (rnd() * 2 - 1) * span - (anywhere ? 0 : wind.z * span);
      this.p.set([x, groundAt(x, z) + 0.5 + rnd() * 4, z], i * 3);
      this.v.set([0, 0, 0, ], i * 3);
    };
    while (this.live < want) respawn(this.live++, true);
    this.live = Math.min(this.live, want);
    const len = Math.hypot(wind.x, wind.z) || 1;
    for (let i = 0; i < this.live; i++) {
      const o = i * 3;
      // Carried along by the wind (a little faster than it, with a gust wobble), sinking slowly, never quite straight.
      const sp = (2 + force * 5) / len;
      this.p[o] += (wind.x * sp + Math.sin(t * 1.7 + i) * 0.5) * dt;
      this.p[o + 2] += (wind.z * sp + Math.cos(t * 1.3 + i * 1.9) * 0.5) * dt;
      this.p[o + 1] += (Math.sin(t * 2.3 + i * 0.7) * 0.6 - 0.35) * dt;
      const gy = groundAt(this.p[o], this.p[o + 2]);
      const out = Math.abs(this.p[o] - focus.x) > span || Math.abs(this.p[o + 2] - focus.z) > span;
      if (this.p[o + 1] < gy + 0.04 || out) respawn(i, false);
      this.dummy.position.set(this.p[o], this.p[o + 1], this.p[o + 2]);
      this.dummy.rotation.set(t * 3 + i, t * 2.1 + i * 2, t * 2.7);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.count = this.live;
    this.mesh.instanceMatrix.needsUpdate = true;
    (this.mesh.material as THREE.MeshBasicMaterial).color.setScalar(0.3 + 0.7 * light);
    this.mesh.visible = this.live > 0;
  }
}
