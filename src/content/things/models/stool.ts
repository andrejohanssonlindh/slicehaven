import { ModelBuilder, addCylinder, addBeam } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A three-legged stool: a round seat on three splayed legs. */
const stool: FurnitureModel = {
  w: 0.36,
  d: 0.36,
  draw() {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    addCylinder(wood, 0, 0, 0.4, 0.45, 0.17, 0.17, 8, { bottom: true });
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5;
      addBeam(wood, [Math.sin(a) * 0.15, 0.01, Math.cos(a) * 0.15], [Math.sin(a) * 0.09, 0.4, Math.cos(a) * 0.09], 0.04, [0, 1, 0]);
    }
    return m.done();
  },
};
export default stool;
