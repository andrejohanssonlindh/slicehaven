import { fbm } from '../noise';

/**
 * The light of the world for the 3D renderer: sun or moon, sky and bounce
 * colours, fog, all from a continuous time of day and the weather. Pure, so
 * the rules and the renderer read the same sky. The cloud field here is
 * mirrored exactly in the renderer's shader (same hash, same fbm).
 */

export type RGB = [number, number, number];
type V3 = [number, number, number];

export interface SkyLight {
  /** Direction toward the sun (or moon), normalised. */
  sunDir: V3;
  sunColor: RGB;
  sunIntensity: number;
  skyTop: RGB;
  skyHorizon: RGB;
  groundBounce: RGB;
  /** Strength of the hemisphere (sky + bounce) light. */
  ambient: number;
  fog: RGB;
  /** Fog start and end distance from the focus, metres. */
  fogNear: number;
  fogFar: number;
  /** 0 by day, 1 at full night: windows and torches glow by it. */
  night: number;
}

/** Key frames: day (0), dusk (1), night (2). */
const KEYS: Omit<SkyLight, 'fogNear' | 'fogFar'>[] = [
  {
    sunDir: [-0.45, 0.8, 0.55], sunColor: [1.0, 0.95, 0.84], sunIntensity: 2.8,
    skyTop: [0.55, 0.7, 0.92], skyHorizon: [0.82, 0.86, 0.9], groundBounce: [0.46, 0.44, 0.31], ambient: 1.65,
    fog: [0.76, 0.8, 0.84], night: 0,
  },
  {
    sunDir: [-0.85, 0.24, 0.4], sunColor: [1.0, 0.6, 0.34], sunIntensity: 2.0,
    skyTop: [0.38, 0.38, 0.62], skyHorizon: [0.95, 0.6, 0.42], groundBounce: [0.38, 0.26, 0.2], ambient: 0.85,
    fog: [0.72, 0.52, 0.48], night: 0.45,
  },
  {
    sunDir: [0.4, 0.75, 0.5], sunColor: [0.55, 0.66, 1.0], sunIntensity: 0.5,
    skyTop: [0.1, 0.13, 0.28], skyHorizon: [0.16, 0.2, 0.34], groundBounce: [0.08, 0.08, 0.12], ambient: 0.55,
    fog: [0.1, 0.12, 0.2], night: 1,
  },
];

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const lerpV = <T extends number[]>(a: T, b: T, k: number): T => a.map((v, i) => lerp(v, b[i], k)) as T;
const unit = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const grey = (c: RGB, k: number): RGB => {
  const l = c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15;
  return [lerp(c[0], l, k), lerp(c[1], l, k), lerp(c[2], l, k)];
};

/**
 * Where the sun (6h to 18h) or the moon (18h to 6h) is: up in the east, over the south at its height, down in the west.
 * z grows southward, so the noon sun lies toward +z.
 */
export function bodyDir(hour: number): V3 {
  const h = ((hour % 24) + 24) % 24;
  const u = (((h - 6) % 12) + 12) % 12 / 12; // 0..1 across the arc, same for both bodies
  const th = Math.PI * u;
  const y = 0.2 + 0.6 * Math.sin(th);
  return unit([Math.cos(th) * 0.9, y, Math.sin(th) * 0.55 + 0.1]);
}

/**
 * @param tod continuous time of day, 0 day, 1 dusk, 2 night
 * @param cloud cloud cover 0..1, rain 0..1, flash 0..1 (lightning)
 * @param hour the clock, if there is one: the sun (by day) or the moon (by night) then crosses the sky
 */
export function skyLight(tod: number, cloud: number, rain: number, flash = 0, hour?: number): SkyLight {
  const t = Math.max(0, Math.min(2, tod));
  const i = Math.min(1, Math.floor(t));
  const k = t - i;
  const a = KEYS[i], b = KEYS[i + 1];
  const gloom = Math.min(1, cloud * 0.6 + rain * 0.5);
  const s: SkyLight = {
    sunDir: unit(lerpV(a.sunDir, b.sunDir, k)),
    sunColor: grey(lerpV(a.sunColor, b.sunColor, k), gloom * 0.6),
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity, k) * (1 - gloom * 0.55),
    skyTop: grey(lerpV(a.skyTop, b.skyTop, k), gloom * 0.7),
    skyHorizon: grey(lerpV(a.skyHorizon, b.skyHorizon, k), gloom * 0.6),
    groundBounce: lerpV(a.groundBounce, b.groundBounce, k),
    ambient: lerp(a.ambient, b.ambient, k) * (1 + gloom * 0.15),
    fog: grey(lerpV(a.fog, b.fog, k), gloom * 0.5),
    fogNear: lerp(60, 14, rain),
    fogFar: lerp(140, 45, rain),
    night: lerp(a.night, b.night, k),
  };
  if (hour !== undefined) s.sunDir = bodyDir(hour);
  if (flash > 0) {
    s.sunIntensity += flash * 4;
    s.sunColor = lerpV(s.sunColor, [0.85, 0.9, 1.0], flash);
    s.ambient += flash * 1.5;
  }
  return s;
}

/** Scale of the cloud field (metres per noise cell) and its seed. */
export const CLOUD_SCALE = 22;
export const CLOUD_SEED = 17;

/** Where cloud shadows begin, from the cover (0 clear .. 1 overcast). Clear days still have a few fair-weather clouds. */
export const cloudThreshold = (cover: number): number => 0.7 - cover * 0.48;

/**
 * Cloud density over (x, z) at time t (seconds), 0 open sky .. 1 under cloud.
 * The field drifts downwind at `drift` metres per second along (wx, wz).
 */
export function cloudDensity(x: number, z: number, t: number, cover: number, wx: number, wz: number, drift: number): number {
  const n = fbm((x - wx * drift * t) / CLOUD_SCALE, (z - wz * drift * t) / CLOUD_SCALE, CLOUD_SEED);
  const th = cloudThreshold(cover);
  const u = Math.max(0, Math.min(1, (n - th + 0.07) / 0.14));
  return u * u * (3 - 2 * u);
}

/** Drift speed of the clouds in m/s for a wind force 0..6. */
export const cloudDrift = (windForce: number): number => 0.6 + windForce * 0.7;
