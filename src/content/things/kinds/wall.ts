import { palisade, stonewall } from '../../../core/world3d/propsMore';
import type { ThingDef } from '../../../core/world3d/things';
import { fromParts } from '../parts';

/** Walls: they stop the eye as well as the feet. A wall is a run, as long as the map says (`len`). */
const walls: ThingDef[] = [
  { id: 'wall', is: 'structure', abstract: true, blocksSight: true, len: 4 },
  {
    id: 'palisade',
    is: 'wall',
    look: 'A palisade of sharpened stakes, lashed together.',
    foot: [{ run: 0.2 }],
    draw: (p) => fromParts(palisade(p.len, p.seed)),
  },
  {
    id: 'stonewall',
    is: 'wall',
    look: 'A wall of fieldstone, laid dry.',
    foot: [{ run: 0.3 }],
    draw: (p) => fromParts(stonewall(p.len, p.seed)),
  },
];

export default walls;
