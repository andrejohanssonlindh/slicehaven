import { describe, expect, it } from 'vitest';
import { type Fighter, startFight } from '../src/core/combat';
import { unhurt } from '../src/core/damage';
import { chooseFor, resolveStyle, styleProblems, wantsToYield } from '../src/core/fightmind';
import { Rng } from '../src/core/rng';
import { FIGHT_MINDS, FIGHT_STYLES, styleFor } from '../src/content/combat';
import { WEAPONS } from '../src/content/chargen/equipment';
import { MAPS } from '../src/content/maps';

const row = (sv: string) => WEAPONS.find((w) => w.sv === sv)!;
const fighter = (id: string, side: number, x: number, over: Partial<Fighter> = {}): Fighter => ({
  id, side, x, z: 0,
  pools: { Svärd: { n: 4, mod: 0 }, 'attr:Reaktion': { n: 3, mod: 0 }, 'attr:Livskraft': { n: 3, mod: 2 }, 'attr:Förflyttning': { n: 3, mod: 0 } },
  baseDamage: { n: 2, mod: 0 }, physique: { n: 3, mod: 0 }, baseArmour: 2, armour: { cut: 0, crush: 0, thrust: 0 }, loadDice: 0,
  weapon: { id: `${id}-sword`, weapon: row('Stridssvärd') }, shield: null, injuries: unhurt(), drew: false, ...over,
});

describe('fighting styles as lines', () => {
  it('every style names only choices and conditions that exist, with the keys they take', () => {
    for (const s of Object.values(FIGHT_STYLES)) expect(styleProblems(s, FIGHT_MINDS, FIGHT_STYLES)).toEqual([]);
    const bad = { id: 'bad', base: 'nobody', lines: [{ do: 'dance' }, { when: { moonIsFull: true }, do: 'strike' }, { do: 'closeIn', sprint: true }, { when: { beaten: 'very' }, do: 'offerYield' }] };
    expect(styleProblems(bad, FIGHT_MINDS, FIGHT_STYLES)).toEqual([
      'bad: no style called nobody to start from',
      'bad, line 1: no choice called dance',
      'bad, line 2 (strike): no condition called moonIsFull',
      'bad, line 3 (closeIn): unknown key "sprint"',
      'bad, line 4 (offerYield): beaten: give a number, 0 (fresh) to about 3 (wrecked)',
    ]);
  });

  it('a style is picked by the map, else by kind, else the default; a base\'s lines come after its own', () => {
    expect(styleFor(['human', 'gladiator']).id).toBe('gladiator');
    expect(styleFor(['human', 'gladiator'], 'coward').id).toBe('coward');
    expect(styleFor(['human', 'job-farmer']).id).toBe('default');
    const coward = resolveStyle('coward', FIGHT_STYLES);
    expect(coward.lines.length).toBe(FIGHT_STYLES.coward.lines.length + FIGHT_STYLES.default.lines.length);
    expect(coward.spare).toBe(6);
  });

  it('every part of the round takes the first line that holds and gives something', () => {
    // Empty-handed with a sword at their feet: they pick it up rather than close in, and still choose a tactic.
    const f = { ...startFight([fighter('a', 0, 0), fighter('b', 1, 6, { weapon: null })]), ground: [{ id: 'sw', weapon: row('Stridssvärd'), x: 7, z: 0 }] };
    const c = chooseFor(f, 'b', styleFor(['gladiator']), FIGHT_MINDS, Rng.fromSeed(1));
    expect(c.pickUp).toBe('sw');
    expect(c.move).toBeUndefined();
    expect(c.attack).toBeDefined();
    expect(c.defend).toBeDefined();
    // Armed and far: the gladiator runs in.
    const far = startFight([fighter('a', 0, 0), fighter('b', 1, 12)]);
    expect(chooseFor(far, 'b', styleFor(['gladiator']), FIGHT_MINDS, Rng.fromSeed(1)).move?.run).toBe(true);
    expect(chooseFor(far, 'b', styleFor([]), FIGHT_MINDS, Rng.fromSeed(1)).move?.run).toBe(false);
  });

  it('on A do B: the gladiator hammers a flagging foe; the coward asks to yield sooner', () => {
    const worn = { ...unhurt(), fatigue: 12, wounds: { torso: 1 } };
    const f = { ...startFight([fighter('a', 0, 0, { injuries: worn }), fighter('b', 1, 1.5)]), melee: { attacker: 1, opened: 1 } };
    const rng = Rng.fromSeed(4);
    let hard = 0;
    for (let i = 0; i < 200; i++) if (chooseFor(f, 'b', styleFor(['gladiator']), FIGHT_MINDS, rng).attack === 'powerful') hard++;
    expect(hard).toBeGreaterThan(120); // 3 in 4, against 2 in 7 otherwise
    const shaken = startFight([fighter('a', 0, 0), fighter('b', 1, 1.5, { injuries: { ...unhurt(), fatigue: 8 } })]);
    expect(wantsToYield(shaken, 'b', styleFor([], 'coward'), FIGHT_MINDS, rng)).toBe(true);
    expect(wantsToYield(shaken, 'b', styleFor(['gladiator']), FIGHT_MINDS, rng)).toBe(false);
  });

  it('every fighting style a map gives someone exists', () => {
    for (const [name, m] of Object.entries(MAPS)) {
      for (const p of m.people ?? []) if (p.fights) expect(FIGHT_STYLES[p.fights], `${name}: ${p.id}`).toBeDefined();
    }
  });
});
