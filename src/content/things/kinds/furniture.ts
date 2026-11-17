import type { Size } from '../../../core/world3d/carry';
import type { SourceKind } from '../../../core/world3d/filaments3d';
import type { ShapeDef } from '../../../core/world3d/inventory';
import type { ThingDef } from '../../../core/world3d/things';
import type { Material } from '../../../core/world3d/effects';
import { MODELS } from '../models';

/**
 * What stands in a room: the pieces the room recipes (`content/furnish.ts`) call for. Each is a kind of thing like
 * the outdoor ones; how it sits in a room (`furniture`) is what the room solver reads, and its 3D model is the file
 * of the same name in `things/models/` (its footprint comes from there). A recipe names a kind and a rule ("against
 * the back wall"); it never says what the kind is. A new piece: a line here and a model file.
 */

type Mount = 'floor' | 'hung' | 'flat';

interface Piece {
  is: string;
  look: string;
  mount: Mount;
  gives?: { kind: SourceKind; weight: number };
}

const floor = (is: string, look: string, gives?: Piece['gives']): Piece => ({ is, look, mount: 'floor', gives });
const hung = (look: string, gives?: Piece['gives']): Piece => ({ is: 'furniture', look, mount: 'hung', gives });
const flat = (look: string, gives?: Piece['gives']): Piece => ({ is: 'furniture', look, mount: 'flat', gives });
const F = 'furniture';

/** Every piece, by the id of its kind. (The stable's horse comes back as a kind of creature, plan item C3.) */
const PIECES: Record<string, Piece> = {
  hearth: floor('fire', 'A cooking hearth of stones, with a pot.'),
  oven: floor('fire', 'A domed oven of clay and brick.'),
  pallet: floor(F, 'A straw pallet to sleep on.'),
  footlocker: floor('container', 'A footlocker bound with iron.'),
  table: floor(F, 'A plain trestle table.'),
  stool: floor(F, 'A three-legged stool.'),
  broom: floor(F, 'A broom of birch twigs.'),
  bucket: floor('container', 'A wooden bucket of water.'),
  keg: floor('container', 'A small keg.'),
  sacks: floor('container', 'Sacks of grain.'),
  basket: floor('container', 'A wicker basket.'),
  kindling: floor(F, 'A pile of kindling.'),
  kneadtrough: floor(F, 'A trough for kneading dough.'),
  loom: floor(F, 'A weaver’s loom, half-woven.', { kind: 'art', weight: 1 }),
  mortarBench: floor(F, 'A bench with mortar and pestle.'),
  longTable: floor(F, 'A long table for many.'),
  innbench: floor(F, 'A bench for the common room.'),
  aleKegs: floor('container', 'Kegs of ale on a rack.'),
  cratestack: floor('container', 'A stack of crates.'),
  fishRack: floor(F, 'A rack of drying fish.'),
  fishTubs: floor(F, 'Tubs of fish in water.', { kind: 'water', weight: 0.5 }),
  nets: floor(F, 'A heap of nets.'),
  counter: floor(F, 'A shop counter.'),
  shelf: hung('A rough shelf on the wall.'),
  pegs: hung('Pegs for cloaks.'),
  hanging: hung('A hanging cloth, woven with a pattern.', { kind: 'art', weight: 0.7 }),
  hooks: hung('Hooks in the wall.'),
  herbs: hung('Bundles of herbs hung to dry.'),
  hungNet: hung('A net hung on the wall.'),
  rug: flat('A rag rug.', { kind: 'art', weight: 0.5 }),
  straw: flat('Straw on the floor.'),
  litter: flat('Odds and ends on the floor.'),
  bed: floor(F, 'A bed with a frame, a tick and a blanket.'),
  haybale: floor(F, 'A bale of hay.'),
  hayRack: hung('A hay rack.'),
  forge: floor('fire', 'A smith’s forge, its coals glowing.'),
  anvil: floor('tool', 'An anvil on a stump.'),
  quenchtub: floor('container', 'A tub of water for quenching hot iron.'),
  workbench: floor(F, 'A smith’s workbench.'),
  coalbin: floor('container', 'A bin of charcoal.'),
  toolrack: hung('A rack of tongs and hammers.'),
};

/** What can be sat on, and how high its seat is (metres): the verb `sit` (`content/actions/verbs/sit.ts`) is for these. */
const SEATS: Record<string, number> = { stool: 0.45, innbench: 0.45, bed: 0.5 };

/**
 * What can be taken (plan B3b, `core/world3d/carry.ts`): how big it is, what it weighs (kg, B6: a full keg, a sack of
 * grain), and what it is worth, in coins (a first guess until prices come with B6). A piece not listed is part of the room (a hearth, a shelf, the pegs) and stays put.
 * Heavy pieces can be tried, and are too heavy to carry alone.
 */
const TAKE: Record<string, { size: Size; weight: number; value?: number; importance?: number; shape?: ShapeDef }> = {
  stool: { size: 'hands', weight: 3, value: 2 },
  broom: { size: 'hands', weight: 1, value: 1 },
  bucket: { size: 'hands', weight: 8, value: 1 },
  keg: { size: 'hands', weight: 16, value: 6 },
  sacks: { size: 'hands', weight: 20, value: 4 },
  basket: { size: 'bag', weight: 1, value: 1, shape: [3, 3] },
  kindling: { size: 'hands', weight: 4, value: 0.5 },
  pallet: { size: 'hands', weight: 5, value: 1 },
  footlocker: { size: 'hands', weight: 12, value: 8 },
  nets: { size: 'hands', weight: 5, value: 3 },
  haybale: { size: 'hands', weight: 15, value: 1 },
  herbs: { size: 'pocket', weight: 0.2, value: 1, shape: [1, 2] },
  table: { size: 'heavy', weight: 30, value: 6 },
  longTable: { size: 'heavy', weight: 60, value: 10 },
  innbench: { size: 'heavy', weight: 25, value: 5 },
  bed: { size: 'heavy', weight: 40, value: 12 },
  anvil: { size: 'heavy', weight: 80, value: 40, importance: 1 },
  loom: { size: 'heavy', weight: 50, value: 25, importance: 1 },
  workbench: { size: 'heavy', weight: 50, value: 8 },
  counter: { size: 'heavy', weight: 70, value: 8 },
  aleKegs: { size: 'heavy', weight: 100, value: 20 },
  cratestack: { size: 'heavy', weight: 60, value: 6 },
};

/**
 * What each piece is made of, as fire sees it (plan B7, the rules' burning materials): straw catches at 2, cloth and
 * twigs at 6, wood at 10, wool at 14. Not listed (a hearth, the anvil, the forge, a tub of water): it doesn't burn.
 */
const MATERIAL: Record<string, Material> = {
  pallet: 'straw', straw: 'straw', haybale: 'straw', herbs: 'straw', litter: 'straw', hayRack: 'wood',
  table: 'wood', stool: 'wood', longTable: 'wood', innbench: 'wood', bed: 'wood', footlocker: 'wood', keg: 'wood',
  aleKegs: 'wood', cratestack: 'wood', counter: 'wood', shelf: 'wood', pegs: 'wood', kneadtrough: 'wood',
  mortarBench: 'wood', loom: 'wood', workbench: 'wood', fishRack: 'wood', toolrack: 'wood', bucket: 'wood',
  broom: 'cloth', kindling: 'cloth', basket: 'cloth', sacks: 'cloth', nets: 'cloth', hungNet: 'cloth', hanging: 'cloth',
  rug: 'wool', coalbin: 'wood',
};

/**
 * How hard a standing piece is to smash (plan B7, the director's wall of stools): its material's own, and a point for
 * every 4 kg. A stool about 11, a table 17, a bed 20, a straw pallet 5. Hung and flat pieces aren't smashed.
 */
const TOUGH: Record<Material, number> = { straw: 4, cloth: 6, wood: 10, wool: 8, leather: 12 };
const toughnessOf = (id: string, mount: Mount): number | undefined =>
  mount === 'floor' && MATERIAL[id] ? TOUGH[MATERIAL[id]] + Math.round((TAKE[id]?.weight ?? 10) / 4) : undefined;

/** What brings water against a fire when carried, in dice (the rules: a big bucket +3D6). */
const DOUSES: Record<string, number> = { bucket: 3 };

/** The family every piece of furniture is a kind of: an item in a room. */
const family: ThingDef = { id: 'furniture', is: 'item', abstract: true };

export default [
  family,
  ...Object.entries(PIECES).map(([id, p]): ThingDef => {
    const model = MODELS[id];
    if (!model) throw new Error(`furniture ${id} has no model in content/things/models/${id}.ts`);
    return {
      id, is: p.is, look: p.look, furniture: { mount: p.mount, model }, ...(p.gives ? { filament: p.gives } : {}), ...(SEATS[id] ? { seat: SEATS[id] } : {}), ...TAKE[id],
      ...(MATERIAL[id] ? { material: MATERIAL[id] } : {}), ...(DOUSES[id] ? { douses: DOUSES[id] } : {}),
      ...(toughnessOf(id, p.mount) ? { toughness: toughnessOf(id, p.mount) } : {}),
    };
  }),
] satisfies ThingDef[];
