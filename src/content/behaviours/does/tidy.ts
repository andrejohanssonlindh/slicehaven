import { type Behaviour, type Whereabout, idle, walkOn } from '../../../core/world3d/behave';

/**
 * Bring a found thing home (plan B3b): walk to it, pick it up, carry it to where it belongs, put it down there. Under
 * the condition `tidying`, which the world sets (a household's own things, or anyone's for someone who likes order).
 * Gone, or taken by someone else on the way: they let it be.
 */
interface State {
  carrying: boolean;
  replan: number;
}

/** Close enough to pick it up, or to put it down, metres. */
const NEAR = 1.2;

const close = (a: Whereabout, b: Whereabout): boolean => Math.hypot(a.x - b.x, a.z - b.z) <= NEAR && a.house === b.house && (a.house === null || a.level === b.level);

const tidy: Behaviour = {
  id: 'tidy',
  about: 'Walk to a found thing, pick it up and put it back where it belongs (the world says which: `tidying`).',
  keys: ['speed'],
  start(): State {
    return { carrying: false, replan: 0 };
  },
  step(use, mind, ctx, dt) {
    const s = mind.state as State, a = mind.actor, id = mind.tidy?.thing, acts = ctx.acts;
    const stop = () => {
      delete mind.tidy;
      return idle(mind, ctx.walking, dt);
    };
    if (!id || !acts?.thingAt || !acts.thingHome || !acts.lift || !acts.putHome) return stop();
    const me: Whereabout = { x: a.x, z: a.z, house: a.house, level: a.stair ? 0 : a.level };
    const goal = s.carrying ? acts.thingHome(id) : acts.thingAt(id);
    if (!goal) return stop();
    if (close(me, goal)) {
      if (s.carrying) {
        acts.putHome(mind, id);
        return stop();
      }
      if (!acts.lift(mind, id)) return stop();
      s.carrying = true;
      s.replan = 0;
      return idle(mind, ctx.walking, dt);
    }
    s.replan -= dt;
    if (s.replan <= 0) {
      s.replan = 2;
      ctx.walking.walkTo(a, goal.x, goal.z, goal.house ? goal.level : undefined);
    }
    return walkOn(mind, ctx.walking, dt, Number(use.speed ?? 1.1)) ?? idle(mind, ctx.walking, dt);
  },
};

export default tidy;
