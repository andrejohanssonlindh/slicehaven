import { describe, expect, it } from 'vitest';
import { PERSON_KINDS } from '../src/content/people';
import { bodySpecOf } from '../src/content/people/bodies';
import { buildBody } from '../src/core/world3d/body';
import type { Vec3 } from '../src/core/world3d/mesh';
import type { Pose } from '../src/core/world3d/pose';
import { LIMBS, aim, apply, frames, matTurn, reach, turnMat, turned, yawMat } from '../src/core/world3d/skeleton';

const who = { is: ['human', 'job-farmer'], seed: 1, look: { sex: 'm' } };
const model = buildBody(bodySpecOf(PERSON_KINDS.resolve(who), 1));
const skel = model.joints, H = model.height;
const near = (a: Vec3, b: Vec3, digits = 4): void => { for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i], digits); };

describe('a posed skeleton', () => {
  it('at rest stands as the body is built: hips at their height, hands and feet below their joints', () => {
    const f = frames(skel, { joints: {} }, H);
    near(f.pos.root, skel.root.at);
    expect(f.pos.ankleL[1]).toBeCloseTo(0.04 * H, 3);
    expect(f.pos.ankleL[0]).toBeGreaterThan(0);
    expect(f.pos.wristR[0]).toBeLessThan(0);
    expect(f.pos.head[1]).toBeGreaterThan(f.pos.chest[1]);
  });

  it('turns as the engine does: a turn and its rotation go both ways', () => {
    for (const t of [[0.3, -0.7, 1.1], [-1.2, 0.4, 0.2], [0, 0, 0]] as const) {
      const back = matTurn(turnMat(t));
      for (let i = 0; i < 3; i++) expect(back[i]).toBeCloseTo(t[i], 6);
    }
    // A negative turn about x swings a hanging limb forward; a positive turn about y brings the right side forward.
    expect(apply(turnMat([-0.5, 0, 0]), [0, -1, 0])[2]).toBeGreaterThan(0);
    expect(apply(turnMat([0, 0.5, 0]), [-1, 0, 0])[2]).toBeGreaterThan(0);
  });

  it('a lift and a shift move the hips, and everything with them', () => {
    const a = frames(skel, { joints: {} }, H), b = frames(skel, { joints: {}, lift: 0.1, shift: [0.05, 0] }, H);
    near(b.pos.head, [a.pos.head[0] + 0.05 * H, a.pos.head[1] + 0.1 * H, a.pos.head[2]]);
  });
});

describe('reaching', () => {
  const base: Pose = { joints: { spine: [0.2, 0.3, 0], chest: [0.1, 0.2, -0.1], root: [0, -0.25, 0.05] }, lift: -0.02 };

  it('puts a hand on a point in reach, the elbow bending the way elbows do', () => {
    const f = frames(skel, base, H);
    for (const target of [[0.05, 1.05, 0.35], [0, 1.1, 0.3], [0.25, 1.3, 0.2]] as Vec3[]) {
      const r = reach(skel, f, LIMBS.armL, target, [0.3, -1, -0.3]);
      const after = frames(skel, turned(base, { shoulderL: r.a, elbowL: r.b }), H);
      near(after.pos.wristL, target, 3);
      expect(r.b[0]).toBeLessThanOrEqual(0);
    }
  });

  it('out of reach, the arm straightens toward the point', () => {
    const f = frames(skel, base, H);
    const target: Vec3 = [0.3, 1.2, 3];
    const r = reach(skel, f, LIMBS.armL, target, [0.3, -1, -0.3]);
    const after = frames(skel, turned(base, { shoulderL: r.a, elbowL: r.b }), H);
    expect(Math.abs(r.b[0])).toBeLessThan(0.05);
    const to = [0, 1, 2].map((i) => target[i] - after.pos.shoulderL[i]), arm = [0, 1, 2].map((i) => after.pos.wristL[i] - after.pos.shoulderL[i]);
    const cos = (to[0] * arm[0] + to[1] * arm[1] + to[2] * arm[2]) / (Math.hypot(...to) * Math.hypot(...arm));
    expect(cos).toBeGreaterThan(0.999);
  });

  it('puts a foot where it should stand with the knee forward, and flat', () => {
    const crouch: Pose = { joints: { root: [0, -0.3, 0.04] }, lift: -0.06, shift: [0.02, 0] };
    const f = frames(skel, crouch, H);
    const target: Vec3 = [0.12, 0.04 * H, 0.2];
    const r = reach(skel, f, LIMBS.legL, target, [0, 0, 1]);
    const flat = aim(r.lower, yawMat(0.2));
    const after = frames(skel, turned(crouch, { hipL: r.a, kneeL: r.b, ankleL: flat }), H);
    near(after.pos.ankleL, target, 3);
    expect(r.b[0]).toBeGreaterThan(0.1);
    expect(after.pos.kneeL[2]).toBeGreaterThan((after.pos.hipL[2] + after.pos.ankleL[2]) / 2);
    // The sole is level: the foot's up is the world's up.
    near(apply(after.rot.ankleL, [0, 1, 0]), [0, 1, 0], 4);
  });
});
