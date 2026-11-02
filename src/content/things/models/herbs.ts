import { ModelBuilder, addBox, addTaper, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A rail on the wall with bundles of herbs tied by the stalks and hanging head-down. Lowest point y = 0. */
const W = 0.9, D = 0.2, TOP = 0.6;
const COLOURS = [0x55663a, 0x9a7a26, 0x6a7a42, 0x8a3a2e, 0xc0b494];

const herbs: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    addBox(wood, [-W / 2, TOP - 0.04, -D / 2], [W / 2, TOP, -D / 2 + 0.06]);
    for (const sx of [-1, 1]) addBox(wood, [sx * (W / 2 - 0.05) - 0.02, TOP - 0.1, -D / 2], [sx * (W / 2 - 0.05) + 0.02, TOP + 0.04, -D / 2 + 0.05]);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + 0.1 + (i + 0.5) * ((W - 0.2) / n);
      const len = 0.3 + vary(seed, i) * 0.15;
      const c = COLOURS[Math.floor(vary(seed, i + 20) * COLOURS.length)];
      addBox(wood, [x - 0.01, TOP - 0.1, -D / 2 + 0.06], [x + 0.01, TOP - 0.04, -D / 2 + 0.08]);
      addTaper(m.mesh('cloth', c), x, -D / 2 + 0.07, TOP - 0.1 - len, TOP - 0.08, 0.08, 0.07, 0.04, 0.04, 1, 0.9);
    }
    return m.done();
  },
};

export default herbs;
