import { type FolkSpec, type Pose, CLOTH, CX, FOOT, H, W, drawFront, drawHeld, EYE } from './folk';
import { capsule, column, pick, polyFill, selOutline, white } from './grit';
import { Pix } from './pix';

/**
 * Walking people: the front view of `folk.ts` plus a back view and a profile,
 * each with a standing breath and a six-frame walk. A person is drawn once per
 * view; left-facing is the right-facing profile turned round by the renderer
 * (the card is rotated, so the art is never mirrored twice).
 */

export type View = 'front' | 'back' | 'side';
export const VIEWS: readonly View[] = ['front', 'back', 'side'];
export const WALK_FRAMES = 6;
export const IDLE_FRAMES = 8;

export interface WalkSet {
  /** Per view: standing frames (breathing) and walking frames. Every frame has the same size and anchor. */
  views: Record<View, { idle: Pix[]; walk: Pix[] }>;
  /** Anchor in art pixels (feet centre) and the person's shadow width, as for any sprite. */
  ax: number;
  ay: number;
}

type Ramp = readonly string[];

/**
 * Which view shows a person moving along (dirX, dirZ) in the world, seen by a
 * camera turned `yaw`, and whether the profile must face screen-left. The
 * current view is kept until another is clearly better, so a path that bends
 * does not make the person flicker between views.
 */
export function viewFor(dirX: number, dirZ: number, yaw: number, current: View, currentLeft: boolean): { view: View; left: boolean } {
  const right = dirX * Math.cos(yaw) - dirZ * Math.sin(yaw);
  // Toward the camera is the way the camera sits from what it looks at.
  const toward = dirX * Math.sin(yaw) + dirZ * Math.cos(yaw);
  if (Math.hypot(right, toward) < 1e-6) return { view: current, left: currentLeft };
  const a = Math.abs(right), b = Math.abs(toward), band = 1.35;
  let view: View;
  if (current === 'side') view = b > a * band ? (toward > 0 ? 'front' : 'back') : 'side';
  else view = a > b * band ? 'side' : toward > 0 ? 'front' : 'back';
  return { view, left: view === 'side' ? (Math.abs(right) > 0.05 ? right < 0 : currentLeft) : false };
}

/** Mirror about the figure's own axis (not the canvas's), so the anchor stays put. */
export function mirror(src: Pix): Pix {
  const out = new Pix(src.w, src.h);
  const axis = 2 * CX + 1;
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const nx = axis - x;
      if (nx < 0 || nx >= src.w) continue;
      const i = (y * src.w + x) * 4, o = (y * src.w + nx) * 4;
      for (let k = 0; k < 4; k++) out.data[o + k] = src.data[i + k];
    }
  }
  return out;
}

/** Walk phase for frame f: stride in -1..1, the lift of each foot in pixels, and the body's bob. */
export function walkPhase(f: number): { stride: number; liftA: number; liftB: number; bob: number } {
  const a = (f / WALK_FRAMES) * Math.PI * 2;
  return {
    stride: Math.sin(a),
    liftA: Math.max(0, Math.cos(a)) * 2,
    liftB: Math.max(0, -Math.cos(a)) * 2,
    // The body sinks a pixel when the legs are furthest apart.
    bob: Math.abs(Math.sin(a)) > 0.8 ? 1 : 0,
  };
}

interface SidePose {
  /** -1..1: leg A (the near leg) forward when positive. */
  stride: number;
  liftA: number;
  liftB: number;
  bob: number;
  blink: boolean;
}

/** The same cloth in shade: the ramp without its lightest tone (never fewer than three). */
const dark = (r: Ramp): Ramp => r.slice(0, Math.max(3, r.length - 1));

/** The profile, facing screen-right. */
export function drawSide(spec: FolkSpec, pose: SidePose): Pix {
  const p = new Pix(W, H);
  const seed = spec.seed;
  const child = spec.build === 'child';
  const legLen = child ? 11 : 16;
  const torsoLen = child ? 8 : 11;
  const hipY = FOOT - legLen;
  const shY = hipY - torsoLen + pose.bob;
  const hy = shY - 8;
  const td = { lean: 3.4, avg: 4, stout: 5, child: 3.1 }[spec.build ?? 'avg'];
  const hem = spec.garment === 'robe' ? FOOT - 3 : spec.garment === 'dress' ? FOOT - 6 : spec.garment === 'tunic' ? hipY + 5 : hipY + 1;
  const boots = spec.boots ?? CLOTH.leather;
  const long = hem >= FOOT - 3 || spec.garment === 'dress';
  const sway = pose.stride * 0.8;

  // --- behind: the cloak, long hair, the far arm's tool ---
  if (spec.cloak) {
    polyFill(p, [[CX - td, shY + 1], [CX + 1, shY + 1], [CX - td - 3 - sway, hem + 1], [CX - td - 1, hem + 1]], (x, y) => pick(spec.cloak!, 0.45 - (y - shY) * 0.01 + (white(x, y, seed + 40) - 0.5) * 0.2, x, y));
  }
  if (spec.style === 'long') column(p, hy + 1, shY + 6, () => CX - 2.2, (y) => (y < hy + 6 ? 2.4 : 1.8), spec.hair, seed + 3, 0.3);

  // --- legs: A is the near leg, B the far one (darker) ---
  const footAt = (leg: 'A' | 'B'): { x: number; lift: number } =>
    leg === 'A' ? { x: CX + pose.stride * 4.5, lift: Math.round(pose.liftA) } : { x: CX - pose.stride * 4.5, lift: Math.round(pose.liftB) };
  const leg = (which: 'A' | 'B'): void => {
    const f = footAt(which);
    const ramp = which === 'A' ? spec.legs : dark(spec.legs);
    const bramp = which === 'A' ? boots : dark(boots);
    const fy = FOOT - 4 - f.lift;
    if (!long) capsule(p, CX, hipY - 1, f.x, fy, td * 0.62, td * 0.5, ramp, seed + (which === 'A' ? 7 : 8), 0.2);
    // Boot, with a toe pointing the way they face.
    capsule(p, f.x, FOOT - 5 - f.lift, f.x + 0.4, FOOT - 1 - f.lift, td * 0.5 + 0.4, td * 0.5 + 0.5, bramp, seed + 9, 0.22);
    for (let k = 1; k <= 2; k++) p.set(Math.round(f.x + td * 0.5 + k), FOOT - 1 - f.lift, bramp[k === 1 ? 2 : 1]);
    p.set(Math.round(f.x + td * 0.5 + 1), FOOT - f.lift, bramp[1]);
  };
  leg('B');

  // --- the far arm (behind the body) ---
  const armLen = child ? 8 : 10;
  const holdsRight = !!spec.right && spec.right !== 'none';
  const swingNear = pose.stride * (holdsRight ? 0.5 : 3.2);
  const arm = (near: boolean): { x: number; y: number } => {
    const sw = near ? swingNear : -pose.stride * 3.2;
    const hx = CX + sw, hyy = shY + armLen - Math.abs(sw) * 0.35;
    const sleeve = near ? spec.top : dark(spec.top);
    const sleeves = spec.sleeves ?? 'long';
    capsule(p, CX - 0.3, shY + 2, hx, hyy - 1, 1.7, 1.4, sleeves === 'long' ? sleeve : spec.skin, seed + (near ? 80 : 81), 0.18);
    if (sleeves !== 'long') {
      const t = sleeves === 'rolled' ? 0.45 : 0.3;
      capsule(p, CX - 0.3, shY + 2, CX - 0.3 + (hx + 0.3 - CX) * t, shY + 2 + (hyy - 1 - shY - 2) * t, 1.9, 1.7, sleeve, seed + 82, 0.18);
    }
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) p.set(Math.round(hx - 0.5) + dx, Math.round(hyy) + dy, pick(spec.skin, near ? 0.62 : 0.4, dx, dy));
    return { x: hx, y: hyy };
  };
  const farHand = arm(false);

  // --- torso ---
  const flare = spec.garment === 'dress' ? 2.6 : spec.garment === 'robe' ? 3 : spec.garment === 'tunic' ? 1 : 0.4;
  const bottom = Math.max(hem, hipY + 1);
  const half = (y: number): number => {
    if (y < shY + 2) return td - (2 - (y - shY)) * 0.9;
    if (y <= hipY) return td + 0.2 * Math.min(1, (y - shY - 2) / Math.max(1, hipY - shY - 2));
    return td + 0.2 + ((y - hipY) / Math.max(1, bottom - hipY)) * flare;
  };
  column(p, shY, bottom, () => CX + 0.2, half, spec.top, seed + 11, 0.16);
  for (let k = 0; k < 3; k++) {
    const fx = Math.round(CX + (white(k, 1, seed + 12) - 0.5) * 2 * (td - 0.6));
    const f0 = hipY + 1 + Math.floor(white(k, 2, seed + 12) * 3);
    for (let y = f0; y > f0 - 4 - k; y--) if (white(fx, y, seed + 13) < 0.8 && p.alpha(fx, y)) p.set(fx, y, spec.top[1]);
  }
  if (spec.garment !== 'shirt') {
    for (let x = 0; x < W; x++) {
      if (p.alpha(x, bottom) && white(x, bottom, seed + 15) < 0.35) p.data[(bottom * W + x) * 4 + 3] = 0;
    }
  }
  if (spec.vest) {
    for (let y = shY + 1; y <= hipY + 1; y++) {
      const h = half(y);
      for (const x of [Math.round(CX + 0.2 + h - 1.5), Math.round(CX + 0.2 - h)]) p.set(x, y, pick(spec.vest, x < CX ? 0.45 : 0.75, x, y));
    }
  }
  if (spec.apron) {
    for (let y = shY + 3; y <= Math.min(bottom, hipY + 9); y++) {
      const h = half(y);
      for (let k = 0; k < 2; k++) p.set(Math.round(CX + 0.2 + h - 1 - k), y, pick(spec.apron, 0.78 - k * 0.2 + (white(k, y, seed + 21) - 0.5) * 0.2, k, y));
    }
  }
  if (spec.belt !== false || spec.apron) {
    for (let x = Math.round(CX + 0.2 - td); x < Math.round(CX + 0.2 + td + 0.2); x++) p.set(x, hipY - 1, CLOTH.leather[1 + (x & 1)]);
    p.set(Math.round(CX + td - 0.6), hipY - 1, '#c8a444');
  }
  leg('A');

  // --- neck and head in profile ---
  const skin = spec.skin;
  p.set(CX, hy + 7, skin[1]); p.set(CX + 1, hy + 7, skin[2]); p.set(CX, hy + 8, skin[0]); p.set(CX + 1, hy + 8, skin[1]);
  const halfs = [2.0, 3.0, 3.3, 3.3, 3.1, 2.6, 1.6];
  const hx0 = CX + 0.5;
  const hood = spec.style === 'hood';
  if (hood) {
    const hc = spec.head ?? spec.cloak ?? CLOTH.brown;
    polyFill(p, [[hx0 - 4.5, hy - 1], [hx0 + 3, hy - 1], [hx0 + 3, hy + 2], [hx0 + 0.5, hy + 8], [hx0 - 5.5, hy + 8]], (x, y) => pick(hc, 0.55 - (x - hx0) * 0.04 + (white(x, y, seed + 30) - 0.5) * 0.2, x, y));
  }
  for (let i = 0; i < 7; i++) {
    const h = halfs[i] - (hood ? 0.5 : 0.1);
    const nose = i === 4 ? 1 : 0;
    for (let x = Math.round(hx0 - h); x <= Math.round(hx0 + h - 0.5) + nose; x++) {
      const u = (x - hx0) / h;
      p.set(x, hy + i, pick(skin, 0.82 - (u + 1) * 0.3 + (white(x, hy + i, seed + 50) - 0.5) * 0.12 - (hood && i < 3 ? 0.3 : 0), x, hy + i));
    }
  }
  // Ear, eye, brow, mouth.
  p.set(Math.round(hx0 - 0.8), hy + 3, skin[1]); p.set(Math.round(hx0 - 0.8), hy + 4, skin[0]);
  p.set(Math.round(hx0 + 1.6), hy + 3, pose.blink ? skin[1] : EYE);
  p.set(Math.round(hx0 + 1.6), hy + 2, skin[1]);
  p.set(Math.round(hx0 + 2.2), hy + 5, '#8a4a40');
  // Hair, hats, beards.
  const hair = spec.hair;
  const cap = (rows: number, from: number, to: number, ramp: Ramp, fringe = 0.25): void => {
    for (let i = 0; i < rows; i++) {
      for (let x = Math.round(hx0 + from); x <= Math.round(hx0 + to); x++) {
        if (!p.alpha(x, hy + i) && i > 0) continue;
        if (i === rows - 1 && white(x, i, seed + 60) < fringe) continue;
        p.set(x, hy + i, pick(ramp, 0.85 - (x - hx0 + 3) * 0.08 - i * 0.05 + (white(x, i, seed + 61) - 0.5) * 0.3, x, hy + i));
      }
    }
  };
  switch (spec.style) {
    case 'short':
      cap(3, -3.4, 2.4, hair);
      for (let i = 3; i < 6; i++) for (let x = Math.round(hx0 - 3.2); x <= Math.round(hx0 - 1.5); x++) p.set(x, hy + i, hair[1]);
      break;
    case 'long':
      cap(3, -3.6, 2.6, hair, 0.4);
      for (let i = 3; i < 9; i++) for (let x = Math.round(hx0 - 3.6); x <= Math.round(hx0 - 1.6); x++) p.set(x, hy + i, hair[i % 2 ? 2 : 1]);
      break;
    case 'bun':
      cap(3, -3.4, 2.2, hair);
      for (let y = -2; y <= 1; y++) for (let x = -2; x <= 1; x++) if (Math.abs(x + 0.5) + Math.abs(y + 0.4) < 2.4) p.set(Math.round(hx0 - 4) + x, hy + 1 + y, pick(hair, 0.7 - x * 0.12, x, y));
      for (let i = 3; i < 5; i++) for (let x = Math.round(hx0 - 3.2); x <= Math.round(hx0 - 1.5); x++) p.set(x, hy + i, hair[1]);
      break;
    case 'bald':
      for (let x = Math.round(hx0 - 2); x <= Math.round(hx0 - 1); x++) p.set(x, hy + 3, spec.hair[2]);
      break;
    case 'kerchief': {
      const c = spec.head ?? CLOTH.linen;
      cap(4, -3.8, 2.4, c, 0);
      for (const [x, y] of [[-5, 3], [-6, 4], [-5, 4], [-6, 5]] as const) p.set(Math.round(hx0 + x), hy + y, c[1]);
      break;
    }
    case 'hat': {
      const c = spec.head ?? CLOTH.straw;
      for (let y = 0; y < 3; y++) for (let x = Math.round(hx0 - 3.5); x <= Math.round(hx0 + 2.5); x++) p.set(x, hy - 1 + y, pick(c, 0.8 - (x - hx0) * 0.06 - y * 0.05 + (white(x, y, seed + 62) - 0.5) * 0.3, x, y));
      for (let x = Math.round(hx0 - 4); x <= Math.round(hx0 + 3); x++) p.set(x, hy + 1, CLOTH.leather[2]);
      for (let x = Math.round(hx0 - 7); x <= Math.round(hx0 + 6); x++) {
        if (white(x, 0, seed + 63) < 0.12) continue;
        p.set(x, hy + 2, pick(c, 0.75 - (x - hx0) * 0.04 + (white(x, 3, seed + 64) - 0.5) * 0.3, x, 2));
        if (Math.abs(x - hx0) < 5.6) p.set(x, hy + 3, pick(c, 0.25 + (white(x, 5, seed + 65) - 0.5) * 0.2, x, 3));
      }
      for (let i = 3; i < 6; i++) for (let x = Math.round(hx0 - 3.2); x <= Math.round(hx0 - 1.5); x++) p.set(x, hy + i, hair[1]);
      break;
    }
    case 'helm': {
      const c = CLOTH.steel;
      for (let y = 0; y < 3; y++) for (let x = Math.round(hx0 - 4); x <= Math.round(hx0 + 3.4); x++) p.set(x, hy - 1 + y, pick(c, 0.9 - (x - hx0 + 4) / 8 * 0.8 - y * 0.05 + (white(x, y, seed + 66) - 0.5) * 0.18, x, y));
      for (let x = Math.round(hx0 - 4); x <= Math.round(hx0 + 1.5); x++) for (let y = 2; y < 6; y++) p.set(x, hy + y, pick(c, 0.35 + (white(x, y, seed + 67) - 0.5) * 0.2, x, y));
      for (let y = 2; y <= 4; y++) p.set(Math.round(hx0 + 2.4), hy + y, c[3]);
      break;
    }
    case 'hood':
      break;
  }
  if (spec.beard === 'full') {
    for (let i = 4; i < 8; i++) for (let x = Math.round(hx0 - 1); x <= Math.round(hx0 + 2.4 - (i - 4) * 0.5); x++) {
      if (i === 5 && x === Math.round(hx0 + 2)) continue;
      p.set(x, hy + i, pick(hair, 0.8 - (x - hx0) * 0.08 - (i - 4) * 0.08 + (white(x, i, seed + 70) - 0.5) * 0.4, x, i));
    }
  } else if (spec.beard === 'stubble') {
    for (let i = 4; i < 7; i++) for (let x = Math.round(hx0 - 1); x < Math.round(hx0 + 2.5); x++) if (p.alpha(x, hy + i) && white(x, i, seed + 71) < 0.35) p.set(x, hy + i, skin[1]);
  }

  // --- the near arm, over the body, and what is held ---
  const nearHand = arm(true);
  if (spec.right && spec.right !== 'none') {
    const hand = spec.right === 'hammer' || spec.right === 'bucket' ? nearHand.y : shY + 9;
    // Held out in front of the body, so a shaft does not run through the face.
    drawHeld(p, spec.right, Math.round(nearHand.x) + 3, Math.round(hand), hy, seed);
  }
  if (spec.left && spec.left !== 'none') drawHeld(p, spec.left, Math.round(farHand.x) + 3, Math.round(farHand.y) - 1, hy, seed + 5);
  return p;
}

/** All of a person's views: standing (breathing) and walking. */
export function makeWalkSet(spec: FolkSpec): WalkSet {
  const set = {} as WalkSet['views'];
  const outline = (p: Pix): Pix => selOutline(p);
  const front = (pose: Pose): Pix => outline(drawFront(spec, pose));
  const back = (pose: Pose): Pix => outline(mirror(drawFront(spec, { ...pose, back: true })));
  const side = (s: SidePose): Pix => outline(drawSide(spec, s));
  const stand = (draw: (bob: number, blink: boolean) => Pix): Pix[] => {
    const a = draw(0, false), b = draw(1, false), c = draw(0, spec.seed % 2 === 0);
    return [a, a, a, b, b, b, b, c].slice(0, IDLE_FRAMES);
  };
  set.front = {
    idle: stand((bob, blink) => front({ bob, arm: bob, blink })),
    walk: Array.from({ length: WALK_FRAMES }, (_, f) => {
      const w = walkPhase(f);
      return front({ bob: w.bob, arm: w.stride * 2, blink: false, lift: [w.liftA, w.liftB] });
    }),
  };
  set.back = {
    idle: stand((bob, blink) => back({ bob, arm: bob, blink })),
    walk: Array.from({ length: WALK_FRAMES }, (_, f) => {
      const w = walkPhase(f);
      return back({ bob: w.bob, arm: w.stride * 2, blink: false, lift: [w.liftA, w.liftB] });
    }),
  };
  set.side = {
    idle: stand((bob, blink) => side({ stride: 0, liftA: 0, liftB: 0, bob, blink })),
    walk: Array.from({ length: WALK_FRAMES }, (_, f) => {
      const w = walkPhase(f);
      return side({ stride: w.stride, liftA: w.liftA, liftB: w.liftB, bob: w.bob, blink: false });
    }),
  };
  return { views: set, ax: CX + 1, ay: FOOT + 2 };
}
