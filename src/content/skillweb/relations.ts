import type { Library } from '../../core/skillweb';

/**
 * How one people sees another (director's notes, 2026-10-27). Our own short
 * reasons, no book text. Rows are the one looking; columns are who they look at.
 * v: −3 hostile … +3 kin. Missing = neutral. Edit freely: it is balance data.
 *
 * What it does (core/skillweb `situation`):
 * - every point makes the roll 1 harder (or easier);
 * - below zero a success is *grudging*: you get less out of it (mood and kept
 *   advantages are cut by the same number), so charming a hostile elf as a dwarf
 *   can work and still leave you with nothing to build on.
 * Humans are the people most scenes are full of, so their row matters most.
 */
const r = (v: number, why: string) => ({ v, why });

export const RELATIONS: Library['relations'] = {
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
