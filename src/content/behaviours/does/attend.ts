import { type Behaviour, idle, placeCentre, walkOn } from '../../../core/world3d/behave';

/**
 * Gather round a place and face it: a crowd at a hanging, a sermon, a fight. Each takes a spot in rings round it (by
 * their number in the crowd, so they spread out instead of piling up), `ring` metres out at the nearest.
 * { "when": { "event": "hanging" }, "do": "attend", "at": "gallows", "ring": 4 }
 */
const attend: Behaviour = {
  id: 'attend',
  about: 'Gather round a place, facing it, in rings (an execution, a sermon, a fight).',
  keys: ['at', 'ring'],
  places: ['at'],
  needs: ['at'],
  start(use, mind, ctx) {
    const p = ctx.places[String(use.at)];
    if (!p) return null;
    const c = placeCentre(p);
    const near = Number(use.ring ?? 3);
    // Twelve to a ring, each ring a pace further out; a little jitter so it does not look drilled.
    const n = mind.slot, ring = Math.floor(n / 12), k = n % 12;
    const ang = (k / 12) * Math.PI * 2 + ring * 0.26 + (ctx.rng.next() - 0.5) * 0.2;
    const r = near + ring * 0.9 + ctx.rng.next() * 0.3;
    const to = { x: c.x + Math.cos(ang) * r, z: c.z + Math.sin(ang) * r };
    ctx.walking.walkTo(mind.actor, to.x, to.z);
    return { cx: c.x, cz: c.z };
  },
  step(_use, mind, ctx, dt) {
    const going = walkOn(mind, ctx.walking, dt, 1.2);
    if (going) return going;
    const s = mind.state as { cx: number; cz: number } | null;
    if (!s) return idle(mind, ctx.walking, dt);
    return { dx: s.cx - mind.actor.x, dz: s.cz - mind.actor.z, moving: false };
  },
};

export default attend;
