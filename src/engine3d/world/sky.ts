import * as THREE from 'three';
import { THINGS } from '../../content/things';
import { CHUNK } from '../../core/world3d/chunks';
import { type Environment3D, environment } from '../../core/world3d/environment3d';
import { SCORCH_SIZE, scorchImage } from '../../core/world3d/scorch';
import { cloudDrift, cloudThreshold } from '../../core/world3d/sky';
import { groundHeight } from '../../core/world3d/terrain';
import type { FSource } from '../../core/world3d/filaments3d';
import { WORLD, lit, pixTexture } from '../materials';
import { Leaves } from '../leaves';
import { Rain } from '../rain';
import { type Chimney, Smoke } from '../smoke';
import { type Water, makeWater } from '../water';
import type { SpikeWorld } from './index';

/**
 * The sky and the weather as the world shows them: the sun (with its shadow box), the sky's light and the fog, mist
 * (asked for, or the rain's) and the wind sweeping it, wet ground and pools, lightning and the scorches it leaves, and
 * the weather's effects (rain, falling leaves, chimney smoke, the lake). The weather itself is `core/world3d/weather.ts`.
 */

/** The camera's distance from what it looks at (the fog is measured from it), metres. */
export const CAM_DIST = 60;
/** The wind sweeps mist clear over this many metres each side of the view's focus, with a soft edge of this many. */
const MIST_REACH = 40;
const MIST_SOFT = 12;
/** How long a lightning bolt stays on screen, seconds. */
const BOLT_LIFE = 0.5;

export class Sky {
  readonly sun = new THREE.DirectionalLight(0xffffff, 2);
  readonly hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  readonly fog = new THREE.Fog(0xcccccc, 80, 200);
  /** Where the sun shines from (unit, world). */
  readonly sunDir = new THREE.Vector3(0, 1, 0);
  /** The wind as the world feels it now (world x/z, and how hard: past force 3 it climbs fast). */
  readonly wind = { x: 0, z: 0, gale: 0 };
  /** Storm weather throws bolts by itself (off: only `strike()` does). */
  autoBolts = true;
  /** The flash of the current bolt: one light that is always in the scene (adding lights at run time would recompile every shader). */
  private boltLight = new THREE.PointLight(0xcfe0ff, 0, 40, 1.5);
  /** Where lightning has struck: the burnt ground it left (kept to a few; the oldest is cleared). */
  private scorches: { x: number; z: number; mesh: THREE.Mesh }[] = [];
  private bolt: { group: THREE.Group; age: number; repeats: number[] } | null = null;
  private cloudOff = new THREE.Vector2();
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
  private bgColor = new THREE.Color();
  private tmpC1 = new THREE.Color();
  private tmpC2 = new THREE.Color();
  private water: Water | null;
  private rain = new Rain(1400);
  private smoke = new Smoke(24);
  private smokeSeen = new Set<string>();
  private leaves = new Leaves(96);
  private leafSpots: { x: number; y: number; z: number; r: number }[] = [];
  private leafSpotsAt = -9;

  constructor(private readonly w: SpikeWorld, shadowMap: number) {
    const scene = w.scene;
    scene.fog = this.fog;
    // Light: sky and bounce, the sun with a soft shadow map that follows the view.
    scene.add(this.hemi);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 2;
    this.sun.shadow.camera.layers.enable(1);
    this.setShadowMap(shadowMap);
    scene.add(this.sun, this.sun.target, this.boltLight);
    this.water = makeWater(w.ground);
    if (this.water) scene.add(this.water.mesh);
    scene.add(this.rain.lines, this.smoke.mesh, this.rain.splashes, this.leaves.mesh);
  }

  setShadowMap(size: number): void {
    const sh = this.sun.shadow;
    if (sh.mapSize.x === size && sh.map) return;
    sh.mapSize.set(size, size);
    sh.map?.dispose();
    sh.map = null as unknown as THREE.WebGLRenderTarget;
  }

  /** The sun's shadow box covers the view (`span` metres each way from its middle). */
  frameShadow(span: number): void {
    const c = this.sun.shadow.camera;
    Object.assign(c, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 90 });
    c.updateProjectionMatrix();
  }

  /** The sun's shadow box follows the view, snapped to whole shadow texels. */
  placeShadow(target: THREE.Vector3): void {
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

  /** The ground lightning burnt, as sources for the filament field (ash). */
  scorchSources(): FSource[] {
    return this.scorches.map((c): FSource => ({ x: c.x, z: c.z, kind: 'burnt' }));
  }

  /**
   * A lightning bolt: a jagged streak from the sky to the ground (near the view unless a spot is given), the sky
   * flashing twice, and a hard white light where it lands. Works in any weather, so it can be tested on a clear day.
   */
  strike(at?: { x: number; z: number }, rnd: () => number = () => this.w.skyRng.next()): { x: number; z: number } {
    const w = this.w;
    this.clearBolt();
    const a = rnd() * Math.PI * 2, r = 4 + rnd() * 9;
    const x = at?.x ?? w.focus.x + Math.cos(a) * r, z = at?.z ?? w.focus.z + Math.sin(a) * r;
    const y = w.store.heightAt(x, z);
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
    w.scene.add(group);
    this.scorch(x, z, rnd);
    this.bolt = { group, age: 0, repeats: [0.14, 0.3] };
    this.boltLight.position.set(x, y + 3, z);
    w.weather.flash = 1;
    return { x, z };
  }

  /** A burnt, fern-scarred patch where the bolt landed. It is ash to the filament field too. */
  private scorch(x: number, z: number, rnd: () => number): void {
    const w = this.w;
    const img = scorchImage(rnd);
    const map = pixTexture(img.data, img.size, img.size, { mips: false });
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    const geo = new THREE.PlaneGeometry(SCORCH_SIZE, SCORCH_SIZE);
    geo.rotateX(-Math.PI / 2);
    // Lie on the highest ground under the patch, so a slope does not bury it.
    const r = SCORCH_SIZE * 0.4;
    const y = Math.max(...[[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]].map(([dx, dz]) => w.store.heightAt(x + dx, z + dz)));
    const mat = lit({ map, sprite: true });
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + 0.03, z);
    mesh.rotation.y = rnd() * Math.PI * 2;
    mesh.renderOrder = 1;
    w.scene.add(mesh);
    this.scorches.push({ x, z, mesh });
    while (this.scorches.length > 10) {
      const old = this.scorches.shift()!;
      w.scene.remove(old.mesh);
      old.mesh.geometry.dispose();
      (old.mesh.material as THREE.Material).dispose();
    }
    w.lights.syncFires();
  }

  private clearBolt(): void {
    if (!this.bolt) return;
    this.w.scene.remove(this.bolt.group);
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
      this.w.weather.flash = Math.max(this.w.weather.flash, 0.7);
    }
    if (b.age > BOLT_LIFE) return this.clearBolt();
    // Flicker: the streak blinks while the light dies away.
    b.group.visible = b.age < 0.15 || Math.floor(b.age * 40) % 3 !== 0;
    this.boltLight.intensity = 120 * Math.max(0, 1 - b.age / BOLT_LIFE);
  }

  /**
   * The sky for this frame: bolts thrown and flickering, the clouds drifting downwind (their offset is part of the
   * environment, so the rules can ask the same field), the sun, the sky's light, the fog, mist and the wind's sweep.
   * Returns the environment now.
   */
  step(dt: number): Environment3D {
    const w = this.w, weather = w.weather;
    if (this.autoBolts && weather.sky === 'storm' && w.skyRng.next() < dt / 5) this.strike();
    this.stepBolt(dt);
    const drift = cloudDrift(weather.windForce);
    this.cloudOff.x += weather.wx * drift * dt;
    this.cloudOff.y += weather.wy * drift * dt;
    const env = environment(weather, { x: this.cloudOff.x, z: this.cloudOff.y });
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
    const wk = weather.wind <= 0.6 ? 1 : (0.6 + (weather.wind - 0.6) * 2.8) / weather.wind;
    this.wind.x = weather.windX * wk;
    this.wind.z = weather.windY * wk;
    this.wind.gale = weather.wind * wk;
    const wantMist = Math.max(this.mist, 0.3 * Math.min(1, weather.rain));
    this.mistNow += (wantMist - this.mistNow) * (1 - Math.exp(-dt / 2.5));
    // Wind blows mist away: a clear patch opens on the upwind side and sweeps downwind across the view (`uMistBlow`), the
    // faster the harder it blows, until nothing is left by about force 4. The ask stays; the mist comes back when the wind drops.
    const blowWant = Math.min(1, Math.max(0, (weather.wind - 0.25) / 0.55));
    this.mistBlow += (blowWant - this.mistBlow) * (1 - Math.exp(-dt / (6 - 3 * blowWant)));
    if (weather.wind > 0.05) this.mistDir.set(weather.wx, weather.wy).normalize();
    const reach = MIST_REACH + MIST_SOFT;
    WORLD.uMistBlow.value.set(this.mistDir.x, this.mistDir.y, THREE.MathUtils.lerp(-reach, reach, this.mistBlow), MIST_SOFT);
    const m = this.mistNow;
    const mFog = m * (1 - this.mistBlow);
    this.fog.near = CAM_DIST + THREE.MathUtils.lerp(env.fogNear - 30, -6, mFog);
    this.fog.far = CAM_DIST + THREE.MathUtils.lerp(env.fogFar, 22, mFog);
    WORLD.uMist.value.set(m, 2.2 + m * 1.6, groundHeight(w.ground, w.focus.x, w.focus.z), this.mistTint ? this.mistTintK : 0);
    WORLD.uMistAt.value.set(w.focus.x, w.focus.z);
    if (this.mistTint) WORLD.uMistColor.value.set(this.mistTint.r, this.mistTint.g, this.mistTint.b);
    // With vision on, what lies past it is black, not sky.
    w.scene.background = this.bgColor.copy(this.fog.color).multiplyScalar(w.vision.outer > 0 ? 0.05 : 1);
    return env;
  }

  /** The world's uniforms for the weather: time, clouds, wetness, pools, wind. */
  stepUniforms(dt: number, env: Environment3D): void {
    const w = this.w, weather = w.weather, { x: wx, z: wz, gale } = this.wind;
    WORLD.uTime.value = w.time;
    WORLD.uCloud.value.set(cloudThreshold(env.cloudCover), 0.55 * (1 - env.night * 0.7), this.cloudOff.x, this.cloudOff.y);
    this.wet += (env.wetness - this.wet) * (1 - Math.exp(-dt / (env.wetness > 0.5 ? 6 : 25)));
    WORLD.uWet.value = this.wet;
    // Hollows fill slowly (steady rain takes minutes to leave pools, a storm about a minute and a half) and drain slower still.
    const downpour = Math.max(0, weather.rain - 0.15);
    this.pool = Math.min(1, Math.max(0, this.pool + (downpour > 0 ? (downpour * dt) / 80 : -dt / 240)));
    WORLD.uPool.value = this.pool;
    WORLD.uWind.value.set(wx, wz, gale);
    WORLD.uGale.value = gale;
    WORLD.uDrift.value.x += wx * dt * 0.6;
    WORLD.uDrift.value.y += wz * dt * 0.6;
  }

  /** The crowns that can shed leaves near the view (worked out twice a second, from the chunks the view touches). */
  private leafTrees(): { x: number; y: number; z: number; r: number }[] {
    const w = this.w;
    if (w.time - this.leafSpotsAt < 0.5) return this.leafSpots;
    this.leafSpotsAt = w.time;
    const reach = Math.max(w.camera.right, w.camera.top) * 1.2 + 6;
    const out: { x: number; y: number; z: number; r: number }[] = [];
    for (let j = Math.floor((w.focus.z - reach) / CHUNK); j <= Math.floor((w.focus.z + reach) / CHUNK); j++) {
      for (let i = Math.floor((w.focus.x - reach) / CHUNK); i <= Math.floor((w.focus.x + reach) / CHUNK); i++) {
        for (const t of w.placed.chunk(i, j).trees) {
          // Broadleaves shed; pines and dead trees hold (or have) nothing to lose: their kind has no crown to shed from.
          const crown = THINGS.get(t.kind ?? 'oak').tree?.crown;
          if (crown) out.push({ x: t.x, y: groundHeight(w.ground, t.x, t.z) + crown.y, z: t.z, r: crown.r });
        }
      }
    }
    return (this.leafSpots = out);
  }

  /** The weather's effects round the view: rain, falling leaves, chimney and campfire smoke, the lake. */
  stepEffects(dt: number, env: Environment3D): void {
    const w = this.w, weather = w.weather, focus = w.focus, { x: wx, z: wz, gale } = this.wind;
    const span = Math.max(w.camera.right, w.camera.top) * 1.1;
    const groundAt = (x: number, z: number): number => groundHeight(w.ground, x, z);
    this.rain.update(dt, weather.rain, focus, span, { x: wx, z: wz }, env.ambient * 0.6 + env.sunIntensity * 0.15 + weather.flash, groundAt);
    this.leaves.update(dt, w.time, gale, focus, span, { x: wx, z: wz }, 1 - env.night * 0.7, groundAt, this.leafTrees(), (x, z) => w.sight.seen(x, z) > 0.3);
    // Chimney smoke: the nearest chimneys in sight (a smoking chimney is a long way to see, but not through the dark).
    const sm: { c: Chimney; d: number }[] = [];
    for (const hs of w.houses) {
      const c = hs.chimney;
      // Not the smoke of the house the hero is in: it would hang over the cut-away room (it thins away rather than cutting off).
      if (!c || hs.open) continue;
      const d = Math.hypot(c.x - focus.x, c.z - focus.z);
      if (d >= 60) continue;
      // Once a chimney has been seen its smoke stays (it is remembered, like the ground); one never seen shows nothing.
      const key = `${c.x},${c.z}`;
      if (w.vision.outer > 0 && !this.smokeSeen.has(key)) {
        if (w.sight.seen(c.x, c.z) <= 0.25) continue;
        this.smokeSeen.add(key);
      }
      sm.push({ c, d });
    }
    // A campfire smokes too (the hero lit it, so it is in view); doused, its smoke thins away rather than cutting off.
    sm.push(...w.lights.campSmoke());
    sm.sort((a, b) => a.d - b.d);
    this.smoke.update(w.time, sm.map((s) => s.c), { x: wx, z: wz }, 1 - env.night * 0.8, 1 - Math.min(1, weather.rain) * 0.5);
    if (this.water) {
      const b = this.water.bounds;
      this.water.mesh.visible = w.vision.outer <= 0 || Math.hypot(focus.x - b.x, focus.z - b.z) < b.r + w.vision.outer;
      this.water.light(this.sun.color, this.sun.intensity, this.tmpC1.setRGB(env.skyHorizon[0], env.skyHorizon[1], env.skyHorizon[2], THREE.SRGBColorSpace), this.tmpC2.copy(this.hemi.color).multiplyScalar(env.ambient * 0.5), env.night);
    }
  }

  /** Where the clouds are, as a key for the field (they count as moved once they've drifted a couple of metres: until then its readings are kept). */
  get cloudKey(): string {
    return `${Math.round(this.cloudOff.x / 2)},${Math.round(this.cloudOff.y / 2)}`;
  }
}
