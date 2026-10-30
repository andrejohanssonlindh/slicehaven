import { keeperRounds, stepRounds } from '../../../core/world3d/actors';
import type { Behaviour } from '../../../core/world3d/behave';

/**
 * Go the rounds of a house: the middle of each storey's last room, up to the top, back down and out to the door, and
 * again (an innkeeper). { "do": "rounds", "house": "inn" } (or "home" for their own)
 */
interface State {
  house: string;
  stops: { x: number; z: number; level: number }[];
  stop: number;
  wait: number;
}

const rounds: Behaviour = {
  id: 'rounds',
  about: 'Go the rounds of a house: each storey, up to the top, down and out to the door, and again.',
  keys: ['house'],
  houses: ['house'],
  start(use, mind, ctx): State | null {
    const id = use.house !== undefined && use.house !== 'home' ? String(use.house) : mind.home;
    const b = id ? ctx.walking.byId(id) : null;
    if (!b) return null;
    const r = keeperRounds(b);
    // (They begin from where they are: the first stop is walked to like any other.)
    return { house: r.house, stops: r.stops, stop: 0, wait: 0 };
  },
  step(_use, mind, ctx, dt) {
    const s = mind.state as State | null;
    if (!s) return { dx: mind.actor.dir.x, dz: mind.actor.dir.z, moving: false };
    const r = { actor: mind.actor, ...s };
    const pose = stepRounds(ctx.walking, r, dt);
    s.stop = r.stop;
    s.wait = r.wait;
    return pose;
  },
};

export default rounds;
