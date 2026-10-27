import { describe, expect, it } from 'vitest';
import { FACETS } from '../src/content/people';
import { isRollable } from '../src/content/rollables';
import { KIND_PARENTS, LIBRARY, PLANNED } from '../src/content/skillweb';
import { TAGGED, TAG_INFO } from '../src/content/skillweb/tags';

/**
 * The rules every library hook follows (director/design/skill-map-handover.md, "How to add a hook").
 * These are what keep the Skill map truthful as content grows: if one fails, fix the hook, not the test.
 */
describe('the shape of every hook', () => {
  const hooks = LIBRARY.hooks;

  it('names a real kind of effort, a real kind of thing and (if any) a real facet', () => {
    for (const h of hooks) {
      expect(h.effort in TAG_INFO, `${h.id}: effort ${h.effort}`).toBe(true);
      expect(h.kind in KIND_PARENTS, `${h.id}: kind ${h.kind}`).toBe(true);
      if (h.facet) expect(FACETS[h.facet], `${h.id}: facet ${h.facet}`).toBeDefined();
    }
  });

  it('takes its skills from the effort\'s tag; anything else is a visible exception in `also`', () => {
    for (const h of hooks) {
      const tagged = TAGGED[h.effort] ?? [];
      expect(h.skills.length, h.id).toBeGreaterThan(0);
      for (const s of h.skills) {
        expect(isRollable(s), `${h.id}: ${s}`).toBe(true);
        expect(tagged.includes(s) || !!h.also?.includes(s), `${h.id}: ${s} lacks the ${h.effort} tag (tag it, or list it in also)`).toBe(true);
      }
      // An `also` entry that already carries the tag is noise.
      for (const s of h.also ?? []) expect(tagged.includes(s), `${h.id}: ${s} is tagged ${h.effort} already`).toBe(false);
    }
  });

  it('has an id made from its intention, unique in the library', () => {
    const ids = hooks.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const h of hooks) expect(h.id === h.intention || h.id.startsWith(`${h.intention}-`), h.id).toBe(true);
  });

  it('never sits on the broad structure or item kinds (a scene\'s own palisade or cart keeps its rules)', () => {
    for (const h of hooks) expect(['structure', 'item'], h.id).not.toContain(h.kind);
  });

  it('kept advantages are for a kind of effort, or for any talk', () => {
    for (const h of hooks) {
      for (const e of [...h.success, ...h.failure, ...(h.strong ?? [])]) {
        if ('token' in e) expect(e.token.kind === 'social' || e.token.kind in TAG_INFO, `${h.id}: ${e.token.kind}`).toBe(true);
      }
      for (const w of h.wants ?? []) expect(w === 'social' || w in TAG_INFO, `${h.id}: wants ${w}`).toBe(true);
    }
  });
});

describe('the efforts still to build', () => {
  const withHooks = new Set(LIBRARY.hooks.map((h) => h.effort));

  it('every effort has a hook, or is listed as planned with where it belongs', () => {
    for (const e of Object.keys(TAG_INFO)) expect(withHooks.has(e) || e in PLANNED, e).toBe(true);
  });

  it('nothing planned has a hook already (take it off the list when you write the first one)', () => {
    for (const e of Object.keys(PLANNED)) {
      expect(e in TAG_INFO, e).toBe(true);
      expect(withHooks.has(e), e).toBe(false);
    }
  });
});
