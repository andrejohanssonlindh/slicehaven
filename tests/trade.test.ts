import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../src/content/skillweb';
import { PERSON_KINDS } from '../src/content/people';
import { THINGS } from '../src/content/things';
import { defaultHero } from '../src/content/rollables';
import { diceOf } from '../src/core/hero';
import { Rng } from '../src/core/rng';
import type { Doer } from '../src/core/world3d/actions';
import { ASK_BUY, ASK_LEAVE, ASK_SELL, BUY, HAGGLE, SELL, type TalkCase, type TalkPerson, newTalkMemory, talk, talkOffers, tradeAsks } from '../src/core/world3d/talk';
import { ROOM_PRICE, buyPrice, haggleSteps, payFrom, sellPrice } from '../src/core/world3d/trade';

const hero = defaultHero();
const doer: Doer = { id: 'hero', dice: (s) => diceOf(hero, s) };
const keeper: TalkPerson = { id: 'k', name: 'Wenna', kind: 'human', tags: PERSON_KINDS.resolve({ is: ['human', 'job-innkeeper'] }).chain, home: 'shop' };

function shop(money = 10, room = true): TalkCase {
  return {
    hero: { kind: hero.kind, people: hero.people, tags: hero.tags }, flags: {}, memory: newTalkMemory(), library: LIBRARY, money,
    trade: {
      sells: [{ kind: 'loaf', name: 'loaf', value: 0.2 }, { kind: 'pan', name: 'pan', value: 20 }],
      buys: [{ id: 'mine:pan', name: 'pan', value: 20 }],
      money, day: 3, room: () => room,
    },
  };
}

describe('prices', () => {
  it('the list price at an even mood; cheaper for a friend, dearer for someone wary; haggling moves it', () => {
    expect(buyPrice(20, 0)).toBe(20);
    expect(buyPrice(20, 2)).toBe(18);
    expect(buyPrice(20, -1)).toBe(23);
    expect(buyPrice(20, 0, 2)).toBe(16);
    expect(buyPrice(0.01, 0)).toBe(0.1);
  });

  it('they pay half for what you sell them, more if they like you or you haggled', () => {
    expect(sellPrice(20, 0)).toBe(10);
    expect(sellPrice(20, 0, 1)).toBe(11);
    expect(sellPrice(20, -2)).toBeLessThan(10);
  });

  it('haggling: a step off, one more an advantage, up to three; a failure one on', () => {
    expect(haggleSteps(true, 0)).toBe(1);
    expect(haggleSteps(true, 5)).toBe(3);
    expect(haggleSteps(false, 0)).toBe(-1);
  });

  it('paying takes from purses in order, or nothing if they hold too little', () => {
    expect(payFrom([{ id: 'a', coins: 2 }, { id: 'b', coins: 5 }], 3.5)).toEqual({ a: 0, b: 3.5 });
    expect(payFrom([{ id: 'a', coins: 2 }], 3)).toBeNull();
  });
});

describe('trading in a talk', () => {
  it('a seller offers Buy, Sell and Haggle; the lists say the price', () => {
    const c = shop(), ids = talkOffers(keeper, c).map((o) => o.id);
    expect(ids).toEqual(expect.arrayContaining([ASK_BUY, ASK_SELL, HAGGLE]));
    expect(tradeAsks(keeper, c, 'buy').map((o) => o.label)).toEqual(['Loaf: 0.2 s', 'Pan: 20 s']);
    expect(tradeAsks(keeper, c, 'sell').map((o) => o.label)).toEqual(['Pan: 10 s']);
    const plain = { ...shop(), trade: undefined };
    expect(talkOffers(keeper, plain).map((o) => o.id)).not.toContain(ASK_BUY);
  });

  it('buying: paid if you can, refused if you can\'t pay or carry it', () => {
    expect(talk(BUY + 'pan', keeper, doer, shop(25), Rng.fromSeed(1))).toMatchObject({ done: true, buy: { kind: 'pan', price: 20 } });
    expect(talk(BUY + 'pan', keeper, doer, shop(5), Rng.fromSeed(1)).done).toBe(false);
    expect(talk(BUY + 'loaf', keeper, doer, shop(5, false), Rng.fromSeed(1)).done).toBe(false);
    expect(talk(SELL + 'mine:pan', keeper, doer, shop(), Rng.fromSeed(1))).toMatchObject({ done: true, sell: { id: 'mine:pan', price: 10 } });
  });

  it('haggling once a day, and it moves the prices that day', () => {
    const c = shop();
    const r = talk(HAGGLE, keeper, doer, c, Rng.fromSeed(4));
    expect(r.done).toBe(true);
    expect(r.roll).toBeDefined();
    const pan = tradeAsks(keeper, c, 'buy')[1].label;
    expect(pan).toBe(r.success ? `Pan: ${buyPrice(20, 0, c.memory.haggle!.k.off)} s` : 'Pan: 22 s');
    expect(talkOffers(keeper, c).map((o) => o.id)).not.toContain(HAGGLE);
    expect(talk(HAGGLE, keeper, doer, c, Rng.fromSeed(5)).done).toBe(false);
  });

  it('a room at the inn is paid for, and refused without the silver', () => {
    const inn: TalkPerson = { ...keeper, leaveAsk: 'Ask {name} for a room for the night' };
    const c = { ...shop(5), hasLeave: () => false };
    expect(talk(ASK_LEAVE, inn, doer, c, Rng.fromSeed(1))).toMatchObject({ done: true, pay: ROOM_PRICE, leave: 'shop' });
    expect(talk(ASK_LEAVE, inn, doer, { ...shop(0.5), hasLeave: () => false }, Rng.fromSeed(1)).done).toBe(false);
  });

  it('every kind a shop sells exists and has a price', () => {
    for (const id of THINGS.placeable) {
      for (const k of THINGS.get(id).sells?.kinds ?? []) {
        expect(THINGS.has(k), `${id} sells ${k}, which is no kind`).toBe(true);
        expect(THINGS.get(k).value, `${k} has no price`).toBeGreaterThan(0);
      }
    }
  });
});
