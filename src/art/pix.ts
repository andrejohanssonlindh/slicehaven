/**
 * Tiny pixel buffer + helpers. All art is generated into these at native
 * resolution and blitted to canvases scaled with nearest-neighbour.
 */
export type RGBA = [number, number, number, number];

const cache = new Map<string, RGBA>();

/** '#rrggbb' or '#rrggbbaa' -> RGBA */
export function rgba(hex: string): RGBA {
  let c = cache.get(hex);
  if (!c) {
    const n = hex.replace('#', '');
    c = [
      parseInt(n.slice(0, 2), 16),
      parseInt(n.slice(2, 4), 16),
      parseInt(n.slice(4, 6), 16),
      n.length >= 8 ? parseInt(n.slice(6, 8), 16) : 255,
    ];
    cache.set(hex, c);
  }
  return c;
}

export class Pix {
  readonly data: Uint8ClampedArray;

  constructor(readonly w: number, readonly h: number) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  set(x: number, y: number, color: string | RGBA): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inside(x, y)) return;
    const c = typeof color === 'string' ? rgba(color) : color;
    const i = (y * this.w + x) * 4;
    if (c[3] === 255) {
      this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2]; this.data[i + 3] = 255;
    } else if (c[3] > 0) {
      const a = c[3] / 255;
      const da = this.data[i + 3] / 255;
      const oa = a + da * (1 - a);
      for (let k = 0; k < 3; k++) {
        this.data[i + k] = (c[k] * a + this.data[i + k] * da * (1 - a)) / (oa || 1);
      }
      this.data[i + 3] = oa * 255;
    }
  }

  alpha(x: number, y: number): number {
    if (!this.inside(x, y)) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  get(x: number, y: number): RGBA {
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  /** Draw another buffer on top (alpha-blended). */
  blit(src: Pix, dx: number, dy: number): void {
    dx = Math.round(dx);
    dy = Math.round(dy);
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        if (src.data[i + 3] === 0) continue;
        this.set(dx + x, dy + y, [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]]);
      }
    }
  }

  /** Add a 1px outline around opaque pixels. */
  outlined(color: string): Pix {
    const out = new Pix(this.w + 2, this.h + 2);
    for (let y = -1; y <= this.h; y++) {
      for (let x = -1; x <= this.w; x++) {
        if (this.alpha(x, y)) continue;
        if (this.alpha(x - 1, y) || this.alpha(x + 1, y) || this.alpha(x, y - 1) || this.alpha(x, y + 1)) {
          out.set(x + 1, y + 1, color);
        }
      }
    }
    out.blit(this, 1, 1);
    return out;
  }

  /** Nearest-neighbour upscale by an integer factor. */
  scaled(k: number): Pix {
    const out = new Pix(this.w * k, this.h * k);
    for (let y = 0; y < out.h; y++) {
      for (let x = 0; x < out.w; x++) {
        const i = (Math.floor(y / k) * this.w + Math.floor(x / k)) * 4;
        const o = (y * out.w + x) * 4;
        for (let c = 0; c < 4; c++) out.data[o + c] = this.data[i + c];
      }
    }
    return out;
  }

  flipX(): Pix {
    const out = new Pix(this.w, this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = (y * this.w + x) * 4;
        const o = (y * this.w + (this.w - 1 - x)) * 4;
        for (let k = 0; k < 4; k++) out.data[o + k] = this.data[i + k];
      }
    }
    return out;
  }

  toCanvas(scale = 1): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    c.getContext('2d')!.putImageData(new ImageData(this.data.slice(), this.w, this.h), 0, 0);
    if (scale === 1) return c;
    const big = document.createElement('canvas');
    big.width = this.w * scale;
    big.height = this.h * scale;
    const g = big.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.drawImage(c, 0, 0, big.width, big.height);
    return big;
  }

  drawTo(g: CanvasRenderingContext2D, x = 0, y = 0): void {
    g.putImageData(new ImageData(this.data.slice(), this.w, this.h), x, y);
  }
}

/**
 * Build a sprite from text rows. Each char maps to a colour in `key`;
 * '.' or ' ' is transparent.
 */
export function sprite(rows: string[], key: Record<string, string>): Pix {
  const w = Math.max(...rows.map((r) => r.length));
  const p = new Pix(w, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = key[ch];
      if (!col) throw new Error(`sprite: no colour for '${ch}'`);
      p.set(x, y, col);
    }
  });
  return p;
}

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Ordered-dither threshold in [0,1) for a pixel. */
export const bayer = (x: number, y: number): number => (BAYER4[y & 3][x & 3] + 0.5) / 16;

/** Pick a colour from a dark->light ramp for value v in [0,1], dithered. */
export function ramp(colors: readonly string[], v: number, x: number, y: number): string {
  const n = colors.length - 1;
  const f = Math.min(0.9999, Math.max(0, v)) * n;
  const i = Math.floor(f);
  return colors[Math.min(n, i + (f - i > bayer(x, y) ? 1 : 0))];
}
