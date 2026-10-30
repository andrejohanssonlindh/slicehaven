import { type BehaveContext, type Behaviour, type DoEntry, idle, walkOn } from '../../../core/world3d/behave';
import type { Pose } from '../../../core/world3d/actors';

/**
 * Walking a path: `beat` goes there and back along it, `patrol` round and round (a guard round the outside of a camp:
 * give it a place made with `around`). Each point is walked to on the walking grid, so they go round what is in the
 * way, and they pause a moment at each (`wait`, seconds).
 */

interface State {
  i: number;
  dir: 1 | -1;
  wait: number;
}

const make = (id: string, about: string, loop: boolean): Behaviour => ({
  id,
  about,
  keys: ['path', 'wait', 'speed'],
  places: ['path'],
  needs: ['path'],
  start(use, mind, ctx): State {
    // Start at the point nearest to where they stand.
    const pts = points(use, ctx);
    let i = 0, best = Infinity;
    pts.forEach(([x, z], k) => {
      const d = Math.hypot(x - mind.actor.x, z - mind.actor.z);
      if (d < best) {
        best = d;
        i = k;
      }
    });
    if (pts[i]) ctx.walking.walkTo(mind.actor, pts[i][0], pts[i][1]);
    return { i, dir: 1, wait: 0 };
  },
  step(use, mind, ctx, dt): Pose {
    const s = mind.state as State, pts = points(use, ctx);
    const going = walkOn(mind, ctx.walking, dt, Number(use.speed ?? 1.1));
    if (going) return going;
    if (pts.length < 2) return idle(mind, ctx.walking, dt);
    s.wait -= dt;
    if (s.wait > 0) return idle(mind, ctx.walking, dt);
    // On to the next point: round the loop, or back the way they came at either end.
    if (loop || (ctx.places[String(use.path)] as { loop?: boolean } | undefined)?.loop) s.i = (s.i + 1) % pts.length;
    else {
      if (s.i + s.dir < 0 || s.i + s.dir >= pts.length) s.dir = s.dir === 1 ? -1 : 1;
      s.i += s.dir;
    }
    s.wait = Number(use.wait ?? 0.6);
    ctx.walking.walkTo(mind.actor, pts[s.i][0], pts[s.i][1]);
    return idle(mind, ctx.walking, dt);
  },
});

function points(use: DoEntry, ctx: BehaveContext): [number, number][] {
  const p = ctx.places[String(use.path)];
  if (!p) return [];
  if (p.kind === 'path') return p.pts;
  if (p.kind === 'spot') return [[p.x, p.z]];
  return [];
}

export const beat = make('beat', 'Walk a path there and back, again and again.', false);
export const patrol = make('patrol', 'Walk a path round and round (a guard round a camp: a place made with "around").', true);

export default [beat, patrol];
