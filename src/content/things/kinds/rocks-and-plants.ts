import { buildBoulder, buildShrub } from '../../../core/world3d/props';
import { stump } from '../../../core/world3d/propsMore';
import type { ThingDef } from '../../../core/world3d/things';
import { fromParts } from '../parts';

/** What grows and lies about outside the walls: bushes, boulders, stumps. */
const things: ThingDef[] = [
  {
    id: 'shrub',
    is: 'plant',
    look: 'A low, thick bush.',
    foot: [{ circle: 0.5 }],
    filament: { kind: 'thicket' },
    draw: (p) => ({ meshes: [], lumps: { material: 'bush', lumps: buildShrub(p.seed) } }),
  },
  {
    id: 'boulder',
    is: 'rock',
    look: 'A boulder, half sunk in the ground.',
    foot: [{ circle: 0.75 }],
    keepClear: 0.8,
    blocksSight: true,
    filament: { kind: 'rock' },
    draw: (p) => ({ meshes: [], lumps: { material: 'stone', lumps: buildBoulder(p.seed) } }),
  },
  {
    id: 'stump',
    is: 'plant',
    look: 'The stump of a felled tree.',
    foot: [{ circle: 0.3 }],
    draw: (p) => fromParts(stump(p.seed), 'bark'),
  },
];

export default things;
