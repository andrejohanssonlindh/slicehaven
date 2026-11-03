import type { BodySpec } from '../core/world3d/body';
import { Rng } from '../core/rng';
import { Pix, bayer } from './pix';

/**
 * A painted head-and-shoulders portrait for talking (plan B3d, Q37 option B): drawn per pixel from the same body spec
 * the 3D figure is built from (skin, hair and clothes colours, the people's head, eyes, jaw and ears), so the two
 * agree. Lit from the upper left, shaded with an ordered dither. 40 × 40 pixels, shown scaled up.
 */
export const PORTRAIT_SIZE = 40;

const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const toHex = (r: number, g: number, b: number): string => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
/** `c` darkened (k < 1) or lightened (k > 1). */
const shade = (c: string, k: number): string => {
  const [r, g, b] = hex(c);
  return k <= 1 ? toHex(r * k, g * k, b * k) : toHex(r + (255 - r) * (k - 1), g + (255 - g) * (k - 1), b + (255 - b) * (k - 1));
};

/** Light from the upper left: -1 (shadow) .. 1 (lit), by where a point is in its shape (nx, ny from -1 to 1). */
const lightAt = (nx: number, ny: number): number => Math.max(-1, Math.min(1, -0.75 * nx - 0.55 * ny));

/** A colour with two shades by the light, dithered between. */
function lit(c: string, l: number, x: number, y: number): string {
  const t = (l + 1) / 2;
  if (t > 0.72 + bayer(x, y) * 0.2) return shade(c, 1.15);
  if (t < 0.32 + bayer(x, y) * 0.2) return shade(c, 0.72);
  return c;
}

/** Fill an ellipse, lit as a round shape. */
function ellipse(p: Pix, cx: number, cy: number, rx: number, ry: number, colour: string, keep?: (x: number, y: number) => boolean): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny > 1) continue;
      if (keep && !keep(x, y)) continue;
      p.set(x, y, lit(colour, lightAt(nx, ny), x, y));
    }
  }
}

export function paintPortrait(spec: BodySpec, seed: number): Pix {
  const S = PORTRAIT_SIZE, p = new Pix(S, S), C = spec.colours, P = spec.plan;
  const rng = Rng.fromSeed(`portrait:${seed}`);
  // The head: bigger for peoples with big heads (dwarves, misslor), wider by the plan.
  const big = Math.min(1.35, P.head / 0.13);
  const hx = 20, hy = 16, rx = 7.2 * P.headW * Math.sqrt(big), ry = 9 * Math.sqrt(big);
  const jaw = P.jaw ?? 0;

  // Shoulders and chest: the garment, a cloak or vest over it; wider for a broad build.
  const sw = 15 * Math.min(1.25, spec.girth) * (spec.plan.shoulders / 0.26 || 1);
  for (let y = 29; y < S; y++) {
    const half = Math.min(sw, 7 + (y - 29) * 2.4);
    for (let x = Math.floor(hx - half); x <= Math.ceil(hx + half); x++) {
      const nx = (x - hx) / half, ny = (y - 34) / 6;
      let c = C.top;
      if (C.cloak && Math.abs(nx) > 0.55) c = C.cloak;
      else if (C.vest && Math.abs(nx) > 0.2 && Math.abs(nx) < 0.75) c = C.vest;
      if (C.apron && Math.abs(nx) < 0.35 && y > 34) c = C.apron;
      p.set(x, y, lit(c, lightAt(nx, ny), x, y));
    }
  }
  // The neck.
  for (let y = hy + ry - 3; y < 31; y++) for (let x = hx - 3; x <= hx + 2; x++) p.set(x, y, lit(C.skinDark, -0.1, x, y));

  // Long hair falls behind the shoulders.
  if (spec.style === 'long') ellipse(p, hx, hy + 6, rx + 2.5, ry + 2, C.hair);
  if (spec.style === 'hood') ellipse(p, hx, hy + 1, rx + 3, ry + 3, C.head ?? C.cloak ?? C.top);

  // Ears (pointed ones rise above the head line: elves).
  for (const side of [-1, 1]) {
    const ex = hx + side * (rx - 0.5), ey = hy + 1;
    ellipse(p, ex, ey, 1.6, 2.4, C.skin);
    if (P.pointedEars) for (let k = 0; k < 5; k++) p.set(ex + side * (k * 0.5), ey - 2 - k, C.skin);
  }
  // The face: a heavy jaw stands out below (the tirak).
  ellipse(p, hx, hy, rx, ry, C.skin);
  if (jaw > 0) ellipse(p, hx, hy + ry * 0.45, rx * (1 + jaw * 1.6), ry * 0.55, C.skin, (_x, y) => y > hy + 1);

  // Eyes, brows, nose, mouth.
  const eyeR = Math.max(1, Math.round(P.eyes)), ey = Math.round(hy + 0.5), eyeC = P.eyeColour ?? C.eyes;
  for (const side of [-1, 1]) {
    const ex = Math.round(hx + side * rx * 0.42) - (side < 0 ? eyeR - 1 : 0);
    for (let dy = 0; dy < eyeR; dy++) for (let dx = 0; dx < eyeR; dx++) p.set(ex + dx, ey + dy, eyeC);
    if (eyeR > 1) p.set(ex, ey, '#ffffff'); // a glint in big eyes
    for (let dx = -1; dx <= eyeR; dx++) p.set(ex + dx, ey - 2, shade(C.hair, 0.8));
  }
  for (let y = ey + 1; y <= ey + 3; y++) p.set(hx + (y === ey + 3 ? 0 : 1), y, C.skinDark);
  const my = Math.round(hy + ry * 0.55);
  for (let dx = -1; dx <= 1; dx++) p.set(hx + dx, my, shade(C.skinDark, 0.85));
  if (jaw > 0) {
    // Tusks from the lower jaw.
    p.set(hx - 3, my - 1, '#e8e0c8');
    p.set(hx - 3, my - 2, '#e8e0c8');
    p.set(hx + 3, my - 1, '#e8e0c8');
    p.set(hx + 3, my - 2, '#e8e0c8');
  }

  // A beard over the lower face.
  if (spec.beard === 'full') {
    for (let y = Math.round(hy + 2); y <= hy + ry + 3; y++) {
      for (let x = Math.floor(hx - rx); x <= Math.ceil(hx + rx); x++) {
        const nx = (x + 0.5 - hx) / rx, ny = (y + 0.5 - (hy + 2)) / (ry + 1);
        if (nx * nx + ny * ny > 1 || (y === my && Math.abs(x - hx) <= 1)) continue;
        p.set(x, y, lit(C.hair, lightAt(nx, ny), x, y));
      }
    }
  } else if (spec.beard === 'stubble') {
    for (let y = my - 2; y <= hy + ry; y++) for (let x = Math.floor(hx - rx + 1); x <= hx + rx - 1; x++) if (bayer(x, y) > 0.55 && p.alpha(x, y)) p.set(x, y, C.skinDark);
  }

  // Hair and headgear over the top of the head.
  const capY = hy - ry * 0.25;
  const cap = (colour: string, down = capY, grow = 0.6): void =>
    ellipse(p, hx, hy - 1, rx + grow, ry + grow, colour, (_x, y) => y < down);
  switch (spec.style) {
    case 'short':
    case 'long':
      cap(C.hair);
      // A ragged fringe.
      for (let x = Math.floor(hx - rx + 1); x < hx + rx - 1; x++) if (rng.next() < 0.5) p.set(x, Math.floor(capY), C.hair);
      break;
    case 'bun':
      cap(C.hair);
      ellipse(p, hx + 1, hy - ry - 1, 3, 2.5, C.hair);
      break;
    case 'kerchief':
      cap(C.head ?? C.top, capY + 1, 0.8);
      break;
    case 'hat':
      cap(C.head ?? C.top, capY - 1, 0.4);
      for (let x = Math.floor(hx - rx - 3); x <= hx + rx + 3; x++) p.set(x, Math.floor(capY - 1), shade(C.head ?? C.top, 0.8));
      break;
    case 'helm':
      cap(C.iron, capY + 1, 0.9);
      for (let y = Math.floor(capY); y <= ey + 3; y++) p.set(hx, y, C.iron); // the nasal
      break;
    case 'hood':
      cap(C.head ?? C.cloak ?? C.top, capY + 1, 1.2);
      break;
    default:
      break;
  }

  return p.outlined('#1a1420');
}
