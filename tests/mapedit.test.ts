import { describe, expect, it } from 'vitest';
import { MAPS, compile } from '../src/content/maps';
import { applyEdit, mapToJson, pickAt, whereIs } from '../src/core/world3d/mapedit';

describe('map maker edits (plan C5)', () => {
  const arena = MAPS.arena;

  it('adds a thing, moves it, turns it and removes it, leaving the old map as it was', () => {
    const a = applyEdit(arena, { do: 'add-prop', kind: 'barrel', at: [3.04, -2.96] });
    const i = a.props!.length - 1;
    expect(a.props![i]).toMatchObject({ kind: 'barrel', x: 3, z: -3 });
    expect(arena.props!.length).toBe(a.props!.length - 1);
    const b = applyEdit(a, { do: 'move', pick: { list: 'props', i }, to: [1, 1] });
    expect(whereIs(b, { list: 'props', i })).toEqual([1, 1]);
    const c = applyEdit(b, { do: 'turn', pick: { list: 'props', i }, by: Math.PI / 2 });
    expect(c.props![i].rot).toBeCloseTo(1.57, 2);
    const d = applyEdit(c, { do: 'remove', pick: { list: 'props', i } });
    expect(d.props!.length).toBe(arena.props!.length);
    expect(compile(d).problems).toEqual([]);
  });

  it('pins notes to the map; they compile without problems and are picked first', () => {
    const a = applyEdit(arena, { do: 'add-note', at: [-11, 1.4], text: 'More weapons here', r: 3 });
    const b = applyEdit(a, { do: 'add-note', at: [5, 5], text: 'A second', by: 'claude' });
    expect(b.notes!.map((n) => n.id)).toEqual(['n1', 'n2']);
    expect(b.notes![1].by).toBe('claude');
    const c = compile(b);
    expect(c.problems).toEqual([]);
    // The note sits on the arming sword: the note wins.
    expect(pickAt(b, c, [-11, 1.4], 1)).toEqual({ list: 'notes', i: 0 });
    const d = applyEdit(b, { do: 'note', pick: { list: 'notes', i: 0 }, done: true, text: 'Done: three more' });
    expect(d.notes![0]).toMatchObject({ done: true, text: 'Done: three more' });
  });

  it('reports a note without text, and a key nothing reads', () => {
    const bad = { ...arena, notes: [{ id: 'x', at: [0, 0], colour: 'red' }] } as unknown as typeof arena;
    const p = compile(bad).problems.join('\n');
    expect(p).toContain('note x: unknown key "colour"');
    expect(p).toContain('needs a spot');
  });

  it('pins a house placed along a road to where it stood when it is moved', () => {
    const hamlet = MAPS.hamlet;
    const built = compile(hamlet);
    const i = hamlet.houses!.findIndex((h) => h.id === 'weaver');
    const was = whereIs(hamlet, { list: 'houses', i }, built)!;
    expect(pickAt(hamlet, built, was, 1)).toEqual({ list: 'houses', i });
    const moved = applyEdit(hamlet, { do: 'move', pick: { list: 'houses', i }, to: [was[0] + 2, was[1] - 3] }, built);
    expect(moved.houses![i].at).toMatchObject({ x: Number((was[0] + 2).toFixed(1)) });
    expect('road' in moved.houses![i].at).toBe(false);
  });

  it('writes a map back as a file that reads the same, one entry a line', () => {
    for (const spec of Object.values(MAPS)) {
      const text = mapToJson(spec);
      expect(JSON.parse(text)).toEqual(spec);
    }
    const lines = mapToJson(arena).split('\n');
    expect(lines.filter((l) => l.includes('"kind": "lowwall"')).length).toBe(2);
  });
});
