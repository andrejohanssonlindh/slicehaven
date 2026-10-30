import { type Behaviour, idle, placeCentre, walkOn } from '../../../core/world3d/behave';

/** Go to a place and stand there, facing another place if asked. { "do": "stay", "at": "gate", "face": "road" } */
const stay: Behaviour = {
  id: 'stay',
  about: 'Go to a place and stand there (facing another place, if asked).',
  keys: ['at', 'face'],
  places: ['at', 'face'],
  needs: ['at'],
  start(use, mind, ctx) {
    const p = ctx.places[String(use.at)];
    if (p) {
      const c = placeCentre(p);
      ctx.walking.walkTo(mind.actor, c.x, c.z);
    }
    return null;
  },
  step(use, mind, ctx, dt) {
    const walking = walkOn(mind, ctx.walking, dt);
    if (walking) return walking;
    const f = use.face !== undefined ? ctx.places[String(use.face)] : undefined;
    if (!f) return idle(mind, ctx.walking, dt);
    const c = placeCentre(f), a = mind.actor;
    return { dx: c.x - a.x, dz: c.z - a.z, moving: false };
  },
};

export default stay;
