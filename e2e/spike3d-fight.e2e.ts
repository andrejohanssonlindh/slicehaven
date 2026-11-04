/* Browser test: a fight in the arena (B8a): pick a sword up off the sand (held in the right hand, not slowing you), fight the gladiator round by round from the fight panel until one side wins, and what it left (the dead, the injuries) is kept through a reload. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

const quick = { 'slicehaven.settings': JSON.stringify({ v: 1, dice: 'result', diceSkin: 'bone', diceClose: 'auto', difficulty: 'easy' }) };

describe('spike3d fight', () => {
  it('a sword picked up off the sand is held in the hand; a fight with the gladiator runs to the end and is kept', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=arena&nogov&save', { storage: quick });
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; const fight = window.spike.fight; return ${fn}; })()`);
    await page.waitForTimeout(1500);

    // The sword on the sand by the west gate, as something to act on.
    const sword = (await w(`(() => {
      for (const lc of w.chunks.values()) for (const g of lc.standing.objects) if (g.userData.thing?.kind === 'arming-sword') return w.targetOf(g);
      return null;
    })()`)) as { id: string; x: number; z: number } | null;
    expect(sword).not.toBeNull();
    await w(`(w.placeHeroAt(${sword!.x - 0.8}, ${sword!.z}), 0)`);
    const r = (await w(`w.act('verb:pick-up', ${JSON.stringify(sword)}, { id: 'hero', dice: () => ({ n: 3, mod: 0 }) })`)) as { done: boolean };
    expect(r.done).toBe(true);
    expect(await w('w.holding')).toBe('arming-sword');
    // In the right hand, and not slowing the hero like something carried in both arms.
    expect(await w('w.inHand.has("hero") && w.carryPace === 1')).toBe(true);
    expect(await w(`w.chunks.size && [...w.chunks.values()].some((lc) => lc.standing.objects.some((g) => g.userData.thing?.id === ${JSON.stringify(sword!.id)}))`)).toBe(false);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/fight-sword.png` });

    // Fight the gladiator: the panel opens, the world waits, they draw their own sword.
    await w(`(fight.start('gladiator'), 0)`);
    expect(await page.isVisible('#fight')).toBe(true);
    expect(await w('w.inFight')).toBe(true);
    expect(await w('w.wieldedBy("gladiator")?.kind')).toMatch(/sword/);
    const hour = await w('w.weather.hour');

    // Take the first choice each round (close in, strike, defend…) until it is over.
    let rounds = 0;
    for (; rounds < 60; rounds++) {
      await page.waitForSelector('#fight .choices button', { timeout: 60_000 });
      const labels = await page.$$eval('#fight .choices button', (bs) => bs.map((b) => b.textContent ?? ''));
      if (labels.some((l) => /Walk away|New game/.test(l))) break;
      if (rounds === 3) await page.screenshot({ path: `${OUT}/fight-round.png` });
      await page.click('#fight .choices button');
      await page.waitForTimeout(100);
    }
    expect(rounds).toBeLessThan(60);
    expect(await w('w.weather.hour')).toBe(hour); // the clock stood still
    await page.screenshot({ path: `${OUT}/fight-end.png` });
    const log = await page.$$eval('#fight .log p', (ps) => ps.map((p) => p.textContent ?? ''));
    expect(log.some((l) => /hits|strikes/.test(l))).toBe(true);
    const heroDead = (await w('!!w.injuriesOf("hero")?.dead')) as boolean;
    const labels = await page.$$eval('#fight .choices button', (bs) => bs.map((b) => b.textContent ?? ''));
    if (heroDead) expect(labels).toContain('New game');
    else {
      // Won (or spared): finish them if offered, then walk away; the world goes on.
      if (labels.includes('Finish them')) {
        await page.click('#fight .choices button:has-text("Finish them")');
        await page.waitForSelector('#fight .choices button:has-text("Walk away")', { timeout: 60_000 });
        expect(await w('!!w.injuriesOf("gladiator")?.dead')).toBe(true);
      }
      await page.click('#fight .choices button:has-text("Walk away")');
      expect(await w('w.inFight')).toBe(false);
    }
    // Kept through a reload: whoever died is still dead.
    const dead = (await w('["hero", "gladiator"].filter((id) => w.injuriesOf(id)?.dead)')) as string[];
    await w('(window.spike.world, 0)');
    await page.evaluate(() => dispatchEvent(new Event('pagehide')));
    await page.reload();
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    expect(await w('["hero", "gladiator"].filter((id) => w.injuriesOf(id)?.dead)')).toEqual(dead);
    if (dead.includes('hero')) expect(await page.isVisible('#fight')).toBe(true);
    expect(errors).toEqual([]);
  }, 400_000);
});
