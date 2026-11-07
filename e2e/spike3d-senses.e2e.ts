/* Browser test: perception (B5): sight is rolled on entering; at night the guard sees the hero and watches; a shout by day turns the villagers who hear it and sends the guard to look; on easy the marks show. */
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

describe('spike3d perception', () => {
  it('people see and hear the hero, and react', async () => {
    const { page, errors } = await openPage(env, '/spike3d/?map=hamlet&nogov', { storage: easy });
    await page.waitForFunction(() => !!(window as unknown as { spike?: unknown }).spike, undefined, { timeout: 90_000 });
    const w = (fn: string) => page.evaluate(`(() => { const w = window.spike.world; return ${fn}; })()`);
    await page.waitForTimeout(1500);
    // Sight was rolled on entering the map.
    expect(await w('w.senses.hero.rolledAt')).not.toBeNull();
    expect(await w('w.senses.showSenses')).toBe(true);

    // Night: the guard stands at the speaker's spot (0, 24); the hero comes up in front of them.
    await w('(w.dayMinutes = 0, w.weather.setHour(23), 0)');
    await page.waitForTimeout(2500);
    const g = (await w('w.schedule.minds.find((m) => m.id === "guard")')) as { x: number; z: number };
    await w(`(w.placeHeroAt(${g.x}, ${g.z} + 4), 0)`);
    await page.waitForFunction(() => (window as any).spike.world.schedule.minds.find((m: { id: string }) => m.id === 'guard').doing === 'watch', undefined, { timeout: 15_000 });
    expect(((await w('w.senses.senses.find((s) => s.id === "guard")')) as { sees: string[] }).sees).toContain('hero');

    // By day, a shout on the green: those out on it turn to it, the guard comes to see.
    await w('(w.weather.setHour(10), 0)');
    await page.waitForTimeout(2500);
    await w('(w.placeHeroAt(0, 16), 0)');
    await page.waitForTimeout(500);
    await w('(w.acting.act("verb:callout", null, { id: "hero", dice: () => ({ n: 3, mod: 0 }) }), 0)');
    await page.waitForTimeout(1200);
    const doing = (await w('w.schedule.minds.map((m) => m.doing)')) as string[];
    expect(doing).toContain('watch');
    expect(doing).toContain('investigate');
    await page.screenshot({ path: `${OUT}senses-shout.png` });
    expect(errors).toEqual([]);
  });
});
