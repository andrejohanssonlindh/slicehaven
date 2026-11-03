/* Browser test: leads (B11): tap the statue on the Hamlet's west road and the lead is added; the innkeeper can be asked about it and hands over the next; the journal shows both. */
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

describe('spike3d leads', () => {
  it('a found lead, asked about, grows into the next', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=hamlet&nogov', { storage: easy });
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    await w('(w.dayMinutes = 0, w.weather.setHour(11), w.placeHeroAt(-50, 3.5), w.heroDir = { x: 0, z: -1 }, w.facing = -Math.PI / 2, 0)');
    await page.waitForTimeout(3000);
    expect(await w('w.journal.length')).toBe(0);
    // Tap the statue.
    const at = (await page.evaluate(`(() => { const w = window.spike.world; const v = w.camera.position.clone().set(-50, w.store.heightAt(-50, -0.5) + 1.4, -0.5).project(w.camera); const r = document.getElementById('view').getBoundingClientRect(); return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }; })()`)) as { x: number; y: number };
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(600);
    expect(await page.textContent('#notice')).toContain('Lead added');
    expect(await w('w.journal.map((j) => j.id)')).toEqual(['statue-north']);
    await page.screenshot({ path: `${OUT}leads-statue.png` });
    // Now that you know of it, the statue can be studied (a hidden knowledge read, once).
    expect(await page.textContent('#act .offers')).toContain('Study the statue');
    const t = '(() => { const o = w.layout.props.find((p) => p.lead); return { id: o.kind + "@" + Math.round(o.x * 10) + "," + Math.round(o.z * 10), kind: o.kind, x: o.x, z: o.z, level: 0, house: null }; })()';
    const study = (await w(`w.offersFor(${t}, { id: "hero", dice: () => ({ n: 3, mod: 0 }) }).find((o) => o.id.startsWith("study:"))`)) as { id: string } | undefined;
    expect(study?.id).toBe('study:statue-north');
    // The innkeeper cares: asking about it is offered, and tells you of the well.
    const hero = '{ kind: "human", tags: [] }';
    const r = (await w(`w.talkTo("lead:statue-north", "keeper", { id: "hero", dice: () => ({ n: 3, mod: 0 }) }, ${hero})`)) as { done: boolean; lead?: string };
    expect(r.done).toBe(true);
    expect(r.lead).toBe('hesma-well');
    // The journal shows both.
    await page.click('#act .close').catch(() => {});
    await page.click('#journal-open');
    await page.waitForTimeout(300);
    expect(await page.locator('#journal .lead').count()).toBe(2);
    await page.screenshot({ path: `${OUT}leads-journal.png` });
    expect(errors).toEqual([]);
  });
});
