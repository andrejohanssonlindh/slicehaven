/* Browser test: money and trade (B6): the hero's purse holds their silver; the general store's keeper sells (Buy… list, a tinderbox bought into the pack, paid) and buys (a tinderbox sold, silver in); the inn's room is paid for. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

const easy = { 'slicehaven.settings': JSON.stringify({ v: 1, dice: 'result', diceSkin: 'bone', diceClose: 'auto', difficulty: 'easy' }) };

describe('spike3d trade', () => {
  it('buy, sell and a room at the inn, paid out of the purse', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=hamlet&nogov', { storage: easy });
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    await page.waitForTimeout(1500);
    await w('(w.dayMinutes = 0, w.weather.setHour(12), 0)');
    // The shepherd's purse: 8 silver, in a pocket.
    expect(await w('w.pack.money')).toBe(8);
    const count = (kind: string) => w(`Object.values(w.carry.loose).filter((l) => l.kind === ${JSON.stringify(kind)} && !l.at).length`) as Promise<number>;

    // The general store's keeper: walk up to them and talk.
    const keeper = (await w(`(() => {
      const house = w.layout.houses.find((h) => h.room === 'general').id;
      const c = w.cast.find((x) => x.who.home === house);
      w.placeHeroAt(c.mind.actor.x + 0.8, c.mind.actor.z, c.mind.actor.house ? c.mind.actor.level : 0);
      return c.who.id;
    })()`)) as string;
    await page.evaluate((id) => (window as unknown as { spike: { talk: { open(id: string): void } } }).spike.talk.open(id), keeper);
    await page.waitForSelector('#talk:not([hidden]) .choices button:has-text("sells")', { timeout: 45_000 });
    await page.locator('#talk .choices button', { hasText: 'sells' }).click();
    await page.waitForSelector('#talk .choices button:has-text("Tinderbox: 3 s")');
    await page.screenshot({ path: `${OUT}trade-buy.png` });
    // Buy a tinderbox: 3 silver out, a second tinderbox in the pack.
    await page.locator('#talk .choices button', { hasText: 'Tinderbox: 3 s' }).click();
    await page.waitForFunction(() => /You pay 3 s/.test(document.querySelector('#talk .log')!.textContent ?? ''), undefined, { timeout: 10_000 });
    expect(await w('w.pack.money')).toBe(5);
    expect(await count('tinderbox')).toBe(2);
    // The pan is too dear now (20 s).
    await page.locator('#talk .choices button', { hasText: 'Pan: 20 s' }).click();
    await page.waitForFunction(() => /can't pay/.test(document.querySelector('#talk .log')!.textContent ?? ''), undefined, { timeout: 10_000 });
    expect(await count('pan')).toBe(0);

    // Sell a tinderbox back: half its price, into the purse.
    await page.locator('#talk .choices button', { hasText: 'Something else' }).click();
    await page.locator('#talk .choices button', { hasText: 'Sell something' }).click();
    await page.locator('#talk .choices button', { hasText: 'Tinderbox: 1.5 s' }).first().click();
    await page.waitForFunction(() => /pays you 1.5 s/.test(document.querySelector('#talk .log')!.textContent ?? ''), undefined, { timeout: 10_000 });
    expect(await w('w.pack.money')).toBe(6.5);
    expect(await count('tinderbox')).toBe(1);
    await page.click('#talk .close');

    // A room at the inn: paid for out of the purse.
    const inn = (await w(`(() => {
      const house = w.layout.houses.find((h) => h.room === 'taproom').id;
      return w.cast.find((x) => x.who.home === house).who.id;
    })()`)) as string;
    const hero = '{ id: "hero", dice: () => ({ n: 3, mod: 0 }) }';
    const r = (await w(`w.talking.talkTo('talk:leave', ${JSON.stringify(inn)}, ${hero}, { kind: 'human', tags: [] })`)) as { done: boolean; pay?: number };
    expect(r).toMatchObject({ done: true, pay: 1 });
    expect(await w("w.pack.money")).toBe(5.5);
    expect(errors).toEqual([]);
  }, 180_000);
});
