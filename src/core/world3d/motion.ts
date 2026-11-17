import { JOINTS, type Joint, type Pose, type Turn } from './pose';

/**
 * Motions (plan B8g, stage F0): a movement that plays once (or holds) rather than looping, such as a strike, a parry, a
 * fall. Each is data, one file in `content/motions/`, found by itself. Which one plays is looked up, never `if`-ed: by
 * the act (what happens: strike, parry, fall), the weapon's **way of moving** (a property on the weapon kind) and,
 * optionally, the fighting style; the most specific motion that exists wins. Pure: the engine asks `sampleMotion` for
 * a pose at a time and shows it. Design: `director/design/fight-feel.md`.
 */

/** What a motion shows happening. The page asks for an act; the rules decided it. */
export const MOTION_ACTS = ['guard', 'strike', 'parry', 'block', 'dodge', 'flinch', 'stagger', 'fall', 'finish', 'down', 'dead'] as const;
export type MotionAct = (typeof MOTION_ACTS)[number];

/** Acts that end on the ground: they play for someone who can't stand, and someone showing them is lying. */
export const LYING_ACTS: ReadonlySet<MotionAct> = new Set<MotionAct>(['fall', 'down', 'dead']);

/**
 * An act with no motion for this weapon or style plays the one it falls back to (a killing stroke is a strike until it
 * has its own), so the page can ask for the act that happened before the library has it.
 */
export const FALLS_BACK: Partial<Record<MotionAct, MotionAct>> = { finish: 'strike', stagger: 'flinch', fall: 'down' };

/** The marks each act must have (time 0–1): `contact` is the moment the blow lands or is met. */
export const MARKS_NEEDED: Record<MotionAct, readonly string[]> = {
  guard: [], strike: ['contact'], parry: ['contact'], block: ['contact'], dodge: ['contact'],
  flinch: [], stagger: [], fall: [], finish: ['contact'], down: [], dead: [],
};

/**
 * How a weapon moves in the hand, said on its kind (`moves`, inherited) so a new weapon finds its motions from its
 * kind. `hands` is no weapon at all.
 */
export const WAYS_OF_MOVING = ['blade', 'two-hander', 'staff', 'spear', 'axe-mace', 'shield', 'hands'] as const;
export type WayOfMoving = (typeof WAYS_OF_MOVING)[number];

/**
 * Which part of the body a motion drives. `upper` and `arms` are laid over what the legs do (walking, standing); `whole`
 * drives every joint and the root (a fall).
 */
export type MotionPart = 'arms' | 'upper' | 'whole';
export const PART_JOINTS: Record<MotionPart, readonly Joint[]> = {
  arms: ['shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR'],
  upper: ['spine', 'chest', 'neck', 'head', 'shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR'],
  whole: JOINTS,
};

/**
 * How a key is come to from the one before. Left out, the movement flows through the keys in a smooth curve, slowing
 * only where it turns round or rests. `in` speeds up all the way into the key and stops dead there (a blow landing),
 * `out` leaves fast and settles, `linear` goes straight across.
 */
export type KeyEase = 'in' | 'out' | 'linear';

/**
 * How much of a body's own small movements (`animate.ts`: breathing, shifting weight, looking about) plays over a
 * motion: all of it (`full`, the default), only the breath (`breath`: lying senseless) or none (`none`: dead).
 */
export type MotionLife = 'full' | 'breath' | 'none';

/**
 * Where the whole body is, against where it stands: a step back or aside (a dodge), down towards the ground, tipped
 * over (lying on the back is a tilt of −π/2). Metres and radians, in the body's own frame (it faces +z).
 */
export interface MotionRoot {
  /** Turned about its own x: negative tips it onto its back. */
  tilt?: number;
  /** Raised (metres; negative sinks). */
  up?: number;
  /** Moved back, away from where it faces (metres; negative is forward). */
  back?: number;
  /** Moved to its right (metres). */
  side?: number;
}

/** One key of a motion: at a share of its length (0–1), the joints' turns, a lift, where the root is. */
export interface MotionKey {
  at: number;
  joints: Partial<Record<Joint, Turn>>;
  lift?: number;
  root?: MotionRoot;
  /** How this key is come to (`KeyEase`); left out, in a smooth curve through it. */
  ease?: KeyEase;
  /**
   * How much of the body's own pose (its stance, what it holds: its guard) shows through at this key, 0–1. A motion
   * that starts and ends on `base: 1` starts and ends wherever the body was, whatever weapon it holds or however it
   * stands; in between, the keys say where the joints are.
   */
  base?: number;
}

export interface Motion {
  id: string;
  act: MotionAct;
  /** Only for weapons that move this way; left out, for any. */
  way?: WayOfMoving;
  /** Only for this fighting style (`content/combat/styles/`); left out, for any. */
  style?: string;
  /** How long it takes, in seconds (0 for a held pose with one key). */
  seconds: number;
  part: MotionPart;
  /**
   * The keys, `at` rising from 0. The turns flow through them in a smooth curve (or as a key's `ease` says); a joint
   * a key leaves out is at rest (0) there, as a pose's are.
   */
  keys: readonly MotionKey[];
  /** Seconds the body takes to ease into this motion from whatever it was doing (`DEFAULT_BLEND` if left out). */
  blend?: number;
  /** Seconds the body takes to ease out of it into what comes next, when that is longer (getting up from lying). */
  leave?: number;
  /** How much of the body's own small movements plays over it (`MotionLife`; `full` if left out). */
  life?: MotionLife;
  /**
   * The keys' turns are **added** to the body's own pose instead of replacing it (a flinch, a stagger: the same jolt
   * whatever the guard and stance). The root still moves as the keys say.
   */
  add?: boolean;
  /** What follows: another act (looked up the same way, usually `guard`), or `hold` the last key. */
  then: MotionAct | 'hold';
  /** Named moments, as a share of the length: `contact` where the blow meets. */
  marks?: Record<string, number>;
}

/** Everything a motion says at one moment. */
export interface MotionFrame {
  joints: Partial<Record<Joint, Turn>>;
  lift: number;
  root: Required<MotionRoot>;
  /** How much of the body's own pose shows through now (the keys' `base`). */
  base: number;
  /** Past its end. */
  done: boolean;
}


/** The joints a motion names in any key: it drives these (and every joint, if it drives the whole body). */
export function motionJoints(m: Motion): Joint[] {
  if (m.part === 'whole') return [...JOINTS];
  const out = new Set<Joint>();
  for (const k of m.keys) for (const j of Object.keys(k.joints) as Joint[]) out.add(j);
  return JOINTS.filter((j) => out.has(j));
}

/** Seconds a body takes to ease into a motion that doesn't say (`blend`). */
export const DEFAULT_BLEND = 0.12;

const EASES: Record<KeyEase, (u: number) => number> = {
  in: (u) => u * u,
  out: (u) => 1 - (1 - u) * (1 - u),
  linear: (u) => u,
};

/**
 * How fast a value passes through key `i` (per share of the motion's length): nothing where it turns round, rests, or
 * at either end; else the mean of the slopes either side, held back so it never swings past a key.
 */
function slopeAt(keys: readonly MotionKey[], get: (k: MotionKey) => number, i: number): number {
  if (i <= 0 || i >= keys.length - 1) return 0;
  const d0 = (get(keys[i]) - get(keys[i - 1])) / (keys[i].at - keys[i - 1].at);
  const d1 = (get(keys[i + 1]) - get(keys[i])) / (keys[i + 1].at - keys[i].at);
  if (d0 * d1 <= 0) return 0;
  const m = (d0 + d1) / 2, cap = 3 * Math.min(Math.abs(d0), Math.abs(d1));
  return Math.sign(m) * Math.min(Math.abs(m), cap);
}

/** One value of a motion between keys `i` and `i + 1`, `u` of the way: a smooth curve, or as the later key's `ease` says. */
function between(keys: readonly MotionKey[], get: (k: MotionKey) => number, i: number, u: number): number {
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const p = get(a), q = get(b);
  if (b === a || u <= 0 || p === q) return p;
  if (b.ease) return p + (q - p) * EASES[b.ease](u);
  const h = b.at - a.at, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p + (u3 - 2 * u2 + u) * h * slopeAt(keys, get, i) + (-2 * u3 + 3 * u2) * q + (u3 - u2) * h * slopeAt(keys, get, i + 1);
}

/** A motion `t` seconds after it began. */
export function sampleMotion(m: Motion, t: number): MotionFrame {
  const k = m.seconds > 0 ? Math.max(0, t / m.seconds) : 1;
  const done = k >= 1;
  const x = Math.min(1, k);
  const keys = m.keys;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].at <= x) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const u = b === a || b.at <= a.at ? 0 : (x - a.at) / (b.at - a.at);
  const joints: Partial<Record<Joint, Turn>> = {};
  for (const j of motionJoints(m)) {
    joints[j] = [0, 1, 2].map((c) => between(keys, (key) => key.joints[j]?.[c] ?? 0, i, u)) as unknown as Turn;
  }
  const mix = (f: keyof MotionRoot): number => between(keys, (key) => key.root?.[f] ?? 0, i, u);
  return {
    joints,
    lift: between(keys, (key) => key.lift ?? 0, i, u),
    base: Math.max(0, Math.min(1, between(keys, (key) => key.base ?? 0, i, u))),
    root: { tilt: mix('tilt'), up: mix('up'), back: mix('back'), side: mix('side') },
    done,
  };
}

/** A frame laid over a body's pose (what the legs and hands do): over it for arms and upper body, instead of it for the whole. */
export function overPose(base: Pose, f: MotionFrame, m: Pick<Motion, 'part' | 'add'>): Pose {
  const joints: Partial<Record<Joint, Turn>> = { ...base.joints };
  // How much of the body's own pose shows through: all of it under an added motion, as the keys say under one that replaces.
  const own = m.add ? 1 : f.base, mine = m.add ? 1 : 1 - f.base;
  for (const [j, v] of Object.entries(f.joints) as [Joint, Turn][]) {
    const b = base.joints[j] ?? ZERO_TURN;
    joints[j] = [b[0] * own + v[0] * mine, b[1] * own + v[1] * mine, b[2] * own + v[2] * mine];
  }
  // A motion of part of the body rides on the body's own lift; one of the whole body sets it.
  const whole = m.part === 'whole' && !m.add, bl = base.lift ?? 0, bs = base.shift ?? [0, 0];
  return { joints, lift: whole ? bl * own + f.lift * mine : bl + f.lift, shift: whole ? [bs[0] * own, bs[1] * own] : base.shift };
}

const ZERO_TURN: Turn = [0, 0, 0];

/**
 * The motion for an act: the most specific that fits (the style counts more than the way of moving), else one for any
 * weapon and style; with none, the act it falls back to (`FALLS_BACK`). Null if there is still none.
 */
export function findMotion(lib: Readonly<Record<string, Motion>>, act: MotionAct, way?: WayOfMoving, style?: string): Motion | null {
  for (let a: MotionAct | undefined = act, n = 0; a && n < 4; a = FALLS_BACK[a], n++) {
    const m = findExact(lib, a, way, style);
    if (m) return m;
  }
  return null;
}

function findExact(lib: Readonly<Record<string, Motion>>, act: MotionAct, way?: WayOfMoving, style?: string): Motion | null {
  let best: Motion | null = null, score = -1;
  for (const m of Object.values(lib)) {
    if (m.act !== act) continue;
    if (m.way && m.way !== way) continue;
    if (m.style && m.style !== style) continue;
    const s = (m.style ? 2 : 0) + (m.way ? 1 : 0);
    if (s > score || (s === score && best && m.id < best.id)) {
      best = m;
      score = s;
    }
  }
  return best;
}

/** What is wrong with one motion (empty if nothing). */
export function motionProblems(m: Motion): string[] {
  const out: string[] = [];
  const bad = (s: string): number => out.push(`motion ${m.id}: ${s}`);
  if (!(MOTION_ACTS as readonly string[]).includes(m.act)) bad(`unknown act ${m.act}`);
  if (m.way && !(WAYS_OF_MOVING as readonly string[]).includes(m.way)) bad(`unknown way of moving ${m.way}`);
  if (!PART_JOINTS[m.part]) bad(`unknown part ${m.part}`);
  if (m.then !== 'hold' && !(MOTION_ACTS as readonly string[]).includes(m.then)) bad(`then names unknown act ${m.then}`);
  if (!(m.seconds >= 0)) bad('seconds must be 0 or more');
  if (!m.keys.length) bad('no keys');
  else {
    if (m.keys[0].at !== 0) bad('the first key must be at 0');
    if (m.keys.length > 1 && m.seconds === 0) bad('several keys need some seconds');
  }
  m.keys.forEach((k, i) => {
    if (!(k.at >= 0 && k.at <= 1)) bad(`key ${i} at ${k.at}, outside 0–1`);
    if (i > 0 && !(k.at > m.keys[i - 1].at)) bad(`key ${i} is not after key ${i - 1}`);
    for (const [j, v] of Object.entries(k.joints)) {
      if (!(JOINTS as readonly string[]).includes(j)) bad(`key ${i}: unknown joint ${j}`);
      else if (PART_JOINTS[m.part] && !PART_JOINTS[m.part].includes(j as Joint)) bad(`key ${i}: ${j} is outside its part (${m.part})`);
      if (!Array.isArray(v) || v.length !== 3 || v.some((n) => !Number.isFinite(n))) bad(`key ${i}: ${j} is not three numbers`);
    }
    if (k.root && m.part !== 'whole') bad(`key ${i}: only a whole-body motion moves the root`);
    if (k.ease && !EASES[k.ease]) bad(`key ${i}: unknown ease ${k.ease}`);
    if (k.base !== undefined && !(k.base >= 0 && k.base <= 1)) bad(`key ${i}: base ${k.base}, outside 0–1`);
    if (k.base !== undefined && m.add) bad(`key ${i}: an added motion has no base (it is all added to the body's own pose)`);
  });
  if (m.blend !== undefined && !(m.blend >= 0)) bad('blend must be 0 or more seconds');
  if (m.leave !== undefined && !(m.leave >= 0)) bad('leave must be 0 or more seconds');
  if (m.life && !['full', 'breath', 'none'].includes(m.life)) bad(`unknown life ${m.life}`);
  for (const need of MARKS_NEEDED[m.act] ?? []) if (m.marks?.[need] === undefined) bad(`needs a ${need} mark`);
  for (const [name, at] of Object.entries(m.marks ?? {})) if (!(at >= 0 && at <= 1)) bad(`mark ${name} at ${at}, outside 0–1`);
  return out;
}

/**
 * What is wrong with a library: every motion's problems, two with the same act, way and style, and an act that some
 * motion's `then` names (or that the engine always needs: guard, strike, down, dead) with no motion for any weapon.
 */
export function libraryProblems(lib: Readonly<Record<string, Motion>>): string[] {
  const out: string[] = [];
  const seen = new Map<string, string>();
  for (const [id, m] of Object.entries(lib)) {
    if (m.id !== id) out.push(`motion ${id} is filed under another id (${m.id})`);
    out.push(...motionProblems(m));
    const key = `${m.act}/${m.way ?? '*'}/${m.style ?? '*'}`;
    if (seen.has(key)) out.push(`motions ${seen.get(key)} and ${id} are both for ${key}`);
    seen.set(key, id);
  }
  const needed = new Set<MotionAct>(['guard', 'strike', 'down', 'dead']);
  for (const m of Object.values(lib)) if (m.then !== 'hold') needed.add(m.then);
  for (const act of needed) if (!Object.values(lib).some((m) => m.act === act && !m.way && !m.style)) out.push(`no motion for ${act} that fits any weapon`);
  return out;
}

/**
 * Someone's motions playing (plain data): the act asked for, the motion found, since when, and the acts queued after
 * it. The engine keeps one per person.
 */
export interface Playing {
  act: MotionAct;
  motion: string;
  since: number;
  queue: MotionAct[];
}

/**
 * Move a playing motion on to `now`: when it is done, the next queued act starts, else what it says follows (`then`),
 * else it holds. `find` looks a motion up for the person (their weapon's way and their style). Returns the same object
 * when nothing changed.
 */
export function advance(p: Playing, now: number, lib: Readonly<Record<string, Motion>>, find: (act: MotionAct) => Motion | null): Playing {
  let cur = p;
  for (let guard = 0; guard < 8; guard++) {
    const m = lib[cur.motion];
    if (!m || now - cur.since < m.seconds) return cur;
    const nextAct = cur.queue[0] ?? (m.then === 'hold' ? null : m.then);
    if (!nextAct) return cur;
    const next = find(nextAct);
    if (!next) return cur;
    cur = { act: nextAct, motion: next.id, since: cur.since + m.seconds, queue: cur.queue.slice(cur.queue[0] ? 1 : 0) };
  }
  return cur;
}
