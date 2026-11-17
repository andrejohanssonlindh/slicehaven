import { describe, expect, it } from 'vitest';
import { MOTIONS } from '../src/content/motions';
import { ANIM, GAITS, HOLDS, READY, SIT, STAND } from '../src/content/people/poses';
import { type AnimInput, type AnimState, type Shown, animate, mannerOf, newAnim } from '../src/core/world3d/animate';
import { type Motion, sampleMotion } from '../src/core/world3d/motion';
import { JOINTS, type Joint, type Pose, addPose, blendPose, mirrorPose } from '../src/core/world3d/pose';

const manner = mannerOf(7);
const base = (more: Partial<AnimInput> = {}): AnimInput => ({ dt: 1 / 60, moved: 0, hip: 0.85, stance: STAND, manner, ...more });
/** Run the animator for some seconds; the last frame shown. */
const run = (s: AnimState, seconds: number, more: Partial<AnimInput> | ((t: number) => Partial<AnimInput>) = {}): Shown => {
  let out!: Shown;
  for (let t = 0; t < seconds; t += 1 / 60) out = animate(s, ANIM, base(typeof more === 'function' ? more(t) : more));
  return out;
};
const turn = (p: Pose, j: Joint, axis = 0): number => p.joints[j]?.[axis] ?? 0;
/** The biggest difference between two poses on any joint (radians). */
const apart = (a: Pose, b: Pose): number => Math.max(...JOINTS.flatMap((j) => [0, 1, 2].map((x) => Math.abs(turn(a, j, x) - turn(b, j, x)))));

describe('poses, the arithmetic', () => {
  it('blends, adds and mirrors the hips\' shift with the joints', () => {
    const a: Pose = { joints: { hipL: [0.2, 0, 0.1] }, shift: [0.02, 0] }, b: Pose = { joints: { kneeL: [1, 0, 0] }, lift: 0.1 };
    const mid = blendPose(a, b, 0.5);
    expect(mid.joints.hipL![0]).toBeCloseTo(0.1);
    expect(mid.joints.kneeL![0]).toBeCloseTo(0.5);
    expect(mid.shift![0]).toBeCloseTo(0.01);
    expect(addPose(a, a, 2).joints.hipL![0]).toBeCloseTo(0.6);
    expect(mirrorPose(a).joints.hipR).toEqual([0.2, -0, -0.1]);
    expect(mirrorPose(a).shift![0]).toBeCloseTo(-0.02);
  });
});

describe('the animator', () => {
  it('is the same every time, and each person moves in their own way', () => {
    const a = run(newAnim(manner), 3), b = run(newAnim(manner), 3);
    expect(a).toEqual(b);
    const other = mannerOf(8);
    expect(mannerOf(7)).toEqual(manner);
    expect(other.phase).not.toBe(manner.phase);
    const s = newAnim(other);
    let c!: Shown;
    for (let t = 0; t < 3; t += 1 / 60) c = animate(s, ANIM, base({ manner: other }));
    expect(apart(a.pose, c.pose)).toBeGreaterThan(0.001);
  });

  it('someone standing is never quite still: they breathe and shift their weight, feet staying put', () => {
    const s = newAnim(manner);
    const seen: Shown[] = [];
    for (let t = 0; t < 20; t += 1 / 60) seen.push(animate(s, ANIM, base()));
    const range = (f: (p: Pose) => number): number => Math.max(...seen.map((x) => f(x.pose))) - Math.min(...seen.map((x) => f(x.pose)));
    expect(range((p) => turn(p, 'chest'))).toBeGreaterThan(0.015);
    expect(range((p) => p.shift?.[0] ?? 0)).toBeGreaterThan(0.01);
    expect(range((p) => turn(p, 'head', 1))).toBeGreaterThan(0.1);
    // From one frame to the next it only ever moves a little (no snaps).
    for (let i = 1; i < seen.length; i++) expect(apart(seen[i - 1].pose, seen[i].pose)).toBeLessThan(0.06);
    // The legs lean against the hips' shift, the ankles undo the lean: the feet stay flat where they are.
    for (const x of seen) expect(turn(x.pose, 'hipL', 2) + turn(x.pose, 'ankleL', 2) + turn(x.pose, 'root', 2)).toBeCloseTo(0, 5);
  });

  it('eases from standing into a walk and back, with no snap', () => {
    const s = newAnim(manner);
    let prev = run(s, 1);
    const still = turn(prev.pose, 'hipR');
    let swing = 0;
    for (let t = 0; t < 4; t += 1 / 60) {
      const going = t > 0.5 && t < 2.5;
      const now = animate(s, ANIM, base({ moved: going ? 1.4 / 60 : 0 }));
      expect(apart(prev.pose, now.pose)).toBeLessThan(0.2);
      swing = Math.max(swing, Math.abs(turn(now.pose, 'hipR') - still));
      prev = now;
    }
    expect(swing).toBeGreaterThan(0.3);
    expect(s.going).toBe(0);
    expect(Math.abs(turn(prev.pose, 'hipR') - still)).toBeLessThan(0.1);
  });

  it('takes shorter steps when slow and longer ones when running, and running is hard work', () => {
    const steps = (speed: number): { loops: number; effort: number } => {
      const s = newAnim(manner), from = s.phase;
      run(s, 4, { moved: speed / 60 });
      return { loops: s.phase - from, effort: s.effort };
    };
    const slow = steps(0.7), walk = steps(GAITS[0].pace), fast = steps(GAITS[1].pace);
    // Ground covered per loop: slow < walk < run.
    expect((0.7 * 4) / slow.loops).toBeLessThan((GAITS[0].pace * 4) / walk.loops);
    expect((GAITS[0].pace * 4) / walk.loops).toBeLessThan((GAITS[1].pace * 4) / fast.loops);
    // Running is under three steps a second (it was nearly five when a run was a fast walk).
    expect(fast.loops / 4).toBeLessThan(1.5);
    expect(fast.effort).toBeGreaterThan(walk.effort + 0.3);
  });

  it('eases into a motion and out of it, and a motion still lands where it says', () => {
    const s = newAnim(manner);
    const before = run(s, 1, { stance: READY });
    const strike = MOTIONS.strike;
    const first = animate(s, ANIM, base({ stance: READY, motion: { motion: strike, t: 0 } }));
    // The first frame of the strike is still (nearly) where the body was.
    expect(apart(before.pose, first.pose)).toBeLessThan(0.15);
    // At the contact mark the arm is where the motion's key puts it (the easing-in is long over).
    const at = strike.marks!.contact * strike.seconds;
    let now = first;
    for (let t = 1 / 60; t <= at; t += 1 / 60) now = animate(s, ANIM, base({ stance: READY, motion: { motion: strike, t } }));
    expect(turn(now.pose, 'shoulderR')).toBeCloseTo(sampleMotion(strike, at).joints.shoulderR![0], 0);
  });

  it('a body falls and gets up through the frames between, never in one', () => {
    const s = newAnim(manner);
    run(s, 0.5, { stance: READY });
    const down = run(s, 1, { stance: READY, motion: { motion: MOTIONS.down, t: 0 } });
    expect(down.root.tilt).toBeCloseTo(-Math.PI / 2);
    const rising = animate(s, ANIM, base({ stance: READY }));
    expect(rising.root.tilt).toBeLessThan(-1.2);
    const up = run(s, 1, { stance: READY });
    expect(up.root.tilt).toBeCloseTo(0);
  });

  it('the senseless breathe and the dead lie still', () => {
    const moves = (id: string): number => {
      const s = newAnim(manner);
      const seen: Shown[] = [];
      for (let t = 0; t < 6; t += 1 / 60) seen.push(animate(s, ANIM, base({ motion: { motion: MOTIONS[id], t: 0 } })));
      const chest = seen.slice(60).map((x) => turn(x.pose, 'chest'));
      return Math.max(...chest) - Math.min(...chest);
    };
    expect(moves('down')).toBeGreaterThan(0.01);
    expect(moves('dead')).toBe(0);
  });

  it('the head turns to what it looks at, as far as a neck goes, and leads the body into a turn', () => {
    const yawOf = (p: Pose): number => turn(p, 'head', 1) + turn(p, 'neck', 1) + turn(p, 'chest', 1);
    const s = newAnim(manner);
    const left = run(s, 1.5, { look: { yaw: 0.8, pitch: 0.3 } });
    expect(yawOf(left.pose)).toBeGreaterThan(0.6);
    expect(turn(left.pose, 'head')).toBeLessThan(0); // looking up
    const behind = run(s, 1.5, { look: { yaw: 3, pitch: 0 } });
    expect(yawOf(behind.pose)).toBeLessThan(ANIM.life.look.reach + 0.1);
    const lead = run(newAnim(manner), 0.4, { stance: SIT, turning: -1 });
    expect(turn(lead.pose, 'head', 1)).toBeLessThan(-0.15);
  });

  it('a hold lies over the arms whatever the legs do', () => {
    const s = newAnim(manner);
    const held = run(s, 2, { hold: HOLDS.carry, moved: 1.4 / 60 });
    expect(turn(held.pose, 'shoulderL')).toBeLessThan(-0.6);
    expect(Math.abs(turn(held.pose, 'hipL')) + Math.abs(turn(held.pose, 'hipR'))).toBeGreaterThan(0.1);
  });
});

describe('motion curves', () => {
  const keys: Motion = {
    id: 't', act: 'flinch', seconds: 1, part: 'upper', then: 'hold',
    keys: [{ at: 0, joints: { shoulderR: [0, 0, 0] } }, { at: 0.5, joints: { shoulderR: [1, 0, 0] } }, { at: 1, joints: { shoulderR: [3, 0, 0] } }],
  };
  const at = (m: Motion, t: number): number => sampleMotion(m, t).joints.shoulderR![0];

  it('flows through a key without stopping, and never swings past one', () => {
    // Still moving as it passes the middle key.
    expect(at(keys, 0.51) - at(keys, 0.49)).toBeGreaterThan(0.02);
    for (let t = 0; t <= 1; t += 0.01) {
      expect(at(keys, t)).toBeGreaterThanOrEqual(-1e-9);
      expect(at(keys, t)).toBeLessThanOrEqual(3 + 1e-9);
    }
    expect(at(keys, 0.5)).toBeCloseTo(1);
  });

  it('a key can say how it is come to: a blow speeds up all the way in', () => {
    const blow: Motion = { ...keys, keys: [keys.keys[0], { ...keys.keys[1], ease: 'in' }, keys.keys[2]] };
    expect(at(blow, 0.25)).toBeCloseTo(0.25);
    expect(at(blow, 0.5) - at(blow, 0.45)).toBeGreaterThan(at(blow, 0.1) - at(blow, 0.05));
  });
});
