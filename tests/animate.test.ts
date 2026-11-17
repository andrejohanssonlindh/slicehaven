import { describe, expect, it } from 'vitest';
import { MOTIONS } from '../src/content/motions';
import { TIRED_BANDS } from '../src/content/people/condition';
import { PERSON_KINDS } from '../src/content/people';
import { bodySpecOf } from '../src/content/people/bodies';
import { ANIM, CARRY, GAITS, READY, SIT, STAND, WEAPON_HOLDS, weaponHold } from '../src/content/people/poses';
import { buildBody } from '../src/core/world3d/body';
import { type Frames, apply, frames } from '../src/core/world3d/skeleton';
import { WAYS_OF_MOVING } from '../src/core/world3d/motion';
import { type Injuries, unhurt } from '../src/core/damage';
import { type Condition, conditionOf } from '../src/core/world3d/condition';
import { type AnimInput, type AnimState, type Shown, animate, mannerOf, newAnim } from '../src/core/world3d/animate';
import { type Motion, sampleMotion } from '../src/core/world3d/motion';
import { JOINTS, type Joint, type Pose, addPose, blendPose, mirrorPose } from '../src/core/world3d/pose';

const manner = mannerOf(7);
const body = buildBody(bodySpecOf(PERSON_KINDS.resolve({ is: ['human', 'job-farmer'], seed: 1, look: { sex: 'm' } }), 1));
const base = (more: Partial<AnimInput> = {}): AnimInput => ({ dt: 1 / 60, moved: 0, body, stance: STAND, manner, ...more });
const at = (p: Pose): Frames => frames(body.joints, p, body.height);
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
    // Whatever the hips do, the feet are put back where the stance stands them, flat on the ground.
    const first = at(seen[0].pose);
    for (const x of seen) {
      const f = at(x.pose);
      for (const j of ['ankleL', 'ankleR'] as const) {
        // (To within a finger: a leg at full stretch can't quite follow the hips at the top of a breath.)
        for (let i = 0; i < 3; i++) expect(Math.abs(f.pos[j][i] - first.pos[j][i])).toBeLessThan(0.015);
        expect(apply(f.rot[j], [0, 1, 0])[1]).toBeCloseTo(1, 3);
      }
    }
    expect(first.pos.ankleL[1]).toBeCloseTo(0.04 * body.height, 2);
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
    const held = run(s, 2, { hold: CARRY, moved: 1.4 / 60 });
    expect(turn(held.pose, 'shoulderL')).toBeLessThan(-0.6);
    expect(Math.abs(turn(held.pose, 'hipL')) + Math.abs(turn(held.pose, 'hipR'))).toBeGreaterThan(0.1);
  });
});

describe('weapons in the hands', () => {
  /** Where the weapon in the right hand points (body space), and where the left hand's hold is. */
  const weapon = (p: Pose): { dir: readonly number[]; left: number[]; f: Frames } => {
    const f = at(p);
    const hold = apply(f.rot.wristL, body.grip);
    return { dir: apply(f.rot.wristR, [0, 0, 1]), left: [0, 1, 2].map((i) => f.pos.wristL[i] + hold[i]), f };
  };
  const guarding = (way: 'spear' | 'staff' | 'two-hander' | 'blade', more: Partial<AnimInput> = {}): Partial<AnimInput> => ({
    stance: READY, hold: weaponHold(way, true, false), motion: { motion: MOTIONS.guard, t: 0 },
    grasp: WEAPON_HOLDS[way].second === undefined ? null : [body.grip[0], body.grip[1], body.grip[2] + WEAPON_HOLDS[way].second!],
    ...more,
  });

  it('every way of moving has a hold, and each weapon is held its own way on guard', () => {
    for (const way of WAYS_OF_MOVING) expect(WEAPON_HOLDS[way], way).toBeTruthy();
    const dirs = (['blade', 'spear', 'staff', 'two-hander'] as const).map((way) => weapon(run(newAnim(manner), 1, guarding(way)).pose).dir);
    // A sword stands up in front; a spear is levelled at the foe.
    expect(dirs[0][1]).toBeGreaterThan(0.6);
    expect(dirs[1][2]).toBeGreaterThan(0.85);
    expect(Math.abs(dirs[1][1])).toBeLessThan(0.4);
    // No two are held alike.
    for (let i = 0; i < dirs.length; i++) for (let j = i + 1; j < dirs.length; j++) expect(Math.hypot(...dirs[i].map((v, k) => v - dirs[j][k]))).toBeGreaterThan(0.2);
  });

  it('a spear is thrust along its own line: the point goes forward, still pointing at the foe', () => {
    const strike = MOTIONS['strike-spear'], hit = strike.marks!.contact * strike.seconds;
    const s = newAnim(manner);
    const before = weapon(run(s, 1, guarding('spear')).pose);
    let now = before;
    for (let t = 0; t <= hit; t += 1 / 60) now = weapon(animate(s, ANIM, base(guarding('spear', { motion: { motion: strike, t } }))).pose);
    expect(now.dir[2]).toBeGreaterThan(0.85);
    // The hand, and so the point, has gone well forward along the way the spear points.
    expect(now.f.pos.wristR[2] - before.f.pos.wristR[2]).toBeGreaterThan(0.35);
  });

  it('the second hand holds a weapon held in both, on guard and through a blow', () => {
    for (const way of ['spear', 'staff', 'two-hander'] as const) {
      const g = guarding(way), s = newAnim(manner);
      const on = (p: Pose): number => {
        const w = weapon(p), hold = apply(w.f.rot.wristR, g.grasp!);
        return Math.hypot(...[0, 1, 2].map((i) => w.left[i] - (w.f.pos.wristR[i] + hold[i])));
      };
      expect(on(run(s, 1, g).pose), way).toBeLessThan(0.03);
      // Through the wind-up of its strike the hand stays on, or the arm is stretched out after the weapon.
      const strike = MOTIONS[`strike-${way}`];
      for (let t = 0; t <= strike.seconds; t += 1 / 60) {
        const p = animate(s, ANIM, base({ ...g, motion: { motion: strike, t } })).pose;
        if (on(p) > 0.05) expect(Math.abs(turn(p, 'elbowL')), `${way} at ${t.toFixed(2)}`).toBeLessThan(0.15);
      }
    }
    // A shield on the arm, and the hand stays off the weapon.
    expect(weaponHold('spear', true, true)!.id).toContain('shield');
    expect(weaponHold('hands', false, false)).toBeNull();
  });

  it('the legs give when the body sinks: a spent fighter\'s knees bend and the feet stay down', () => {
    const fresh = run(newAnim(manner), 3, guarding('blade')).pose;
    const spent = run(newAnim(manner), 3, guarding('blade', { condition: conditionOf({ ...unhurt(), fatigue: 40 }, TIRED_BANDS) })).pose;
    expect(turn(spent, 'kneeL')).toBeGreaterThan(turn(fresh, 'kneeL') + 0.1);
    const a = at(fresh), b = at(spent);
    for (const j of ['ankleL', 'ankleR'] as const) for (let i = 0; i < 3; i++) expect(b.pos[j][i]).toBeCloseTo(a.pos[j][i], 2);
    // A foot on higher ground is lifted to it.
    const slope = run(newAnim(manner), 1, { ground: { L: 0.1, R: 0 } }).pose, flat = run(newAnim(manner), 1).pose;
    expect(at(slope).pos.ankleL[1] - at(flat).pos.ankleL[1]).toBeCloseTo(0.1, 2);
  });
});

describe('a body\'s condition', () => {
  const hurt = (f: (i: Injuries) => void): Condition => {
    const i = unhurt();
    f(i);
    return conditionOf(i, TIRED_BANDS);
  };

  it('fatigue falls in the director\'s bands: 0–10, 11–20, 21–30, over 30', () => {
    expect(TIRED_BANDS.map((b) => b.from)).toEqual([0, 11, 21, 31]);
    expect(conditionOf(null, TIRED_BANDS).tired).toBe(0);
    expect(hurt((i) => { i.fatigue = 10; }).band).toBe('fresh');
    expect(hurt((i) => { i.fatigue = 11; }).band).toBe('winded');
    expect(hurt((i) => { i.fatigue = 8; i.baseFatigue = 14; }).band).toBe('worn');
    expect(hurt((i) => { i.fatigue = 45; }).tired).toBe(1);
  });

  it('reads the limbs: wounds by thirds, a break or a lost part useless; blood runs from the worst wound', () => {
    const c = hurt((i) => { i.wounds = { leftArm: 1, rightLeg: 2 }; i.broken = ['rightArm']; i.lost = [{ area: 'foot', side: 'left' }]; i.bleed = { rate: 2, diff: 10 }; });
    expect(c.armL).toBeCloseTo(1 / 3);
    expect(c.armR).toBe(1);
    expect(c.legL).toBe(1);
    expect(c.legR).toBeCloseTo(2 / 3);
    expect(c.bleed).toBe(2);
    expect(c.bleedFrom).toBe('kneeR');
    expect(c.stains.rightLeg).toBeGreaterThan(c.stains.leftArm!);
    expect(hurt(() => {}).bleed).toBe(0);
  });

  it('a part cut off is gone from its joint down; a stump keeps half the bone', () => {
    const c = hurt((i) => { i.lost = [{ area: 'hand', side: 'left' }, { area: 'calf', side: 'right' }, { area: 'neck' }]; });
    expect(c.gone).toEqual({ wristL: 0, kneeR: 0.5, ankleR: 0 });
    expect(hurt(() => {}).gone).toEqual({});
  });

  it('the spent stand bent over with the guard sunk, and breathe hard', () => {
    const fresh = newAnim(manner), spent = newAnim(manner);
    const a = run(fresh, 4, { stance: READY, motion: { motion: MOTIONS.guard, t: 0 } });
    const b = run(spent, 4, { stance: READY, motion: { motion: MOTIONS.guard, t: 0 }, condition: hurt((i) => { i.fatigue = 35; }) });
    expect(turn(b.pose, 'chest') - turn(a.pose, 'chest')).toBeGreaterThan(0.12);
    expect(turn(b.pose, 'elbowR') - turn(a.pose, 'elbowR')).toBeGreaterThan(0.2);
    expect(spent.effort).toBeGreaterThan(fresh.effort + 0.2);
    // A new band comes on over a moment, not in a frame.
    const s = newAnim(manner);
    const before = run(s, 1);
    const after = animate(s, ANIM, base({ condition: hurt((i) => { i.fatigue = 35; }) }));
    expect(apart(before.pose, after.pose)).toBeLessThan(0.05);
  });

  it('a hurt arm is held in and does less; a hurt leg limps and the weight stays off it', () => {
    const arm = hurt((i) => { i.broken = ['rightArm']; });
    const strike = MOTIONS.strike, at = strike.marks!.contact * strike.seconds;
    const whole = run(newAnim(manner), 1, { stance: READY, motion: { motion: strike, t: at } });
    const nursed = run(newAnim(manner), 1, { stance: READY, motion: { motion: strike, t: at }, condition: arm });
    expect(Math.abs(turn(nursed.pose, 'shoulderR'))).toBeLessThan(Math.abs(turn(whole.pose, 'shoulderR')) * 0.5);
    expect(turn(nursed.pose, 'elbowR')).toBeLessThan(-1);

    const leg = hurt((i) => { i.wounds = { rightLeg: 3 }; });
    const knees = (c: Condition | null): { bend: number; low: number } => {
      const s = newAnim(manner);
      let bend = 0, low = 0;
      for (let t = 0; t < 4; t += 1 / 60) {
        const p = animate(s, ANIM, base({ moved: 1.2 / 60, condition: c })).pose;
        if (t > 1) { bend = Math.max(bend, turn(p, 'kneeR')); low = Math.min(low, p.lift ?? 0); }
      }
      return { bend, low };
    };
    expect(knees(leg).bend).toBeLessThan(knees(null).bend * 0.6);
    expect(knees(leg).low).toBeLessThan(knees(null).low - 0.005);
    // Standing: the hips stay over the left foot the whole time.
    const s = newAnim(manner);
    for (let t = 0; t < 12; t += 1 / 60) {
      const p = animate(s, ANIM, base({ condition: leg })).pose;
      if (t > 1) expect(p.shift![0]).toBeGreaterThan(0);
    }
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
