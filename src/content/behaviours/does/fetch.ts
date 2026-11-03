import { type Behaviour, idle, walkOn } from '../../../core/world3d/behave';

/**
 * Go and get help: walk to the nearest person of a calling (`of`, default the guard), tell them, and they come to see
 * about the hero (the world hands it over: `ctx.answers`). No one of that calling about: the nearest neighbour. One of
 * the answers to a wrong (plan B3c): { "when": { "answering": "fetch" }, "do": "fetch", "of": "job-guard" }.
 */
interface State {
  helper: string | null;
  replan: number;
  told: boolean;
}

/** Close enough to tell them, metres. */
const NEAR = 2;

const fetch: Behaviour = {
  id: 'fetch',
  about: 'Walk to the nearest person of a calling (`of`, default the guard; else a neighbour), tell them, and they come for the hero.',
  keys: ['of', 'speed'],
  start(use, mind, ctx): State {
    return { helper: ctx.answers?.helperFor(mind, String(use.of ?? 'job-guard')) ?? null, replan: 0, told: false };
  },
  step(use, mind, ctx, dt) {
    const s = mind.state as State, a = mind.actor;
    const at = s.helper && !s.told ? ctx.whereIs?.(s.helper) : null;
    if (!at) return idle(mind, ctx.walking, dt);
    if (Math.hypot(at.x - a.x, at.z - a.z) <= NEAR && (at.house ?? null) === a.house) {
      s.told = true;
      ctx.answers?.handOver(mind, s.helper!);
      return idle(mind, ctx.walking, dt);
    }
    s.replan -= dt;
    if (s.replan <= 0) {
      s.replan = 1.5;
      ctx.walking.walkTo(a, at.x, at.z, at.house ? at.level : undefined);
    }
    return walkOn(mind, ctx.walking, dt, Number(use.speed ?? 1.8)) ?? idle(mind, ctx.walking, dt);
  },
};

export default fetch;
