import { ModelBuilder, addBox } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A weapon rack: two posts, two rails, and blades and hafts standing in it. 1.8 m long, 0.5 m deep, 1.6 m tall. */
const W = 1.8, D = 0.5;

export default {
  w: W,
  d: D,
  draw() {
    const m = new ModelBuilder();
    const wood = m.mesh('plank'), steel = m.mesh('iron', 0xb4b8bc), haft = m.mesh('bark');
    for (const x of [-W / 2, W / 2 - 0.08]) addBox(wood, [x, 0, -0.06], [x + 0.08, 1.6, 0.06]);
    addBox(wood, [-W / 2, 0.15, -D / 2], [W / 2, 0.22, D / 2]);
    addBox(wood, [-W / 2, 1.25, -0.05], [W / 2, 1.32, 0.05]);
    // Blades and hafts standing in it, leaning on the upper rail.
    const items: [x: number, h: number, steelTop: boolean][] = [[-0.65, 1.1, true], [-0.4, 1.5, false], [-0.15, 0.95, true], [0.1, 1.7, true], [0.35, 1.0, false], [0.6, 1.25, true]];
    for (const [x, h, top] of items) {
      addBox(haft, [x - 0.015, 0.2, -0.015], [x + 0.015, top ? 0.4 : h - 0.15, 0.015]);
      if (top) addBox(steel, [x - 0.022, 0.4, -0.006], [x + 0.022, h, 0.006]);
      else addBox(steel, [x - 0.05, h - 0.18, -0.02], [x + 0.05, h, 0.02]);
    }
    return m.done();
  },
} satisfies FurnitureModel;
