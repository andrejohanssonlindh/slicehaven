import { buildCart, buildFence, buildLaundry, buildWoodpile } from '../../../core/world3d/props';
import { bench, hay } from '../../../core/world3d/propsMore';
import type { ThingDef } from '../../../core/world3d/things';
import { fromParts, solid } from '../parts';

/** What stands about a farmyard or a lane: woodpiles, carts, fences, washing, hay, benches. */
const things: ThingDef[] = [
  {
    id: 'woodpile',
    is: 'structure',
    look: 'Split logs stacked to dry.',
    foot: [{ box: [0.9, 0.55] }],
    keepClear: 1,
    sink: 0.02,
    draw: (p) => solid('bark', buildWoodpile(p.seed)),
  },
  {
    id: 'cart',
    is: 'structure',
    look: 'A two-wheeled cart.',
    foot: [{ box: [0.8, 0.55] }],
    draw: (p) => solid('bark', buildCart(p.seed)),
  },
  {
    id: 'fence',
    is: 'structure',
    look: 'A post-and-rail fence.',
    len: 4,
    foot: [{ run: 0.1 }],
    draw: (p) => solid('bark', buildFence(p.len, p.seed)),
  },
  {
    id: 'laundry',
    is: 'structure',
    look: 'Washing hung out on a line.',
    len: 3,
    foot: [{ run: 0.1 }],
    draw: (p) => {
      const l = buildLaundry(p.len, p.seed);
      // The cloth swings from the line.
      return { meshes: [{ material: 'bark', mesh: l.wood }, ...l.cloths.map((c) => ({ material: 'clothHang' as const, mesh: c.mesh, colour: c.colour }))] };
    },
  },
  {
    id: 'hay',
    is: 'item',
    look: 'A bale of hay.',
    foot: [{ box: [0.95, 0.34] }],
    draw: (p) => fromParts(hay(p.seed)),
  },
  {
    id: 'bench',
    is: 'structure',
    look: 'A plank bench.',
    foot: [{ box: [0.75, 0.18] }],
    draw: () => fromParts(bench()),
  },
];

export default things;
