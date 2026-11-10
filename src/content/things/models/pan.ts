import { ModelBuilder, addBox, addCylinder } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** An iron pan with a long handle, lying flat. */
const pan: FurnitureModel = {
  w: 0.4,
  d: 0.2,
  draw() {
    const m = new ModelBuilder();
    const iron = m.mesh('iron');
    addCylinder(iron, -0.1, 0, 0, 0.05, 0.09, 0.1, 10, { top: false, bottom: true });
    addBox(iron, [0, 0.03, -0.015], [0.2, 0.045, 0.015]);
    return m.done();
  },
};

export default pan;
