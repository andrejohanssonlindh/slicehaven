import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../src/content/skillweb';
import { KIND_PARENTS } from '../src/content/skillweb/kinds';
import { THINGS } from '../src/content/things';
import { MAPS } from '../src/content/maps';
import { kindChain } from '../src/core/skillweb';
import { compileMap } from '../src/core/world3d/mapgen';
import { Things } from '../src/core/world3d/things';

/** Kinds of thing (`content/things/kinds/`): what everything in the world is, inherited down a tree. */

const at = (kind: string, extra: object = {}) => ({ kind, x: 2, z: 3, seed: 4, ...extra });

describe('kinds of thing', () => {
  it('inherit what they do not say: a young tree is an oak is a tree', () => {
    const young = THINGS.get('young');
    expect(young.chain).toEqual(['young', 'oak', 'tree', 'plant']);
    expect(young.blocksSight).toBe(true); // from tree
    expect(young.filament).toEqual({ kind: 'tree' }); // from tree
    expect(young.tree?.crown).toEqual({ y: 2.6, r: 1 }); // its own
    expect(THINGS.shapes(at('young'))).toEqual(THINGS.shapes(at('oak')));
  });

  it('say only how they differ: a pine is a tree, but its own filament and a crown that holds', () => {
    const pine = THINGS.get('pine');
    expect(pine.filament).toEqual({ kind: 'pine' });
    expect(pine.tree?.crown).toBeNull();
    expect(pine.blocksSight).toBe(true);
  });

  it('a family says a thing once for all of it: every wall stops the eye', () => {
    for (const id of THINGS.placeable.filter((k) => THINGS.get(k).chain.includes('wall'))) expect(THINGS.get(id).blocksSight, id).toBe(true);
    expect(THINGS.placeable).not.toContain('wall');
    expect(THINGS.placeable).not.toContain('tree');
  });

  it("every kind's chain ends in a kind of the skill library, and the two trees agree", () => {
    for (const id of THINGS.placeable) {
      const chain = THINGS.get(id).chain;
      expect(KIND_PARENTS, `${id} > ${chain.join(' > ')}`).toHaveProperty(chain[chain.length - 1]);
    }
    for (const [id, parent] of Object.entries(THINGS.parents)) if (id in KIND_PARENTS) expect(KIND_PARENTS[id], id).toBe(parent);
  });

  it('the skill hooks see them: a well is water, a gate a door, a barrel a container', () => {
    expect(kindChain('well', LIBRARY.parents)).toEqual(['well', 'water', 'feature', 'thing']);
    expect(kindChain('gate', LIBRARY.parents)).toContain('door');
    expect(kindChain('barrel', LIBRARY.parents)).toContain('container');
    expect(kindChain('palisade', LIBRARY.parents)).toEqual(['palisade', 'wall', 'structure', 'feature', 'thing']);
  });

  it('every kind that can be placed has a look and something to say when looked at', () => {
    for (const id of THINGS.placeable) {
      const t = THINGS.get(id);
      expect(!!(t.draw || t.tree), id).toBe(true);
      expect(t.look, id).toBeTruthy();
    }
  });

  it('every kind the maps place is a kind of thing', () => {
    for (const [name, spec] of Object.entries(MAPS)) {
      for (const p of spec.props ?? []) expect(THINGS.has(p.kind), `${name}: ${p.kind}`).toBe(true);
      for (const t of spec.trees ?? []) expect(THINGS.has(t.kind ?? 'oak'), name).toBe(true);
    }
  });

  it('a map that places a kind nobody defined (or a family) is told so', () => {
    const c = compileMap({ name: 't', seed: 1, size: 60, roads: [], houses: [], props: [at('dragon-egg'), at('wall')], hero: [0, 0] }, THINGS);
    expect(c.problems).toContain('prop: no kind of thing called dragon-egg');
    expect(c.problems).toContain('prop: no kind of thing called wall that can be placed');
    expect(c.layout.props).toEqual([]);
  });

  it('a loop or two kinds with one name is caught when the kinds are made', () => {
    expect(() => new Things([{ id: 'a', is: 'b' }, { id: 'b', is: 'a' }])).toThrow(/loop/);
    expect(() => new Things([{ id: 'a', is: 'thing' }, { id: 'a', is: 'thing' }])).toThrow(/two kinds/);
  });

  it('a torch post is a fire: a post to walk round, a small fire to the field, a flame to the renderer', () => {
    expect(kindChain('torchpost', LIBRARY.parents)).toEqual(['torchpost', 'fire', 'feature', 'thing']);
    expect(THINGS.get('torchpost').flame?.y).toBeGreaterThan(1);
    expect(THINGS.shapes(at('torchpost'))).toHaveLength(1);
    expect(THINGS.source(at('torchpost'))).toMatchObject({ kind: 'fire' });
  });

  it('a run takes its length from the placement, else its kind', () => {
    const [short] = THINGS.shapes(at('fence', { len: 2 }));
    const [dflt] = THINGS.shapes(at('fence'));
    expect(short.kind === 'box' && short.hw).toBeCloseTo(1);
    expect(dflt.kind === 'box' && dflt.hw).toBeCloseTo(2);
  });
});
