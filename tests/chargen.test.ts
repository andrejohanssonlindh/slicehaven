import { describe, expect, it } from 'vitest';
import { derive } from '../src/core/chargen/derive';
import { parseGrants, tokenSkills, type Token } from '../src/core/chargen/grants';
import { newChar, roll } from '../src/core/chargen/state';
import { attrDice, baseArmour, baseDamage, diceText, skillDice, wisdomRow } from '../src/core/chargen/tables';
import { CONTENT } from '../src/content/chargen';
import { SKILL_BY_ID } from '../src/content/chargen/skills';

/** Every grant line in the content, with where it came from. */
function allGrants(): { where: string; g: string }[] {
  const out: { where: string; g: string }[] = [];
  const opts = (where: string, list: { id: string; g: string }[]) => list.forEach((o) => out.push({ where: `${where}/${o.id}`, g: o.g }));
  for (const b of CONTENT.backgrounds) b.opts.forEach((g, i) => out.push({ where: `bg ${b.n}.${i}`, g }));
  for (const f of Object.values(CONTENT.families)) {
    opts(`family ${f.id}`, [...f.innate, ...f.culture]);
    f.picks.forEach((pg) => opts(`family ${f.id} ${pg.id}`, pg.options));
  }
  for (const p of CONTENT.peoples) {
    opts(`people ${p.id}`, [...p.innate, ...p.culture]);
    p.picks.forEach((pg) => opts(`people ${p.id} ${pg.id}`, pg.options));
  }
  for (const r of CONTENT.religions) r.doctrines.forEach((d, i) => opts(`religion ${r.id} ${i}`, d.options));
  for (const a of CONTENT.archetypes) {
    out.push({ where: `arch ${a.id}`, g: a.g });
    opts(`arch ${a.id}`, a.extras.options);
  }
  for (const e of CONTENT.environments) {
    out.push({ where: `env ${e.id}`, g: e.g });
    opts(`env ${e.id}`, e.extras.options);
  }
  for (const l of CONTENT.living) out.push({ where: `living ${l.id}`, g: l.g });
  for (const t of Object.values(CONTENT.tables)) t?.entries.forEach((e) => out.push({ where: `${t.id} ${e.lo}`, g: e.g }));
  return out;
}

function tokensOf(g: string): Token[] {
  return parseGrants(g).flatMap((it) => (it.k === 'token' ? [it.token] : it.options.flatMap((o) => o.tokens)));
}

describe('chargen content', () => {
  it('every grant line parses', () => {
    const bad: string[] = [];
    for (const { where, g } of allGrants()) {
      try {
        parseGrants(g);
      } catch (e) {
        bad.push(`${where}: ${(e as Error).message}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every skill named in the data exists', () => {
    const bad: string[] = [];
    for (const { where, g } of allGrants()) {
      for (const t of tokensOf(g)) {
        for (const id of tokenSkills(t)) {
          if (/^[EFHK]:\?$/.test(id)) continue;
          if (!SKILL_BY_ID.has(id)) bad.push(`${where}: ${id}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('forced religions and borrowed peoples exist', () => {
    const rel = new Set(CONTENT.religions.map((r) => r.id));
    const ppl = new Set([...CONTENT.peoples.map((p) => p.id), ...Object.keys(CONTENT.families)]);
    const bad: string[] = [];
    for (const { where, g } of allGrants()) {
      for (const t of tokensOf(g)) {
        if (t.k === 'religion') t.ids.filter((id) => !rel.has(id)).forEach((id) => bad.push(`${where}: religion ${id}`));
        if (t.k === 'doktrinx') t.religions.filter((id) => id !== 'valfri' && !rel.has(id)).forEach((id) => bad.push(`${where}: religion ${id}`));
        if (t.k === 'lana') t.people.filter((id) => !ppl.has(id)).forEach((id) => bad.push(`${where}: people ${id}`));
      }
    }
    expect(bad).toEqual([]);
  });

  it('tables cover 1–100 with no gaps or overlaps', () => {
    const check = (name: string, ranges: { lo: number; hi: number }[]) => {
      const sorted = [...ranges].sort((a, b) => a.lo - b.lo);
      let next = 1;
      for (const r of sorted) {
        expect(r.lo, `${name} at ${r.lo}`).toBe(next);
        next = r.hi + 1;
      }
      expect(next, name).toBe(101);
    };
    check('homelands', CONTENT.homelands);
    check('backgrounds', CONTENT.backgrounds.map((b) => ({ lo: b.n, hi: b.n })));
    check('humans', CONTENT.peoples.filter((p) => p.family === 'manniska') as { lo: number; hi: number }[]);
    for (const t of Object.values(CONTENT.tables)) if (t && t.entries.length) check(t.id, t.entries);
  });

  it('every people has 8 attributes and a language', () => {
    for (const p of CONTENT.peoples) {
      const attrs = p.attrs ?? CONTENT.families[p.family].attrs;
      expect(attrs?.length, p.id).toBe(8);
      expect(p.language.length, p.id).toBeGreaterThan(0);
    }
  });

  it('archetypes give 24 units and environments 16', () => {
    const units = (g: string) =>
      tokensOf(g)
        .filter((t) => t.k === 'group')
        .reduce((n, t) => n + (t as { n: number }).n, 0);
    for (const a of CONTENT.archetypes) expect(units(a.g), a.id).toBe(24);
    for (const e of CONTENT.environments) expect(units(e.g), e.id).toBe(16);
  });
});

describe('chargen tables', () => {
  it('converts attributes to dice', () => {
    expect(diceText(attrDice(4))).toBe('1D6');
    expect(diceText(attrDice(11))).toBe('2D6+3');
    expect(diceText(attrDice(12))).toBe('3D6');
    expect(diceText(attrDice(19))).toBe('4D6+3');
    expect(diceText(attrDice(24))).toBe('6D6');
  });
  it('derives base armour and damage from Physique', () => {
    expect([4, 8, 9, 12, 14, 24].map(baseArmour)).toEqual([0, 0, 1, 2, 3, 8]);
    expect(diceText(baseDamage(4))).toBe('1D6+2');
    expect(diceText(baseDamage(7))).toBe('1D6+3');
    expect(diceText(baseDamage(8))).toBe('2D6');
    expect(diceText(baseDamage(14))).toBe('2D6+3');
    expect(diceText(baseDamage(16))).toBe('3D6');
    expect(diceText(baseDamage(24))).toBe('4D6');
  });
  it('converts skill values to dice', () => {
    expect([0, 1, 3, 5, 8].map((v) => diceText(skillDice(v)))).toEqual(['0', '2D6', '3D6+2', '4D6+1', '5D6']);
  });
  it('reads the wisdom table', () => {
    expect(wisdomRow(4).incompetent).toBe('all');
    expect(wisdomRow(8).incompetent).toBe(5);
    expect(wisdomRow(15)).toMatchObject({ base1: 9, expertise: 2, newKnowledgeXp: 4 });
    expect(wisdomRow(18).base1).toBe('all');
    expect(wisdomRow(21)).toMatchObject({ extraUnits: 2, expertise: 10, newKnowledgeXp: 2 });
  });
});

describe('chargen derive', () => {
  it('a blank character lists what to do', () => {
    const d = derive(newChar(1), CONTENT);
    expect(d.pending.map((p) => p.key)).toEqual(expect.arrayContaining(['homeland', 'background', 'people', 'archetype']));
  });

  it('builds the book example (an Västmark Marnakh tirak scholar) up to skills', () => {
    const s = newChar(42);
    s.homeland = 'vastmark';
    s.background = 47; // Artist
    s.picks['bg.p'] = ['0', '1']; // painter, sculptor
    s.people = 'marnakh-tiraker';
    s.picks['ppl.p.val'] = ['naringsidkare', 'integrerade'];
    s.religion = 'mahktah';
    s.archetype = 'lard';
    s.picks['arch.x'] = ['avtr', 'skrift'];
    s.environment = 'stad';
    s.picks['env.x'] = ['smeten'];
    s.living = 'valmaende';
    const d = derive(s, CONTENT);
    expect(d.people?.en).toBe('Marnakh tirak');
    expect(d.languages.spoken).toEqual(expect.arrayContaining(['Ashariska', 'Sakhra']));
    expect(d.silver).toBe(100);
    // City gives +1 to Presence, Composure, Alertness, Wisdom.
    const presence = d.attrs.find((a) => a.attr === 'Intryck')!;
    expect(presence.base + presence.mods).toBe(9);
    // Background, archetype and environment rolls: 1 any + 2 studies + 1 any + 1 intrigue + 1 studies + 1 any.
    expect(d.slots.length).toBe(7);
    // Units from scholar + city: knowledge 10+4, social 4+8, expertise 4, movement 4, free 6.
    const pool = (p: string) => d.pools.find((x) => x.pool === p)?.total ?? 0;
    expect(pool('kunskap')).toBe(14);
    expect(pool('social')).toBe(12);
    expect(pool('E')).toBe(4);
    expect(pool('rorelse')).toBe(4);
    // Painter 4, sculptor 4 from the background, skills from the culture.
    const sk = (id: string) => d.skills.find((x) => x.id === id);
    expect(sk('H:Målare')?.value).toBe(4);
    expect(sk('Argumentera')?.value).toBe(3); // base 1 + 2
    expect(sk('F:Luktsinne')?.value).toBe(4);
    expect(d.pending.some((p) => p.k === 'pick' && p.key.endsWith('.lana'))).toBe(true);
  });

  it('a mystic archetype attunes and Sensing gets base 1', () => {
    const s = newChar(3);
    s.archetype = 'magiker';
    const d = derive(s, CONTENT);
    expect(d.attuned).toBe(true);
    expect(d.skills.find((x) => x.id === 'Förnimma')?.value).toBe(1);
  });

  it('units above the skill cap turn into free units', () => {
    const s = newChar(4);
    s.people = 'adasier';
    s.picks['ppl.p.val'] = ['som-fisken-i-vattnet', 'traskens-faror'];
    s.background = 100; // adventurer: Jump/Climb/Swim
    s.picks['bg.p'] = ['2', '0'];
    const d = derive(s, CONTENT);
    expect(d.skills.find((x) => x.id === 'Simma')?.value).toBe(6);
    expect(d.skills.find((x) => x.id === 'Simma')?.talent).toBe(true);
  });

  it('rolls are deterministic from the seed', () => {
    const a = newChar(99);
    const b = newChar(99);
    expect([roll(a, 100), roll(a, 100), roll(a, 10)]).toEqual([roll(b, 100), roll(b, 100), roll(b, 10)]);
  });
});
