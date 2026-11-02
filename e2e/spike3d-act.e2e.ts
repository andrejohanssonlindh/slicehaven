/* Browser test: actions on things (B3a): tap a hearth, put it out and light it again through the sheet; sit on a stool; no fire indoors; a torch put out goes dark; a villager lights their hearth at dawn. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { OUT, openPage, startEnv, stopEnv, type Env } from './harness';

let env: Env;
beforeAll(async () => {
  env = await startEnv();
});
afterAll(async () => {
  await stopEnv(env);
});

/** Rolls shown as the result only, going by themselves: quick to get past. */
const quick = { 'slicehaven.settings': JSON.stringify({ v: 1, dice: 'result', diceSkin: 'bone', diceClose: 'auto' }) };

const ready = (page: Page) => page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 60_000 });
const evalIn = (page: Page) => (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
const stopped = (page: Page) => page.waitForFunction(() => !(window as any).spike.world.walking, undefined, { timeout: 40_000 });

/** Where on the page a point of the world is (client px). */
const screenOf = (page: Page, at: string) => page.evaluate(`(() => {
  const w = window.spike.world, p = ${at};
  const v = w.camera.position.clone().set(p.x, p.y, p.z).project(w.camera);
  const r = document.getElementById('view').getBoundingClientRect();
  return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
})()`) as Promise<{ x: number; y: number }>;

/** Tap a piece of furniture of the house the hero is in, by kind (its middle, a little up). */
async function tapPiece(page: Page, kind: string): Promise<void> {
  await page.waitForTimeout(400); // (the cut-away has to open and show the room)
  const p = await screenOf(page, `(() => {
    const g = w.houses.flatMap((h) => h.furniture).find((f) => f.visible && f.userData.thing.kind === ${JSON.stringify(kind)});
    const v = g.getWorldPosition(w.camera.position.clone()); v.y += 0.3; return v;
  })()`);
  await page.mouse.click(p.x, p.y);
}

const offerTexts = (page: Page) => page.locator('#act .offers button span').allTextContents();

describe('spike3d actions', () => {
  it('a tapped hearth can be put out, then lit again with a roll that takes ten minutes', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov', { storage: quick });
    await ready(page);
    const w = evalIn(page);
    expect(await w('w.walkIn()')).not.toBeNull();
    await stopped(page);
    const fire = (await w('w.firesNear()[0]')) as { id: string; kind: string; lit: boolean };
    expect(fire.lit).toBe(true);
    await tapPiece(page, fire.kind);
    await page.waitForSelector('#act:not([hidden])');
    await page.screenshot({ path: `${OUT}act-hearth-sheet.png` });
    expect(await offerTexts(page)).toContain(`Put out the ${fire.kind}`);
    await page.locator('#act .offers button', { hasText: 'Put out' }).click();
    await page.waitForFunction(`!window.spike.world.walking && window.spike.world.states.get(${JSON.stringify(fire.id)}, ${JSON.stringify(fire.kind)}, 'lit') === false`, undefined, { timeout: 20_000 });
    expect(await w(`w.houses.find((h) => h.fireOf && h.fireOf.id === ${JSON.stringify(fire.id)}).chimney`)).toBeNull();
    expect(await page.locator('#notice').textContent()).toMatch(/smother/);
    // Lit again: now the sheet offers lighting it, with Survival; it rolls, and the clock moves on.
    const hour = (await w('w.weather.hour')) as number;
    await tapPiece(page, fire.kind);
    await page.waitForSelector('#act:not([hidden])');
    expect(await offerTexts(page)).toContain(`Light the ${fire.kind}`);
    expect(await page.locator('#act .offers button small').first().textContent()).toBe('Survival');
    await page.locator('#act .offers button', { hasText: 'Light' }).click();
    await page.waitForSelector('.dice-show', { timeout: 10_000 });
    await page.screenshot({ path: `${OUT}act-hearth-roll.png` });
    await page.waitForSelector('.dice-show', { state: 'detached', timeout: 15_000 });
    expect((await w('w.weather.hour')) as number).toBeCloseTo(hour + 10 / 60, 1);
    await page.screenshot({ path: `${OUT}act-hearth-after.png` });
    expect(errors).toEqual([]);
  });

  it('sits on a stool, gets up by walking; no fire can be made indoors', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov', { storage: quick });
    await ready(page);
    const w = evalIn(page);
    expect(await w('w.walkIn()')).not.toBeNull();
    await stopped(page);
    const kinds = (await w('w.houses.flatMap((h) => h.furniture).filter((f) => f.visible).map((f) => f.userData.thing.kind)')) as string[];
    const seat = ['stool', 'innbench', 'bed'].find((k) => kinds.includes(k));
    expect(seat, `a seat among ${kinds.join(', ')}`).toBeDefined();
    await tapPiece(page, seat!);
    await page.waitForSelector('#act:not([hidden])');
    await page.locator('#act .offers button', { hasText: 'Sit on' }).click();
    await page.waitForFunction(() => (window as any).spike.world.sitting, undefined, { timeout: 20_000 });
    for (let k = 0; k < 3; k++) await page.click('#zoom button[data-zoom="1"]');
    await page.waitForTimeout(800);
    const sp = await screenOf(page, '(() => { const v = w.heroFig.place.getWorldPosition(w.camera.position.clone()); v.y += 0.6; return v; })()');
    await page.screenshot({ path: `${OUT}act-sit.png`, clip: { x: Math.max(0, sp.x - 110), y: Math.max(0, sp.y - 110), width: 220, height: 220 } });
    for (let k = 0; k < 3; k++) await page.click('#zoom button[data-zoom="-1"]');
    await page.waitForTimeout(300);
    // Tap the hero: the spot they stand on, and a fire there is refused indoors.
    const hp = await screenOf(page, '(() => { const v = w.heroFig.place.getWorldPosition(w.camera.position.clone()); v.y += 0.8; return v; })()');
    await page.mouse.click(hp.x, hp.y);
    await page.waitForSelector('#act:not([hidden])');
    expect(await page.locator('#act .name').textContent()).toBe('Where you stand');
    await page.locator('#act .offers button', { hasText: 'Make a fire' }).click();
    await page.waitForFunction(() => /Not indoors/.test(document.getElementById('notice')!.textContent ?? ''), undefined, { timeout: 5_000 });
    expect(await w('w.campfires')).toBe(0);
    // Walking gets them up.
    expect(await w('w.walkIn()')).not.toBeNull();
    await stopped(page);
    expect(await w('w.sitting')).toBe(false);
    expect(errors).toEqual([]);
  });

  it('a torch put out goes dark and gives no fire to the field', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov&map=hamlet', { storage: quick });
    await ready(page);
    const w = evalIn(page);
    await page.waitForTimeout(1500);
    const torch = (await w(`(() => {
      for (const [id, f] of w.placedFires) if (f.kind === 'torchpost') return { id, kind: f.kind, x: f.torch.light.position.x, z: f.torch.light.position.z };
      return null;
    })()`)) as { id: string; kind: string; x: number; z: number } | null;
    expect(torch).not.toBeNull();
    const target = JSON.stringify({ id: torch!.id, kind: torch!.kind, x: torch!.x, z: torch!.z, level: 0, house: null });
    const r = (await w(`w.act('verb:putout', ${target}, { id: 'hero', dice: () => ({ n: 3, mod: 0 }) })`)) as { done: boolean };
    expect(r.done).toBe(true);
    expect(await w(`(() => { const f = w.placedFires.get(${JSON.stringify(torch!.id)}); return { flame: f.torch.flame.visible, pooled: w.torches.includes(f.torch) }; })()`)).toEqual({ flame: false, pooled: false });
    expect(errors).toEqual([]);
  });

  it('a villager lights the hearth of their home at dawn, through the same action', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?nogov&map=hamlet', { storage: quick });
    await ready(page);
    const w = evalIn(page);
    // The innkeeper's hearth, put out in the night; stand by the inn so they are not too far to stir.
    const fire = (await w(`w.fireOf('inn')`)) as { id: string; kind: string; x: number; z: number };
    expect(fire).not.toBeNull();
    await w(`(w.weather.setHour(5.9), w.states.set(${JSON.stringify(fire.id)}, ${JSON.stringify(fire.kind)}, 'lit', false), w.placeHeroAt(${fire.x + 6}, ${fire.z + 6}), 0)`);
    await w('(w.dayMinutes = 0, w.weather.setHour(6.05), 0)');
    await page.waitForFunction(`window.spike.world.states.get(${JSON.stringify(fire.id)}, ${JSON.stringify(fire.kind)}, 'lit') === true`, undefined, { timeout: 60_000 });
    expect((await w(`w.minds.find((m) => m.id === 'keeper').doing`))).toBe('tendfire');
    expect(errors).toEqual([]);
  });
});
