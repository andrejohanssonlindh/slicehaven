import { ModelBuilder, addBox, addTaper, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/**
 * Example 3 (wood and cloth, varied by seed): a bed, its head against the wall (the back, -z), the foot toward the
 * room. A frame of posts and rails in `plank`; the straw tick, the blanket and the pillow in `cloth` with colours.
 * The seed picks the blanket's colour, so two beds in a room differ. Soft things use `addTaper` (a little narrower at
 * the top) so they look stuffed rather than boxed.
 */
const W = 0.92, D = 1.85;

/** Blanket colours (sRGB): wool in madder, woad, undyed, moss and rust. */
const BLANKETS = [0x8a3a2e, 0x3c5070, 0x9a8a6a, 0x55663a, 0x9a5a2a];

const bed: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    const t = 0.07;
    // Posts: tall at the head, short at the foot.
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - t / 2);
      addBox(wood, [x - t / 2, 0, -D / 2], [x + t / 2, 0.78, -D / 2 + t], { aoBottom: 0.6 });
      addBox(wood, [x - t / 2, 0, D / 2 - t], [x + t / 2, 0.48, D / 2], { aoBottom: 0.6 });
      // The side rail.
      addBox(wood, [x - 0.03, 0.18, -D / 2 + t], [x + 0.03, 0.32, D / 2 - t], { aoBottom: 0.7 });
    }
    // Headboard and footboard.
    addBox(wood, [-W / 2 + t, 0.3, -D / 2 + 0.01], [W / 2 - t, 0.7, -D / 2 + 0.05]);
    addBox(wood, [-W / 2 + t, 0.22, D / 2 - 0.05], [W / 2 - t, 0.42, D / 2 - 0.01]);
    // The tick of straw, the blanket over the foot two-thirds, and the pillow.
    const tick = m.mesh('cloth', 0xc8b484);
    addTaper(tick, 0, 0, 0.3, 0.44, W - 0.12, D - 0.16, W - 0.16, D - 0.2, 0.8, 1);
    const blanket = m.mesh('cloth', BLANKETS[Math.floor(vary(seed, 1) * BLANKETS.length)]);
    addTaper(blanket, 0, 0.22, 0.34, 0.47, W - 0.08, D * 0.62, W - 0.14, D * 0.6, 0.85, 1);
    addTaper(m.mesh('cloth', 0xe0d8c4), 0, -D / 2 + 0.28, 0.43, 0.53, W * 0.62, 0.3, W * 0.55, 0.24, 0.85, 1);
    return m.done();
  },
};

export default bed;
