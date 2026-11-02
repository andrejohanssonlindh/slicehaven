import { ModelBuilder, addBox, addCylinder, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/**
 * Example 4 (hung on the wall, with variants): a shelf. Hung pieces sit on the back wall at the recipe's height: the
 * model's y = 0 is its lowest point, its back flat at z = -d/2. A recipe line's `variant` says what it holds (loaves,
 * jars, bolts of cloth, tankards, bottles, wares); without one it is a home's rough shelf of bowls and a jug. The seed
 * shuffles sizes and colours, so no two shelves are the same.
 */
const W = 1.1, D = 0.28;
/** Board heights: the brackets under the lowest one reach down to y = 0. */
const BOARDS = [0.16, 0.58];

type Fill = (m: ModelBuilder, x: number, y: number, seed: number, i: number) => void;

const pot = (colour: number, r: number, h: number): Fill => (m, x, y, seed, i) => {
  const s = 0.85 + vary(seed, i) * 0.3;
  addCylinder(m.mesh('cloth', colour), x, 0, y, y + h * s, r * s, r * s * 0.8, 8);
};

const FILLS: Record<string, Fill> = {
  loaves: (m, x, y, seed, i) => {
    const l = 0.16 + vary(seed, i) * 0.06;
    addBox(m.mesh('cloth', 0xa8743a), [x - l / 2, y, -0.07], [x + l / 2, y + 0.08, 0.07]);
  },
  jars: pot(0x9a6a48, 0.05, 0.15),
  bottles: (m, x, y, seed, i) => {
    const colour = vary(seed, i) < 0.5 ? 0x2e4a32 : 0x4a3424;
    addCylinder(m.mesh('cloth', colour), x, 0, y, y + 0.16, 0.035, 0.035, 6);
    addCylinder(m.mesh('cloth', colour), x, 0, y + 0.16, y + 0.24, 0.015, 0.012, 4);
  },
  bolts: (m, x, y, seed, i) => {
    const colours = [0x8a3a2e, 0x3c5070, 0xc0b494, 0x55703a, 0x9a7a26];
    addBox(m.mesh('cloth', colours[Math.floor(vary(seed, i) * colours.length)]), [x - 0.08, y, -0.09], [x + 0.08, y + 0.14, 0.09]);
  },
  tankards: (m, x, y, seed, i) => {
    addCylinder(m.mesh('plank'), x, 0, y, y + 0.12, 0.045, 0.045, 6);
    addCylinder(m.mesh('iron'), x, 0, y + 0.02, y + 0.035, 0.05, 0.05, 6, { top: false });
    void seed; void i;
  },
  wares: (m, x, y, seed, i) => (vary(seed, i + 50) < 0.5 ? pot(0x8a7a6a, 0.06, 0.1) : FILLS.bolts)(m, x, y, seed, i),
};
/** A home's shelf: bowls, and now and then a jug. */
const HOME: Fill = (m, x, y, seed, i) => (vary(seed, i + 90) < 0.3 ? pot(0x7a5a3c, 0.05, 0.2) : pot(0x8a6a4a, 0.07, 0.05))(m, x, y, seed, i);

const shelf: FurnitureModel = {
  w: W,
  d: D,
  draw(seed, variant) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    const fill = (variant && FILLS[variant]) || HOME;
    for (const [b, y] of BOARDS.entries()) {
      addBox(wood, [-W / 2, y, -D / 2], [W / 2, y + 0.035, D / 2], { aoBottom: 0.6 });
      // Brackets under each board, against the wall.
      for (const sx of [-1, 1]) addBox(wood, [sx * (W / 2 - 0.12) - 0.025, y - 0.16, -D / 2], [sx * (W / 2 - 0.12) + 0.025, y, -D / 2 + 0.14], { aoBottom: 0.7 });
      // Things on it, spaced along the board with a little jitter.
      const n = 4 + Math.floor(vary(seed, b) * 2);
      for (let i = 0; i < n; i++) {
        const x = -W / 2 + 0.12 + (i + 0.5) * ((W - 0.24) / n) + (vary(seed, 10 + b * 10 + i) - 0.5) * 0.05;
        fill(m, x, y + 0.035, seed, b * 10 + i);
      }
    }
    return m.done();
  },
};

export default shelf;
