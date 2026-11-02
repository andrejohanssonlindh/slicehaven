import { ModelBuilder, addCylinder, addTaper, addBeam } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A bucket and a broom: a wooden bucket with an iron hoop, a broom leaning against it. */
const broom: FurnitureModel = {
  w: 0.5,
  d: 0.4,
  draw() {
    const m = new ModelBuilder();
    const wood = m.mesh('plank'), iron = m.mesh('iron');
    addCylinder(wood, 0.1, 0.05, 0, 0.3, 0.14, 0.17, 8, { top: false, bottom: true });
    addCylinder(iron, 0.1, 0.05, 0.1, 0.13, 0.152, 0.152, 8, { top: false });
    addCylinder(iron, 0.1, 0.05, 0.25, 0.28, 0.168, 0.168, 8, { top: false });
    addCylinder(m.mesh('water'), 0.1, 0.05, 0.26, 0.26, 0.16, 0.16, 8);
    // The broom: a long handle leaning on the wall, a bundle of twigs at the foot.
    addBeam(wood, [-0.17, 0.02, 0.08], [-0.1, 1.3, -0.17], 0.03, [0, 0, 1]);
    addTaper(m.mesh('cloth', 0xa8903c), -0.17, 0.1, 0, 0.3, 0.2, 0.12, 0.07, 0.07, 0.7, 1);
    return m.done();
  },
};
export default broom;
