import { type Behaviour, idle, walkOn } from '../../../core/world3d/behave';

/**
 * Walk up to someone (the hero unless `who` names another) and stand facing them, close: telling them off, squaring up,
 * a guard come to see what's wrong. Follows them as they move. One of the answers to a wrong (plan B3c):
 * { "when": { "answering": "scold" }, "do": "confront" }.
 */
interface State {
  /** Seconds until the way to them is worked out again (they may have moved). */
  replan: number;
}

/** How close they come, metres. */
const CLOSE = 1.3;

const confront: Behaviour = {
  id: 'confront',
  about: 'Walk up to the hero (or `who`) and stand facing them, close; follows them as they move.',
  keys: ['who', 'speed'],
  start(): State {
    return { replan: 0 };
  },
  step(use, mind, ctx, dt) {
    const s = mind.state as State, a = mind.actor;
    const at = ctx.whereIs?.(String(use.who ?? 'hero'));
    if (!at) return idle(mind, ctx.walking, dt);
    const d = Math.hypot(at.x - a.x, at.z - a.z);
    const there = d <= CLOSE && (at.house ?? null) === a.house;
    s.replan -= dt;
    if (!there && s.replan <= 0) {
      s.replan = 1;
      ctx.walking.walkTo(a, at.x, at.z, at.house ? at.level : undefined);
    }
    if (there) {
      a.legs = [];
      ctx.walking.settle(a);
      return { dx: at.x - a.x, dz: at.z - a.z, moving: false };
    }
    return walkOn(mind, ctx.walking, dt, Number(use.speed ?? 1.5)) ?? { dx: at.x - a.x, dz: at.z - a.z, moving: false };
  },
};

export default confront;
