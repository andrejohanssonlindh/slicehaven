import { describe, expect, it } from 'vitest';
import { LEADS } from '../src/content/leads';
import { MAPS } from '../src/content/maps';
import { askAbout, giveLead, heldBack, leadProblems, leadStatus, leadsToAsk, studied, type LeadsState } from '../src/core/world3d/leads';
import { ASK_LEADS, leadAsks, talk, talkOffers, newTalkMemory, type TalkCase, type TalkPerson } from '../src/core/world3d/talk';
import { rollableName } from '../src/content/rollables';
import { LIBRARY } from '../src/content/skillweb';
import { ACTIONS } from '../src/content/actions';
import { libraryProblems } from '../src/core/world3d/actions';
import { THINGS } from '../src/content/things';
import { Rng } from '../src/core/rng';

const keeper = { id: 'keeper', tags: ['human', 'job-innkeeper'] };
const guard = { id: 'guard', tags: ['human', 'job-guard'] };
const miller = { id: 'villager', tags: ['human', 'job-miller'] };
const farmer = { id: 'towns0', tags: ['human', 'job-farmer'] };

describe('leads (B11)', () => {
  it('the lead files have no problems, and every lead a map names exists', () => {
    expect(leadProblems(LEADS)).toEqual([]);
    expect(libraryProblems(ACTIONS, THINGS)).toEqual([]);
    for (const [name, spec] of Object.entries(MAPS)) {
      for (const p of (spec as { props?: { lead?: string }[] }).props ?? []) if (p.lead) expect(LEADS[p.lead], `${name}: ${p.lead}`).toBeDefined();
    }
  });

  it('is given once, asked of those who care, grows into the next, and is spent when all is heard', () => {
    const s: LeadsState = {}, flags: Record<string, boolean> = {};
    expect(giveLead(s, LEADS, 'statue-north', 100)).toBe(true);
    expect(giveLead(s, LEADS, 'statue-north', 101)).toBe(false);
    expect(leadsToAsk(s, LEADS, flags, farmer)).toEqual([]);
    expect(leadsToAsk(s, LEADS, flags, keeper).map((d) => d.id)).toEqual(['statue-north']);
    const r = askAbout(s, LEADS, 'statue-north', keeper, flags, 102)!;
    expect(r.lines.length).toBeGreaterThan(0);
    expect(r.next).toBe('hesma-well');
    expect(s['statue-north'].lines.length).toBe(1 + r.lines.length);
    // Asked once: they have nothing more.
    expect(leadsToAsk(s, LEADS, flags, keeper)).toEqual([]);
    expect(leadsToAsk(s, LEADS, flags, miller).map((d) => d.id)).toEqual(['hesma-well']);
    expect(leadStatus(LEADS['statue-north'], s['statue-north'], flags)).toBe('open');
    askAbout(s, LEADS, 'statue-north', guard, flags, 103);
    expect(leadStatus(LEADS['statue-north'], s['statue-north'], flags)).toBe('spent');
    flags['hesma-well-found'] = true;
    expect(leadStatus(LEADS['hesma-well'], s['hesma-well'], flags)).toBe('solved');
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  const caseWith = (state: LeadsState): TalkCase => ({ hero: { kind: 'human', tags: [] } as never, flags: {}, memory: newTalkMemory(), library: LIBRARY, leads: { state, defs: LEADS, hours: 1 } });
  const hero = { id: 'hero', dice: () => ({ n: 3, mod: 0 }) };

  it('can be asked of anyone: those who care tell (no roll), the rest don\'t know', () => {
    const state: LeadsState = {};
    giveLead(state, LEADS, 'statue-north', 0);
    const c = caseWith(state);
    const wenna: TalkPerson = { id: 'keeper', name: 'Wenna', kind: 'human', tags: ['human', 'job-innkeeper'] };
    const tam: TalkPerson = { id: 'towns0', name: 'Tam', kind: 'human', tags: ['human', 'job-farmer'] };
    // Both are offered the list; it holds every open lead.
    for (const p of [wenna, tam]) expect(talkOffers(p, c).some((o) => o.id === ASK_LEADS)).toBe(true);
    expect(leadAsks(tam, c).map((o) => o.label)).toEqual(['Ask Tam about the statue by the road']);
    const no = talk('lead:statue-north', tam, hero, c, Rng.fromSeed(1));
    expect(no.done && !no.success && !no.lead).toBe(true);
    const r = talk('lead:statue-north', wenna, hero, c, Rng.fromSeed(1));
    expect(r.done && r.success && !r.roll).toBe(true);
    expect(r.lead).toBe('hesma-well');
    expect(r.lines.at(-1)?.text).toContain('Lead added');
    expect(talk('lead:statue-north', wenna, hero, c, Rng.fromSeed(1)).lines[0].text).toContain('told you');
  });

  it('someone who holds back can be pressed: a social roll; a failure sours them', () => {
    const state: LeadsState = {};
    giveLead(state, LEADS, 'hesma-well', 0);
    const c = caseWith(state);
    const miller: TalkPerson = { id: 'villager', name: 'Odo', kind: 'human', tags: ['human', 'job-miller'] };
    const first = talk('lead:hesma-well', miller, hero, c, Rng.fromSeed(1));
    expect(first.success).toBe(false);
    expect(heldBack(state, LEADS, miller)).toHaveLength(1);
    const press = talkOffers(miller, c).find((o) => o.id === 'leadpress:hesma-well');
    expect(press?.label).toBe('Press Odo about Saint Hesma\'s well');
    // A strong talker gets it out of them; a weak one sours them.
    const weak = { id: 'hero', dice: () => ({ n: 0, mod: 0 }) };
    const fail = talk('leadpress:hesma-well', miller, { ...weak, dice: (s: string) => (s === 'attr:Intryck' ? { n: 2, mod: 0 } : { n: 0, mod: 0 }) }, c, Rng.fromSeed(3));
    if (!fail.success) expect(c.memory.social.villager.mood).toBe(-1);
    const strong = { id: 'hero', dice: (s: string) => (s === 'Argumentera' ? { n: 12, mod: 0 } : { n: 0, mod: 0 }) };
    const ok = talk('leadpress:hesma-well', miller, strong, c, Rng.fromSeed(2));
    expect(ok.success && !!ok.roll).toBe(true);
    expect(state['hesma-well'].heard).toHaveLength(1);
    expect(heldBack(state, LEADS, miller)).toHaveLength(0);
  });

  it('the thing can be studied once: a hidden read that adds the true or the wrong lines', () => {
    for (const truth of [true, false]) {
      const state: LeadsState = {};
      giveLead(state, LEADS, 'statue-north', 0);
      const r = studied(state, LEADS, 'statue-north', truth, 1)!;
      expect(r.lines).toEqual(truth ? LEADS['statue-north'].study!.know : LEADS['statue-north'].study!.wrong);
      expect(!!state['hesma-well']).toBe(truth);
      expect(studied(state, LEADS, 'statue-north', truth, 2)).toBeNull();
    }
    for (const d of Object.values(LEADS)) for (const s of d.study?.skills ?? []) expect(rollableName(s), s).not.toBe(s);
  });
});
