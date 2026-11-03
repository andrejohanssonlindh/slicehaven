import { type Behaviour, idle } from '../../../core/world3d/behave';
import { lastHeard } from '../../../core/world3d/perceive';

/**
 * Stop and watch: face whoever they see (the hero, or the one named in `who`), or else turn to where the last noise
 * came from. Usually under a perception condition (plan B5):
 * { "when": { "sees": "hero", "hours": [22, 6] }, "do": "watch" }, { "when": { "heard": "shout" }, "do": "watch" }.
 */
const watch: Behaviour = {
  id: 'watch',
  about: 'Stop and watch whoever they see (the hero unless named), or turn to where the last noise came from.',
  keys: ['who'],
  start(_use, mind, ctx) {
    mind.actor.legs = [];
    ctx.walking.settle(mind.actor);
    return null;
  },
  step(use, mind, ctx, dt) {
    const a = mind.actor;
    const id = String(use.who ?? 'hero');
    const seen = mind.senses.sees.includes(id) ? ctx.whereIs?.(id) : null;
    const at = seen ?? lastHeard(mind.senses, 'any');
    if (!at || Math.hypot(at.x - a.x, at.z - a.z) < 1e-3) return idle(mind, ctx.walking, dt);
    return { dx: at.x - a.x, dz: at.z - a.z, moving: false };
  },
};

export default watch;
