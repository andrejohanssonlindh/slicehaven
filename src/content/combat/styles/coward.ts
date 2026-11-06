import type { FightStyle } from '../../../core/fightmind';

/**
 * Anyone, but quick to give up: the default's way of fighting with lines on top (an example of starting from another
 * style). Never comes at you (the director: a careful fighter running in made no sense): arms itself if it can, then
 * waits for you; defends carefully, asks to yield as soon as it goes badly, and is easy to talk down.
 * Give it to someone in a map with "fights": "coward".
 */
const style: FightStyle = {
  id: 'coward',
  base: 'default',
  spare: 6,
  lines: [
    { when: { beaten: 0.5 }, do: 'offerYield' },
    { do: 'pickUp' },
    { when: { free: true }, do: 'holdGround' },
    { do: 'defend', weights: { standard: 1, defensive: 3 } },
  ],
};

export default style;
