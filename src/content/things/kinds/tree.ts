import type { ThingDef } from '../../../core/world3d/things';
import { buildTree } from '../../../core/world3d/tree';

/**
 * Trees: the family, and the kinds a map can place. What they share (a trunk that stops feet and the eye, the life it
 * gives off, a crown that sheds in the wind) is said once on `tree`; each kind says only how it differs.
 */
const trees: ThingDef[] = [
  {
    id: 'tree',
    is: 'plant',
    abstract: true,
    foot: [{ circle: 0.5 }],
    blocksSight: true,
    filament: { kind: 'tree' },
    tree: { model: (seed) => buildTree(seed, 7, 'oak'), crown: { y: 5.2, r: 2 } },
  },
  { id: 'oak', is: 'tree', look: 'A broad old oak.' },
  {
    id: 'young',
    is: 'oak',
    look: 'A young tree, not much taller than a man.',
    tree: { model: (seed) => buildTree(seed, 7, 'young'), crown: { y: 2.6, r: 1 } },
  },
  {
    id: 'pine',
    is: 'tree',
    look: 'A tall pine, dark and resinous.',
    filament: { kind: 'pine' },
    // Needles hold through the wind; the crown is darker and bluer than a broadleaf's.
    tree: { model: (seed) => buildTree(seed, 7, 'pine'), crown: null, leafTint: 0x7fa596 },
  },
  {
    id: 'dead',
    is: 'tree',
    look: 'A dead tree, grey and bare.',
    tree: { model: (seed) => buildTree(seed, 7, 'dead'), crown: null },
  },
];

export default trees;
