/* Browser test: the pack (B6): the hero starts with a pack and kit in pockets and pack; the sheet shows the grids; an add-on is fitted on a side; a thing is taken out, put back from the hand, put down and packed again from the ground; auto-pack; it all stays through a reload. */
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

describe('spike3d pack', () => {
  it('kit, sheet, add-on, take out, put back, put down and pack again, auto-pack, through a reload', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=hamlet&nogov&save', { storage: easy });
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    await page.waitForTimeout(1500);
    const hero = '{ id: "hero", dice: () => ({ n: 3, mod: 0 }) }';
    const idOf = (kind: string) => w(`Object.keys(w.carry.loose).find((id) => w.carry.loose[id].kind === ${JSON.stringify(kind)})`) as Promise<string>;

    // The kit: a pack worn, the rest laid in; the tinderbox in a pocket.
    expect(await w('w.pack.worn?.l.kind')).toBe('backpack');
    const kinds = (await w('w.pack.items.map((i) => w.carry.loose[i.id].kind).sort()')) as string[];
    expect(kinds).toEqual(['loaf', 'pan', 'side-pouch', 'tinderbox', 'waterskin']);
    expect(await w(`w.carry.loose[${JSON.stringify(await idOf('tinderbox'))}].in.grid`)).toBe('pocket:0');
    expect(await w('w.pack.carriedKg')).toBeGreaterThan(4);

    // The sheet: pockets and the pack, a thing picked, then moved by tapping a cell.
    await page.click('#pack-open');
    await page.waitForSelector('#pack:not([hidden]) .grid');
    expect(await page.locator('#pack .grid').count()).toBe(3);
    await page.screenshot({ path: `${OUT}pack-sheet.png` });
    const loaf = await idOf('loaf');
    await page.locator(`#pack .item[data-id="${loaf}"]`).first().click();
    expect(await page.locator('#pack .item.picked').count()).toBe(2);
    await page.locator('#pack .grid[data-grid="pack"] .cell').last().click();
    expect(await w(`w.carry.loose[${JSON.stringify(loaf)}].in`)).toMatchObject({ grid: 'pack', x: 3, y: 5 });

    // The side pouch fitted on the left: a grid of its own beside the pack.
    const pouch = await idOf('side-pouch');
    await page.locator(`#pack .item[data-id="${pouch}"]`).first().click();
    await page.getByRole('button', { name: 'Fit on the side' }).click();
    expect(await w(`w.carry.loose[${JSON.stringify(pouch)}].fitted`)).toBe('left');
    expect(await page.locator('#pack .grid[data-grid="side:left"]').count()).toBe(1);
    await page.screenshot({ path: `${OUT}pack-sheet-addon.png` });

    // Taken out into the hand, then put back in from the hand (the verb on the spot where you stand).
    expect(await w(`w.pack.takeOut(${JSON.stringify(loaf)})`)).toBe(true);
    expect(await w('w.carrying.holding')).toBe('loaf');
    const offers = (await w(`w.acting.offersFor(null, ${hero}).map((o) => o.id)`)) as string[];
    expect(offers).toContain('verb:pack-held');
    expect(((await w(`w.acting.act('verb:pack-held', null, ${hero})`)) as { done: boolean }).done).toBe(true);
    expect(await w('w.carrying.holding')).toBeNull();
    expect(await w(`!!w.carry.loose[${JSON.stringify(loaf)}].in`)).toBe(true);

    // Put down on the ground: it lies there, drawn; packed again from there (yours: no wrong).
    const pan = await idOf('pan');
    expect(await w(`w.pack.drop(${JSON.stringify(pan)})`)).toBe(true);
    expect(await w(`w.carrying.looseDrawn.has(${JSON.stringify(pan)})`)).toBe(true);
    const target = await w(`w.acting.targetOf(w.carrying.looseDrawn.get(${JSON.stringify(pan)}).g)`);
    const r = (await w(`w.acting.act('verb:pack', ${JSON.stringify(target)}, ${hero})`)) as { done: boolean; wrongs?: unknown[] };
    expect(r.done).toBe(true);
    expect(r.wrongs ?? []).toEqual([]);
    expect(await w(`w.carrying.looseDrawn.has(${JSON.stringify(pan)})`)).toBe(false);
    expect(await w(`!!w.carry.loose[${JSON.stringify(pan)}].in`)).toBe(true);

    // Auto-pack, then a reload: the same pack, the pouch still fitted.
    expect(await w('w.pack.autoPack()')).toBe(true);
    const before = await w('JSON.stringify(Object.fromEntries(w.pack.items.map((i) => [i.id, i.at])))');
    await page.reload();
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    await page.waitForTimeout(1500);
    expect(await w('JSON.stringify(Object.fromEntries(w.pack.items.map((i) => [i.id, i.at])))')).toBe(before);
    expect(await w(`w.carry.loose[${JSON.stringify(pouch)}].fitted`)).toBe('left');
    expect(errors).toEqual([]);
  }, 180_000);
});
