import { type Behaviour, idle, walkOn } from '../../../core/world3d/behave';

/**
 * Something is burning near them (plan B7; the world says what, and whether they fight it, in `mind.fire`). Who
 * fights it walks up to a metre from it and beats at the flames (*Put out the flames*, with their own sheet) every
 * round until it's out; who doesn't keeps a good way off and watches. { "when": { "fire": true }, "do": "firefight" },
 * put at the top of everyone's day by the world.
 */
interface State {
  /** Seconds before the next try at the flames. */
  wait: number;
}

/** How near they stand to beat at it, metres (outside the half metre that burns), and how far off the rest keep. */
const NEAR = 1.1;
const AWAY = 8;
/** Seconds between tries: a round. */
const ROUND = 4;

const firefight: Behaviour = {
  id: 'firefight',
  about: 'Put out what burns near them (theirs, or if they are bold), or keep well away from it.',
  keys: [],
  start(_use, mind, ctx): State {
    const f = mind.fire, a = mind.actor;
    if (!f) return { wait: 0 };
    const dx = a.x - f.thing.x, dz = a.z - f.thing.z, d = Math.hypot(dx, dz) || 1;
    const k = f.fight ? NEAR : AWAY;
    // Toward it from where they stand, or away along the same line (shorter if the far spot can't be reached).
    for (const m of f.fight ? [k] : [k, k * 0.6, k * 0.35]) {
      if (ctx.walking.walkTo(a, f.thing.x + (dx / d) * m, f.thing.z + (dz / d) * m, f.thing.house ? f.thing.level : undefined) !== null) break;
    }
    return { wait: 0 };
  },
  step(_use, mind, ctx, dt) {
    const s = mind.state as State;
    const f = mind.fire;
    const going = walkOn(mind, ctx.walking, dt, f?.fight ? 1.6 : 1.8);
    if (going) return going;
    const a = mind.actor;
    if (f) {
      const dx = f.thing.x - a.x, dz = f.thing.z - a.z;
      if (f.fight && ctx.acts?.ablaze?.(f.thing)) {
        s.wait -= dt;
        if (s.wait <= 0 && Math.hypot(dx, dz) <= NEAR + 0.6) {
          ctx.acts.act(mind, 'verb:douse', f.thing);
          s.wait = ROUND;
        }
      }
      // Facing the fire, either way.
      const d = Math.hypot(dx, dz) || 1;
      idle(mind, ctx.walking, dt);
      return { dx: dx / d, dz: dz / d, moving: false };
    }
    return idle(mind, ctx.walking, dt);
  },
};

export default firefight;
