import { type Behaviour, idle, insideHouse, walkOn } from '../../../core/world3d/behave';

/** Go into a house (their own by default) and stay in its back room. { "do": "home" } or { "do": "home", "house": "inn" } */
const home: Behaviour = {
  id: 'home',
  about: 'Go into a house (their own, if none is named) and stay inside.',
  keys: ['house'],
  houses: ['house'],
  start(use, mind, ctx) {
    const id = use.house !== undefined && use.house !== 'home' ? String(use.house) : mind.home;
    const at = id ? insideHouse(ctx.walking, id) : null;
    if (at) ctx.walking.walkTo(mind.actor, at.room.x, at.room.z, 0);
    return null;
  },
  step(_use, mind, ctx, dt) {
    return walkOn(mind, ctx.walking, dt) ?? idle(mind, ctx.walking, dt);
  },
};

export default home;
