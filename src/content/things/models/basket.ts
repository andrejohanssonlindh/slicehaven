import { ModelBuilder, addCylinder, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A wicker basket: a wide-mouthed taper in straw colour with a rim, and a few loaves/roots in it. */
const basket: FurnitureModel = {
  w: 0.4,
  d: 0.4,
  draw(seed) {
    const m = new ModelBuilder();
    const wick = m.mesh('cloth', 0x9a7a4a);
    addCylinder(wick, 0, 0, 0, 0.28, 0.14, 0.2, 8, { top: false, bottom: true, ao0: 0.7 });
    addCylinder(m.mesh('cloth', 0x7a5a36), 0, 0, 0.26, 0.3, 0.2, 0.2, 8, { top: false });
    const goods = m.mesh('cloth', vary(seed, 1) < 0.5 ? 0xa8743a : 0x55663a);
    addCylinder(goods, 0, 0, 0.26, 0.33, 0.17, 0.15, 8);
    return m.done();
  },
};
export default basket;
