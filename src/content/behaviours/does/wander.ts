import { type Behaviour, idle, spotIn, walkOn } from '../../../core/world3d/behave';

/**
 * Mill about in an area: walk to a spot in it, stand a while, and again. A square full of people at market time is a
 * crowd wandering it. { "do": "wander", "in": "square", "wait": [3, 10] }
 */
const wander: Behaviour = {
  id: 'wander',
  about: 'Mill about in an area: walk to a spot, stand a while, and again.',
  keys: ['in', 'wait', 'speed'],
  places: ['in'],
  needs: ['in'],
  start(_use, _mind, ctx) {
    // (A short first pause, different for each, so a crowd does not set off in step.)
    return { wait: ctx.rng.next() * 3 };
  },
  step(use, mind, ctx, dt) {
    const s = mind.state as { wait: number };
    const going = walkOn(mind, ctx.walking, dt, Number(use.speed ?? 0.9));
    if (going) return going;
    s.wait -= dt;
    if (s.wait > 0) return idle(mind, ctx.walking, dt);
    const p = ctx.places[String(use.in)];
    const [lo, hi] = Array.isArray(use.wait) ? (use.wait as number[]) : [3, 10];
    s.wait = lo + ctx.rng.next() * (hi - lo);
    if (p?.kind === 'area') {
      const to = spotIn(p.area, ctx.rng, ctx.walking, mind.actor);
      if (to) ctx.walking.walkTo(mind.actor, to.x, to.z);
    }
    return idle(mind, ctx.walking, dt);
  },
};

export default wander;
