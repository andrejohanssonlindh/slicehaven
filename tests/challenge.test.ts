import { describe, expect, it } from 'vitest';
import {
  challengeAllowed, challengeOpen, challengeOutcome, challengePool, challengeSkills, edgeControl, mustLock, newChallenge,
  rollChallenge, difficultyAt,
} from '../src/core/challenge';
import type { ChallengeDef } from '../src/core/challenge';
import { Rng } from '../src/core/rng';
import { apply, attempt, checkFor, checkOpen, newSceneState } from '../src/core/scene';
import { type Approach, conflictOver, leadOf, newConflict, playRound, replyTo, theirMove } from '../src/core/social';
import { expandScene, readPerson } from '../src/core/skillweb';
import { surveyChallenge } from '../src/content/skillweb/challenges';
import { GATE_SCENE } from '../src/content/scenes/gate';
import { LIBRARY } from '../src/content/skillweb';

/** An Rng that returns these d6 faces in order (then 1s). */
function dice(...faces: number[]): Rng {
  const r = Rng.fromSeed(1);
  let i = 0;
  r.int = (n: number) => (n === 6 ? (faces[i++] ?? 1) - 1 : 0);
  return r;
}

const survey = GATE_SCENE.challenges![0];
const pool = { n: 3, mod: 0 };

describe('conflicts alternate who leads', () => {
  const a: Approach = {
    id: 'sweet', label: 'Sweet-talk', skills: ['Charm', 'attr:Intryck', 'Argumentera'], locked: 'attr:Intryck',
    situation: 0, answers: ['A', 'B', 'C'], moves: ['X', 'Y', 'Z'],
  };
  const mine = () => ({ n: 3, mod: 0 });

  it('you lead rounds 1 and 3, he leads round 2', () => {
    expect([0, 1, 2].map(leadOf)).toEqual(['me', 'them', 'me']);
    const c = newConflict('sweet');
    const r1 = playRound(c, a, 'Charm', mine, mine, dice());
    const r2 = playRound(c, a, 'Argumentera', mine, mine, dice(), undefined, 'Y');
    const r3 = playRound(c, a, 'attr:Intryck', mine, mine, dice());
    expect([r1.lead, r2.lead, r3.lead]).toEqual(['me', 'them', 'me']);
    expect(r2.answer).toBe('Y'); // his pick, not an answer to your skill
    expect(conflictOver(c)).toBe(true);
  });

  it('his answer to your lead is one of the skills that fit it, drawn at random', () => {
    const c = newConflict('sweet');
    const responses = { Charm: ['P', 'Q'] };
    const seen = new Set<string>();
    for (let seed = 1; seed < 40; seed++) seen.add(replyTo(c, a, 'Charm', Rng.fromSeed(seed), responses));
    expect([...seen].sort()).toEqual(['P', 'Q']);
    // A skill with no entry falls back to the approach's own answers.
    const fallback = new Set<string>();
    for (let seed = 1; seed < 60; seed++) fallback.add(replyTo(c, a, 'Argumentera', Rng.fromSeed(seed), responses));
    expect([...fallback].sort()).toEqual(['A', 'B', 'C']);
  });

  it('he leads with something from his own moves, and avoids repeating himself', () => {
    const c = newConflict('sweet');
    const first = theirMove(c, a, Rng.fromSeed(3));
    expect(['X', 'Y', 'Z']).toContain(first);
    c.rounds.push({ answer: first } as never);
    for (let seed = 1; seed < 30; seed++) expect(theirMove(c, a, Rng.fromSeed(seed))).not.toBe(first);
  });

  it('his side also pays −2D6 for repeating a skill', () => {
    const c = newConflict('sweet');
    playRound(c, a, 'Charm', mine, mine, dice(), undefined);
    const r = playRound(c, a, 'Argumentera', mine, mine, dice(), undefined, c.rounds[0].answer);
    expect(r.answerDice).toEqual({ n: 1, mod: 0 });
  });
});

describe('challenges: three rolls against a difficulty', () => {
  it('a roll that reaches it gives 1 Control, +1 per 5 over; falling short gives none', () => {
    const c = newChallenge('survey');
    const hard = difficultyAt(survey, 'night'); // 14
    const r1 = rollChallenge(survey, c, 'attr:Vaksamhet', pool, 'night', dice(1, 1, 1));
    const r2 = rollChallenge(survey, c, 'Genomsöka', pool, 'night', dice(5, 5, 5)); // 15: success
    const r3 = rollChallenge(survey, c, 'Speja', pool, 'night', dice(5, 5, 5, 5), ); // 15 again, pool is 3
    expect([r1.control, r2.control, r3.control]).toEqual([0, 1, 1]);
    expect(hard).toBe(14);
    const big = rollChallenge(survey, newChallenge('x'), 'Genomsöka', { n: 5, mod: 0 }, 'night', dice(5, 5, 5, 5, 5)); // 25: 11 over: 2 advantages
    expect(big.control).toBe(3);
  });

  it('the locked roll must fit in the three rolls', () => {
    const c = newChallenge('survey');
    expect(mustLock(survey, c)).toEqual([]);
    rollChallenge(survey, c, 'Genomsöka', pool, 'day', dice());
    rollChallenge(survey, c, 'Speja', pool, 'day', dice());
    expect(mustLock(survey, c)).toEqual(['attr:Vaksamhet']);
    expect(challengeAllowed(survey, c, 'Naturlära', 'day')).toBe(false);
    expect(challengeAllowed(survey, c, 'attr:Vaksamhet', 'day')).toBe(true);
    expect(() => rollChallenge(survey, c, 'Naturlära', pool, 'day', dice())).toThrow();
  });

  it('repeating a skill costs 2D6 each time', () => {
    const c = newChallenge('survey');
    rollChallenge(survey, c, 'Genomsöka', pool, 'day', dice());
    expect(challengePool(c, 'Genomsöka', pool)).toEqual({ n: 1, mod: 0 });
  });

  it('night makes it harder, and darkvision is reasonable only at night', () => {
    expect(difficultyAt(survey, 'night')).toBeGreaterThan(difficultyAt(survey, 'day'));
    expect(challengeSkills(survey, 'night')).toContain('F:Mörkersyn');
    expect(challengeSkills(survey, 'day')).not.toContain('F:Mörkersyn');
    expect(challengeAllowed(survey, newChallenge('s'), 'F:Mörkersyn', 'day')).toBe(false);
    expect(challengeAllowed(survey, newChallenge('s'), 'F:Mörkersyn', 'night')).toBe(true);
  });

  it('darkvision is an upper hand at night (+2 Control), and nothing by day or without it', () => {
    const dwarf = (id: string) => id === 'F:Mörkersyn';
    expect(edgeControl(survey, 'night', dwarf).control).toBe(2);
    expect(edgeControl(survey, 'day', dwarf).control).toBe(0);
    expect(edgeControl(survey, 'night', () => false).control).toBe(0);
  });

  it('the result list is read off the total Control', () => {
    const at = (rolls: number[], situation = 0) => {
      const c = newChallenge('survey');
      c.rolls = rolls.map((control) => ({ control }) as never);
      return challengeOutcome(survey, c, situation);
    };
    expect(at([0, 0, 0]).result.atLeast).toBe(0);
    expect(at([1, 0, 0]).result.atLeast).toBe(1);
    expect(at([1, 1, 0]).result.atLeast).toBe(2);
    expect(at([1, 1, 1]).result.atLeast).toBe(3);
    expect(at([2, 1, 1]).result.atLeast).toBe(4);
    expect(at([2, 2, 2]).result.atLeast).toBe(6);
    // A dwarf's night eyes lift a middling effort.
    expect(at([1, 1, 0], 2).result.atLeast).toBe(4);
    // A weak position can't push Control below zero.
    expect(at([0, 0, 0], -2).control).toBe(0);
  });

  it('everyday challenges give 1 to 3 Control whatever you roll', () => {
    const everyday: ChallengeDef = { ...survey, level: 'everyday' };
    const c = newChallenge('x');
    c.rolls = [{ control: 0 }, { control: 0 }, { control: 0 }] as never;
    expect(challengeOutcome(everyday, c, 0).control).toBe(1);
    c.rolls = [{ control: 3 }, { control: 3 }, { control: 3 }] as never;
    expect(challengeOutcome(everyday, c, 0).control).toBe(3);
  });

  it('the gate\'s survey: results are scene specific, and the best ones reveal the guard\'s habits', () => {
    const s = newSceneState(GATE_SCENE);
    expect(challengeOpen(survey, s)).toBe(true);
    const best = survey.results.find((r) => r.atLeast === 6)!;
    const events = apply(s, best.effects);
    expect(events.some((e) => e.kind === 'reveal')).toBe(true);
    expect(s.tokens.map((t) => t.kind).sort()).toEqual(['sneak', 'social']);
    expect(s.tokens.every((t) => t.against === 'guard')).toBe(true);
    const worst = apply(s, survey.results.find((r) => r.atLeast === 0)!.effects);
    expect(worst).toEqual([{ kind: 'flag', flag: 'guardWatching', on: true }]);
    s.flags['done:survey'] = true;
    expect(challengeOpen(survey, s)).toBe(false);
  });

  it('the template gives the same standard skills to any scene', () => {
    const t = surveyChallenge({ intro: 'x', results: [{ atLeast: 0, text: 'y', effects: [] }] });
    expect(t.locked).toEqual(['attr:Vaksamhet']);
    expect(t.skills.map((x) => x.id)).toContain('Orientering');
  });
});

describe('knowledge and insight: a hidden roll with a plausible wrong answer', () => {
  const def = expandScene(GATE_SCENE, LIBRARY);
  const guard = def.objects.find((o) => o.id === 'guard')!;
  const rock = def.objects.find((o) => o.id === 'rock')!;

  it('size-up and study are hidden; asking and persuading are not', () => {
    const s = newSceneState(def);
    expect(checkFor(guard, s, 'Genomskåda')?.hidden).toBe(true);
    expect(checkFor(rock, s, 'Naturlära')?.hidden).toBe(true);
    expect(checkFor(guard, s, 'Argumentera')?.hidden).toBeUndefined();
  });

  it('you cannot tell how it went: success and failure say the same kind of thing', () => {
    const s = newSceneState(def);
    const c = checkFor(rock, s, 'Naturlära')!;
    const ok = attempt(s, c, { n: 6, mod: 0 }, dice(5, 5, 5, 5, 5, 5)).effects;
    const s2 = newSceneState(def);
    const bad = attempt(s2, checkFor(rock, s2, 'Naturlära')!, { n: 1, mod: 0 }, dice(1)).effects;
    const say = (e: typeof ok) => e.map((x) => ('say' in x ? x.say : ''));
    expect(say(ok)[0]).toMatch(/^You study the ivy-covered boulder with a trained eye\. /);
    expect(say(bad)[0]).toMatch(/^You study the ivy-covered boulder with a trained eye\. /);
    // One is the truth and the other a believable opposite.
    expect(say(ok)[0]).toContain(rock.lore!.true);
    expect(say(bad)[0]).toContain(rock.lore!.false);
    expect(rock.lore!.true).not.toBe(rock.lore!.false);
  });

  it('a hidden check closes after one try, so you cannot roll again to compare', () => {
    const s = newSceneState(def);
    const c = checkFor(rock, s, 'Naturlära')!;
    expect(checkOpen(c, s)).toBe(true);
    attempt(s, c, { n: 1, mod: 0 }, dice(1));
    expect(checkOpen(c, s)).toBe(false);
  });

  it('a misreading of a person is wrong in every part, and always says something', () => {
    const s = newSceneState(def);
    s.social.guard = { talks: 1, mood: -1 };
    const who = { kind: 'elf' };
    const place = { majority: 'human' };
    const truth = readPerson(guard, s, who, LIBRARY, place, true);
    const wrong = readPerson(guard, s, who, LIBRARY, place, false);
    expect(truth[0]).toMatch(/wary/);
    expect(wrong[0]).not.toMatch(/wary/);
    expect(wrong.length).toBeGreaterThanOrEqual(2);
    expect(wrong.join(' ')).toMatch(/at ease with your sort/);
    expect(truth.join(' ')).not.toMatch(/at ease/);
  });
});
