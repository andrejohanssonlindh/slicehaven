import { ModelBuilder, addBox } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/**
 * Hand weapons as models (plan B8a), shared shapes for the weapon files beside this one. A weapon lies flat on the
 * ground, its length along x, the hilt at the −x end; `grip` says where a hand holds it (along x), so the same model
 * is drawn lying on the sand and in a fist.
 */

const STEEL = 0xb4b8bc, LEATHER = 0x5a3a22, BRASS = 0x9a7a3a;

/** A sword `len` long with a blade `blade` wide: pommel, grip, cross-guard, blade, flat on the ground. */
export function sword(len: number, blade: number, guard: number): FurnitureModel {
  const hilt = Math.min(0.2, len * 0.22);
  const x0 = -len / 2, xg = x0 + hilt;
  return {
    w: len,
    d: guard,
    grip: x0 + hilt * 0.5,
    draw() {
      const m = new ModelBuilder();
      const steel = m.mesh('iron', STEEL), grip = m.mesh('cloth', LEATHER), fit = m.mesh('iron', BRASS);
      addBox(fit, [x0, 0, -0.022], [x0 + 0.035, 0.04, 0.022]);
      addBox(grip, [x0 + 0.035, 0.006, -0.015], [xg - 0.012, 0.034, 0.015]);
      addBox(fit, [xg - 0.012, 0, -guard / 2], [xg + 0.012, 0.03, guard / 2]);
      addBox(steel, [xg + 0.012, 0.012, -blade / 2], [len / 2 - 0.05, 0.022, blade / 2]);
      // The point narrows.
      addBox(steel, [len / 2 - 0.05, 0.013, -blade / 4], [len / 2, 0.021, blade / 4]);
      return m.done();
    },
  };
}

/** A hand axe: a wooden haft `len` long, an iron head at the far end. */
export function axe(len: number, head: number): FurnitureModel {
  const x0 = -len / 2;
  return {
    w: len,
    d: head,
    grip: x0 + 0.08,
    draw() {
      const m = new ModelBuilder();
      const wood = m.mesh('plank'), iron = m.mesh('iron');
      addBox(wood, [x0, 0, -0.018], [len / 2 - 0.02, 0.034, 0.018]);
      addBox(iron, [len / 2 - 0.09, 0, -0.03], [len / 2, 0.036, head / 2]);
      addBox(iron, [len / 2 - 0.07, 0.004, -head / 2], [len / 2 - 0.02, 0.032, -0.03]);
      return m.done();
    },
  };
}

/** A two-handed axe or a broad one: a long haft, a deep head (two bits, for a double axe). */
export function bigAxe(len: number, head: number, double = false): FurnitureModel {
  const x0 = -len / 2;
  return {
    w: len,
    d: head * (double ? 2 : 1),
    grip: x0 + 0.12,
    draw() {
      const m = new ModelBuilder();
      const wood = m.mesh('plank'), iron = m.mesh('iron');
      addBox(wood, [x0, 0, -0.02], [len / 2 - 0.02, 0.038, 0.02]);
      addBox(iron, [len / 2 - 0.16, 0, -0.035], [len / 2, 0.04, head]);
      if (double) addBox(iron, [len / 2 - 0.16, 0, -head], [len / 2, 0.04, 0.035]);
      return m.done();
    },
  };
}

/** A spear: a long ash shaft and a leaf-shaped iron head. */
export function spear(len: number, head: number): FurnitureModel {
  const x0 = -len / 2;
  return {
    w: len,
    d: 0.06,
    grip: x0 + len * 0.35,
    draw() {
      const m = new ModelBuilder();
      const wood = m.mesh('plank'), iron = m.mesh('iron', STEEL);
      addBox(wood, [x0, 0, -0.016], [len / 2 - head, 0.032, 0.016]);
      addBox(iron, [len / 2 - head, 0.004, -0.028], [len / 2 - head * 0.3, 0.028, 0.028]);
      addBox(iron, [len / 2 - head * 0.3, 0.008, -0.014], [len / 2, 0.024, 0.014]);
      return m.done();
    },
  };
}

/** A mace or hammer: a haft and an iron head, square (`flat`: a hammer's face and spike) or studded. */
export function mace(len: number, head: number, hammer = false): FurnitureModel {
  const x0 = -len / 2;
  return {
    w: len,
    d: hammer ? head * 1.6 : head,
    grip: x0 + 0.1,
    draw() {
      const m = new ModelBuilder();
      const wood = m.mesh('plank'), iron = m.mesh('iron'), fit = m.mesh('iron', BRASS);
      addBox(wood, [x0, 0, -0.018], [len / 2 - head * 0.6, 0.034, 0.018]);
      if (hammer) {
        addBox(iron, [len / 2 - head * 0.7, 0, -head * 0.8], [len / 2, head * 0.7, -0.02]);
        addBox(iron, [len / 2 - head * 0.5, head * 0.15, 0.02], [len / 2 - head * 0.2, head * 0.45, head * 0.8]);
      } else {
        addBox(iron, [len / 2 - head, 0, -head / 2], [len / 2, head, head / 2]);
        for (const z of [-1, 1]) addBox(fit, [len / 2 - head * 0.7, head * 0.3, z * head * 0.5], [len / 2 - head * 0.3, head * 0.7, z * (head * 0.5 + 0.02)]);
      }
      return m.done();
    },
  };
}

/** A flail: a short haft, a chain, and an iron ball lying beside it. */
export function flail(len: number, ball: number): FurnitureModel {
  const x0 = -len / 2;
  return {
    w: len,
    d: ball + 0.1,
    grip: x0 + 0.08,
    draw() {
      const m = new ModelBuilder();
      const wood = m.mesh('plank'), iron = m.mesh('iron');
      const haft = x0 + len * 0.55;
      addBox(wood, [x0, 0, -0.018], [haft, 0.034, 0.018]);
      for (let k = 0; k < 4; k++) {
        const a = haft + k * 0.045;
        addBox(iron, [a, 0.008, 0.01 + k * 0.012], [a + 0.035, 0.02, 0.022 + k * 0.012]);
      }
      addBox(iron, [len / 2 - ball, 0, 0.05], [len / 2, ball, 0.05 + ball]);
      return m.done();
    },
  };
}

/** A club: a stout stick thickening toward its end, lying on its side. */
export function club(len: number, end: number): FurnitureModel {
  return {
    w: len,
    d: end,
    grip: -len / 2 + 0.1,
    draw() {
      const m = new ModelBuilder();
      const wood = m.mesh('bark');
      const n = 4;
      for (let k = 0; k < n; k++) {
        const a = -len / 2 + (k / n) * len, b = -len / 2 + ((k + 1) / n) * len;
        const r = 0.02 + ((end / 2 - 0.02) * (k + 1)) / n;
        addBox(wood, [a, 0, -r], [b, r * 2, r]);
      }
      return m.done();
    },
  };
}
