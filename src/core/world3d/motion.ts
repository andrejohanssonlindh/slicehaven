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
  arms: ['shoulderL', 'elbowL', 'shoulderR', 'elbowR'],
  upper: ['spine', 'neck', 'shoulderL', 'elbowL', 'shoulderR', 'elbowR'],
  whole: JOINTS,
};

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
   * The keys, `at` rising from 0. Between keys the turns ease straight across; a joint a key leaves out is at rest (0)
   * there, as a pose's are.
   */
  keys: readonly MotionKey[];
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
  /** Past its end. */
  done: boolean;
}

const ZERO: Turn = [0, 0, 0];
const NO_ROOT: Required<MotionRoot> = { tilt: 0, up: 0, back: 0, side: 0 };

/** The joints a motion names in any key: it drives these (and every joint, if it drives the whole body). */
export function motionJoints(m: Motion): Joint[] {
  if (m.part === 'whole') return [...JOINTS];
  const out = new Set<Joint>();
  for (const k of m.keys) for (const j of Object.keys(k.joints) as Joint[]) out.add(j);
  return JOINTS.filter((j) => out.has(j));
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
    const p = a.joints[j] ?? ZERO, q = b.joints[j] ?? ZERO;
    joints[j] = [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
  }
  const ra = { ...NO_ROOT, ...a.root }, rb = { ...NO_ROOT, ...b.root };
  const mix = (f: keyof MotionRoot): number => ra[f] + (rb[f] - ra[f]) * u;
  return {
    joints,
    lift: (a.lift ?? 0) + ((b.lift ?? 0) - (a.lift ?? 0)) * u,
    root: { tilt: mix('tilt'), up: mix('up'), back: mix('back'), side: mix('side') },
    done,
  };
}

/** A frame laid over a body's pose (what the legs and hands do): over it for arms and upper body, instead of it for the whole. */
export function overPose(base: Pose, f: MotionFrame, part: MotionPart): Pose {
  if (part === 'whole') return { joints: f.joints, lift: f.lift };
  return { joints: { ...base.joints, ...f.joints }, lift: (base.lift ?? 0) + f.lift };
}

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
  });
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
