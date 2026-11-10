import { ModelBuilder, addBox } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A small tin tinderbox with a lid. */
const tinderbox: FurnitureModel = {
  w: 0.1,
  d: 0.07,
  draw() {
    const m = new ModelBuilder();
    const tin = m.mesh('iron');
    addBox(tin, [-0.05, 0, -0.035], [0.05, 0.03, 0.035], { aoBottom: 0.7 });
    addBox(tin, [-0.052, 0.03, -0.037], [0.052, 0.04, 0.037]);
    return m.done();
  },
};

export default tinderbox;
