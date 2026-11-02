import { ModelBuilder, addBox, addCylinder, addBeam, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A work bench with a stone mortar and pestle, a jar and a small scale-pan on it. */
const W = 1.1, D = 0.55, H = 0.85;

const mortarBench: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank'), stone = m.mesh('stone'), clay = m.mesh('cloth', 0x9a6a48), iron = m.mesh('iron');
    addBox(wood, [-W / 2, H - 0.06, -D / 2], [W / 2, H, D / 2], { aoBottom: 0.7 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * (W / 2 - 0.07), z = sz * (D / 2 - 0.07);
      addBox(wood, [x - 0.04, 0, z - 0.04], [x + 0.04, H - 0.06, z + 0.04], { aoBottom: 0.6 });
    }
    addBox(wood, [-W / 2 + 0.05, 0.25, -0.02], [W / 2 - 0.05, 0.3, 0.02]);
    const mx = -0.2 + (vary(seed, 1) - 0.5) * 0.1;
    addCylinder(stone, mx, 0.02, H, H + 0.12, 0.1, 0.14, 8, { bottom: true });
    addBeam(stone, [mx + 0.02, H + 0.05, 0.02], [mx + 0.1, H + 0.3, 0.06], 0.035, [0, 0, 1]);
    addCylinder(clay, 0.25, -0.1, H, H + 0.16, 0.06, 0.05, 6);
    addCylinder(clay, 0.4, 0.08, H, H + 0.1, 0.045, 0.04, 6);
    addCylinder(iron, 0.05, 0.14, H, H + 0.02, 0.07, 0.07, 6);
    return m.done();
  },
};

export default mortarBench;
