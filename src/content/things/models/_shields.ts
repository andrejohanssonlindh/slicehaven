import { ModelBuilder, addBox, addCylinder } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/**
 * Shields as models (plan B8a), shared shapes for the shield files beside this one. A shield lies on the ground face
 * up (y), its width along x; held, it is worn on the left forearm, face out (`SpikeWorld.showHeld`).
 */

const WOOD = 0x7a5a36, IRON = 0x8c9094, PAINT = 0x7a2a22, RIM = 0x5a3a22;

/** A round shield `d` across: planks, a rim, an iron boss in the middle (a buckler is small and all iron). */
export function round(d: number, allIron = false): FurnitureModel {
  return {
    w: d,
    d,
    draw() {
      const m = new ModelBuilder();
      const face = allIron ? m.mesh('iron', IRON) : m.mesh('plank', WOOD), rim = m.mesh('cloth', RIM), boss = m.mesh('iron', IRON);
      addCylinder(rim, 0, 0, 0, 0.02, d / 2, d / 2, 12);
      addCylinder(face, 0, 0, 0.004, 0.024, d / 2 - 0.02, d / 2 - 0.02, 12);
      addCylinder(boss, 0, 0, 0.02, 0.06, Math.min(0.08, d * 0.18), Math.min(0.05, d * 0.1), 8);
      return m.done();
    },
  };
}

/** A tall shield `w` wide and `h` long (a knight's, narrowing to a point; or a curved, square one), painted. */
export function tall(w: number, h: number, pointed: boolean): FurnitureModel {
  return {
    w: h,
    d: w,
    draw() {
      const m = new ModelBuilder();
      const face = m.mesh('cloth', PAINT), rim = m.mesh('cloth', RIM), boss = m.mesh('iron', IRON);
      const x0 = -h / 2, x1 = pointed ? h * 0.15 : h / 2;
      addBox(rim, [x0, 0, -w / 2], [x1, 0.02, w / 2]);
      addBox(face, [x0 + 0.02, 0.004, -w / 2 + 0.02], [x1 - 0.02, 0.026, w / 2 - 0.02]);
      if (pointed) {
        // The lower part narrows in steps to the point.
        for (let i = 0; i < 4; i++) {
          const a = x1 + ((h / 2 - x1) * i) / 4, b = x1 + ((h / 2 - x1) * (i + 1)) / 4, k = 1 - (i + 1) / 5;
          addBox(face, [a, 0.004, (-w / 2) * k], [b, 0.026, (w / 2) * k]);
        }
      }
      addCylinder(boss, -h * 0.05, 0, 0.02, 0.05, 0.05, 0.035, 8);
      return m.done();
    },
  };
}
