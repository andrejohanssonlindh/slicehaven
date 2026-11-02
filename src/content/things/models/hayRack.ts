import { ModelBuilder, addBox, addTaper, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A hay rack on the wall: a slatted slanted back stuffed with hay over a shallow manger. Lowest point y = 0. */
const W = 1.2, D = 0.4;

const hayRack: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank'), hay = m.mesh('hay');
    addBox(wood, [-W / 2, 0, -D / 2 + 0.1], [W / 2, 0.05, D / 2], { aoBottom: 0.7 }); // manger floor
    addBox(wood, [-W / 2, 0, D / 2 - 0.04], [W / 2, 0.16, D / 2]);
    addBox(wood, [-W / 2, 0, -D / 2], [-W / 2 + 0.04, 0.8, -D / 2 + 0.1]);
    addBox(wood, [W / 2 - 0.04, 0, -D / 2], [W / 2, 0.8, -D / 2 + 0.1]);
    for (let i = 0; i < 4; i++) { // slats
      const x = -W / 2 + 0.2 + i * ((W - 0.4) / 3);
      addBox(wood, [x - 0.02, 0.15, -D / 2 + 0.1], [x + 0.02, 0.8, -D / 2 + 0.14]);
    }
    addBox(wood, [-W / 2, 0.76, -D / 2], [W / 2, 0.82, -D / 2 + 0.14]);
    const h = 0.3 + vary(seed, 1) * 0.2;
    addTaper(hay, 0, -D / 2 + 0.2, 0.05, 0.05 + h, W - 0.12, 0.2, W - 0.2, 0.12, 1, 1);
    return m.done();
  },
};

export default hayRack;
