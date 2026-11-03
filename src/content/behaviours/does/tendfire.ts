import { type Behaviour, idle, walkOn } from '../../../core/world3d/behave';
import type { ActTarget } from '../../../core/world3d/actions';

/**
 * See to the fire of a house (their own by default): if it is out, walk to it and light it, through the same action
 * the hero uses (`verb:light`: the gates, a Survival roll with their own sheet, or Agility at −2D6 for those
 * without the skill, the outcome); a try that fails is tried again a little later. Then stay by it. { "do": "tendfire" } or { "do": "tendfire", "house": "inn" }; usually at dawn:
 * { "when": { "hours": [6, 8] }, "do": "tendfire" }.
 */
interface State {
  fire: ActTarget | null;
  /** Seconds before the next try (after one that failed). */
  wait: number;
}

/** How long someone fumbles before trying again, seconds. */
const RETRY = 10;
/** How close they must be to set a light to it, metres. */
const REACH = 2;

const tendfire: Behaviour = {
  id: 'tendfire',
  about: 'See to the fire of a house (their own unless named): light it if it is out, then stay by it.',
  keys: ['house'],
  houses: ['house'],
  start(use, mind, ctx): State {
    const id = use.house !== undefined && use.house !== 'home' ? String(use.house) : mind.home;
    const fire = id && ctx.acts ? ctx.acts.fireOf(id) : null;
    if (fire && !ctx.acts!.lit(fire)) ctx.walking.walkTo(mind.actor, fire.x, fire.z, fire.level);
    return { fire, wait: 0 };
  },
  step(_use, mind, ctx, dt) {
    const s = mind.state as State | null;
    const walking = walkOn(mind, ctx.walking, dt);
    if (walking) return walking;
    const f = s?.fire;
    if (s && f && ctx.acts && !ctx.acts.lit(f)) {
      s.wait -= dt;
      const a = mind.actor;
      if (s.wait <= 0 && a.house === f.house && a.level === f.level && Math.hypot(a.x - f.x, a.z - f.z) <= REACH) {
        const r = ctx.acts.act(mind, 'verb:light', f);
        if (!r.success) s.wait = RETRY;
      } else if (s.wait <= 0) {
        // Not there yet (something was in the way, or they were far and waiting): walk to it again.
        ctx.walking.walkTo(a, f.x, f.z, f.level);
        s.wait = RETRY;
      }
    }
    return idle(mind, ctx.walking, dt);
  },
};

export default tendfire;
