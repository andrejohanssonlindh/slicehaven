import { describe, expect, it } from 'vitest';
import { LEADS } from '../src/content/leads';
import { MAPS } from '../src/content/maps';
import { askAbout, giveLead, leadProblems, leadStatus, leadsToAsk, type LeadsState } from '../src/core/world3d/leads';
import { talk, talkOffers, newTalkMemory, type TalkCase, type TalkPerson } from '../src/core/world3d/talk';
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

  it('opens asking about it in a talk, with no roll', () => {
    const state: LeadsState = {};
    giveLead(state, LEADS, 'statue-north', 0);
    const p: TalkPerson = { id: 'keeper', name: 'Wenna', kind: 'human', tags: ['human', 'job-innkeeper'] };
    const c: TalkCase = { hero: { kind: 'human', tags: [] } as never, flags: {}, memory: newTalkMemory(), library: LIBRARY, leads: { state, defs: LEADS, hours: 1 } };
    const ask = talkOffers(p, c).find((o) => o.id === 'lead:statue-north');
    expect(ask?.label).toBe('Ask Wenna about the statue by the road');
    const r = talk('lead:statue-north', p, { id: 'hero', dice: () => ({ n: 3, mod: 0 }) }, c, Rng.fromSeed(1));
    expect(r.done && r.success && !r.roll).toBe(true);
    expect(r.lead).toBe('hesma-well');
    expect(r.lines.at(-1)?.text).toContain('Lead added');
    expect(talkOffers(p, c).some((o) => o.id === 'lead:statue-north')).toBe(false);
  });
});
