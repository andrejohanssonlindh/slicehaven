import { fbm } from './noise';
import type { Light } from './grit';
import { Pix } from './pix';

/**
 * The "later style" layer. The pixels stay chunky and hand-placed; on top of
 * them goes the stuff a 90s console could not do: projected shadows, coloured
 * light with falloff, bloom around glowing things, a colour grade, dappled
 * light moving over the ground, and a vignette.
 */

export interface Look {
  name: string;
  /** Colour multipliers (r, g, b). */
  tint: [number, number, number];
  /** Cast-shadow darkness 0..1. */
  shadow: number;
  /** How strongly point lights show. */
  lightGain: number;
  bloom: number;
  vignette: number;
  /** Moving patches of leaf-filtered sunlight. */
  dapple: number;
  /** S-curve contrast around the middle. */
  contrast: number;
}

export const LOOKS: Record<string, Look> = {
  flat: { name: 'Flat', tint: [1, 1, 1], shadow: 0.22, lightGain: 0, bloom: 0, vignette: 0, dapple: 0, contrast: 0 },
  day: { name: 'Day', tint: [1.04, 1.0, 0.9], shadow: 0.42, lightGain: 0.35, bloom: 0.25, vignette: 0.22, dapple: 0.16, contrast: 0.12 },
  dusk: { name: 'Dusk', tint: [1.0, 0.76, 0.74], shadow: 0.5, lightGain: 1.0, bloom: 0.6, vignette: 0.38, dapple: 0.06, contrast: 0.18 },
  night: { name: 'Night', tint: [0.58, 0.68, 1.0], shadow: 0.3, lightGain: 1.5, bloom: 0.85, vignette: 0.5, dapple: 0, contrast: 0.1 },
};

export interface WorldLight extends Omit<Light, 'dx' | 'dy'> {
  x: number;
  y: number;
}

/** Darken ground pixels under the projected silhouette of a sprite frame. */
export function castShadow(
  out: Pix, frame: Pix, ax: number, ay: number, x: number, y: number, amount: number, length = 0.55,
): void {
  const done = new Set<number>();
  for (let sy = 0; sy < frame.h; sy++) {
    const h = ay - sy;
    if (h <= 0) continue;
    for (let sx = 0; sx < frame.w; sx++) {
      if (!frame.alpha(sx, sy)) continue;
      // Light from the top-left: the shadow lies down-right, squashed by the view angle.
      const gx = Math.round(x - ax + sx + h * length);
      const gy = Math.round(y + h * 0.2);
      done.add(gy * 4096 + gx);
    }
  }
  for (const k of done) {
    const gy = Math.floor(k / 4096), gx = k % 4096;
    if (!out.inside(gx, gy)) continue;
    const i = (gy * out.w + gx) * 4;
    if (!out.data[i + 3]) continue;
    out.data[i] = out.data[i] * (1 - amount) + 18 * amount * 0.5;
    out.data[i + 1] = out.data[i + 1] * (1 - amount) + 14 * amount * 0.5;
    out.data[i + 2] = out.data[i + 2] * (1 - amount * 0.6) + 46 * amount * 0.4;
  }
}

/** Soft contact shadow right under a thing's feet, so it sits in the ground. */
export function contactShadow(out: Pix, x: number, y: number, rx: number, ry: number, amount: number): void {
  for (let yy = Math.floor(y - ry); yy <= Math.ceil(y + ry); yy++) {
    for (let xx = Math.floor(x - rx); xx <= Math.ceil(x + rx); xx++) {
      const d = ((xx + 0.5 - x) / rx) ** 2 + ((yy + 0.5 - y) / ry) ** 2;
      if (d > 1 || !out.inside(xx, yy)) continue;
      const i = (yy * out.w + xx) * 4;
      if (!out.data[i + 3]) continue;
      const k = amount * (1 - d);
      out.data[i] *= 1 - k; out.data[i + 1] *= 1 - k; out.data[i + 2] *= 1 - k * 0.7;
    }
  }
}

function blur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const n = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += src[y * w + Math.min(w - 1, Math.max(0, x + k))];
      tmp[y * w + x] = s / n;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x];
      out[y * w + x] = s / n;
    }
  }
  return out;
}

/** Light, bloom, grade and vignette over a finished frame, in place. */
export function applyLook(img: Pix, t: number, look: Look, lights: readonly WorldLight[]): void {
  const { w, h, data } = img;
  const f = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) for (let c = 0; c < 3; c++) f[i * 3 + c] = data[i * 4 + c];

  // Leaf-filtered sunlight drifting over everything.
  if (look.dapple) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = fbm((x + t * 0.35) / 9, (y - t * 0.2) / 7, 41, 2);
        const k = n > 0.56 ? 1 + (n - 0.56) * look.dapple * 3.4 : 1 - (0.56 - n) * look.dapple * 1.1;
        const i = (y * w + x) * 3;
        f[i] *= k; f[i + 1] *= k; f[i + 2] *= k * 0.97;
      }
    }
  }

  // Grade first, so lights add on top of the mood instead of being tinted by it.
  const mid = 118;
  for (let i = 0; i < w * h; i++) {
    for (let c = 0; c < 3; c++) {
      let v = f[i * 3 + c] * look.tint[c];
      v = mid + (v - mid) * (1 + look.contrast);
      f[i * 3 + c] = v;
    }
  }

  if (look.lightGain > 0) {
    for (const l of lights) {
      const flick = l.flicker ? 1 + Math.sin(t * 1.7 + l.x) * 0.06 * l.flicker + Math.sin(t * 4.3 + l.y) * 0.05 * l.flicker : 1;
      const r = l.r * flick;
      for (let y = Math.max(0, Math.floor(l.y - r)); y <= Math.min(h - 1, Math.ceil(l.y + r)); y++) {
        for (let x = Math.max(0, Math.floor(l.x - r)); x <= Math.min(w - 1, Math.ceil(l.x + r)); x++) {
          const d = Math.hypot((x - l.x) / 1.0, (y - l.y) / 0.85) / r;
          if (d >= 1) continue;
          const k = (1 - d) ** 2 * look.lightGain * 150;
          const i = (y * w + x) * 3;
          f[i] += l.color[0] * k; f[i + 1] += l.color[1] * k; f[i + 2] += l.color[2] * k;
        }
      }
    }
  }

  if (look.bloom > 0) {
    const bright = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const lum = f[i * 3] * 0.3 + f[i * 3 + 1] * 0.59 + f[i * 3 + 2] * 0.11;
      bright[i] = Math.max(0, lum - 175);
    }
    const b1 = blur(bright, w, h, 2);
    const b2 = blur(bright, w, h, 5);
    for (let i = 0; i < w * h; i++) {
      const g = (b1[i] * 1.6 + b2[i] * 2.4) * look.bloom;
      f[i * 3] += g * 1.0; f[i * 3 + 1] += g * 0.82; f[i * 3 + 2] += g * 0.55;
    }
  }

  const cx = w / 2, cy = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!data[i * 4 + 3]) continue;
      const d = Math.hypot((x - cx) / cx, (y - cy) / cy) / 1.41;
      const vig = 1 - look.vignette * d * d * 1.6;
      for (let c = 0; c < 3; c++) data[i * 4 + c] = Math.max(0, Math.min(255, f[i * 3 + c] * vig));
    }
  }
}

/** Rising smoke puffs from a chimney: soft, grey-warm, widening, drifting downwind. */
export function drawSmoke(out: Pix, x: number, y: number, t: number, wind = 0.4): void {
  const N = 9;
  for (let i = 0; i < N; i++) {
    const age = ((t * 0.55 + i * (24 / N)) % 24) / 24; // 0..1
    const px = x + Math.sin(age * 5 + i * 1.7) * (1 + age * 2) + age * age * (6 + wind * 8);
    const py = y - age * 34;
    const r = 1.4 + age * 4.2;
    const a = (1 - age) ** 1.4 * 0.55 * Math.min(1, age * 8);
    for (let yy = Math.floor(py - r); yy <= Math.ceil(py + r); yy++) {
      for (let xx = Math.floor(px - r); xx <= Math.ceil(px + r); xx++) {
        const d = Math.hypot(xx + 0.5 - px, yy + 0.5 - py) / r;
        if (d > 1 || !out.inside(xx, yy)) continue;
        // Ragged edge so it reads as pixel smoke, not a blur.
        if (d > 0.7 && ((xx * 7 + yy * 13 + i) & 3) === 0) continue;
        out.set(xx, yy, [196 - age * 40, 188 - age * 40, 190 - age * 30, Math.round(a * (1 - d * 0.5) * 255)]);
      }
    }
  }
}
