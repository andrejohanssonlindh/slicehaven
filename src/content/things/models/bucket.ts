import { ModelBuilder, addCylinder } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A wooden bucket with two iron hoops, water in it. (Was drawn as one with the broom; now each is its own thing.) */
const bucket: FurnitureModel = {
  w: 0.36,
  d: 0.36,
  draw() {
    const m = new ModelBuilder();
    const wood = m.mesh('plank'), iron = m.mesh('iron');
    addCylinder(wood, 0, 0, 0, 0.3, 0.14, 0.17, 8, { top: false, bottom: true });
    addCylinder(iron, 0, 0, 0.1, 0.13, 0.152, 0.152, 8, { top: false });
    addCylinder(iron, 0, 0, 0.25, 0.28, 0.168, 0.168, 8, { top: false });
    addCylinder(m.mesh('water'), 0, 0, 0.26, 0.26, 0.16, 0.16, 8);
    return m.done();
  },
};
export default bucket;
