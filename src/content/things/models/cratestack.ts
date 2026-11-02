import { ModelBuilder, addBox, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A stack of crates: slatted boxes with corner posts, three below and two on top, each turned a hair by the seed. */
const W = 0.9, D = 0.62, CH = 0.4;

const cratestack: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    const crate = (cx: number, cz: number, y: number, w: number, d: number): void => {
      const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, t = 0.045;
      addBox(wood, [x0, y, z0], [x1, y + 0.03, z1], { aoBottom: 0.6 });
      for (const sx of [x0, x1 - t]) for (const sz of [z0, z1 - t]) addBox(wood, [sx, y, sz], [sx + t, y + CH, sz + t]);
      for (const [a, b] of [[0.08, 0.32]] as const) {
        addBox(wood, [x0 + t, y + a, z1 - 0.02], [x1 - t, y + b, z1]);
        addBox(wood, [x0 + t, y + a, z0], [x1 - t, y + b, z0 + 0.02]);
        addBox(wood, [x0, y + a, z0 + t], [x0 + 0.02, y + b, z1 - t]);
        addBox(wood, [x1 - 0.02, y + a, z0 + t], [x1, y + b, z1 - t]);
      }
    };
    const j = (i: number): number => (vary(seed, i) - 0.5) * 0.04;
    crate(-0.2 + j(1), 0.0 + j(2), 0, 0.46, 0.58);
    crate(0.22 + j(3), 0.0 + j(4), 0, 0.44, 0.58);
    crate(-0.05 + j(5), 0.0 + j(6), CH, 0.5, 0.5);
    return m.done();
  },
};

export default cratestack;
