import { cloudDensity, skyLight, type RGB } from './sky';

/**
 * The one interface the renderer and the rules read for the world's
 * conditions (brief §6). Fed by the weather model (`weather.ts`: eased
 * cloud cover, rain, wind, time of day) and nothing else, so what the player
 * sees is what the rules would be told.
 */

/** The slice of the weather model this needs (what `Weather` exposes). */
export interface WeatherState {
  tod: number;
  /** The clock as drawn, hours 0..24, when the world has one. */
  lightHour?: number | null;
  cloud: number;
  rain: number;
  flash: number;
  /** Smoothed wind: strength 0..1.2 and direction (unit-ish vector). */
  wind: number;
  wx: number;
  wy: number;
  windForce: number;
}

export interface Environment3D {
  sunDir: [number, number, number];
  sunColor: RGB;
  sunIntensity: number;
  skyTop: RGB;
  skyHorizon: RGB;
  groundBounce: RGB;
  ambient: number;
  cloudCover: number;
  fog: RGB;
  fogNear: number;
  fogFar: number;
  /** 0 dry .. 1 soaked (the renderer eases it slowly; this is the target). */
  wetness: number;
  wind: { x: number; z: number; force: number };
  flash: number;
  rain: number;
  tod: number;
  night: number;
  /** How far the cloud field has drifted, metres (accumulated by the caller as the wind blows). */
  cloudOffset: { x: number; z: number };
  /** Cloud shadow at a point: 0 open sky .. 1 under cloud (what the rules may ask). */
  cloudShadow(x: number, z: number): number;
}

/** Build the environment from the weather and the clouds' accumulated drift (metres). */
export function environment(w: WeatherState, cloudOffset = { x: 0, z: 0 }): Environment3D {
  const sky = skyLight(w.tod, w.cloud, w.rain, w.flash, w.lightHour ?? undefined);
  return {
    sunDir: sky.sunDir,
    sunColor: sky.sunColor,
    sunIntensity: sky.sunIntensity,
    skyTop: sky.skyTop,
    skyHorizon: sky.skyHorizon,
    groundBounce: sky.groundBounce,
    ambient: sky.ambient,
    cloudCover: w.cloud,
    fog: sky.fog,
    fogNear: sky.fogNear,
    fogFar: sky.fogFar,
    wetness: w.rain > 0.1 ? 1 : 0,
    wind: { x: w.wx * w.wind, z: w.wy * w.wind, force: w.windForce },
    flash: w.flash,
    rain: w.rain,
    tod: w.tod,
    night: sky.night,
    cloudOffset,
    cloudShadow: (x, z) => cloudDensity(x, z, 1, w.cloud, cloudOffset.x, cloudOffset.z, 1),
  };
}
