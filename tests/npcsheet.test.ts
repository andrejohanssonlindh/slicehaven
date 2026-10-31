import { describe, expect, it } from 'vitest';
import { LEVEL_SPAN, PERSON_LEVELS, SHEET_ATTRS, mergeSheets, rollSheet, sheetSpan, skillLevel, unitsDice } from '../src/core/npcsheet';
import { SKILL_BY_ID } from '../src/content/chargen/skills';
import { ARMOUR, SHIELDS, WEAPONS } from '../src/content/chargen/equipment';
import { FACETS, PERSON_KINDS } from '../src/content/people';
import { ARCHETYPE_SHEETS, BASE_SHEETS, GROUP_ARCHETYPE } from '../src/content/people/sheets';

/** Character sheets for kinds of person (`core/npcsheet.ts`, data in `content/people`). */

describe('levels', () => {
  it('the five levels follow on from each other with no gaps: novice 2D6–3D6 up to master 5D6+1–6D6', () => {
    expect(LEVEL_SPAN.novice).toEqual([8, 12]);
    expect(unitsDice(13)).toEqual({ n: 3, mod: 1 });
    expect(unitsDice(24)).toEqual({ n: 6, mod: 0 });
    for (let i = 1; i < PERSON_LEVELS.length; i++) expect(LEVEL_SPAN[PERSON_LEVELS[i]][0]).toBe(LEVEL_SPAN[PERSON_LEVELS[i - 1]][1] + 1);
  });

  it('main skills sit at the level, side skills a step below, never under novice', () => {
    expect(skillLevel('main', 'skilled')).toBe('skilled');
    expect(skillLevel('side', 'skilled')).toBe('capable');
    expect(skillLevel('side', 'novice')).toBe('novice');
  });
});

describe('merging down a chain', () => {
  it('the stronger lean wins, attribute shifts add up, the most specific baseline and gear win', () => {
    const m = mergeSheets([
      { attrs: { Kroppsbyggnad: 16 }, skills: { Svärd: 'side', Speja: 'side' }, gear: { weapon: ['Kniv'], armour: ['Ringbrynja'] }, knacks: ['Marsch', 'Speja'] },
      { attrShift: { Kroppsbyggnad: 2 } },
      { attrShift: { Kroppsbyggnad: 1 }, skills: { Svärd: 'main' }, gear: { weapon: ['Stridssvärd'], armour: [] } },
      { skills: { Svärd: 'side' } },
    ]);
    expect(m.attrs.Kroppsbyggnad).toBe(19);
    expect(m.attrs.Intryck).toBe(12);
    expect(m.skills).toEqual({ Svärd: 'main', Speja: 'side' });
    expect(m.gear).toEqual({ weapon: ['Stridssvärd'] });
    // A knack the kind already has is not a knack.
    expect(m.knacks).toEqual(['Marsch']);
  });
});

describe('rolling a person', () => {
  const guard = () => sheetSpan(PERSON_KINDS.sheet({ is: ['human', 'guard-sword'] }), 'capable');

  it('lands every value in its span, the same seed the same person, another seed another', () => {
    const s = guard();
    for (let seed = 1; seed < 60; seed++) {
      const p = rollSheet(s, seed);
      for (const a of SHEET_ATTRS) {
        expect(p.attrs[a]).toBeGreaterThanOrEqual(s.attrs[a][0]);
        expect(p.attrs[a]).toBeLessThanOrEqual(s.attrs[a][1]);
      }
      for (const k of s.skills) {
        expect(p.skills[k.id], k.id).toBeGreaterThanOrEqual(k.span[0]);
        expect(p.skills[k.id], k.id).toBeLessThanOrEqual(k.span[1]);
      }
      expect(p.knacks).toHaveLength(s.knacks.count);
      for (const [slot, thing] of Object.entries(p.gear)) expect(s.gear[slot]).toContain(thing);
      expect(JSON.parse(JSON.stringify(p))).toEqual(p);
    }
    expect(rollSheet(s, 5)).toEqual(rollSheet(s, 5));
    expect(rollSheet(s, 5)).not.toEqual(rollSheet(s, 6));
  });

  it('a capable guard with a sword: sword main at 3D6+1–4D6+1, the guard’s own skills main, the warrior’s attributes', () => {
    const s = guard();
    const sword = s.skills.find((k) => k.id === 'Svärd')!;
    expect(sword).toMatchObject({ lean: 'main', level: 'capable', span: [13, 17] });
    for (const id of ['Genomsöka', 'Speja']) expect(s.skills.find((k) => k.id === id)?.lean, id).toBe('main');
    expect(s.attrs.Kroppsbyggnad).toEqual([15, 17]);
    expect(s.gear.weapon.length).toBeGreaterThan(0);
  });

  it('the level moves attributes a little, skills a lot', () => {
    const sheet = PERSON_KINDS.sheet({ is: ['guard-sword'] });
    const novice = sheetSpan(sheet, 'novice'), master = sheetSpan(sheet, 'master');
    expect(master.attrs.Kroppsbyggnad[0] - novice.attrs.Kroppsbyggnad[0]).toBe(4);
    const sw = (s: typeof novice) => s.skills.find((k) => k.id === 'Svärd')!.span;
    expect(sw(master)[0] - sw(novice)[0]).toBe(13);
  });

  it('a tirak guard differs from a human one: the tirak build, and the tirak’s own gifts as side skills', () => {
    const h = PERSON_KINDS.sheet({ is: ['human', 'job-guard'] }), tk = PERSON_KINDS.sheet({ is: ['tirak', 'job-guard'] });
    expect(tk.attrs.Kroppsbyggnad).toBeGreaterThan(h.attrs.Kroppsbyggnad);
    expect(Object.keys(tk.skills).length).toBeGreaterThan(Object.keys(h.skills).length);
  });
});

describe('the data', () => {
  const known = (id: string) => SKILL_BY_ID.has(id) || /^[EFHK]:/.test(id);
  const gearKnown = (sv: string) => WEAPONS.some((w) => w.sv === sv) || SHIELDS.some((s) => s.sv === sv) || ARMOUR.some((a) => a.sv === sv);

  it('every group of callings has an archetype, and every archetype is one of the book’s eight', () => {
    for (const f of Object.values(FACETS).filter((x) => x.dim === 'station' && x.parent === 'station')) expect(GROUP_ARCHETYPE[f.id], f.id).toBeTruthy();
    expect(Object.keys(ARCHETYPE_SHEETS)).toHaveLength(8);
  });

  it('every calling and every people starts with a sheet, and each skill and piece of gear named is one the game has', () => {
    for (const f of Object.values(FACETS).filter((x) => x.id.startsWith('job-') || x.dim === 'people')) expect(BASE_SHEETS[f.id], f.id).toBeTruthy();
    const sheets = [...Object.values(BASE_SHEETS), ...PERSON_KINDS.kinds.map((k) => PERSON_KINDS.def(k)?.sheet)];
    for (const s of sheets) {
      for (const id of [...Object.keys(s?.skills ?? {}), ...(s?.knacks ?? [])]) expect(known(id), id).toBe(true);
      for (const choices of Object.values(s?.gear ?? {})) for (const g of choices) expect(gearKnown(g), g).toBe(true);
    }
  });

  it('most callings name a main skill of their own', () => {
    const jobs = Object.keys(BASE_SHEETS).filter((k) => k.startsWith('job-'));
    const withSkills = jobs.filter((k) => Object.keys(BASE_SHEETS[k].skills ?? {}).length > 0);
    expect(withSkills.length / jobs.length).toBeGreaterThan(0.9);
  });
});
