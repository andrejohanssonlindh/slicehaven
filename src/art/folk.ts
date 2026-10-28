import { Rng } from '../core/rng';
import { type Prop, capsule, column, pick, polyFill, selOutline, white } from './grit';
import { Pix } from './pix';
import { FRAMES } from './props';

/**
 * People. Aimed at Secret of Mana's readable, shaded sprites but with grown-up
 * proportions (about five heads tall, real shoulders, hands, boots) and
 * working clothes that have seen use. Front view, idle breathing, blinking.
 *
 * Everything is built from a spec, so a new villager is a new spec, not new pixels.
 */

type Ramp = readonly string[];

export const SKIN: Record<string, Ramp> = {
  fair: ['#5a3a30', '#8c5a48', '#bc8266', '#dba684', '#efc8a4'],
  tan: ['#4b2c20', '#7a4a34', '#a66c48', '#c88c60', '#e0aa7c'],
  brown: ['#2e1a14', '#52301f', '#7a4a2e', '#9c6840', '#bb8656'],
  ruddy: ['#5a2f2a', '#8c4a40', '#b8695a', '#d68d78', '#ebb094'],
};
export const HAIR: Record<string, Ramp> = {
  brown: ['#150e0c', '#2c1c14', '#47301f', '#68472c'],
  black: ['#0a0809', '#171316', '#2a2328', '#41383d'],
  grey: ['#35343a', '#5f5e66', '#8c8b90', '#bcbbbb'],
  blond: ['#4e3a1c', '#7c6030', '#a98a46', '#d2b766'],
  red: ['#2e120c', '#5c2412', '#8c3c1a', '#b85c28'],
};
export const CLOTH: Record<string, Ramp> = {
  linen: ['#6c6150', '#968a72', '#c0b494', '#e2dac0'],
  bluegrey: ['#262f3f', '#3a4b63', '#58708c', '#8099b2'],
  moss: ['#222d1c', '#37492a', '#55703a', '#7c9650'],
  brown: ['#2a1c14', '#46301f', '#664830', '#8a6444'],
  rust: ['#3a1810', '#6a2c1a', '#964628', '#bf6c3c'],
  wine: ['#2e1218', '#561e2a', '#802e3c', '#a8485a'],
  grey: ['#25252c', '#3e3f48', '#5e606c', '#868894'],
  mustard: ['#3c2c10', '#6a5018', '#9a7a26', '#c8a444'],
  leather: ['#1c120d', '#34221a', '#523828', '#76523a'],
  straw: ['#5a4222', '#8a6a38', '#b8944c', '#dcc078'],
  steel: ['#1e2128', '#383d4a', '#5e6676', '#8f98a8', '#c4ccd6'],
  white: ['#6a6670', '#9c98a2', '#c8c4cc', '#ecebe6'],
};

export type Held = 'hoe' | 'staff' | 'spear' | 'hammer' | 'basket' | 'bucket' | 'stick' | 'none';
export type HairStyle = 'short' | 'long' | 'bald' | 'bun' | 'kerchief' | 'hat' | 'helm' | 'hood';
export type Garment = 'shirt' | 'tunic' | 'dress' | 'robe';

export interface FolkSpec {
  seed: number;
  build?: 'lean' | 'avg' | 'stout' | 'child';
  skin: Ramp;
  hair: Ramp;
  style: HairStyle;
  beard?: 'full' | 'stubble';
  garment: Garment;
  top: Ramp;
  legs: Ramp;
  boots?: Ramp;
  /** Cloth for hat / kerchief / hood. */
  head?: Ramp;
  sleeves?: 'long' | 'rolled' | 'short';
  apron?: Ramp;
  vest?: Ramp;
  belt?: boolean;
  cloak?: Ramp;
  right?: Held;
  left?: Held;
}

export interface Pose {
  bob: number;
  /** Arm swing in pixels-ish: the left hand drops and the right lifts when positive (negative the other way). */
  arm: number;
  blink: boolean;
  /** Pixels each foot is raised (left, right), for the walk. */
  lift?: [number, number];
  /** Seen from behind: no face, hair all round, the cloak in front. Mirror the result so held things swap sides. */
  back?: boolean;
}

export const W = 40, H = 44, CX = 17, FOOT = 38;
export const EYE = '#1b1424';

export function drawHeld(p: Pix, what: Held, hx: number, hy: number, top: number, seed: number): void {
  const wood = CLOTH.leather;
  switch (what) {
    case 'hoe': {
      capsule(p, hx, hy + 7, hx + 1.5, top - 2, 0.9, 0.9, wood, seed, 0.2);
      for (const [x, y, c] of [[2, -1, 3], [3, 0, 2], [4, 1, 2], [4, 2, 1], [3, 2, 1], [2, 0, 0]] as const) {
        p.set(hx + 1 + x - 1, top - 2 + y, CLOTH.steel[c]);
      }
      break;
    }
    case 'staff':
      capsule(p, hx, hy + 8, hx + 0.5, top - 4, 1.0, 1.0, wood, seed, 0.25);
      for (const [x, y] of [[0, 0], [1, 0], [1, 1], [0, 1], [-1, 0]] as const) p.set(hx + x + 0, top - 5 + y, wood[3]);
      break;
    case 'stick':
      capsule(p, hx + 0.5, hy + 8, hx - 0.5, hy - 9, 0.8, 0.8, wood, seed, 0.25);
      break;
    case 'spear':
      capsule(p, hx, hy + 8, hx, top - 8, 0.9, 0.9, wood, seed, 0.2);
      for (const [dy, w] of [[-8, 1], [-7, 1], [-6, 2], [-5, 2], [-4, 3], [-3, 2], [-2, 1]] as const) {
        for (let k = 0; k < w; k++) p.set(hx - Math.floor(w / 2) + k, top + dy - 2, k === 0 ? CLOTH.steel[4] : CLOTH.steel[2 + (k & 1)]);
      }
      break;
    case 'hammer':
      capsule(p, hx, hy + 3, hx + 0.5, hy - 6, 0.9, 0.9, wood, seed, 0.2);
      for (let y = -9; y <= -6; y++) for (let x = -2; x <= 3; x++) p.set(hx + x, hy + y, CLOTH.steel[x < 0 ? 3 : x < 2 ? 2 : 1]);
      p.set(hx - 2, hy - 9, CLOTH.steel[4]);
      break;
    case 'bucket': {
      for (let x = hx - 3; x <= hx + 2; x++) p.set(x, hy + 3, '#2a1c14');
      for (const k of [-3, 2]) for (let y = hy; y <= hy + 3; y++) p.set(hx + k, y, y === hy + 1 ? CLOTH.steel[2] : CLOTH.leather[1]);
      const pts: [number, number][] = [[hx - 3, hy + 4], [hx + 3, hy + 4], [hx + 3, hy + 11], [hx - 3, hy + 11]];
      polyFill(p, pts, (x, y) => pick(CLOTH.brown, 0.8 - (x - hx + 3) * 0.12 + (white(x >> 0, y, seed) - 0.5) * 0.15 + (y - hy - 4) * 0.02, x, y));
      for (const y of [hy + 5, hy + 10]) for (let x = hx - 3; x < hx + 3; x++) p.set(x, y, CLOTH.steel[1 + (x & 1)]);
      for (let x = hx - 2; x < hx + 2; x++) p.set(x, hy + 4, '#3b5f86');
      break;
    }
    case 'basket': {
      polyFill(p, [[hx - 5, hy + 1], [hx + 4, hy + 1], [hx + 3, hy + 8], [hx - 4, hy + 8]], (x, y) => {
        const weave = (x + y) % 3 === 0 ? -0.18 : 0.04;
        return pick(CLOTH.straw, 0.55 + weave - (x - hx) * 0.04 + (white(x, y, seed) - 0.5) * 0.15, x, y);
      });
      for (let x = hx - 5; x <= hx + 4; x++) p.set(x, hy + 1, CLOTH.straw[1]);
      for (const [x, y, c] of [[-3, 0, '#b8453a'], [-1, 0, '#c9574a'], [1, 0, '#b8453a'], [0, -1, '#d8705a'], [-2, -1, '#a83c32'], [2, 0, '#c9574a']] as const) p.set(hx + x, hy + y, c);
      break;
    }
    case 'none':
      break;
  }
}

export function drawFront(spec: FolkSpec, pose: Pose): Pix {
  const p = new Pix(W, H);
  const seed = spec.seed;
  const child = spec.build === 'child';
  const legLen = child ? 11 : 16;
  const torsoLen = child ? 8 : 11;
  const hipY = FOOT - legLen;
  const shY = hipY - torsoLen + pose.bob;
  const hy = shY - 8; // top row of the head
  const sh = { lean: 4.5, avg: 5.2, stout: 6.4, child: 3.8 }[spec.build ?? 'avg'];
  const wa = { lean: 3.5, avg: 4.0, stout: 5.6, child: 3.2 }[spec.build ?? 'avg'];
  const hem = spec.garment === 'robe' ? FOOT - 3 : spec.garment === 'dress' ? FOOT - 6 : spec.garment === 'tunic' ? hipY + 5 : hipY + 1;
  const boots = spec.boots ?? CLOTH.leather;
  const legX = wa * 0.55;

  // --- behind the body (from behind, the cloak hangs in front of it instead: drawn after the torso) ---
  const drawCloak = (): void => {
    if (!spec.cloak) return;
    polyFill(p, [[CX - sh - 1, shY + 1], [CX + sh + 1, shY + 1], [CX + sh + 3.5, hem + 1], [CX - sh - 3.5, hem + 1]], (x, y) => {
      const u = (x - CX) / (sh + 3);
      return pick(spec.cloak!, 0.5 - u * 0.3 - (y - shY) * 0.012 + (white(x, y, seed + 40) - 0.5) * 0.18 + (white(x, 0, seed + 41) < 0.14 ? -0.2 : 0), x, y);
    });
  };
  if (!pose.back) drawCloak();
  if (spec.style === 'long') {
    column(p, hy + 1, shY + 6, () => CX, (y) => (y < hy + 6 ? 4.4 : 4.2 - (y - hy - 6) * 0.15), spec.hair, seed + 3, 0.3);
  }
  if (spec.right && spec.right !== 'hammer' && spec.right !== 'bucket') drawHeld(p, spec.right, CX + sh + 1.5, shY + 9, hy, seed);

  // --- legs ---
  const bare = spec.garment === 'shirt' || spec.garment === 'tunic';
  if (bare || hem < FOOT - 3) {
    const step = pose.bob ? 0.4 : 0;
    for (const side of [-1, 1]) {
      const hx = CX + side * legX;
      const fx = CX + side * (legX + 0.8 + step * side);
      const lf = Math.round(pose.lift?.[side < 0 ? 0 : 1] ?? 0);
      capsule(p, hx, hipY - 1, fx, FOOT - 4 - lf, wa * 0.42, wa * 0.36, spec.legs, seed + (side > 0 ? 7 : 8), 0.2);
      // Boot.
      capsule(p, fx, FOOT - 5 - lf, fx + side * 0.4, FOOT - 1 - lf, wa * 0.42 + 0.3, wa * 0.42 + 0.5, boots, seed + 9, 0.22);
      p.set(Math.round(fx + side * (wa * 0.42 + 1.2)), FOOT - 1 - lf, boots[2]);
      p.set(Math.round(fx + side * (wa * 0.42 + 0.6)), FOOT - lf, boots[1]);
    }
  }

  // --- torso / skirt ---
  const flare = spec.garment === 'dress' ? 3.2 : spec.garment === 'robe' ? 3.8 : spec.garment === 'tunic' ? 1.4 : 0.6;
  const bottom = Math.max(hem, hipY + 1);
  const widthAt = (y: number): number => {
    if (y < shY + 2) return sh - (2 - (y - shY)) * 1.1; // sloped shoulders
    if (y <= hipY) return sh + (wa - sh) * Math.min(1, (y - shY - 2) / (hipY - shY - 2));
    return wa + ((y - hipY) / Math.max(1, bottom - hipY)) * flare;
  };
  const torsoTop = shY;
  const torsoColors = spec.top;
  column(p, torsoTop, bottom, () => CX, widthAt, torsoColors, seed + 11, 0.16);
  // Folds: dark creases from the belt up and from the hem up.
  for (let k = 0; k < 3; k++) {
    const fx = Math.round(CX + (white(k, 1, seed + 12) - 0.5) * 2 * (wa - 0.6));
    const f0 = hipY + 1 + Math.floor(white(k, 2, seed + 12) * 3);
    const len = 4 + Math.floor(white(k, 3, seed + 12) * 6);
    for (let y = f0; y > f0 - len; y--) {
      if (white(fx, y, seed + 13) < 0.8 && p.alpha(fx, y)) p.set(fx, y, torsoColors[1]);
    }
    for (let y = hipY + 2; y <= bottom - 1 && spec.garment !== 'shirt'; y++) {
      if (white(fx + 3 * k, y, seed + 14) < 0.55 && p.alpha(fx + 2 * (k - 1), y)) p.set(fx + 2 * (k - 1), y, torsoColors[1]);
    }
  }
  // Ragged hem.
  if (spec.garment !== 'shirt') {
    for (let x = 0; x < W; x++) {
      if (p.alpha(x, bottom) && white(x, bottom, seed + 15) < 0.35) {
        const i = (bottom * W + x) * 4;
        p.data[i + 3] = 0;
      } else if (p.alpha(x, bottom - 1) && white(x, bottom, seed + 16) < 0.2) p.set(x, bottom, torsoColors[0]);
    }
  }
  if (spec.vest) {
    for (let y = shY + 1; y <= hipY + 1; y++) {
      const half = widthAt(y);
      for (const side of [-1, 1]) {
        for (let k = 0; k < 2; k++) {
          const x = Math.round(CX + side * (half - 0.5 - k));
          p.set(x - (side < 0 ? 0 : 1), y, pick(spec.vest, 0.7 - (x - CX) * 0.08, x, y));
        }
      }
    }
  }
  if (pose.back) drawCloak();
  if (spec.apron && !pose.back) {
    const a0 = shY + 3;
    for (let y = a0; y <= Math.min(bottom, hipY + 9); y++) {
      const half = y < hipY ? 3.4 : 3.4 + (y - hipY) * 0.25;
      for (let x = Math.round(CX - half); x < Math.round(CX + half); x++) {
        const u = (x - CX) / half;
        p.set(x, y, pick(spec.apron, 0.78 - u * 0.25 + (white(x, y, seed + 20) - 0.5) * 0.18 - (y - a0) * 0.01 + (white(x >> 1, y, seed + 21) < 0.05 ? -0.3 : 0), x, y));
      }
      p.set(Math.round(CX - half), y, spec.apron[1]);
    }
    p.set(CX - 3, shY + 1, spec.apron[1]); p.set(CX + 2, shY + 1, spec.apron[1]);
  }
  if (spec.belt !== false && !spec.apron) {
    const by = hipY - 1;
    for (let x = Math.round(CX - wa - 0.5); x < Math.round(CX + wa + 0.5); x++) p.set(x, by, CLOTH.leather[1 + (x & 1)]);
    p.set(CX, by, '#c8a444');
  } else if (spec.apron) {
    for (let x = Math.round(CX - wa - 0.5); x < Math.round(CX + wa + 0.5); x++) p.set(x, hipY - 1, CLOTH.leather[1]);
  }

  // --- neck and head ---
  const skin = spec.skin;
  p.set(CX - 1, hy + 7, skin[1]); p.set(CX, hy + 7, skin[1]); p.set(CX - 1, hy + 8, skin[0]); p.set(CX, hy + 8, skin[1]);
  if (!pose.back) {
    // Collar: a dark V where cloth meets neck.
    p.set(CX - 2, hy + 8, torsoColors[1]); p.set(CX + 1, hy + 8, torsoColors[1]);
  }
  if (spec.style === 'hood') {
    const hc = spec.head ?? spec.cloak ?? CLOTH.brown;
    polyFill(p, [[CX - 5, hy - 1], [CX + 5, hy - 1], [CX + 6, hy + 7], [CX - 6, hy + 8]], (x, y) => pick(hc, 0.6 - (x - CX) * 0.05 + (white(x, y, seed + 30) - 0.5) * 0.2 - (y - hy) * 0.02, x, y));
  }
  const halfs = [2.0, 3.0, 3.3, 3.3, 3.1, 2.6, 1.6];
  for (let i = 0; i < 7; i++) {
    const y = hy + i;
    const hh = spec.style === 'hood' ? halfs[i] - 0.7 : halfs[i];
    for (let x = Math.round(CX - hh); x <= Math.round(CX + hh) - 1; x++) {
      const u = (x + 0.5 - CX) / hh;
      let v = 0.85 - (u + 1) * 0.34 + (white(x, y, seed + 50) - 0.5) * 0.12;
      if (spec.style === 'hood' && i < 3) v -= 0.3; // deep inside the hood
      p.set(x, y, pick(skin, v, x, y));
    }
  }
  // Ears.
  for (const side of [-1, 1]) p.set(Math.round(CX + side * 3.6 - (side < 0 ? 0 : 0.5)), hy + 3, skin[side < 0 ? 2 : 1]);
  // Face (from behind there is none: hair or headgear covers the whole head, see below).
  const ex = [CX - 2, CX + 1];
  if (!pose.back) {
    for (const x of ex) p.set(x, hy + 3, pose.blink ? skin[1] : EYE);
    p.set(CX, hy + 4, skin[1]);
    p.set(CX - 1, hy + 5, '#8a4a40'); p.set(CX, hy + 5, '#9a5a4c');
    for (const x of ex) p.set(x, hy + 2, skin[1]);
  }

  // Hair, hats and beards.
  const hair = spec.hair;
  const cap = (rows: number, extra: number, ramp: Ramp, fringe = 0.3): void => {
    for (let i = 0; i < rows; i++) {
      const hh = halfs[i] + extra;
      for (let x = Math.round(CX - hh); x <= Math.round(CX + hh) - 1; x++) {
        if (i === rows - 1 && white(x, i, seed + 60) < fringe) continue; // ragged fringe
        const u = (x + 0.5 - CX) / hh;
        p.set(x, hy + i, pick(ramp, 0.85 - (u + 1) * 0.36 - i * 0.05 + (white(x, i, seed + 61) - 0.5) * 0.3, x, hy + i));
      }
    }
  };
  if (pose.back) {
    // The back of the head: hair (or the cloth or metal that covers it) to the nape.
    const covered: Partial<Record<HairStyle, Ramp>> = {
      short: hair, long: hair, bun: hair, hat: hair, kerchief: spec.head ?? CLOTH.linen, helm: CLOTH.steel, hood: spec.head ?? spec.cloak ?? CLOTH.brown,
    };
    const ramp = covered[spec.style];
    if (ramp) cap(spec.style === 'helm' || spec.style === 'hood' ? 6 : 5, spec.style === 'hood' ? -0.7 : 0.2, ramp, 0);
  }
  switch (spec.style) {
    case 'short':
      cap(3, 0.6, hair);
      for (const side of [-1, 1]) for (let i = 3; i < 5; i++) p.set(Math.round(CX + side * 3.3 - (side < 0 ? 0 : 1)), hy + i, hair[1]);
      break;
    case 'long':
      cap(3, 0.7, hair, 0.4);
      for (const side of [-1, 1]) for (let i = 3; i < 9; i++) p.set(Math.round(CX + side * 3.6 - (side < 0 ? 0.5 : 0.5)), hy + i, hair[side < 0 ? 2 : 1]);
      break;
    case 'bun':
      cap(3, 0.5, hair);
      for (let y = -2; y <= 0; y++) for (let x = -2; x <= 1; x++) if (Math.abs(x + 0.5) + Math.abs(y + 0.4) < 2.4) p.set(CX + x, hy - 1 + y, pick(hair, 0.7 - x * 0.12, CX + x, y));
      break;
    case 'bald':
      for (const side of [-1, 1]) for (let i = 3; i < 5; i++) p.set(Math.round(CX + side * 3.3 - (side < 0 ? 0 : 1)), hy + i, hair[2]);
      for (let x = CX - 2; x <= CX; x++) p.set(x, hy, skin[4]);
      break;
    case 'kerchief': {
      const c = spec.head ?? CLOTH.linen;
      cap(4, 0.8, c, 0);
      for (const [x, y] of [[CX + 4, hy + 3], [CX + 5, hy + 4], [CX + 4, hy + 4], [CX + 5, hy + 5]] as const) p.set(x, y, c[1]);
      for (const x of [CX - 2, CX, CX + 1]) p.set(x, hy + 4, hair[2]);
      break;
    }
    case 'hat': {
      const c = spec.head ?? CLOTH.straw;
      for (let y = 0; y < 3; y++) for (let x = CX - 3; x <= CX + 2; x++) p.set(x, hy - 1 + y, pick(c, 0.8 - (x - CX) * 0.08 - y * 0.05 + (white(x, y, seed + 62) - 0.5) * 0.3, x, y));
      for (let x = CX - 4; x <= CX + 3; x++) p.set(x, hy + 1, CLOTH.leather[2]);
      for (let x = CX - 7; x <= CX + 6; x++) {
        const edge = Math.abs(x + 0.5 - CX) / 7;
        const y = hy + 2 + (edge > 0.7 ? 0 : 0);
        if (white(x, 0, seed + 63) < 0.12) continue;
        p.set(x, y, pick(c, 0.75 - (x - CX) * 0.05 + (white(x, 3, seed + 64) - 0.5) * 0.3, x, y));
        if (edge < 0.8) p.set(x, y + 1, pick(c, 0.25 + (white(x, 5, seed + 65) - 0.5) * 0.2, x, y + 1));
      }
      for (let x = CX - 3; x <= CX + 2; x++) p.set(x, hy + 4, skin[1]);
      break;
    }
    case 'helm': {
      const c = CLOTH.steel;
      for (let y = 0; y < 3; y++) {
        const hh = [2.8, 3.6, 4.0][y];
        for (let x = Math.round(CX - hh); x < Math.round(CX + hh); x++) p.set(x, hy - 1 + y, pick(c, 0.9 - (x - CX + hh) / (2 * hh) * 0.8 - y * 0.05 + (white(x, y, seed + 66) - 0.5) * 0.18, x, y));
      }
      for (let x = CX - 6; x <= CX + 5; x++) p.set(x, hy + 2, pick(c, 0.55 - (x - CX) * 0.04 + (white(x, 1, seed + 67) - 0.5) * 0.2, x, 2));
      for (let x = CX - 5; x <= CX + 4; x++) p.set(x, hy + 3, c[0]);
      p.set(CX - 2, hy, c[4]); p.set(CX - 1, hy - 1, c[4]);
      break;
    }
    case 'hood':
      break;
  }
  if (pose.back) {
    // No beard to show.
  } else if (spec.beard === 'full') {
    for (let i = 4; i < 7; i++) {
      const hh = [3.1, 2.8, 1.8][i - 4];
      for (let x = Math.round(CX - hh); x < Math.round(CX + hh); x++) {
        if (i === 4 && x > CX - 3 && x < CX + 2) continue; // cheeks and nose stay clear
        if (i === 5 && (x === CX - 1 || x === CX)) { p.set(x, hy + i, '#8a4a40'); continue; }
        p.set(x, hy + i, pick(hair, 0.8 - (x - CX) * 0.1 - (i - 4) * 0.08 + (white(x, i, seed + 70) - 0.5) * 0.4, x, i));
      }
    }
    p.set(CX - 1, hy + 7, hair[2]); p.set(CX, hy + 7, hair[1]);
  } else if (spec.beard === 'stubble') {
    for (let i = 4; i < 7; i++) for (let x = CX - 3; x < CX + 3; x++) if (p.alpha(x, hy + i) && white(x, i, seed + 71) < 0.35 && !(i === 5 && (x === CX - 1 || x === CX))) p.set(x, hy + i, skin[1]);
  }

  // --- arms ---
  const sleeves = spec.sleeves ?? 'long';
  const swing = pose.arm;
  const armLen = child ? 8 : 10;
  for (const side of [-1, 1]) {
    const sx = CX + side * (sh - 0.8);
    const hxp = CX + side * (sh + 0.7 + (side > 0 ? 0.3 : 0));
    const handY = shY + armLen + (side > 0 ? -swing : swing) * 0.7 + (child ? 1 : 0);
    const sleeve = side > 0 ? spec.top.map((c, i) => (i === 3 ? spec.top[2] : c)) : spec.top;
    const elbowT = sleeves === 'long' ? 1 : sleeves === 'rolled' ? 0.45 : 0.3;
    // Forearm and hand in skin; sleeve over the upper part.
    capsule(p, sx, shY + 1, hxp, handY - 1, 1.9, 1.5, sleeves === 'long' ? sleeve : skin, seed + (side > 0 ? 80 : 81), 0.18);
    if (sleeves !== 'long') {
      capsule(p, sx, shY + 1, sx + (hxp - sx) * elbowT, shY + 1 + (handY - 1 - shY - 1) * elbowT, 2.0, 1.8, sleeve, seed + 82, 0.18);
    }
    // Hand.
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) p.set(Math.round(hxp - 0.5) + dx, Math.round(handY) + dy, pick(skin, 0.6 - (dx ? 0.2 : 0) + (side > 0 ? -0.1 : 0), dx, dy));
    if (sleeves === 'long') {
      for (let k = -1; k <= 1; k++) p.set(Math.round(hxp) + k, Math.round(handY) - 1, spec.top[1]); // cuff
    }
  }
  if (spec.right === 'hammer' || spec.right === 'bucket') drawHeld(p, spec.right, CX + sh + 1.8, shY + armLen - swing * 0.7, hy, seed);
  if (spec.left) drawHeld(p, spec.left, CX - sh - 1.5, shY + armLen + swing * 0.7, hy, seed + 5);
  return p;
}

/** A person, standing and breathing. */
export function makeFolk(spec: FolkSpec): Prop {
  const rng = Rng.fromSeed(spec.seed);
  const phase = rng.int(FRAMES);
  const frames: Pix[] = [];
  const cache = new Map<string, Pix>();
  for (let f = 0; f < FRAMES; f++) {
    const g = (f + phase) % FRAMES;
    const pose: Pose = { bob: g >= 3 && g <= 5 ? 1 : 0, arm: g >= 2 && g <= 6 ? 1 : 0, blink: g === 7 && spec.seed % 2 === 0 };
    const key = `${pose.bob}${pose.arm}${pose.blink}`;
    let out = cache.get(key);
    if (!out) {
      out = selOutline(drawFront(spec, pose));
      cache.set(key, out);
    }
    frames.push(out);
  }
  return { frames, ax: CX + 1, ay: FOOT + 2, shadow: 14 };
}

// --- a first cast ----------------------------------------------------------

export const FOLK: Record<string, FolkSpec> = {
  farmer: {
    seed: 1, build: 'avg', skin: SKIN.tan, hair: HAIR.brown, style: 'hat', head: CLOTH.straw, beard: 'stubble',
    garment: 'shirt', top: CLOTH.linen, legs: CLOTH.brown, vest: CLOTH.moss, sleeves: 'rolled', right: 'hoe',
  },
  baker: {
    seed: 2, build: 'avg', skin: SKIN.fair, hair: HAIR.brown, style: 'kerchief', head: CLOTH.rust,
    garment: 'dress', top: CLOTH.bluegrey, legs: CLOTH.bluegrey, apron: CLOTH.white, sleeves: 'rolled', left: 'basket',
  },
  elder: {
    seed: 3, build: 'lean', skin: SKIN.fair, hair: HAIR.grey, style: 'bald', beard: 'full',
    garment: 'robe', top: CLOTH.moss, legs: CLOTH.moss, cloak: CLOTH.brown, right: 'staff',
  },
  smith: {
    seed: 4, build: 'stout', skin: SKIN.ruddy, hair: HAIR.black, style: 'short', beard: 'full',
    garment: 'shirt', top: CLOTH.mustard, legs: CLOTH.grey, apron: CLOTH.leather, sleeves: 'short', right: 'hammer',
  },
  guard: {
    seed: 5, build: 'avg', skin: SKIN.fair, hair: HAIR.brown, style: 'helm', beard: 'stubble',
    garment: 'tunic', top: CLOTH.wine, legs: CLOTH.grey, vest: CLOTH.steel, sleeves: 'long', right: 'spear',
  },
  wife: {
    seed: 6, build: 'lean', skin: SKIN.fair, hair: HAIR.red, style: 'long',
    garment: 'dress', top: CLOTH.moss, legs: CLOTH.moss, sleeves: 'long', right: 'bucket',
  },
  child: {
    seed: 7, build: 'child', skin: SKIN.fair, hair: HAIR.blond, style: 'short',
    garment: 'tunic', top: CLOTH.rust, legs: CLOTH.brown, sleeves: 'short', right: 'stick',
  },
  traveller: {
    seed: 8, build: 'avg', skin: SKIN.brown, hair: HAIR.black, style: 'hood', head: CLOTH.grey,
    garment: 'tunic', top: CLOTH.grey, legs: CLOTH.brown, cloak: CLOTH.grey, right: 'staff',
  },
};
