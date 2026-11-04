import type { FightStyle } from '../../../core/fightmind';

/** Anyone: mostly plain blows, now and then a hard one; asks to yield once badly off; doesn't kill someone who is down. */
const style: FightStyle = {
  id: 'default',
  spare: 8,
  lines: [
    { when: { beaten: 1 }, do: 'offerYield' },
    { do: 'pickUp' },
    { do: 'closeIn' },
    { do: 'strike', weights: { standard: 4, quick: 1, powerful: 1 } },
    { do: 'defend', weights: { standard: 4, defensive: 2 } },
  ],
};

export default style;
