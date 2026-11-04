import type { FightStyle } from '../../../core/fightmind';

/**
 * The arena's own: runs in, presses hard, hammers a foe who is flagging, finishes what it starts (the first fight is to
 * the death, Q46), and is hard to beg off; asks to yield only when wrecked.
 */
const style: FightStyle = {
  id: 'gladiator',
  spare: 16,
  lines: [
    { when: { foeDown: true }, do: 'finish' },
    { when: { beaten: 1.75 }, do: 'offerYield' },
    { do: 'pickUp' },
    { do: 'closeIn', run: true },
    { when: { attacking: true, foeBeaten: 1 }, do: 'strike', weights: { standard: 1, powerful: 3 } },
    { do: 'strike', weights: { standard: 3, quick: 2, powerful: 2 } },
    { do: 'defend', weights: { standard: 3, defensive: 1, counter: 1 } },
  ],
};

export default style;
