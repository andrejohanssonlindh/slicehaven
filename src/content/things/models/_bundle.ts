import { ModelBuilder, addBox } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/**
 * A bundle of gear (an equipment package, plan B6): a bag, case or roll of a size and colour, with a strap or a lid.
 * Not a kind's own file (the underscore keeps it out of the folder's list): `kinds/kits.ts` builds one per package.
 */
export function bundle(w: number, d: number, h: number, colour: number, trim = 0x3e2a18): FurnitureModel {
  return {
    w,
    d,
    draw() {
      const m = new ModelBuilder();
      addBox(m.mesh('cloth', colour), [-w / 2, 0, -d / 2], [w / 2, h, d / 2], { aoBottom: 0.7 });
      addBox(m.mesh('cloth', trim), [-w / 2 - 0.005, h * 0.75, -d / 2 - 0.005], [w / 2 + 0.005, h + 0.01, d / 2 + 0.005]);
      addBox(m.mesh('cloth', trim), [-0.015, 0.02, d / 2], [0.015, h * 0.75, d / 2 + 0.01]);
      return m.done();
    },
  };
}
