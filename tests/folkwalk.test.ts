import { describe, expect, it } from 'vitest';
import { PEOPLE } from '../src/content/village/folk';
import { IDLE_FRAMES, VIEWS, WALK_FRAMES, makeWalkSet, mirror, viewFor, walkPhase } from '../src/art/folkWalk';
import { Pix } from '../src/art/pix';

const key = (p: Pix): string => Array.from(p.data).join();
const YAW = 0.42;
// A step toward the camera (+toward) and to the screen's right (+right), as world directions.
const toward = [Math.sin(YAW), Math.cos(YAW)] as const;
const right = [Math.cos(YAW), -Math.sin(YAW)] as const;

describe('walking people', () => {
  it('every person has every view, all frames the same size, and some pixels', () => {
    for (const name of ['farmer', 'baker', 'smith', 'elder', 'child', 'traveller', 'guard']) {
      const set = makeWalkSet(PEOPLE[name] ?? PEOPLE.farmer);
      const w = set.views.front.idle[0].w, h = set.views.front.idle[0].h;
      for (const v of VIEWS) {
        expect(set.views[v].idle.length).toBe(IDLE_FRAMES);
        expect(set.views[v].walk.length).toBe(WALK_FRAMES);
        for (const f of [...set.views[v].idle, ...set.views[v].walk]) {
          expect([f.w, f.h]).toEqual([w, h]);
          let opaque = 0;
          for (let i = 3; i < f.data.length; i += 4) if (f.data[i] > 0) opaque++;
          expect(opaque, `${name} ${v}`).toBeGreaterThan(150);
        }
      }
    }
  });

  it('walking changes the picture, and the cycle is not a standstill', () => {
    const set = makeWalkSet(PEOPLE.farmer);
    for (const v of VIEWS) {
      const keys = new Set(set.views[v].walk.map((f) => key(f)));
      expect(keys.size, v).toBeGreaterThanOrEqual(3);
    }
  });

  it('the back view is not the front view', () => {
    const set = makeWalkSet(PEOPLE.baker);
    expect(key(set.views.back.idle[0]) === key(set.views.front.idle[0])).toBe(false);
  });

  it('mirror flips about the figure and twice is the identity', () => {
    const p = new Pix(40, 10);
    p.set(10, 3, '#ff0000');
    const m = mirror(p);
    expect(m.alpha(35 - 10, 3)).toBeTruthy();
    expect(m.alpha(10, 3)).toBeFalsy();
    expect(key(mirror(m)) === key(p)).toBe(true);
  });

  it('feet alternate through the cycle', () => {
    const lifts = Array.from({ length: WALK_FRAMES }, (_, f) => walkPhase(f));
    expect(lifts.some((l) => l.liftA > 0 && l.liftB === 0)).toBe(true);
    expect(lifts.some((l) => l.liftB > 0 && l.liftA === 0)).toBe(true);
    for (const l of lifts) expect(Math.abs(l.stride)).toBeLessThanOrEqual(1);
  });
});

describe('which view', () => {
  it('toward the camera is front, away is back, across is profile', () => {
    expect(viewFor(toward[0], toward[1], YAW, 'side', false).view).toBe('front');
    expect(viewFor(-toward[0], -toward[1], YAW, 'side', false).view).toBe('back');
    expect(viewFor(right[0], right[1], YAW, 'front', false)).toEqual({ view: 'side', left: false });
    expect(viewFor(-right[0], -right[1], YAW, 'front', false)).toEqual({ view: 'side', left: true });
  });

  it('a path bending a little does not flip the view (hysteresis)', () => {
    // 45 degrees between toward and right: stays whatever it was.
    const d = [toward[0] + right[0], toward[1] + right[1]] as const;
    expect(viewFor(d[0], d[1], YAW, 'front', false).view).toBe('front');
    expect(viewFor(d[0], d[1], YAW, 'side', false).view).toBe('side');
  });

  it('standing still keeps the last view', () => {
    expect(viewFor(0, 0, YAW, 'back', false)).toEqual({ view: 'back', left: false });
    expect(viewFor(0, 0, YAW, 'side', true)).toEqual({ view: 'side', left: true });
  });
});
