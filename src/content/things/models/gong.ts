import { ModelBuilder, addBox } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A gong: a bronze disc (drawn as a stepped square) hung in a wooden frame, 1.2 m wide, 1.8 m tall. */
const W = 1.2, D = 0.4;

export default {
  w: W,
  d: D,
  draw() {
    const m = new ModelBuilder();
    const wood = m.mesh('plank'), bronze = m.mesh('iron', 0xb08838);
    for (const x of [-W / 2, W / 2 - 0.09]) {
      addBox(wood, [x, 0, -0.06], [x + 0.09, 1.8, 0.06]);
      addBox(wood, [x, 0, -D / 2], [x + 0.09, 0.08, D / 2]);
    }
    addBox(wood, [-W / 2, 1.72, -0.07], [W / 2, 1.84, 0.07]);
    // The disc, in three steps to look round from afar; its boss in the middle.
    const c = 1.05;
    for (const [r, t] of [[0.42, 0.02], [0.36, 0.035], [0.26, 0.045]] as const) addBox(bronze, [-r, c - r * 0.95, -t], [r, c + r * 0.95, t]);
    addBox(bronze, [-0.07, c - 0.07, -0.06], [0.07, c + 0.07, 0.06]);
    // Its cords.
    for (const x of [-0.25, 0.25]) addBox(wood, [x - 0.01, c + 0.38, -0.01], [x + 0.01, 1.72, 0.01]);
    return m.done();
  },
} satisfies FurnitureModel;
