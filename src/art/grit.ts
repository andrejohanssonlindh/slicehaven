import { fbm, white } from './noise';
import { OUTLINE } from './palette';
import { Pix, type RGBA, rgba } from './pix';
import { FRAMES, type Sprite } from './props';

/**
 * Shared tools for the "rough" art pass: wobbly shapes, selective outlines,
 * wear and grime. The aim is 90s 2D with imperfection: nothing perfectly
 * straight, nothing perfectly clean.
 */

export interface Light {
  /** Offset from the sprite's anchor. */
  dx: number;
  dy: number;
  r: number;
  color: [number, number, number];
  /** 0 = steady, 1 = fire-like flicker. */
  flicker?: number;
}

/** A sprite plus what the lighting pass needs to know about it. */
export interface Prop extends Sprite {
  lights?: Light[];
  /** Chimney tops: where smoke starts (offset from the anchor). */
  smoke?: { dx: number; dy: number }[];
  /** Ground it covers, in hexes (width across, depth in rows), when bigger than one. */
  footprint?: { cols: number; rows: number };
  /** What you see when you step inside: the roof and front walls cut away. */
  cutaway?: Prop;
  /** Lies on the floor (rugs, straw, small litter) rather than standing. */
  flat?: boolean;
}

export const still = (p: Pix, ax: number, ay: number, shadow = 0, extra: Partial<Prop> = {}): Prop => ({
  frames: Array.from({ length: FRAMES }, () => p), ax, ay, shadow, ...extra,
});

// --- colour ----------------------------------------------------------------

export function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 255];
}

const COOL: RGBA = [34, 22, 52, 255];
const WARM: RGBA = [255, 226, 160, 255];

/** Darker, shifted toward cool purple (shadows are never just black). */
export const shadeDown = (c: RGBA, t: number): RGBA => mix(c, COOL, t);
/** Lighter, shifted toward warm cream. */
export const shadeUp = (c: RGBA, t: number): RGBA => mix(c, WARM, t);

/** Pick from a dark -> light ramp with dithering (value outside 0..1 clamps). */
export function pick(colors: readonly string[], v: number, x: number, y: number): string {
  const n = colors.length - 1;
  const f = Math.min(0.9999, Math.max(0, v)) * n;
  const i = Math.floor(f);
  const frac = f - i;
  // Rough dither: ordered pattern plus a little white noise, so bands never look stamped.
  const th = (((x & 1) * 2 + (y & 1) * 3) % 4) / 4 + (white(x, y, 77) - 0.5) * 0.3 + 0.125;
  return colors[Math.min(n, i + (frac > th ? 1 : 0))];
}

// --- outlines --------------------------------------------------------------

/**
 * Selective outline: each outline pixel takes the colour of what it hugs,
 * darkened toward cool purple. Softer and more painterly than one flat colour.
 * Pixels under an object (its ground contact) get the full dark outline.
 */
export function selOutline(src: Pix, strength = 0.62): Pix {
  const out = new Pix(src.w + 2, src.h + 2);
  const base = rgba(OUTLINE);
  for (let y = -1; y <= src.h; y++) {
    for (let x = -1; x <= src.w; x++) {
      if (src.alpha(x, y)) continue;
      let r = 0, g = 0, b = 0, n = 0, below = 0;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (!src.alpha(x + dx, y + dy)) continue;
        const c = src.get(x + dx, y + dy);
        r += c[0]; g += c[1]; b += c[2]; n++;
        if (dy === -1) below++;
      }
      if (!n) continue;
      const avg: RGBA = [r / n, g / n, b / n, 255];
      const k = below ? 0.9 : strength;
      const c = mix(avg, base, k);
      // The rim facing the light (top-left) stays a little lighter.
      if (!below && (src.alpha(x + 1, y) || src.alpha(x, y + 1)) && !src.alpha(x - 1, y) && !src.alpha(x, y - 1)) {
        out.set(x + 1, y + 1, mix(c, avg, 0.25));
      } else out.set(x + 1, y + 1, c);
    }
  }
  out.blit(src, 1, 1);
  return out;
}

// --- shapes ----------------------------------------------------------------

export type Pt = [number, number];

/** Fill a polygon (pixel centres, even-odd). `paint` returns a colour or null to skip. */
export function polyFill(p: Pix, pts: Pt[], paint: (x: number, y: number) => string | RGBA | null): void {
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const yc = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = Math.ceil(xs[i] - 0.5); x <= Math.floor(xs[i + 1] - 0.5); x++) {
        const c = paint(x, y);
        if (c) p.set(x, y, c);
      }
    }
  }
}

/** Shake a polygon's corners and add midpoints, so edges are never ruler-straight. */
export function wobble(pts: Pt[], seed: number, amount = 1, split = 2): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    for (let s = 0; s < split; s++) {
      const t = s / split;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      out.push([x + (white(i, s, seed) - 0.5) * 2 * amount, y + (white(i, s, seed + 1) - 0.5) * 2 * amount]);
    }
  }
  return out;
}

/** A thick line with shading across its width (left lit). `colors` dark -> light. */
export function capsule(
  p: Pix, x0: number, y0: number, x1: number, y1: number, r0: number, r1: number,
  colors: readonly string[], seed = 0, grain = 0.12,
): void {
  const minX = Math.floor(Math.min(x0, x1) - Math.max(r0, r1) - 1);
  const maxX = Math.ceil(Math.max(x0, x1) + Math.max(r0, r1) + 1);
  const minY = Math.floor(Math.min(y0, y1) - Math.max(r0, r1) - 1);
  const maxY = Math.ceil(Math.max(y0, y1) + Math.max(r0, r1) + 1);
  const dx = x1 - x0, dy = y1 - y0;
  const len2 = dx * dx + dy * dy || 1;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const t = Math.max(0, Math.min(1, ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / len2));
      const cx = x0 + dx * t, cy = y0 + dy * t;
      const r = r0 + (r1 - r0) * t;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > r) continue;
      // Signed offset across the stroke: -1 left .. +1 right.
      const side = Math.max(-1, Math.min(1, (x + 0.5 - cx) / (r || 1)));
      const v = 0.92 - (side + 1) * 0.42 + (white(x, y, seed) - 0.5) * grain;
      p.set(x, y, pick(colors, v, x, y));
    }
  }
}

/** Fill a vertical band (for torsos, trunks): widths per row, shaded across, left lit. */
export function column(
  p: Pix, y0: number, y1: number, centre: (y: number) => number, half: (y: number) => number,
  colors: readonly string[], seed = 0, grain = 0.14,
): void {
  for (let y = y0; y <= y1; y++) {
    const c = centre(y), h = half(y);
    for (let x = Math.round(c - h); x <= Math.round(c + h - 1); x++) {
      const u = (x + 0.5 - c) / (h || 1);
      const v = 0.95 - (u + 1) * 0.42 + (white(x, y, seed) - 0.5) * grain;
      p.set(x, y, pick(colors, v, x, y));
    }
  }
}

// --- wear ------------------------------------------------------------------

function tweak(p: Pix, x: number, y: number, f: (c: RGBA) => RGBA): void {
  if (!p.alpha(x, y)) return;
  const c = f(p.get(x, y));
  const i = (y * p.w + x) * 4;
  p.data[i] = c[0]; p.data[i + 1] = c[1]; p.data[i + 2] = c[2];
}

/** Dirt where the object meets the ground, and streaks running down from above. */
export function grime(p: Pix, seed: number, amount = 0.5, bottom = p.h): void {
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const low = Math.max(0, 1 - (bottom - y) / 9);
      const streak = fbm(x / 1.4, y / 9, seed) > 0.62 ? 0.25 : 0;
      const k = (low * (0.35 + fbm(x / 4, y / 3, seed + 1) * 0.65) + streak) * amount;
      if (k > 0.05) tweak(p, x, y, (c) => mix(c, [48, 34, 28, 255], Math.min(0.7, k)));
    }
  }
}

/** Moss / lichen sitting on upward-facing, damp-looking parts. */
export function mossify(p: Pix, seed: number, amount = 0.5, where: (x: number, y: number) => number = () => 1): void {
  const MOSS = ['#2c4326', '#3b5a2c', '#506f34', '#6e8c42'];
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      if (!p.alpha(x, y)) continue;
      const n = fbm(x / 3.2, y / 2.6, seed) * where(x, y);
      if (n > 1 - amount * 0.45 && white(x, y, seed + 2) < 0.88) {
        p.set(x, y, pick(MOSS, 0.2 + (n - 0.5) * 1.6 + (white(x, y, seed + 3) - 0.5) * 0.4, x, y));
      }
    }
  }
}

/** Scatter single light/dark pixels over what's already drawn (grain, chips, dust). */
export function speckle(p: Pix, seed: number, density: number, lighter: number, darker: number): void {
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const w = white(x, y, seed);
      if (w < density) tweak(p, x, y, (c) => (white(x, y, seed + 1) < 0.5 ? shadeDown(c, darker) : shadeUp(c, lighter)));
    }
  }
}

/** Roughen the edge of a finished shape: knock a few edge pixels out. */
export function chew(p: Pix, seed: number, amount = 0.15): void {
  const kill: number[] = [];
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      if (!p.alpha(x, y)) continue;
      if (!(p.alpha(x - 1, y) && p.alpha(x + 1, y) && p.alpha(x, y - 1) && p.alpha(x, y + 1)) && white(x, y, seed) < amount) {
        kill.push((y * p.w + x) * 4 + 3);
      }
    }
  }
  for (const i of kill) p.data[i] = 0;
}

/** Cast shadow of a rectangle's overhang onto what's drawn beneath it. */
export function dropShadow(p: Pix, x0: number, x1: number, y: number, depth: number, strength = 0.55): void {
  for (let k = 0; k < depth; k++) {
    for (let x = x0; x <= x1; x++) {
      tweak(p, x, y + k, (c) => shadeDown(c, strength * (1 - k / depth)));
    }
  }
}

export { fbm, white };
