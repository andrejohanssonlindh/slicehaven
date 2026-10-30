import type { BuiltHouse } from '../../core/world3d/layout';
import { type CompiledMap, type MapRule, type MapSpec, compileMap } from '../../core/world3d/mapgen';
import { type RoomSet, piecesOf } from '../furnish';
import { PERSON_KINDS } from '../people';
import { THINGS } from '../things';

/**
 * Every map in the game is a JSON file here (`<name>.json`, its `name` the same), found without a list to edit; and
 * every map rule is a file in `rules/` (one rule each, its `id` what maps call it). `tests/maps.test.ts` checks every
 * map compiles with no problems. (A vitest run that misses a brand-new file has a stale glob: edit this file once.)
 */
const mapFiles = import.meta.glob<{ default: MapSpec }>('./*.json', { eager: true });
const ruleFiles = import.meta.glob<{ default: MapRule }>('./rules/*.ts', { eager: true });

export const MAPS: Record<string, MapSpec> = Object.fromEntries(
  Object.entries(mapFiles).map(([path, m]) => {
    const file = path.replace(/^\.\/|\.json$/g, '');
    if (m.default.name !== file) throw new Error(`the map in ${file}.json is called ${m.default.name}: the two must match`);
    return [file, m.default];
  }),
);

export const MAP_RULES: Record<string, MapRule> = {};
for (const m of Object.values(ruleFiles)) {
  if (MAP_RULES[m.default.id]) throw new Error(`two map rules are called ${m.default.id}`);
  MAP_RULES[m.default.id] = m.default;
}

/** The kinds of furniture a house's rooms call for (the compiler checks the ones painted for one way of looking). */
export const housePieces = (b: BuiltHouse): string[] => piecesOf(b.model, (b.place.room ?? 'home') as RoomSet);

/** Compile a map against everything the game has: the kinds of thing and person, the furniture, the rules. */
export const compile = (spec: MapSpec): CompiledMap => compileMap(spec, THINGS, { persons: PERSON_KINDS, pieces: housePieces, rules: MAP_RULES });

const compiled = new Map<string, CompiledMap>();

/** The compiled map (cached): ground, layout, hero start, the people, and any problems. */
export function mapNamed(name: string): CompiledMap {
  let c = compiled.get(name);
  if (!c) {
    const spec = MAPS[name];
    if (!spec) throw new Error(`no map called ${name}`);
    compiled.set(name, (c = compile(spec)));
  }
  return c;
}
