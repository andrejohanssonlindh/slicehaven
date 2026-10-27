import { describe, expect, it } from 'vitest';
import { attributeUse } from '../src/core/attributes';
import { challengeAllowed, newChallenge, rollChallenge } from '../src/core/challenge';
import { DIFFICULTY_RULES } from '../src/core/difficulty';
import { Rng } from '../src/core/rng';
import { type Approach, allowed, attrUseIn, hasOtherChoice, naturalAttrs, newConflict, playRound } from '../src/core/social';
import { type Context, linkedSkills, modesOf, relationsOf } from '../src/core/skillgraph';
import { OUTCOME_TYPES, USE_MODES } from '../src/content/skillweb/uses';
import { GENERIC_GUARD } from '../src/content/npcs';
import { GATE_SCENE } from '../src/content/scenes/gate';
import { SKILL_SETS, isRollable } from '../src/content/rollables';
import { LIBRARY } from '../src/content/skillweb';
import { EXAMPLES, examplesOf, missingExamples } from '../src/content/skillweb/examples';
import { TAGGED, TAG_INFO, skillsWith, tagsOf } from '../src/content/skillweb/tags';

function dice(...faces: number[]): Rng {
  const r = Rng.fromSeed(1);
  let i = 0;
  r.int = (n: number) => (n === 6 ? (faces[i++] ?? 1) - 1 : 0);
  return r;
}

describe('skill tags', () => {
  it('every tag is described and every tagged id is a real skill or attribute', () => {
    for (const [tag, ids] of Object.entries(TAGGED)) {
      expect(tag in TAG_INFO, tag).toBe(true);
      for (const id of ids) expect(isRollable(id), `${tag}: ${id}`).toBe(true);
    }
  });

  it('the skill sets scenes use are built from the tags', () => {
    expect(SKILL_SETS.threaten).toEqual(skillsWith('threaten'));
    expect(SKILL_SETS.bribe).toEqual(skillsWith('bribe'));
    expect(SKILL_SETS.readPeople).toEqual(skillsWith('read-people'));
  });

  it('Physique is for threatening and distracting, not bartering', () => {
    expect(tagsOf('attr:Kroppsbyggnad')).toEqual(expect.arrayContaining(['threaten', 'distract']));
    expect(tagsOf('attr:Kroppsbyggnad')).not.toContain('bribe');
    expect(tagsOf('attr:Kroppsbyggnad')).toContain('impress'); // a show of strength impresses
  });

  it('every skill a library hook or a survey lists carries a matching tag where one exists', () => {
    const survey = GATE_SCENE.challenges![0];
    for (const s of survey.skills) expect(tagsOf(s.id), s.id).toContain('survey');
    for (const id of survey.locked) expect(tagsOf(id)).toContain('survey');
    for (const h of LIBRARY.hooks.filter((x) => x.intention === 'persuade')) for (const id of h.skills) expect(tagsOf(id)).toContain('persuade');
  });
});

describe('attributes are a fallback, by difficulty', () => {
  const a: Approach = {
    id: 'sweet', label: '', skills: ['Charm', 'attr:Intryck', 'Argumentera'], locked: 'attr:Intryck', situation: 0, answers: [],
  };
  const threat: Approach = { ...a, id: 'threat', locked: 'attr:Kroppsbyggnad', skills: ['Injaga fruktan', 'attr:Kroppsbyggnad'], aggressive: true };
  const base = (n: number) => ({ n, mod: 0 });

  it('budgets: easy 2, normal 1, hard 0', () => {
    expect(['easy', 'normal', 'hard'].map((d) => DIFFICULTY_RULES[d as 'easy'].attrBudget)).toEqual([2, 1, 0]);
  });

  it('the locked roll is free; Presence is natural; Physique only when aggressive', () => {
    expect(naturalAttrs(a)).toEqual(['attr:Intryck']);
    expect(naturalAttrs(threat)).toEqual(['attr:Intryck', 'attr:Kroppsbyggnad']);
    const c = newConflict('sweet');
    expect(attrUseIn(c, a, 'attr:Intryck', true, 0)).toMatchObject({ ok: true, penalty: 0 }); // locked, first time
    expect(attrUseIn(c, a, 'attr:Kroppsbyggnad', true, 5).ok).toBe(false); // not suited to sweet talk
    expect(attrUseIn(c, threat, 'attr:Intryck', true, 1).ok).toBe(true);
  });

  it('extra attribute rolls follow the budget', () => {
    const c = newConflict('threat');
    const side = { dice: () => ({ n: 3, mod: 0 }), ids: ['attr:Självkontroll'] };
    const mine = (id: string) => base(id === 'Injaga fruktan' ? 3 : 4);
    playRound(c, threat, 'attr:Kroppsbyggnad', mine, side, dice(), { attrBudget: 1 }); // locked: free
    expect(attrUseIn(c, threat, 'attr:Intryck', true, 1).ok).toBe(true); // first extra
    playRound(c, threat, 'attr:Intryck', mine, side, dice(), { attrBudget: 1 });
    // The budget is spent: another attribute is no longer possible while a skill fits.
    expect(allowed(newConflictWith(threat, ['attr:Kroppsbyggnad', 'attr:Intryck']), threat, 'attr:Intryck', { budget: 1, hasOther: true })).toBe(false);
  });

  it('on hard no extra attribute is possible while a skill fits', () => {
    const c = newConflict('sweet');
    expect(attrUseIn(c, a, 'attr:Kroppsbyggnad', true, 0)).toMatchObject({ ok: false });
    expect(attrUseIn(newConflictWith(a, ['attr:Intryck']), a, 'attr:Intryck', true, 0).ok).toBe(false); // locked again counts as extra
  });

  it('with no skill that fits, any attribute works at −2D6', () => {
    const none = (id: string) => (id.startsWith('attr:') ? base(4) : base(0));
    expect(hasOtherChoice(threat, none)).toBe(false);
    const use = attrUseIn(newConflict('threat'), threat, 'attr:Visdom', false, 0);
    expect(use).toMatchObject({ ok: true, penalty: 2 });
    const side = { dice: () => ({ n: 2, mod: 0 }), ids: ['attr:Självkontroll'] };
    const r = playRound(newConflict('threat'), threat, 'attr:Visdom', none, side, dice(), { attrBudget: 0 });
    expect(r.dice).toEqual({ n: 2, mod: 0 }); // 4D6 − 2D6
  });

  it('challenges follow the same rule', () => {
    const survey = GATE_SCENE.challenges![0];
    const c = newChallenge('survey');
    expect(challengeAllowed(survey, c, 'attr:Intryck', 'day', { budget: 1, hasOther: true })).toBe(false);
    expect(challengeAllowed(survey, c, 'attr:Vaksamhet', 'day', { budget: 0, hasOther: true })).toBe(true); // locked
    expect(challengeAllowed(survey, c, 'attr:Intryck', 'day', { budget: 0, hasOther: false })).toBe(true); // nothing else fits
    const r = rollChallenge(survey, c, 'attr:Intryck', { n: 4, mod: 0 }, 'day', dice(), { budget: 0, hasOther: false });
    expect(r.dice).toEqual({ n: 2, mod: 0 });
  });

  it('the plain rule: only attributes are affected', () => {
    expect(attributeUse({ skill: 'Charm', locked: [], lockedUsed: [], natural: [], extrasUsed: 9, budget: 0, hasOther: true }).ok).toBe(true);
  });
});

function newConflictWith(a: Approach, skills: string[]) {
  const c = newConflict(a.id);
  for (const skill of skills) c.rounds.push({ skill, answer: 'x' } as never);
  return c;
}

describe('the skill map', () => {
  const cx: Context = { tags: TAGGED, library: LIBRARY, scenes: [GATE_SCENE], people: [GENERIC_GUARD] };

  it('shows what he answers with, from his own sheet, when you start with a skill', () => {
    const r = relationsOf('Charm', cx);
    const sweet = r.asYours.find((l) => l.approach === 'Sweet-talk him')!;
    expect(sweet.who).toBe('Gate guard');
    expect(sweet.answers.length).toBeGreaterThan(0);
    for (const a of sweet.answers) expect(GENERIC_GUARD.dice[a].n).toBeGreaterThan(0);
    expect(sweet.fallback).toBe(false);
  });

  it('the locked roll is marked, and aggression too', () => {
    const phys = relationsOf('attr:Kroppsbyggnad', cx).asYours.find((l) => l.approach === 'Threaten him')!;
    expect(phys.locked).toBe(true);
    expect(phys.aggressive).toBe(true);
  });

  it('shows where he uses a skill and what you could answer with', () => {
    const r = relationsOf('Genomskåda', cx);
    expect(r.asHis.some((l) => l.role === 'answer')).toBe(true);
    expect(r.asHis[0].yours.length).toBeGreaterThan(1);
  });

  it('shows hooks, scene checks, challenges and owners', () => {
    expect(relationsOf('Klättra', cx).hooks.some((h) => h.intention === 'climb')).toBe(true);
    expect(relationsOf('Klättra', cx).checks.some((c) => c.label.includes('Climb'))).toBe(true);
    const dark = relationsOf('F:Mörkersyn', cx);
    expect(dark.challenges[0].time).toEqual(['night']);
    expect(relationsOf('Genomskåda', cx).owners.map((o) => o.name)).toContain('Generic guard');
  });

  it('tells linked from unlinked skills', () => {
    const linked = linkedSkills(['Charm', 'Sjömannaskap'], cx);
    expect(linked.has('Charm')).toBe(true);
    expect(linked.has('Sjömannaskap')).toBe(false);
  });
});

describe('examples per skill and kind of effort', () => {
  it('only skills that carry the tag have examples under it', () => {
    for (const [tag, bySkill] of Object.entries(EXAMPLES)) {
      expect(tag in TAGGED, tag).toBe(true);
      for (const skill of Object.keys(bySkill)) expect(TAGGED[tag], `${tag}: ${skill}`).toContain(skill);
    }
  });

  it('each is a short line, and every skill has two or three of them', () => {
    for (const [tag, bySkill] of Object.entries(EXAMPLES)) {
      for (const [skill, ways] of Object.entries(bySkill)) {
        expect(ways.length, `${tag}/${skill}`).toBeGreaterThanOrEqual(2);
        expect(ways.length, `${tag}/${skill}`).toBeLessThanOrEqual(3);
        for (const w of ways) {
          expect(w.length, w).toBeGreaterThan(10);
          expect(w.length, w).toBeLessThan(120);
          expect(/[.!?]$/.test(w), w).toBe(true);
        }
        expect(new Set(ways).size).toBe(ways.length);
      }
    }
  });

  it('the model covers every kind of effort, and Physique impresses by lifting something heavy', () => {
    expect(Object.keys(EXAMPLES).sort()).toEqual(Object.keys(TAGGED).sort());
    expect(examplesOf('attr:Kroppsbyggnad').find((e) => e.tag === 'impress')!.ways.join(' ')).toMatch(/lift something heavy/);
  });

  it('what is left to write can be listed', () => {
    const left = missingExamples();
    expect(left.length).toBeGreaterThan(0); // the model is a start, not the full map
    for (const m of left) expect(TAGGED[m.tag]).toContain(m.skill);
  });
});

describe('weapon skills and the ways of use', () => {
  it('weapon skills can threaten and impress', () => {
    for (const w of ['Svärd', 'Yxa', 'Spjut', 'Dolk', 'Båge']) {
      expect(tagsOf(w), w).toEqual(expect.arrayContaining(['threaten', 'impress']));
      expect(examplesOf(w).map((e) => e.tag).sort(), w).toEqual(['impress', 'threaten']);
    }
    expect(SKILL_SETS.threaten).toContain('Svärd');
    expect(SKILL_SETS.impress).toContain('Båge');
    expect(tagsOf('Sköld')).not.toContain('impress'); // a shield is for defending
  });

  it('every way of use that the map derives for a skill is a known mode', () => {
    const cx: Context = { tags: TAGGED, library: LIBRARY, scenes: [GATE_SCENE], people: [GENERIC_GUARD] };
    for (const id of ['Charm', 'Genomskåda', 'attr:Kroppsbyggnad', 'F:Mörkersyn', 'Klättra', 'Genomsöka']) {
      for (const m of modesOf(relationsOf(id, cx))) expect(m in USE_MODES, `${id}: ${m}`).toBe(true);
    }
  });

  it('the modes a skill takes part in are derived from what is recorded', () => {
    const cx: Context = { tags: TAGGED, library: LIBRARY, scenes: [GATE_SCENE], people: [GENERIC_GUARD] };
    const m = (id: string) => modesOf(relationsOf(id, cx));
    expect(m('Genomskåda')).toEqual(expect.arrayContaining(['hidden-read', 'check']));
    expect(m('Genomskåda')).not.toContain('conflict-lead'); // he uses it against you; it is not on your list
    expect(m('Charm')).toEqual(expect.arrayContaining(['conflict-lead', 'conflict-answer']));
    expect(m('F:Mörkersyn')).toEqual(expect.arrayContaining(['challenge-roll', 'edge']));
    expect(m('attr:Kroppsbyggnad')).toEqual(expect.arrayContaining(['locked-roll', 'attribute-fallback']));
    expect(m('Genomsöka')).toContain('look-around');
  });

  it('built and planned modes are both listed', () => {
    const states = new Set(Object.values(USE_MODES).map((u) => u.status));
    expect(states).toEqual(new Set(['built', 'planned']));
    expect(OUTCOME_TYPES.some((o) => o.status === 'planned')).toBe(true);
  });
});
