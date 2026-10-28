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
  /** The unmasked GPU name, if the browser gives it. */
  gpu?: string;
}

/** Software renderers and very old GPUs: start one tier lower than the screen says. */
export const isWeakGpu = (gpu?: string): boolean => !!gpu && /swiftshader|llvmpipe|software|mali-4|mali-t|adreno \(tm\) [23]\d\d|powervr sgx/i.test(gpu);

/** Atlas size for the device: 512 when the GPU is small or weak, else 1024. */
export const atlasSize = (d: DeviceInfo): number => ((d.maxTexture !== undefined && d.maxTexture < 4096) || isWeakGpu(d.gpu) ? 512 : 1024);

/** A sensible default: touch and small screens are phones. */
export function pickTier(d: DeviceInfo): TierName {
  const small = Math.min(d.width, d.height) < 600;
  if (isWeakGpu(d.gpu) || (d.touch && small)) return 'low';
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

/** What the governor can change, per tier. Level 0 is the tier as it stands. */
export interface Quality {
  shadowMap: number;
  lights: number;
  shells: number;
  grass: number;
}

export const MAX_LEVEL = 3;

/**
 * The tier's quality stepped down `level` times (0..MAX_LEVEL). The first steps
 * are the cheapest to lose (fringe, grass), then the shadow map and lights.
 * Render scale is never touched automatically: that is a visible setting.
 */
export function qualityAt(t: Tier, level: number): Quality {
  const l = Math.max(0, Math.min(MAX_LEVEL, level));
  return {
    shells: l >= 3 ? 0 : l >= 1 ? Math.min(1, t.shells) : t.shells,
    grass: Math.round(t.grass * [1, 0.6, 0.4, 0.25][l]),
    shadowMap: l >= 2 ? Math.max(512, t.shadowMap / 2) : t.shadowMap,
    lights: l >= 2 ? Math.max(2, Math.ceil(t.lights / 2)) : t.lights,
  };
}

export interface GovernorResult {
  level: number;
  /** Set when the level just changed: the visible notice for the player. */
  notice?: string;
}

/**
 * Dynamic scaling: feed it each frame's time; it steps quality down when the
 * median creeps over budget and back up after a long stretch with room to
 * spare. Waits after every change so it judges the new setting, not the old.
 */
export class Governor {
  level = 0;
  private ms: number[] = [];
  private cool = 0;

  constructor(readonly budgetMs = 1000 / 30, private window = 60) {}

  push(frameMs: number): GovernorResult {
    if (this.cool > 0) {
      this.cool--;
      return { level: this.level };
    }
    this.ms.push(frameMs);
    if (this.ms.length < this.window) return { level: this.level };
    const verdict = adjust(this.ms, this.budgetMs);
    this.ms = [];
    if (verdict === -1 && this.level < MAX_LEVEL) {
      this.level++;
      this.cool = this.window;
      return { level: this.level, notice: `Slow frames: quality lowered (step ${this.level} of ${MAX_LEVEL}).` };
    }
    // Stepping up is cautious: only after a clean window, and never above where we started.
    if (verdict === 1 && this.level > 0) {
      this.level--;
      this.cool = this.window * 2;
      return { level: this.level, notice: `Room to spare: quality raised (step ${this.level} of ${MAX_LEVEL}).` };
    }
    return { level: this.level };
  }
}
