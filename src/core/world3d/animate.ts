import { DEFAULT_BLEND, type Motion, type MotionRoot, overPose, sampleMotion } from './motion';
import { type Cycle, type Joint, type Pose, type Turns, addPose, blendPose, cyclePose, scalePose } from './pose';

/**
 * The animator: what a body shows each frame, put together in layers from data. Pure: the engine keeps one `AnimState`
 * per person, says what they are doing (`AnimInput`) and shows the pose it gets back.
 *
 *   1. a **stance** (standing, on guard, sitting: a slow loop) blended with a **gait** by how fast they move (a walk,
 *      a run: the steps shorten at low speed, and the legs ease into standing when they stop);
 *   2. a **hold** laid over the arms (carrying, a weapon held up);
 *   3. a **motion** over that (`motion.ts`: a strike, a fall), eased into from whatever showed before;
 *   4. **life**: the small movements nobody steers: breath (deeper and faster after effort), weight shifting from foot
 *      to foot, arms that never hang quite still, a head that looks about, turns to what it attends to and leads the
 *      body into a turn. Each person has their own tempo, size of movement and posture (`Manner`, from their seed).
 *
 * A change of stance, hold or motion never snaps: the last shown pose is kept and eased out of. New movement is data:
 * a stance or gait in `content/people/poses.ts`, a motion in `content/motions/`; a new kind of layer is added here.
 */

/** A way of being still: a slow loop of poses, and how much of the small movements plays over it. */
export interface Stance {
  id: string;
  loop: Cycle;
  /** Seconds one loop takes (a person's tempo shifts it). */
  seconds: number;
  /** How much the weight shifts from foot to foot (1 standing at ease, 0 sitting). */
  sway: number;
  /** How much the head looks about on its own. */
  look: number;
  /** How much the arms drift. */
  arms: number;
  /** How hard it is to keep up (0 at ease, 1 a sprint): the breath follows. */
  effort: number;
}

/** A way of moving over the ground: a loop of poses, two steps to a loop. */
export interface Gait {
  id: string;
  loop: Cycle;
  /** The speed it is made for, metres a second: slower, the steps shorten; between two gaits they are blended. */
  pace: number;
  /** The ground one loop covers at that pace, in hip heights. */
  stride: number;
  /** How hard it is to keep up (0–1). */
  effort: number;
}

/** The sizes of the small movements (data: `LIFE` in `content/people/poses.ts`). Turns in radians, moves as shares of the body's height. */
export interface Life {
  breath: { seconds: number; chest: number; shoulders: number; lift: number };
  sway: { seconds: number; shift: number; roll: number; knee: number };
  arms: { seconds: number; swing: number; elbow: number; wrist: number };
  look: { seconds: number; yaw: number; pitch: number; reach: number; lead: number; settle: number };
}

/** A person's own way of moving: the same data played a little differently for each. */
export interface Manner {
  /** How fast their slow loops run (1 typical). */
  tempo: number;
  /** Where in the loops they start (0–1), so no two breathe together. */
  phase: number;
  /** The size of their small movements (1 typical). */
  loose: number;
  /** How they carry themselves: a lean of the chest (radians; forward is positive) and a tilt of the head. */
  stoop: number;
  tilt: number;
}

/** A number in 0..1 from a seed and a salt (the same every time). */
function hash(seed: number, salt: number): number {
  let h = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(salt | 0, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/** A person's manner from their seed. */
export function mannerOf(seed: number): Manner {
  return {
    tempo: 0.85 + hash(seed, 1) * 0.3,
    phase: hash(seed, 2),
    loose: 0.8 + hash(seed, 3) * 0.45,
    stoop: -0.02 + hash(seed, 4) * 0.07,
    tilt: (hash(seed, 5) - 0.5) * 0.06,
  };
}

/** What was shown: the pose, and where the whole body was put. */
export interface Shown {
  pose: Pose;
  root: Required<MotionRoot>;
}

/** One person's animation between frames (working state: never saved). */
export interface AnimState {
  /** How far through the gait's loop. */
  phase: number;
  /** Their speed over the ground, smoothed (metres a second). */
  speed: number;
  /** 0 standing … 1 moving, eased. */
  going: number;
  /** How hard they have been working (0–1): rises fast, fades slowly. */
  effort: number;
  /** Their own clocks: the breath's (it runs faster with effort) and the slow loops'. */
  breath: number;
  clock: number;
  /** Where the head is turned (relative to the body), eased. */
  lookYaw: number;
  lookPitch: number;
  /** What was showing (stance, hold, motion), and how long its motion takes to leave. */
  key: string;
  leave: number;
  /** The pose being eased out of, how long ago it was left, and how long the easing takes. */
  from: Shown | null;
  since: number;
  blend: number;
  last: Shown | null;
}

export const newAnim = (manner: Manner): AnimState => ({
  phase: manner.phase, speed: 0, going: 0, effort: 0, breath: manner.phase * 7, clock: manner.phase * 50,
  lookYaw: 0, lookPitch: 0, key: '', leave: 0, from: null, since: 0, blend: 0, last: null,
});

export interface AnimLib {
  /** Slowest first. */
  gaits: readonly Gait[];
  life: Life;
}

export interface AnimInput {
  /** Seconds since the last frame. */
  dt: number;
  /** Metres covered over the ground since the last frame. */
  moved: number;
  /** The body's hip height, metres (a stride is counted in these). */
  hip: number;
  stance: Stance;
  /** Something held, laid over the arms (`id` names it, so a change is eased). */
  hold?: { id: string; joints: Turns } | null;
  /** A motion playing, `t` seconds in. */
  motion?: { motion: Motion; t: number } | null;
  /** How far the body still has to turn to face where it is going (radians, positive to its left): the head goes first. */
  turning?: number;
  /** Something to look at, as a direction from the body's facing (radians: to its left, and upward). */
  look?: { yaw: number; pitch: number } | null;
  manner: Manner;
}

const NO_ROOT: Required<MotionRoot> = { tilt: 0, up: 0, back: 0, side: 0 };
const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const smooth = (u: number): number => u * u * (3 - 2 * u);
/** How far to go toward a goal in `dt` seconds, settling in about `tau`. */
const toward = (dt: number, tau: number): number => 1 - Math.exp(-dt / Math.max(1e-4, tau));

/** A slow, never-repeating drift in −1..1 (two waves that don't line up). */
const drift = (t: number, seed: number): number => 0.62 * Math.sin(TAU * (t + seed)) + 0.38 * Math.sin(TAU * (t * 0.618 + seed * 3.7));

/**
 * A glance in −1..1: every `1` of `t` a new place to look (often straight ahead again), turned to quickly and then
 * held. Reads as looking about, where a wave reads as a slow shake of the head.
 */
function glance(t: number, seed: number): number {
  const i = Math.floor(t), u = t - i;
  const at = (n: number): number => (hash(n, seed * 977 + 13) < 0.45 ? 0 : hash(n, seed * 977 + 31) * 2 - 1);
  const a = at(i - 1), b = at(i);
  return a + (b - a) * smooth(clamp(u / 0.22, 0, 1));
}

/** The gait pose and stride (hip heights) for a speed: one gait scaled down below its pace, two blended between theirs. */
function gaitAt(gaits: readonly Gait[], speed: number, phase: number): { pose: Pose; stride: number; effort: number } {
  const first = gaits[0];
  if (speed <= first.pace || gaits.length === 1) {
    const k = clamp(speed / first.pace, 0.45, 1);
    return { pose: scalePose(cyclePose(first.loop, phase), k), stride: first.stride * k, effort: first.effort * k };
  }
  let i = 0;
  while (i < gaits.length - 2 && speed > gaits[i + 1].pace) i++;
  const a = gaits[i], b = gaits[i + 1];
  const u = clamp((speed - a.pace) / (b.pace - a.pace), 0, 1);
  return {
    pose: blendPose(cyclePose(a.loop, phase), cyclePose(b.loop, phase), u),
    stride: a.stride + (b.stride - a.stride) * u,
    effort: a.effort + (b.effort - a.effort) * u,
  };
}

/** The small movements for this moment, as a pose to add. */
function lifePose(s: AnimState, lib: AnimLib, inp: AnimInput, full: number): Pose {
  const L = lib.life, m = inp.manner, st = inp.stance, size = m.loose;
  const still = 1 - s.going;
  const joints: Partial<Record<Joint, [number, number, number]>> = {};
  const add = (j: Joint, x: number, y = 0, z = 0): void => {
    const b = joints[j] ?? (joints[j] = [0, 0, 0]);
    b[0] += x; b[1] += y; b[2] += z;
  };

  // Breath: the chest rises and tips back a little, the shoulders with it, the head stays level. Deeper with effort.
  const deep = 1 + s.effort * 1.6;
  const b = (0.5 - 0.5 * Math.cos(TAU * s.breath)) * deep;
  add('chest', -L.breath.chest * b);
  add('spine', L.breath.chest * 0.35 * b);
  add('head', L.breath.chest * 0.5 * b);
  add('shoulderL', 0, 0, L.breath.shoulders * b);
  add('shoulderR', 0, 0, -L.breath.shoulders * b);
  let lift = L.breath.lift * b;
  let shiftX = 0;

  if (full > 0) {
    // Posture: how this person carries themselves.
    add('chest', m.stoop * full);
    add('neck', m.stoop * 0.5 * full);
    add('head', -m.stoop * 0.8 * full, 0, m.tilt * full);

    // Weight from foot to foot: the hips move over one foot and drop on the other side, the legs lean to keep the
    // feet where they are, the free knee eases, the shoulders tip the other way and the head stays upright.
    const w = drift(s.clock / L.sway.seconds, m.phase) * st.sway * still * size * full;
    if (w !== 0) {
      const sx = w * L.sway.shift, lean = Math.asin(clamp(sx / 0.5, -1, 1)), roll = w * L.sway.roll;
      shiftX = sx;
      add('root', 0, 0, roll);
      for (const side of ['L', 'R'] as const) {
        add(`hip${side}`, 0, 0, -lean - roll);
        add(`ankle${side}`, 0, 0, lean);
      }
      // Weight to the left (w > 0) frees the right knee, and the other way round.
      const free = w > 0 ? 'R' : 'L', k = Math.abs(w) * L.sway.knee;
      add(`hip${free}`, -k * 0.5);
      add(`knee${free}`, k);
      add(`ankle${free}`, -k * 0.5);
      lift -= Math.abs(w) * L.sway.knee * 0.004;
      add('spine', 0, 0, -roll * 0.9);
      add('chest', 0, 0, -roll * 0.5);
      add('head', 0, 0, roll * 0.4);
    }

    // Arms never hang quite still (a weapon held on guard wanders a little).
    const a = st.arms * size * full * (0.35 + 0.65 * still);
    if (a > 0) {
      const t = s.clock / L.arms.seconds;
      add('shoulderL', drift(t, m.phase + 0.11) * L.arms.swing * a, 0, drift(t * 0.8, m.phase + 0.23) * L.arms.swing * 0.5 * a);
      add('shoulderR', drift(t, m.phase + 0.47) * L.arms.swing * a, 0, drift(t * 0.8, m.phase + 0.59) * L.arms.swing * 0.5 * a);
      add('elbowL', drift(t * 1.3, m.phase + 0.31) * L.arms.elbow * a);
      add('elbowR', drift(t * 1.3, m.phase + 0.67) * L.arms.elbow * a);
      add('wristL', drift(t * 1.7, m.phase + 0.71) * L.arms.wrist * a);
      add('wristR', drift(t * 1.7, m.phase + 0.83) * L.arms.wrist * a);
    }

    // The head: turned to what it looks at (or about, on its own), shared down the neck and chest.
    add('head', s.lookPitch * 0.7, s.lookYaw * 0.6);
    add('neck', s.lookPitch * 0.3, s.lookYaw * 0.25);
    add('chest', 0, s.lookYaw * 0.15);
  }
  return { joints, lift, shift: [shiftX, 0] };
}

/**
 * Move one person's animation on by a frame and say what to show. `s` is changed in place (it is working state).
 */
export function animate(s: AnimState, lib: AnimLib, inp: AnimInput): Shown {
  const { dt, stance, manner } = inp;
  const L = lib.life;

  // How fast, and whether going at all. (A jump, such as a load or a door between storeys, is not a step.)
  const moved = inp.moved > 0 && inp.moved < 1 ? inp.moved : 0;
  if (dt > 0) s.speed += (moved / dt - s.speed) * toward(dt, 0.1);
  s.going += ((moved > 0 || s.speed > 0.25 ? clamp(s.speed / 0.5, 0, 1) : 0) - s.going) * toward(dt, 0.1);
  if (s.going < 0.001) s.going = 0;

  const gait = gaitAt(lib.gaits, s.speed, s.phase);
  s.phase += moved / Math.max(0.05, gait.stride * inp.hip);

  // Effort comes quickly and goes slowly; the breath runs on its own clock so its speed can change without a jump.
  const work = Math.max(stance.effort, gait.effort * s.going);
  s.effort += (work - s.effort) * toward(dt, work > s.effort ? 2.5 : 9);
  s.breath += (dt * manner.tempo * (1 + s.effort * 1.2)) / L.breath.seconds;
  s.clock += dt * manner.tempo;

  // 1–2. Stance and gait, then what the arms hold.
  let pose = blendPose(cyclePose(stance.loop, s.clock / stance.seconds), gait.pose, smooth(s.going));
  if (inp.hold) pose = { ...pose, joints: { ...pose.joints, ...inp.hold.joints } };

  // 3. A motion over it.
  const m = inp.motion?.motion;
  const frame = m ? sampleMotion(m, inp.motion!.t) : null;
  if (m && frame) pose = overPose(pose, frame, m.part);
  const root = frame?.root ?? NO_ROOT;
  const life = m?.life ?? 'full';

  // 4. Life. The head eases toward what it looks at; with nothing to look at, about on its own and into a turn.
  const full = life === 'full' ? 1 : 0;
  const still = 1 - s.going;
  const t = s.clock / L.look.seconds;
  const lead = clamp((inp.turning ?? 0) * L.look.lead, -L.look.reach, L.look.reach);
  const wantYaw = inp.look ? clamp(inp.look.yaw, -L.look.reach, L.look.reach) : lead + glance(t, manner.phase * 97 + 1) * L.look.yaw * stance.look * still * manner.loose;
  const wantPitch = inp.look ? clamp(-inp.look.pitch, -0.6, 0.6) : glance(t * 0.7, manner.phase * 97 + 5) * L.look.pitch * stance.look * still;
  s.lookYaw += (wantYaw * full - s.lookYaw) * toward(dt, L.look.settle);
  s.lookPitch += (wantPitch * full - s.lookPitch) * toward(dt, L.look.settle);
  if (life !== 'none') pose = addPose(pose, lifePose(s, lib, inp, full));

  // A change never snaps: ease out of what was last shown.
  const key = `${stance.id}|${inp.hold?.id ?? ''}|${m?.id ?? ''}`;
  if (key !== s.key) {
    if (s.last) {
      s.from = s.last;
      s.since = 0;
      s.blend = Math.max(m ? m.blend ?? DEFAULT_BLEND : 0.25, s.leave);
    }
    s.key = key;
    s.leave = m?.leave ?? 0;
  }
  let shown: Shown = { pose, root };
  if (s.from) {
    s.since += dt;
    const u = s.blend > 0 ? s.since / s.blend : 1;
    if (u >= 1) s.from = null;
    else {
      const k = smooth(u), f = s.from.root;
      shown = {
        pose: blendPose(s.from.pose, pose, k),
        root: { tilt: f.tilt + (root.tilt - f.tilt) * k, up: f.up + (root.up - f.up) * k, back: f.back + (root.back - f.back) * k, side: f.side + (root.side - f.side) * k },
      };
    }
  }
  s.last = shown;
  return shown;
}
