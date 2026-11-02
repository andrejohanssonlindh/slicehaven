import { ModelBuilder, addBox, addCylinder, addTaper, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A cooking hearth: a ring of stones round a bed of embers (a cloth in ember colour), a pot on an iron tripod. */
const hearth: FurnitureModel = {
  w: 1.0,
  d: 0.7,
  draw(seed) {
    const m = new ModelBuilder();
    const stone = m.mesh('stone'), iron = m.mesh('iron');
    addTaper(m.mesh('cloth', 0x2a2622), 0, 0, 0, 0.04, 0.7, 0.5, 0.64, 0.44, 1, 1);
    addTaper(m.mesh('cloth', 0xd0642a), 0.02, 0.02, 0.04, 0.09 + vary(seed, 1) * 0.03, 0.42, 0.3, 0.3, 0.2, 1, 1);
    // Back wall of stones and a ring of single stones round the front.
    addBox(stone, [-0.5, 0, -0.35], [0.5, 0.32, -0.22], { aoBottom: 0.6 });
    for (const [x, z, s] of [[-0.42, -0.12, 0.2], [-0.4, 0.12, 0.18], [-0.25, 0.3, 0.2], [0, 0.32, 0.18], [0.25, 0.3, 0.2], [0.42, 0.12, 0.18], [0.42, -0.1, 0.2]] as const) {
      addBox(stone, [x - s / 2, 0, z - s / 2], [x + s / 2, 0.16 + s * 0.2, z + s / 2], { aoBottom: 0.6 });
    }
    // Tripod and pot.
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.3;
      addBox(iron, [Math.sin(a) * 0.16 - 0.015, 0, Math.cos(a) * 0.16 - 0.015], [Math.sin(a) * 0.16 + 0.015, 0.4, Math.cos(a) * 0.16 + 0.015]);
    }
    addCylinder(iron, 0, 0, 0.18, 0.4, 0.13, 0.17, 8, { bottom: true });
    return m.done();
  },
};
export default hearth;
