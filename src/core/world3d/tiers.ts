/**
 * Quality tiers for the 3D world. Phones see less and render chunkier;
 * desktops see more. Pure: the page measures the device and asks here.
 */

export type TierName = 'low' | 'medium' | 'high';

export interface Tier {
  name: TierName;
  /** Size of one rendered pixel in CSS pixels (the device pixel factor is rounded to a whole number). */
  pixelCss: number;
  shadowMap: number;
  /** Real point lights; the rest become glow only. */
  lights: number;
  /** Shell layers on rough materials (0 = off). */
  shells: number;
  /** Zoom steps allowed, in rendered pixels per metre (bigger = closer). */
  zooms: number[];
  /** Default zoom index into `zooms`. */
  zoom: number;
  grass: number;
  bloom: boolean;
}

/** Texture detail: texels per metre, from the old art (a 36 px person is 1.7 m). */
export const TEXELS_PER_M = 21;

export const TIERS: Record<TierName, Tier> = {
  low: { name: 'low', pixelCss: 1, shadowMap: 1024, lights: 4, shells: 1, zooms: [14, 21, 42], zoom: 1, grass: 600, bloom: false },
  medium: { name: 'medium', pixelCss: 1, shadowMap: 2048, lights: 8, shells: 2, zooms: [10.5, 14, 21, 42], zoom: 2, grass: 1500, bloom: true },
  high: { name: 'high', pixelCss: 1, shadowMap: 4096, lights: 16, shells: 2, zooms: [7, 10.5, 14, 21, 42], zoom: 3, grass: 3000, bloom: true },
};

export interface DeviceInfo {
  /** CSS size of the view. */
  width: number;
  height: number;
  dpr: number;
  touch: boolean;
  /** Max texture size the GPU reports, if known. */
  maxTexture?: number;
}

/** A sensible default: touch and small screens are phones. */
export function pickTier(d: DeviceInfo): TierName {
  const small = Math.min(d.width, d.height) < 600;
  if (d.touch && small) return 'low';
  if (d.touch || (d.maxTexture !== undefined && d.maxTexture < 8192) || Math.max(d.width, d.height) < 1100) return 'medium';
  return 'high';
}

/** Device pixels per rendered pixel: always a whole number, at least 1. */
export const pixelFactor = (dpr: number, pixelCss: number): number => Math.max(1, Math.round(dpr * pixelCss));

/** How many metres the view covers across and up at a zoom (rendered px per metre). */
export function viewSpan(cssW: number, cssH: number, dpr: number, pixelCss: number, ppm: number): { w: number; h: number; rw: number; rh: number } {
  const k = pixelFactor(dpr, pixelCss);
  const rw = Math.ceil((cssW * dpr) / k), rh = Math.ceil((cssH * dpr) / k);
  return { w: rw / ppm, h: rh / ppm, rw, rh };
}

/**
 * Dynamic scaling: given recent frame times (ms), say whether to step down,
 * up, or stay. Down when the median is over budget; up only with lots of room.
 */
export function adjust(frameMs: readonly number[], budgetMs: number): -1 | 0 | 1 {
  if (frameMs.length < 30) return 0;
  const s = [...frameMs].sort((a, b) => a - b);
  const med = s[Math.floor(s.length / 2)];
  if (med > budgetMs * 1.15) return -1;
  if (med < budgetMs * 0.5) return 1;
  return 0;
}
