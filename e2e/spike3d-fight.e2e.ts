/* Browser test: a fight in the arena (B8a, B8g F2–F4; a second test runs a fight in dice mode, one roll a step): draw and put away your own weapon; pick a sword (and a shield for the left arm) up off the sand, fight the gladiator round by round in fast mode (each exchange played out, what it did floating up, body outlines, the dice behind a tap on the log; the view swings side-on; every move in your column, Offensive and Defensive, the one you lack greyed with why; the foe mirrored, their move shown when you are quicker; the Move row) until one side wins, and what it left (the dead, the injuries) is kept through a reload. */
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

    // The hero's own gear (the shepherd's quarterstaff) is carried on them: tap yourself → Draw a weapon; Put away.
    expect(await w('w.stowed.map((s) => s.kind)')).toEqual(['quarterstaff']);
    await w(`(window.spike.sheet.open(null), 0)`);
    await page.click('#act .offers button:has-text("Draw a weapon")');
    expect(await w('w.holding')).toBe('quarterstaff');
    expect(await w('w.inHand.has("hero")')).toBe(true);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/fight-drawn.png` });
    await w(`(window.spike.sheet.open(null), 0)`);
    await page.click('#act .offers button:has-text("Put away the quarterstaff")');
    expect(await w('w.holding')).toBeNull();
    expect(await w('w.stowed.length')).toBe(1);

    // The gong calls a fresh gladiator at the level picked; the rack hands out any weapon (then put it back down).
    const thing = async (kind: string) => (await w(`(() => {
      for (const lc of w.chunks.values()) for (const g of lc.standing.objects) if (g.userData.thing?.kind === '${kind}') return w.targetOf(g);
      return null;
    })()`)) as { id: string; x: number; z: number } | null;
    const gong = await thing('gong'), rack = await thing('weapon-rack');
    expect(gong && rack).toBeTruthy();
    const level0 = await w('w.sheetOf("gladiator").level');
    await w(`(w.placeHeroAt(${gong!.x}, ${gong!.z + 1.4}), window.spike.sheet.open(${JSON.stringify(gong)}), 0)`);
    await page.click('#act .offers button:has-text("call a fighter")');
    await page.waitForSelector('#act .offers button:has-text("Master")', { timeout: 15_000 });
    await page.screenshot({ path: `${OUT}/fight-gong.png` });
    await page.click('#act .offers button:has-text("Capable")');
    expect(await w('w.sheetOf("gladiator").level')).toBe('capable');
    expect(level0).toBe('novice');
    await w(`(w.placeHeroAt(${rack!.x}, ${rack!.z - 1.4}), window.spike.sheet.open(${JSON.stringify(rack)}), 0)`);
    await page.click('#act .offers button:has-text("Take something")');
    await page.waitForSelector('#act .offers button:has-text("Greatsword")', { timeout: 15_000 });
    await page.screenshot({ path: `${OUT}/fight-rack.png` });
    await page.click('#act .offers button:has-text("Hunting spear")');
    expect(await w('w.holding')).toBe('hunting-spear');
    expect(await w('w.inHand.has("hero")')).toBe(true);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/fight-spear.png` });
    await w(`(w.act('verb:put-down', null, { id: 'hero', dice: () => ({ n: 3, mod: 0 }) }), 0)`);
    expect(await w('w.holding')).toBeNull();

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

    // A shield from the rack goes on the left forearm, beside the sword in the right hand.
    await w(`(w.placeHeroAt(${rack!.x}, ${rack!.z - 1.4}), window.spike.sheet.open(${JSON.stringify(rack)}), 0)`);
    await page.click('#act .offers button:has-text("Take something")');
    await page.click('#act .offers button:has-text("Buckler")');
    expect(await w('w.shieldOf("hero")?.kind')).toBe('buckler');
    expect(await w('w.wieldedBy("hero")?.kind')).toBe('arming-sword');
    // Drawn: the buckler on the left forearm, the sword in the right hand.
    expect(await w('w.figureOf("hero").rig.left.children.length')).toBe(1);
    expect(await w('w.figureOf("hero").rig.hand.children.length')).toBe(1);
    await w(`(w.placeHeroAt(${sword!.x - 0.8}, ${sword!.z}), 0)`);
    // (Zoomed in to see the buckler on the arm, then back.)
    for (let i = 0; i < 4; i++) await page.click('#zoom button[data-zoom="1"]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/fight-shield.png` });
    for (let i = 0; i < 4; i++) await page.click('#zoom button[data-zoom="-1"]');

    // A quick hero (Reaktion 8D6): quicker when it is rolled, so they see what the gladiator means to do.
    await w(`(window.spike.hero.dice['attr:Reaktion'] = { n: 8, mod: 0 }, 0)`);
    // Fight the gladiator: the panel opens, the world waits, they draw their own sword.
    await w(`(fight.start('gladiator'), 0)`);
    expect(await page.isVisible('#fight')).toBe(true);
    expect(await w('w.inFight')).toBe(true);
    expect(await w('w.wieldedBy("gladiator")?.kind')).toMatch(/sword/);
    // Fast mode (the default, B8g F3): count what floats up over the fighters, and the body outlines in both cards.
    await page.evaluate(() => {
      const o = window as unknown as { floats: string[] };
      o.floats = [];
      new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if ((n as HTMLElement).classList?.contains('fight-float')) o.floats.push((n as HTMLElement).className + ':' + n.textContent); })
        .observe(document.getElementById('stage')!, { childList: true });
    });
    expect(await page.locator('#fight .us .card .outline svg rect').count()).toBe(6);
    expect(await page.locator('#fight .them .card .outline svg rect').count()).toBe(6);
    // Your card says what you fight with: the sword and the buckler.
    expect(await page.textContent('#fight .us .card')).toMatch(/arming sword and buckler/);
    // The view swings side-on to the fight (B8g): the line from you to them runs left to right on screen.
    await page.waitForTimeout(1500);
    expect(await w(`(() => { const h = w.fighterAt('hero'), g = w.fighterAt('gladiator'); const want = Math.atan2(-(g.z - h.z), g.x - h.x); return Math.abs(Math.atan2(Math.sin(w.yaw - want), Math.cos(w.yaw - want))); })()`)).toBeLessThan(0.05);
    // Every defence is shown, with a block row for the buckler; a dodge can't counter.
    expect(await page.$$eval('#fight .us .moves button[data-move^="def:"]', (bs) => bs.map((b) => (b as HTMLElement).dataset.move))).toEqual(
      ['def:parry:standard', 'def:parry:defensive', 'def:parry:counter', 'def:block:standard', 'def:block:defensive', 'def:block:counter', 'def:dodge:standard', 'def:dodge:defensive'],
    );
    const hour = await w('w.weather.hour');

    // Moving on purpose: a tap on the ground plans the round's move (a mark there), offered as a choice.
    await page.waitForSelector('#fight .choices button', { timeout: 60_000 });
    await w(`(() => { const h = w.fighterAt('hero'); fight.tap(null, { x: h.x + 3, z: h.z + 1 }); return 0; })()`);
    expect(await page.$$eval('#fight .choices button', (bs) => bs.map((b) => b.textContent ?? ''))).toContainEqual(expect.stringMatching(/^Walk there \(3\.\d m\)/));
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/fight-plan.png` });
    // The panel leaves the fighters in view: at the bottom on a phone (the view aims above it); when wide, between
    // the two columns and above the strip at the bottom.
    expect((await w('w.viewAim.y')) as number).toBeGreaterThan(0.3);
    await page.setViewportSize({ width: 1200, height: 760 });
    await page.waitForTimeout(1200);
    expect(Math.abs((await w('w.viewAim.x')) as number)).toBeLessThan(0.2);
    expect((await w('w.viewAim.y')) as number).toBeGreaterThan(0.1);
    expect(await page.isVisible('#fight .them .group.defend')).toBe(true);
    await page.screenshot({ path: `${OUT}/fight-wide.png` });
    await page.setViewportSize({ width: 400, height: 720 });
    await page.waitForTimeout(600);

    // Each round: counter when defending (to win the attack back, and with it the upper hand), a standard blow when
    // attacking, else the first thing in the Move row (close in…), until it is over.
    let rounds = 0, sawIntent = false, sawWhy = false, shotFloat = false;
    for (; rounds < 60; rounds++) {
      await page.waitForSelector('#fight .us .moves button:not([disabled]), #fight .choices button', { timeout: 60_000 });
      const labels = await page.$$eval('#fight .choices button', (bs) => bs.map((b) => b.textContent ?? ''));
      if (labels.some((l) => /^OK$|New game/.test(l))) break;
      const can = await page.$$eval('#fight .us .moves button:not([disabled])', (bs) => bs.map((b) => (b as HTMLElement).dataset.move ?? ''));
      // With the upper hand you see what they mean to do before you choose (their move lit on a wide screen).
      if (!sawIntent && (await page.isVisible('#fight .them .gist:not(.unknown)'))) {
        sawIntent = true;
        expect(await page.textContent('#fight .them .gist')).toMatch(/means to/);
        await page.screenshot({ path: `${OUT}/fight-intent.png` });
      }
      // In a melee the group you don't have says why.
      if (!sawWhy && can.length && (await page.isVisible('#fight .us .group.off .why'))) {
        sawWhy = true;
        expect(await page.textContent('#fight .us .group.off .why')).toMatch(/You’re (attacking|defending): /);
      }
      if (rounds === 3) {
        await page.screenshot({ path: `${OUT}/fight-round.png` });
        // Your card opens the condition sheet: fatigue and where it came from, dice off rolls, wounds.
        await page.click('#fight .us .card');
        expect(await page.isVisible('#condition')).toBe(true);
        await page.screenshot({ path: `${OUT}/fight-condition.png` });
        await page.click('#condition .close');
      }
      const pick = can.find((m) => m.endsWith(':counter')) ?? can.find((m) => m === 'atk:standard');
      await page.click(pick ? `#fight .us .moves button[data-move="${pick}"]` : '#fight .choices button');
      // One picture of an exchange as it plays: the motions and what floats up.
      if (pick && !shotFloat && (await page.waitForSelector('.fight-float', { timeout: 4000 }).catch(() => null))) {
        shotFloat = true;
        await page.waitForTimeout(250);
        await page.screenshot({ path: `${OUT}/fight-float.png` });
      }
      await page.waitForTimeout(100);
    }
    expect(sawWhy).toBe(true);
    // Every exchange floated what it did over the one hit (a number on easy) or how it was met.
    const floats = (await page.evaluate(() => (window as unknown as { floats: string[] }).floats)) as string[];
    expect(floats.length).toBeGreaterThan(0);
    expect(floats.some((f) => /hit:\d|miss:(parried|blocked|dodged|missed)/.test(f))).toBe(true);
    // The dice were rolled, not shown: a line with a die opens them.
    expect(await page.locator('#fight .log p.rolls').count()).toBeGreaterThan(0);
    await page.locator('#fight .log p.rolls').first().click();
    await page.waitForSelector('.dice-lines', { timeout: 15_000 });
    await page.waitForSelector('.dice-show', { state: 'detached', timeout: 15_000 });
    expect(rounds).toBeLessThan(60);
    expect(await w('w.weather.hour')).toBe(hour); // the clock stood still
    await page.screenshot({ path: `${OUT}/fight-end.png` });
    const log = await page.$$eval('#fight .log p', (ps) => ps.map((p) => p.textContent ?? ''));
    expect(log.some((l) => /strike.*against/i.test(l))).toBe(true);
    // Near enough, someone was quicker (Reaktion) and so saw the other's choice first.
    expect(log.some((l) => /is quicker|are quicker/.test(l))).toBe(true);
    expect(log.some((l) => /You are quicker/.test(l))).toBe(true);
    expect(sawIntent).toBe(true);
    const heroDead = (await w('!!w.injuriesOf("hero")?.dead')) as boolean;
    const labels = await page.$$eval('#fight .choices button', (bs) => bs.map((b) => b.textContent ?? ''));
    if (heroDead) expect(labels).toContain('New game');
    else {
      // Won (or spared): finish them if offered, then OK; the world goes on.
      if (labels.includes('Finish them')) {
        await page.click('#fight .choices button:has-text("Finish them")');
        await page.waitForSelector('#fight .choices button:text-is("OK")', { timeout: 60_000 });
        expect(await w('!!w.injuriesOf("gladiator")?.dead')).toBe(true);
      }
      await page.click('#fight .choices button:text-is("OK")');
      expect(await w('w.inFight')).toBe(false);
      // Fatigue comes back with time (Q49).
      const before = (await w('w.injuriesOf("hero")?.fatigue ?? 0')) as number;
      if (before > 0) {
        await page.waitForTimeout(4000); // a real second is a world minute with the clock stopped; easy: a point a minute
        expect((await w('w.injuriesOf("hero").fatigue')) as number).toBeLessThan(before);
      }
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

  it('dice mode (B8g F4): each blow shows one roll a step, the exchange plays out between them', async () => {
    const dice = { 'slicehaven.settings': JSON.stringify({ v: 1, dice: 'result', diceSkin: 'bone', diceClose: 'auto', difficulty: 'easy', fight: 'dice' }) };
    const { page, errors } = await openPage(env, '/spike3d/?map=arena&nogov', { storage: dice });
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; const fight = window.spike.fight; return ${fn}; })()`);
    await page.waitForTimeout(1500);
    // What each show of dice says, and what floats up.
    await page.evaluate(() => {
      const o = window as unknown as { shows: string[]; floats: string[] };
      o.shows = [];
      o.floats = [];
      new MutationObserver((ms) => {
        for (const m of ms) for (const n of m.addedNodes) {
          const e = n as HTMLElement;
          if (e.classList?.contains('dice-lines')) o.shows.push(e.textContent ?? '');
          if (e.classList?.contains('fight-float')) o.floats.push(e.textContent ?? '');
        }
      }).observe(document.body, { childList: true, subtree: true });
    });
    await w(`(window.spike.hero.dice['attr:Reaktion'] = { n: 8, mod: 0 }, 0)`);
    await w(`(fight.start('gladiator'), 0)`);
    // Fight until someone is hit (or a few rounds): close in, strike, defend.
    for (let rounds = 0; rounds < 30; rounds++) {
      await page.waitForSelector('#fight .us .moves button:not([disabled]), #fight .choices button', { timeout: 90_000 });
      const shows = (await page.evaluate(() => (window as unknown as { shows: string[] }).shows)) as string[];
      if (shows.some((x) => /Where \(D10\)/.test(x))) break;
      const labels = await page.$$eval('#fight .choices button', (bs) => bs.map((b) => b.textContent ?? ''));
      if (labels.some((l) => /^OK$|New game/.test(l))) break;
      const can = await page.$$eval('#fight .us .moves button:not([disabled])', (bs) => bs.map((b) => (b as HTMLElement).dataset.move ?? ''));
      const pick = can.find((m) => m === 'atk:powerful') ?? can.find((m) => m === 'def:parry:standard');
      await page.click(pick ? `#fight .us .moves button[data-move="${pick}"]` : '#fight .choices button');
      await page.waitForTimeout(100);
    }
    const shows = (await page.evaluate(() => (window as unknown as { shows: string[] }).shows)) as string[];
    // The attack, with the defence beside it; where it lands on its own; the damage on its own.
    expect(shows.some((x) => /attack/.test(x))).toBe(true);
    const where = shows.find((x) => /Where \(D10\)/.test(x));
    expect(where).toBeTruthy();
    expect(where).not.toMatch(/Damage/);
    expect(shows.some((x) => /Damage/.test(x) && !/Where/.test(x))).toBe(true);
    // A blow floated up and landed on an outline.
    expect(((await page.evaluate(() => (window as unknown as { floats: string[] }).floats)) as string[]).length).toBeGreaterThan(0);
    expect(await page.locator('#fight .card .outline svg path').count()).toBeGreaterThan(0);
    // No dice hidden behind the log in this mode.
    expect(await page.locator('#fight .log p.rolls').count()).toBe(0);
    await page.screenshot({ path: `${OUT}/fight-dice.png` });
    expect(errors).toEqual([]);
  }, 300_000);
});
