import { ModelBuilder, addBox } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A round-topped loaf of bread. */
const loaf: FurnitureModel = {
  w: 0.24,
  d: 0.12,
  draw() {
    const m = new ModelBuilder();
    const crust = m.mesh('cloth', 0xa8743a);
    addBox(crust, [-0.12, 0, -0.06], [0.12, 0.06, 0.06], { aoBottom: 0.7 });
    addBox(m.mesh('cloth', 0xb98848), [-0.1, 0.06, -0.045], [0.1, 0.09, 0.045]);
    return m.done();
  },
};

export default loaf;
