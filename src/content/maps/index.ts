import { type CompiledMap, type MapSpec, compileMap } from '../../core/world3d/mapgen';
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

/** The compiled map (cached): ground, layout, hero start, the people, and any problems. */
export function mapNamed(name: string): CompiledMap {
  let c = compiled.get(name);
  if (!c) {
    const spec = MAPS[name];
    if (!spec) throw new Error(`no map called ${name}`);
    compiled.set(name, (c = compileMap(spec, THINGS, PERSON_KINDS)));
  }
  return c;
}
