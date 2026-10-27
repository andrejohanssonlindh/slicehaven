import type { Library } from '../../core/skillweb';

/**
 * How one people sees another (director's notes, 2026-10-27). Our own short
 * reasons, no book text. Rows are the one looking; columns are who they look at.
 * v: −3 hostile … +3 kin. Missing = neutral. Edit freely: it is balance data.
 *
 * What it does:
 * - single rolls: every point makes the difficulty 2 higher (or lower);
 * - conflicts: every point is 1 Control of situation, so winning over a hostile
 *   elf as a dwarf takes real work;
 * - kin (your own people) only counts when you are *not* the majority where you
 *   are: two elves in a human city are kin, two humans in a human city are neutral.
 * A more specific kind overrides single entries: rural folk are warier of the unusual
 * than the human row says. Entries a kind doesn't have fall back to its parent's.
 */
const r = (v: number, why: string) => ({ v, why });

export const RELATIONS: Library['relations'] = {
  // Country folk have seen fewer strangers.
  rural: {
    elf: r(-2, 'country folk are uneasy around elves'),
    dwarf: r(-1, 'country folk keep an eye on dwarves'),
    tirak: r(-3, 'country folk have heard the stories and run from tirak'),
    missla: r(1, 'the misslor are easy to like'),
  },
  human: {
    human: r(0, ''),
    elf: r(-1, 'elves unsettle ordinary folk'),
    dwarf: r(0, ''),
    tirak: r(-2, 'most people fear and shun the tirak'),
    missla: r(1, 'the misslor are easy to like'),
  },
  dwarf: {
    human: r(0, ''),
    elf: r(-2, 'dwarves and elves have never trusted each other'),
    dwarf: r(1, 'one of their own'),
    tirak: r(-2, 'almost nobody likes the tirak'),
    missla: r(0, ''),
  },
  elf: {
    human: r(-1, 'elves find short-lived peoples hard to take seriously'),
    elf: r(1, 'one of their own'),
    dwarf: r(-2, 'dwarves and elves have never trusted each other'),
    tirak: r(-2, 'almost nobody likes the tirak'),
    missla: r(0, ''),
  },
  tirak: {
    human: r(-1, 'they expect humans to flinch'),
    elf: r(-2, 'almost everyone looks down on the tirak, elves most of all'),
    dwarf: r(-1, 'dwarves keep their distance'),
    tirak: r(2, 'family'),
    missla: r(0, ''),
  },
  missla: {
    human: r(0, ''),
    elf: r(0, ''),
    dwarf: r(0, ''),
    tirak: r(-1, 'big and frightening'),
    missla: r(2, 'family'),
  },
};
