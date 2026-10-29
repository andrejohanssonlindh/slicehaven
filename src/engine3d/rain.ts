import * as THREE from 'three';

/**
 * Rain as short streaks in a box round the view's focus, recycled as they hit
 * the ground. Drawn as lines, so each streak is one art pixel wide.
 */
export class Rain {
  readonly lines: THREE.LineSegments;
  private pos: Float32Array;
  private speed: Float32Array;
  private count = 0;
  /** Splashes where drops land: a ring buffer of tiny crosses on the ground that open and fade. */
  readonly splashes: THREE.LineSegments;
  private splashPos: Float32Array;
  private splashAge: Float32Array;
  private splashAt: Float32Array;
  private nextSplash = 0;
  private static SPLASHES = 140;
  private static SPLASH_LIFE = 0.28;

  constructor(private max = 1500) {
    const S = Rain.SPLASHES;
    this.splashPos = new Float32Array(S * 24);
    this.splashAge = new Float32Array(S).fill(Rain.SPLASH_LIFE);
    this.splashAt = new Float32Array(S * 3);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(this.splashPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.splashes = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0xaac4dc, transparent: true, opacity: 0.5, depthWrite: false }));
    this.splashes.frustumCulled = false;
    this.splashes.renderOrder = 3;
    this.pos = new Float32Array(max * 6);
    this.speed = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({ color: 0xaac4dc, transparent: true, opacity: 0.4, depthWrite: false });
    this.lines = new THREE.LineSegments(geo, mat);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 3;
  }

  /**
   * @param amount 0..1, how hard it rains
   * @param focus centre of the box; `span` its half size in metres
   */
  update(dt: number, amount: number, focus: THREE.Vector3, span: number, wind: { x: number; z: number }, brightness: number, groundAt?: (x: number, z: number) => number): void {
    const want = Math.floor(this.max * Math.min(1, amount));
    const rnd = Math.random;
    const H = 14;
    const respawn = (i: number, anyHeight: boolean): void => {
      const x = focus.x + (rnd() * 2 - 1) * span - wind.x * 3;
      const z = focus.z + (rnd() * 2 - 1) * span - wind.z * 3;
      const y = focus.y + (anyHeight ? rnd() * H : H);
      this.pos.set([x, y, z, x, y, z], i * 6);
      this.speed[i] = 14 + rnd() * 6;
    };
    while (this.count < want) respawn(this.count++, true);
    this.count = Math.min(this.count, want);
    const len = 0.022;
    for (let i = 0; i < this.count; i++) {
      const o = i * 6;
      const v = this.speed[i];
      const vx = wind.x * 4, vz = wind.z * 4;
      // Head at o+3..5 falls; the tail trails it by a short streak.
      this.pos[o + 3] += vx * dt;
      this.pos[o + 4] -= v * dt;
      this.pos[o + 5] += vz * dt;
      this.pos[o] = this.pos[o + 3] - vx * len;
      this.pos[o + 1] = this.pos[o + 4] + v * len;
      this.pos[o + 2] = this.pos[o + 5] - vz * len;
      const floor = groundAt ? groundAt(this.pos[o + 3], this.pos[o + 5]) : focus.y - 2;
      if (this.pos[o + 4] < floor) {
        if (groundAt && Math.random() < 0.12) this.splash(this.pos[o + 3], floor, this.pos[o + 5]);
        respawn(i, false);
      }
    }
    this.stepSplashes(dt, brightness);
    const geo = this.lines.geometry;
    geo.setDrawRange(0, this.count * 2);
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.lines.material as THREE.LineBasicMaterial).color.setRGB(0.4 * brightness + 0.06, 0.48 * brightness + 0.08, 0.56 * brightness + 0.1);
    this.lines.visible = this.count > 0;
  }

  private splash(x: number, y: number, z: number): void {
    const i = this.nextSplash;
    this.nextSplash = (i + 1) % Rain.SPLASHES;
    this.splashAge[i] = 0;
    this.splashAt.set([x, y + 0.03, z], i * 3);
  }

  private stepSplashes(dt: number, brightness: number): void {
    const L = Rain.SPLASH_LIFE;
    for (let i = 0; i < Rain.SPLASHES; i++) {
      const a = (this.splashAge[i] += dt);
      const o = i * 24;
      if (a >= L) { this.splashPos.fill(0, o, o + 24); continue; }
      const [x, y, z] = [this.splashAt[i * 3], this.splashAt[i * 3 + 1], this.splashAt[i * 3 + 2]];
      const k = a / L;
      const r = 0.03 + k * 0.1, g = 0.02 + k * 0.05;
      // Two short dashes, a pair on each axis, opening as they fade out by thinning.
      const len = (1 - k) * 0.06;
      this.splashPos.set([x - r - len, y, z, x - r, y, z, x + r, y, z, x + r + len, y, z, x, y, z - g - len, x, y, z - g, x, y, z + g, x, y, z + g + len], o);
    }
    (this.splashes.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.splashes.material as THREE.LineBasicMaterial).color.setRGB(0.5 * brightness + 0.1, 0.58 * brightness + 0.12, 0.66 * brightness + 0.14);
    this.splashes.visible = this.count > 0;
  }
}
