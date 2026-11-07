import { describe, expect, it } from 'vitest';
import {
  type Fight, type Fighter, type LogLine, DEMAND_EXTRA, acceptYield, attackPool, demandDifficulty, attackWhy, beaten, bestDamage, moreDamage, refuseYield, bonusDice, damageDice, defenceOptions, defencePool, dropFrom, fists, parseProps, pleaDifficulty,
  resolveRound, roleOf, seizeInitiative, startFight, tacticFatigue, weaponFromRow, weaponOf,
} from '../src/core/combat';
import { type Injuries, recoverFatigue, unhurt } from '../src/core/damage';
import { Rng } from '../src/core/rng';
import { type Style, chooseFor as choose, wantsToYield as wants } from '../src/core/fightmind';
import { FIGHT_MINDS } from '../src/content/combat';
import { WOUND_TABLES } from '../src/content/wounds';
import { SHIELDS, WEAPONS } from '../src/content/chargen/equipment';

const RULES = { tables: WOUND_TABLES, ground: 6 };
const row = (sv: string) => WEAPONS.find((w) => w.sv === sv)!;
const BASE = { n: 2, mod: 0 };
const PHYS = { n: 3, mod: 0 };

const fighter = (id: string, side: number, x: number, over: Partial<Fighter> = {}): Fighter => ({
  id, side, x, z: 0,
  pools: { Svärd: { n: 4, mod: 0 }, Sköld: { n: 3, mod: 0 }, Undvika: { n: 2, mod: 0 }, 'attr:Reaktion': { n: 3, mod: 0 }, 'attr:Livskraft': { n: 3, mod: 2 }, 'attr:Förflyttning': { n: 3, mod: 0 } },
  baseDamage: BASE, physique: PHYS, baseArmour: 2, armour: { cut: 3, crush: 3, thrust: 2 }, loadDice: 0,
  weapon: { id: `${id}-sword`, weapon: row('Stridssvärd') }, shield: null,
  injuries: unhurt(), drew: false, ...over,
});

const STYLE: Style = {
  id: 'test', spare: 12, lines: [
    { when: { foeDown: true }, do: 'finish' },
    { do: 'pickUp' },
    { do: 'closeIn' },
    { do: 'strike', weights: { standard: 2, quick: 1, powerful: 1 } },
    { do: 'defend', weights: { standard: 3, defensive: 1 } },
  ],
};
const chooseFor = (f: Fight, id: string, style: Style, rng: Rng, known?: Parameters<typeof choose>[5]) => choose(f, id, style, FIGHT_MINDS, rng, known);
const wantsToYield = (f: Fight, id: string, style: Style) => wants(f, id, style, FIGHT_MINDS, Rng.fromSeed(1));

describe('weapons in hand', () => {
  it('reads properties and damage lines', () => {
    expect(parseProps('Precis 1, Snabb, Genomslag S5, Bräcklig 2–4')).toEqual({ Precis: 1, Snabb: 1, Genomslag: 5, Bräcklig: 2 });
    expect(damageDice('G+2T6+1', BASE)).toEqual({ n: 4, mod: 1 });
    expect(damageDice('4T6+2', BASE)).toEqual({ n: 4, mod: 2 });
    expect(damageDice('–', BASE)).toBeNull();
    expect(bonusDice('+1T6')).toEqual({ n: 1, mod: 0 });
    expect(bonusDice('+3')).toEqual({ n: 0, mod: 3 });
    expect(bonusDice('±0')).toEqual({ n: 0, mod: 0 });
  });

  it('builds a weapon for the hands that can hold it', () => {
    const sword = weaponFromRow(row('Stridssvärd'), BASE, PHYS);
    expect(sword).toMatchObject({ skill: 'Svärd', hands: 1, weak: 0, damage: { cut: { n: 4, mod: 1 }, crush: { n: 2, mod: 2 }, thrust: { n: 3, mod: 2 } } });
    expect(bestDamage(sword).type).toBe('cut');
    // A bastard sword needs 4D6 one-handed: with 3D6 it is held in both, with Double grip's +2.
    const bastard = weaponFromRow(row('Slagsvärd'), BASE, PHYS);
    expect(bastard.hands).toBe(2);
    expect(bastard.damage.cut).toEqual({ n: 5, mod: 2 });
    // A great axe (7D6 / 3D6) two-handed is fine; a weaker fighter is short.
    expect(weaponFromRow(row('Storyxa'), BASE, { n: 2, mod: 0 }).weak).toBe(1);
    expect(fists(BASE)).toMatchObject({ skill: 'Slagsmål', unarmed: true, damage: { brawl: BASE } });
  });

  it('chooses the best defence: parry, block or dodge', () => {
    const shield = SHIELDS.find((s) => s.sv === 'Stor rundsköld')!;
    const a = fighter('a', 0, 0);
    const b = fighter('b', 1, 1.5, { shield: { id: 'b-shield', shield: { name: shield.sv, melee: bonusDice(shield.melee), props: parseProps(shield.props) } } });
    expect(defencePool({ ...b, pools: { ...b.pools, Sköld: { n: 4, mod: 0 } } }, weaponOf(a), 'standard')).toMatchObject({ how: 'block', dice: { n: 5, mod: 0 } });
    expect(defencePool(a, weaponOf(b), 'standard').how).toBe('parry');
    // Bare hands parry at −2D6 against a weapon, so a dodger dodges.
    const bare = fighter('c', 1, 1.5, { weapon: null, pools: { Slagsmål: { n: 2, mod: 0 }, Undvika: { n: 3, mod: 0 } } });
    expect(defencePool(bare, weaponOf(a), 'standard').how).toBe('dodge');
    expect(defencePool(bare, weaponOf(a), 'counter').how).toBe('parry'); // no dodging into a counter
  });

  it('defends the way chosen, if it can (B8g), else the best', () => {
    const a = fighter('a', 0, 0);
    const bare = fighter('c', 1, 1.5, { weapon: null, pools: { Slagsmål: { n: 2, mod: 0 }, Undvika: { n: 3, mod: 0 } } });
    expect(defencePool(bare, weaponOf(a), 'standard', 'parry').how).toBe('parry');
    expect(defencePool(bare, weaponOf(a), 'standard', 'block').how).toBe('dodge'); // no shield: the best instead
    expect(defenceOptions(bare, weaponOf(a), 'counter').map((o) => o.how)).toEqual(['parry']);
  });

  it('tactics change the pools and cost fatigue', () => {
    const a = fighter('a', 0, 0);
    expect(attackPool(a, 'standard')).toEqual({ n: 4, mod: 0 });
    expect(attackPool(a, 'quick')).toEqual({ n: 5, mod: 0 });
    expect(attackPool(a, 'powerful')).toEqual({ n: 3, mod: 0 });
    expect(attackPool({ ...a, drew: true }, 'standard')).toEqual({ n: 3, mod: 0 });
    const sword = weaponOf(a);
    expect(tacticFatigue('quick', null, sword)).toBe(1);
    expect(tacticFatigue('quick', null, { ...sword, props: { Snabb: 1 } })).toBe(0);
    expect(tacticFatigue('powerful', 'counter', sword)).toBe(3);
  });

  it('an untrained combat skill rolls 2D6 (Q48), and a pool says where it came from', () => {
    const a = fighter('a', 0, 0, { pools: {} });
    expect(attackWhy(a, 'standard')).toMatchObject({ skill: 'Svärd', untrained: true, dice: { n: 2, mod: 0 } });
    const hurt = fighter('b', 0, 0, { drew: true, injuries: { ...unhurt(), pain: 1, wounds: { rightArm: 1 } } });
    const why = attackWhy(hurt, 'quick');
    expect(why.mods).toEqual([{ why: 'quick', n: 1 }, { why: 'drew', n: -1 }, { why: 'pain', n: -1 }, { why: 'rightArm', n: -1 }]);
    expect(why.dice).toEqual({ n: 2, mod: 0 });
  });
});

describe('fatigue', () => {
  it('remembers where it came from, and goes back with time (Q49)', () => {
    const f = startFight([fighter('a', 0, 0), fighter('b', 1, 1.5)]);
    f.melee = { attacker: 0, opened: 0 };
    const r = resolveRound(f, { a: { attack: 'powerful' }, b: { defend: 'defensive' } }, RULES, Rng.fromSeed(3));
    const [a, b] = r.fight.fighters;
    expect(a.injuries.fatigueFrom.powerful).toBe(2);
    expect(b.injuries.fatigueFrom.careful).toBe(1);
    const sum = (i: typeof a.injuries) => Object.values(i.fatigueFrom).reduce((s, n) => s + (n ?? 0), 0);
    expect(sum(b.injuries)).toBe(b.injuries.fatigue);
    // Five points, one back every 2 minutes: tactics go first; knocked out, they wake when it's all gone.
    let i: Injuries = { ...unhurt(), out: true, fatigue: 5, fatigueFrom: { hits: 4, powerful: 1 } };
    i = recoverFatigue(i, 3, 2);
    expect(i).toMatchObject({ fatigue: 4, fatigueFrom: { hits: 4 }, rested: 1, out: true });
    i = recoverFatigue(i, 7, 2);
    expect(i).toMatchObject({ fatigue: 0, fatigueFrom: {}, out: false });
    expect(recoverFatigue({ ...unhurt(), out: true, dying: true, fatigue: 1, fatigueFrom: { hits: 1 } }, 9, 1).out).toBe(true);
  });

  it('a plea to yield: granted ends the fight with the pleader spared; refused, an attacker loses their blow', () => {
    const f = startFight([fighter('a', 0, 0), fighter('b', 1, 1.5)]);
    f.melee = { attacker: 0, opened: 0 };
    expect(pleaDifficulty(f, 'a', STYLE)).toBe(12);
    const yes = resolveRound(f, { a: { plead: { dice: { n: 9, mod: 0 }, difficulty: 6 } } }, RULES, Rng.fromSeed(1));
    expect(yes.fight.winner).toBe(1);
    expect(yes.fight.spared).toBe('a');
    expect(yes.log.some((l) => l.k === 'attack')).toBe(false);
    expect(yes.fight.fighters[0].injuries.out || yes.fight.fighters[0].injuries.dead).toBe(false);
    expect(yes.fight.fighters[0].weapon).toBeNull(); // who yields lays their weapon down
    expect(pleaDifficulty(f, 'a', STYLE, 2)).toBe(12 + 12); // yielded to them twice before
    const no = resolveRound(f, { a: { plead: { dice: { n: 1, mod: 0 }, difficulty: 40 } } }, RULES, Rng.fromSeed(1));
    expect(no.fight.winner).toBeNull();
    expect(no.log.some((l) => l.k === 'plead' && !l.granted)).toBe(true);
    expect(no.log.some((l) => l.k === 'attack')).toBe(false);
    // A foe far more tired and hurt is easier to talk down.
    const g = structuredClone(f);
    g.fighters[1].injuries = { ...unhurt(), fatigue: 10, wounds: { torso: 1 } };
    const eased = pleaDifficulty(g, 'a', STYLE);
    expect(eased).toBeLessThan(12);
    // The worse off they are (here a broken arm too), the easier, never under 6.
    const h = structuredClone(g);
    h.fighters[1].injuries = { ...h.fighters[1].injuries, fatigue: 30, broken: ['leftArm'] };
    expect(pleaDifficulty(h, 'a', STYLE)).toBeLessThan(eased);
    expect(pleaDifficulty(h, 'a', STYLE)).toBeGreaterThanOrEqual(6);
  });

  it('making the foe yield: harder than a plea; granted, they lay down their weapons and the fight is won', () => {
    const f = startFight([fighter('a', 0, 0), fighter('b', 1, 1.5)]);
    f.melee = { attacker: 0, opened: 0 };
    expect(demandDifficulty(f, 'a', STYLE)).toBe(12 + DEMAND_EXTRA);
    const yes = resolveRound(f, { a: { demand: { dice: { n: 9, mod: 0 }, difficulty: 6 } } }, RULES, Rng.fromSeed(1));
    expect(yes.fight.winner).toBe(0);
    expect(yes.fight.spared).toBe('b');
    expect(yes.fight.fighters[1].weapon).toBeNull();
    expect(yes.log.some((l) => l.k === 'demand' && l.granted)).toBe(true);
    expect(yes.log.some((l) => l.k === 'attack')).toBe(false);
    const no = resolveRound(f, { a: { demand: { dice: { n: 1, mod: 0 }, difficulty: 40 } } }, RULES, Rng.fromSeed(1));
    expect(no.fight.winner).toBeNull();
    expect(no.log.some((l) => l.k === 'attack')).toBe(false); // the attacker spent their blow on it
    const g = structuredClone(f);
    g.fighters[1].injuries = { ...unhurt(), fatigue: 20, wounds: { torso: 2 } };
    expect(demandDifficulty(g, 'a', STYLE)).toBeLessThan(12 + DEMAND_EXTRA);
  });

  it('putting away in a fight frees the hand: the weapon goes on the belt, to be drawn again', () => {
    const f = startFight([fighter('a', 0, 0), fighter('b', 1, 8)]);
    const r = resolveRound(f, { a: { stow: 'weapon' } }, RULES, Rng.fromSeed(1));
    const a = r.fight.fighters[0];
    expect(a.weapon).toBeNull();
    expect(a.belt?.map((b) => b.id)).toEqual(['a-sword']);
    expect(r.log.some((l) => l.k === 'stow' && l.who === 'a')).toBe(true);
  });

  it('knocked down: down through their next round (no moving, −1D6), then up on their own', () => {
    const f = startFight([fighter('a', 0, 0), fighter('b', 1, 6)]);
    f.fighters[1].injuries = { ...unhurt(), short: ['fall'] };
    const r1 = resolveRound(f, { b: { move: { x: 2, z: 0 } } }, RULES, Rng.fromSeed(1));
    expect(r1.fight.fighters[1].x).toBe(6); // couldn't move while down
    expect(r1.fight.fighters[1].injuries.short).toEqual([]); // up at the end of that round
    expect(r1.log.some((l) => l.k === 'rise' && l.who === 'b')).toBe(true);
  });

  it('closing in from both sides, nobody walks through the other; the round pauses when blades cross', () => {
    const f = startFight([fighter('a', 0, 0), fighter('b', 1, 6)]);
    const r = resolveRound(f, { a: { move: { x: 6, z: 0 } }, b: { move: { x: 0, z: 0 } } }, RULES, Rng.fromSeed(2), { pauseOnOpen: true });
    const [a, b] = r.fight.fighters;
    expect(a.x).toBeLessThan(b.x);
    expect(b.x - a.x).toBeGreaterThanOrEqual(1.49);
    expect(r.fight.midRound).toBe(true);
    expect(r.log.some((l) => l.k === 'attack')).toBe(false);
    // The second half: the tactic chosen now is the one struck with; the round then moves on.
    const att = r.fight.melee!.attacker === 0 ? 'a' : 'b';
    const r2 = resolveRound(r.fight, { [att]: { attack: 'powerful', move: { x: 50, z: 0 } } }, RULES, Rng.fromSeed(3), { pauseOnOpen: true });
    const blow = r2.log.find((l) => l.k === 'attack');
    expect(blow?.k === 'attack' && blow.tactic).toBe('powerful');
    expect(r2.log.some((l) => l.k === 'move')).toBe(false);
    expect(r2.fight.round).toBe(r.fight.round + 1);
  });

  it('advantages buy damage as dice: 2 are +1D6, 5 are +2D6+2', () => {
    expect(moreDamage(1, false)).toEqual({ n: 0, mod: 2 });
    expect(moreDamage(2, false)).toEqual({ n: 1, mod: 0 });
    expect(moreDamage(5, false)).toEqual({ n: 2, mod: 2 });
    expect(moreDamage(3, true)).toEqual({ n: 3, mod: 0 });
  });

  it('a broken leg keeps them on the ground: no moving, −1D6 to fight', () => {
    const lame = fighter('a', 0, 0, { injuries: { ...unhurt(), broken: ['leftLeg'] } });
    const f = startFight([lame, fighter('b', 1, 8)]);
    const r = resolveRound(f, { a: { move: { x: 8, z: 0 } } }, RULES, Rng.fromSeed(1));
    expect(r.fight.fighters[0].x).toBe(0);
    expect(attackWhy(lame, 'standard').mods).toContainEqual({ why: 'grounded', n: -1 });
  });

  it('a beaten foe offers to yield; accepted, they lay down their weapon', () => {
    const style: Style = { ...STYLE, lines: [{ when: { beaten: 1 }, do: 'offerYield' }, ...STYLE.lines] };
    const f = startFight([fighter('a', 0, 0), fighter('b', 1, 1.5, { injuries: { ...unhurt(), broken: ['rightLeg'], wounds: { torso: 2 } } })]);
    expect(beaten(f.fighters[1])).toBeGreaterThanOrEqual(1);
    expect(wantsToYield(f, 'b', style)).toBe(true);
    expect(wantsToYield(f, 'a', style)).toBe(false);
    const no = refuseYield({ ...f, offer: 'b' }, 'b');
    expect(wantsToYield(no, 'b', style)).toBe(false); // not again until worse off
    const yes = acceptYield(f, 'b', Rng.fromSeed(1));
    expect(yes.fight.winner).toBe(0);
    expect(yes.fight.spared).toBe('b');
    expect(yes.fight.fighters[1].weapon).toBeNull();
    expect(yes.fight.ground).toHaveLength(1);
  });

  it('a tie goes to the attacker', () => {
    // Search seeds for a round where attack and defence come out equal: it must be a hit.
    let seen = 0;
    for (let s = 1; s < 400 && seen < 3; s++) {
      const f = startFight([fighter('a', 0, 0), fighter('b', 1, 1.5)]);
      f.melee = { attacker: 0, opened: 0 };
      const l = resolveRound(f, {}, RULES, Rng.fromSeed(s)).log.find((x) => x.k === 'attack');
      if (l?.k === 'attack' && l.defend && l.attack.total === l.defend.total) {
        seen++;
        expect(l.hit).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe('drawing your own weapon', () => {
  it('is the side action: from the belt to the hand, −1D6 on the next roll unless quick to draw', () => {
    const f = startFight([fighter('a', 0, 0, { weapon: null, belt: [{ id: 'own', weapon: row('Stridssvärd') }] }), fighter('b', 1, 8)]);
    const r = resolveRound(f, { a: { draw: 'own' } }, RULES, Rng.fromSeed(1));
    const a = r.fight.fighters[0];
    expect(a.weapon?.id).toBe('own');
    expect(a.belt).toEqual([]);
    expect(a.drew).toBe(true);
    expect(r.log[0]).toEqual({ k: 'draw', who: 'a', item: 'own' });
    expect(attackWhy(a, 'standard').mods).toContainEqual({ why: 'drew', n: -1 });
    // Hands full: nothing is drawn.
    const full = startFight([fighter('a', 0, 0, { belt: [{ id: 'own', weapon: row('Dolk') }] })]);
    expect(resolveRound(full, { a: { draw: 'own' } }, RULES, Rng.fromSeed(1)).fight.fighters[0].weapon?.id).toBe('a-sword');
  });
});

describe('the upper hand (declared in reverse order)', () => {
  it('belongs to the attacker in a melee, with no roll', () => {
    const f = { ...startFight([fighter('a', 0, 0), fighter('b', 1, 1.5)]), melee: { attacker: 1, opened: 1 } };
    const r = seizeInitiative(f);
    expect(r.fight.upper).toBe(1);
    expect(r.log).toEqual([]);
  });

  it('nobody has it while free, however near (the roll belongs to the meeting): Reaktion is rolled as blades cross', () => {
    const near = seizeInitiative(startFight([fighter('a', 0, 0), fighter('b', 1, 6)]));
    expect(near.fight.upper).toBeUndefined();
    expect(near.log).toEqual([]);
    const r = resolveRound(near.fight, { a: { move: { x: 4.5, z: 0 } } }, RULES, Rng.fromSeed(5), { pauseOnOpen: true });
    expect(r.log.find((l) => l.k === 'open')).toMatchObject({ rolls: [expect.anything(), expect.anything()] });
  });

  it('both closing in meet in the middle (they move at the same time), never passing through each other', () => {
    const f = startFight([fighter('a', 0, 0), fighter('b', 1, 8)]);
    const r = resolveRound(f, { a: { move: { x: 6.5, z: 0 } }, b: { move: { x: 1.5, z: 0 } } }, RULES, Rng.fromSeed(5), { pauseOnOpen: true });
    const [a, b] = r.fight.fighters;
    expect(a.x).toBeGreaterThan(2.5);
    expect(b.x).toBeLessThan(5.5);
    expect(b.x - a.x).toBeGreaterThan(1.4);
    expect(b.x - a.x).toBeLessThanOrEqual(2);
    expect(r.log.filter((l) => l.k === 'move').map((l) => (l as { metres: number }).metres > 2)).toEqual([true, true]);
  });

  it('two free fighters reaching for the one sword roll Reaktion for it; the winner has it', () => {
    const f: Fight = { ...startFight([fighter('a', 0, 0, { weapon: null }), fighter('b', 1, 2.5, { weapon: null })]), ground: [{ id: 'sw', weapon: row('Stridssvärd'), x: 1.2, z: 0 }] };
    const r = resolveRound(f, { a: { pickUp: 'sw' }, b: { pickUp: 'sw' } }, RULES, Rng.fromSeed(2));
    const race = r.log.find((l) => l.k === 'race') as Extract<LogLine, { k: 'race' }>;
    expect(race).toMatchObject({ item: 'sw' });
    expect(r.fight.fighters.find((x) => x.id === race.ids[0])!.weapon?.id).toBe('sw');
  });

  it('decides the roles when blades cross that round, goes first for a weapon, and lasts one round', () => {
    for (const upper of [0, 1]) {
      const f = { ...startFight([fighter('a', 0, 0), fighter('b', 1, 4)]), upper };
      const r = resolveRound(f, { a: { move: { x: 2.5, z: 0 } } }, RULES, Rng.fromSeed(5), { pauseOnOpen: true });
      expect(r.fight.melee?.attacker).toBe(upper);
      expect(r.log.find((l) => l.k === 'open')).toMatchObject({ rolls: [] });
    }
    // Both reach for the one sword on the ground: whoever has the upper hand gets it.
    for (const upper of [0, 1]) {
      const f: Fight = { ...startFight([fighter('a', 0, 0, { weapon: null }), fighter('b', 1, 2.5, { weapon: null })]), upper, ground: [{ id: 'sw', weapon: row('Stridssvärd'), x: 1.2, z: 0 }] };
      const r = resolveRound(f, { a: { pickUp: 'sw' }, b: { pickUp: 'sw' } }, RULES, Rng.fromSeed(2));
      expect(r.fight.fighters[upper].weapon?.id).toBe('sw');
      expect(r.fight.upper).toBeUndefined();
    }
  });

  it('lets someone who knows the other’s tactic lean to the answer', () => {
    const f = { ...startFight([fighter('a', 0, 0), fighter('b', 1, 1.5)]), melee: { attacker: 0, opened: 1 } };
    const style: Style = { ...STYLE, lines: [{ do: 'strike', weights: { standard: 1, quick: 1, powerful: 1 } }, { do: 'defend', weights: { standard: 1, defensive: 1, counter: 1 } }] };
    const count = (known: Parameters<typeof chooseFor>[4], key: 'attack' | 'defend', value: string) => {
      const rng = Rng.fromSeed(11);
      let n = 0;
      for (let i = 0; i < 400; i++) if (chooseFor(f, key === 'attack' ? 'a' : 'b', style, rng, known)[key] === value) n++;
      return n;
    };
    expect(count({ defend: 'counter' }, 'attack', 'quick')).toBeGreaterThan(count(undefined, 'attack', 'quick') + 60);
    expect(count({ attack: 'powerful' }, 'defend', 'counter')).toBeGreaterThan(count(undefined, 'defend', 'counter') + 60);
  });
});

describe('a round', () => {
  it('walks 5 m and opens a melee within 2 m', () => {
    let f = startFight([fighter('a', 0, 0), fighter('b', 1, 8)]);
    let r = resolveRound(f, { a: { move: { x: 8, z: 0 } } }, RULES, Rng.fromSeed(1));
    expect(r.fight.fighters[0].x).toBeCloseTo(5);
    expect(r.fight.melee).toBeNull();
    f = r.fight;
    r = resolveRound(f, { a: { move: { x: 6.5, z: 0 } } }, RULES, Rng.fromSeed(2));
    expect(r.fight.melee).not.toBeNull();
    expect(r.log.some((l) => l.k === 'open')).toBe(true);
    expect(r.log.some((l) => l.k === 'attack')).toBe(true);
    expect(['attacker', 'defender']).toContain(roleOf(r.fight, 'a'));
  });

  it('is deterministic for a seed, and a fight to the end has a winner', () => {
    const play = (seed: number) => {
      let f: Fight = startFight([fighter('a', 0, 0), fighter('b', 1, 1.5)]);
      const rng = Rng.fromSeed(seed);
      const lines: string[] = [];
      for (let i = 0; i < 60 && f.winner === null; i++) {
        const r = resolveRound(f, { a: chooseFor(f, 'a', STYLE, rng), b: chooseFor(f, 'b', STYLE, rng) }, RULES, rng);
        f = r.fight;
        lines.push(...r.log.map((l) => l.k));
      }
      return { f, lines };
    };
    const one = play(7), two = play(7);
    expect(one.lines).toEqual(two.lines);
    expect(one.f.winner).not.toBeNull();
    // Over many seeds, both sides win sometimes and fights don't run forever.
    const winners = new Set<number>();
    for (let s = 1; s <= 30; s++) {
      const { f } = play(s);
      expect(f.winner).not.toBeNull();
      winners.add(f.winner!);
    }
    expect(winners.has(0) && winners.has(1)).toBe(true);
  });

  it('can retreat, but not in the round the melee opened', () => {
    const f = startFight([fighter('a', 0, 0), fighter('b', 1, 1.5)]);
    const r1 = resolveRound(f, { a: { retreat: true }, b: { retreat: true } }, RULES, Rng.fromSeed(3));
    expect(r1.log.some((l) => l.k === 'retreat')).toBe(false);
    const att = r1.fight.melee!.attacker === 0 ? 'a' : 'b';
    if (r1.fight.winner === null && r1.fight.fighters.every((x) => !x.injuries.out)) {
      const r2 = resolveRound(r1.fight, { [att]: { retreat: true } }, RULES, Rng.fromSeed(4));
      expect(r2.log.some((l) => l.k === 'retreat')).toBe(true);
      expect(r2.fight.melee).toBeNull();
    }
  });

  it('drops what is in the hit arm, and it can be picked up as a side action', () => {
    const f = startFight([fighter('a', 0, 0), fighter('b', 1, 1.5)]);
    const log: never[] = [];
    dropFrom(f, f.fighters[1], ['rightArm'], Rng.fromSeed(5), log);
    expect(f.fighters[1].weapon).toBeNull();
    expect(f.ground).toHaveLength(1);
    const g = f.ground[0];
    expect(Math.hypot(g.x - 1.5, g.z)).toBeGreaterThanOrEqual(1);
    expect(Math.hypot(g.x - 1.5, g.z)).toBeLessThanOrEqual(3.01);
    // Without a weapon, the brawler parries with bare hands; the dropped sword is picked up next round.
    const c = chooseFor(f, 'b', STYLE, Rng.fromSeed(6));
    expect(c.pickUp).toBe('b-sword');
    const r = resolveRound(f, { b: { pickUp: 'b-sword' } }, RULES, Rng.fromSeed(6));
    const b = r.fight.fighters[1];
    expect(b.weapon?.id).toBe('b-sword');
    expect(r.fight.ground).toHaveLength(0);
    expect(r.log[0]).toEqual({ k: 'pickUp', who: 'b', item: 'b-sword' });
    // A two-handed grip and a Secure item stay.
    const two = startFight([fighter('c', 0, 0, { weapon: { id: 'axe', weapon: row('Storyxa') } })]);
    dropFrom(two, two.fighters[0], [undefined], Rng.fromSeed(1), []);
    expect(two.fighters[0].weapon?.id).toBe('axe');
  });

  it('the one left standing finishes a knocked-out foe, by their style', () => {
    const f = startFight([fighter('a', 0, 0), fighter('b', 1, 1.5, { injuries: { ...unhurt(), out: true } })]);
    const r = resolveRound(f, {}, RULES, Rng.fromSeed(1));
    expect(r.fight.winner).toBe(0);
    const c = chooseFor(r.fight, 'a', STYLE, Rng.fromSeed(1));
    expect(c.mercy).toBe('b');
    const r2 = resolveRound(r.fight, { a: c }, RULES, Rng.fromSeed(1));
    expect(r2.fight.fighters[1].injuries.dead).toBe(true);
    expect(chooseFor(r.fight, 'a', { ...STYLE, lines: STYLE.lines.filter((l) => l.do !== 'finish') }, Rng.fromSeed(1)).mercy).toBeUndefined();
  });
});
