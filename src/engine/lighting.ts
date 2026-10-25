import { type Pix, bayer } from '../art/pix';
import type { RGB } from './weather';

export interface Light {
  x: number;
  y: number;
  r: number;
  color: RGB;
}

export interface LightingParams {
  ambient: RGB;
  desaturate: number;
  cloud: number; // 0..1 cloud cover
  /** Cloud shadow strength at a world pixel, 0..1 (same field the rules use). */
  shadowAt?: (x: number, y: number) => number;
  flash: number; // lightning flash 0..1
  lights: Light[];
}

const STEPS = 10; // light levels: stepped + dithered for a pixel-art look

/**
 * Multiply the scene by a light map. The light map = ambient * cloud shadow
 * + point lights, quantised to a few levels with ordered dithering.
 */
export class Lighting {
  private lr: Float32Array;
  private lg: Float32Array;
  private lb: Float32Array;
  private shadow: Float32Array;
  private sw: number;
  private sh: number;

  constructor(private w: number, private h: number) {
    this.lr = new Float32Array(w * h);
    this.lg = new Float32Array(w * h);
    this.lb = new Float32Array(w * h);
    this.sw = Math.ceil(w / 4);
    this.sh = Math.ceil(h / 4);
    this.shadow = new Float32Array(this.sw * this.sh);
  }

  apply(buf: Pix, p: LightingParams): void {
    const { w, h, lr, lg, lb } = this;
    const flash = p.flash;
    const amb: RGB = [p.ambient[0] + flash * 1.4, p.ambient[1] + flash * 1.5, p.ambient[2] + flash * 1.8];
    const neutral = !p.shadowAt && flash < 0.01 && p.lights.length === 0 && p.desaturate < 0.01
      && Math.abs(amb[0] - 1) < 0.01 && Math.abs(amb[1] - 1) < 0.01 && Math.abs(amb[2] - 1) < 0.01;
    if (neutral) return;

    // Cloud shadows at quarter resolution.
    const shadows = !!p.shadowAt;
    if (p.shadowAt) {
      for (let y = 0; y < this.sh; y++) {
        for (let x = 0; x < this.sw; x++) this.shadow[y * this.sw + x] = p.shadowAt(x * 4 + 2, y * 4 + 2) * 0.4;
      }
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 1;
        if (shadows) s = 1 - this.shadow[(y >> 2) * this.sw + (x >> 2)];
        const i = y * w + x;
        lr[i] = amb[0] * s;
        lg[i] = amb[1] * s;
        lb[i] = amb[2] * s;
      }
    }

    for (const L of p.lights) {
      const x0 = Math.max(0, Math.floor(L.x - L.r));
      const x1 = Math.min(w - 1, Math.ceil(L.x + L.r));
      const y0 = Math.max(0, Math.floor(L.y - L.r * 0.7));
      const y1 = Math.min(h - 1, Math.ceil(L.y + L.r * 0.7));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          // Squashed like the board, so pools of light lie on the ground.
          const d = Math.hypot(x - L.x, (y - L.y) / 0.7) / L.r;
          if (d >= 1) continue;
          const f = (1 - d) * (1 - d);
          const i = y * w + x;
          lr[i] += L.color[0] * f;
          lg[i] += L.color[1] * f;
          lb[i] += L.color[2] * f;
        }
      }
    }

    const data = buf.data;
    const ds = p.desaturate;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const o = i * 4;
        if (data[o + 3] === 0) continue;
        const t = bayer(x, y);
        const qr = Math.floor(lr[i] * STEPS + t) / STEPS;
        const qg = Math.floor(lg[i] * STEPS + t) / STEPS;
        const qb = Math.floor(lb[i] * STEPS + t) / STEPS;
        let r = data[o];
        let g = data[o + 1];
        let b = data[o + 2];
        if (ds > 0) {
          const l = r * 0.3 + g * 0.59 + b * 0.11;
          r += (l - r) * ds;
          g += (l - g) * ds;
          b += (l - b) * ds;
        }
        data[o] = r * qr;
        data[o + 1] = g * qg;
        data[o + 2] = b * qb;
      }
    }
  }
}
