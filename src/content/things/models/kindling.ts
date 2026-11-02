import { ModelBuilder, addBox, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A pile of kindling: sticks laid crosswise in a few layers, with a few split logs underneath. */
const kindling: FurnitureModel = {
  w: 0.5,
  d: 0.4,
  draw(seed) {
    const m = new ModelBuilder();
    const bark = m.mesh('bark'), wood = m.mesh('plank');
    for (let i = 0; i < 3; i++) addBox(bark, [-0.22, 0.02 + 0.07 * 0, -0.15 + i * 0.12], [0.22, 0.09, -0.08 + i * 0.12], { aoBottom: 0.6 });
    for (let i = 0; i < 3; i++) addBox(wood, [-0.12 + i * 0.1, 0.09, -0.18], [-0.07 + i * 0.1, 0.14, 0.18]);
    for (let i = 0; i < 2; i++) addBox(bark, [-0.2, 0.14, -0.08 + i * 0.14 + vary(seed, i) * 0.03], [0.2, 0.19, -0.03 + i * 0.14 + vary(seed, i) * 0.03]);
    addBox(wood, [-0.1, 0.19, -0.1], [0.1, 0.23, -0.06]);
    return m.done();
  },
};
export default kindling;
