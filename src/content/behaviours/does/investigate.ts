import { type Behaviour, idle, walkOn } from '../../../core/world3d/behave';
import { lastHeard } from '../../../core/world3d/perceive';

/**
 * Go and see what that was: walk to where the last noise came from (of a kind, if `of` is given), then look about,
 * turning one way and the other, for `look` seconds. A guard at night (plan B5):
 * { "when": { "heard": "any", "hours": [22, 6] }, "do": "investigate" }. Put a `watch` on `sees` above it, so they
 * stop and watch once they find someone.
 */
interface State {
  /** Seconds spent looking about once there. */
  looked: number;
  /** The way they faced when they got there. */
  face: number | null;
}

/** How close to the noise they go, metres. */
const NEAR = 1.5;

const investigate: Behaviour = {
  id: 'investigate',
  about: 'Walk to where the last noise came from (of a kind, if named), then look about for a while.',
  keys: ['of', 'look', 'speed'],
  start(use, mind, ctx): State {
    const h = lastHeard(mind.senses, (use.of as string | string[] | undefined) ?? 'any');
    const a = mind.actor;
    if (h && Math.hypot(h.x - a.x, h.z - a.z) > NEAR) ctx.walking.walkTo(a, h.x, h.z, h.house ? h.level : undefined);
    return { looked: 0, face: null };
  },
  step(use, mind, ctx, dt) {
    const s = mind.state as State;
    const going = walkOn(mind, ctx.walking, dt, Number(use.speed ?? 1.3));
    if (going) return going;
    const a = mind.actor;
    s.face ??= Math.atan2(a.dir.z, a.dir.x);
    s.looked += dt;
    if (s.looked > Number(use.look ?? 8)) return idle(mind, ctx.walking, dt);
    // Look one way, then the other, a little past a quarter turn each side.
    const ang = s.face + Math.sin(s.looked * 0.9) * 1.6;
    return { dx: Math.cos(ang), dz: Math.sin(ang), moving: false };
  },
};

export default investigate;
