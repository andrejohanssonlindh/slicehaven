import { ModelBuilder, addBox } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A leather purse drawn shut with a cord. */
const purse: FurnitureModel = {
  w: 0.1,
  d: 0.08,
  draw() {
    const m = new ModelBuilder();
    const leather = m.mesh('cloth', 0x6a4426);
    addBox(leather, [-0.05, 0, -0.04], [0.05, 0.06, 0.04], { aoBottom: 0.7 });
    addBox(leather, [-0.025, 0.06, -0.02], [0.025, 0.085, 0.02]);
    addBox(m.mesh('cloth', 0x2e2014), [-0.03, 0.06, -0.025], [0.03, 0.068, 0.025]);
    return m.done();
  },
};

export default purse;
