import type { BuiltHouse } from '../../core/world3d/layout';
import { type CompiledMap, type MapSpec, compileMap } from '../../core/world3d/mapgen';
import { type RoomSet, piecesOf } from '../furnish';
import { PERSON_KINDS } from '../people';
import { THINGS } from '../things';
import { HAMLET_MAP } from './hamlet';
import { SPIKE_MAP } from './spike';
import { WILDS_MAP } from './wilds';

/** Every map in the game, by name. A new map is a new file here and a line below; `tests/maps.test.ts` checks them all. */
export const MAPS: Record<string, MapSpec> = {
  spike: SPIKE_MAP,
  hamlet: HAMLET_MAP,
  wilds: WILDS_MAP,
};

const compiled = new Map<string, CompiledMap>();

/** The kinds of furniture a house's rooms call for (the compiler checks the ones painted for one way of looking). */
export const housePieces = (b: BuiltHouse): string[] => piecesOf(b.model, (b.place.room ?? 'home') as RoomSet);

/** The compiled map (cached): ground, layout, hero start, the people, and any problems. */
export function mapNamed(name: string): CompiledMap {
  let c = compiled.get(name);
  if (!c) {
    const spec = MAPS[name];
    if (!spec) throw new Error(`no map called ${name}`);
    compiled.set(name, (c = compileMap(spec, THINGS, PERSON_KINDS, housePieces)));
  }
  return c;
}
