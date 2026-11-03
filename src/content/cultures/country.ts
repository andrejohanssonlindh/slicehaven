import type { CultureDef } from '../../core/world3d/standing';

/**
 * Country folk (a hamlet, a village): they know each other's things, mind them, and fetch the guard if it comes to
 * that. Balance data, a first guess to tune by playing. Sitting down uninvited in someone's home earns a grumble;
 * putting out their hearth in front of them, a scolding; do it again and they fetch the guard.
 */
const country: CultureDef = {
  id: 'country',
  about: 'Country folk: neighbours who mind their own things and fetch the guard when it comes to that.',
  acts: { sit: 6, use: 10, meddle: 22, move: 15, take: 35, steal: 45, harm: 60 },
  owner: 1,
  others: 0.5,
  town: 0.6,
  // (Sit on a bench, light a torch: no one minds. Putting the torches out, they do.)
  townMay: ['sit', 'use'],
  answers: [
    { id: 'grumble', at: -5, do: 'watch', for: 8, says: ['Hey. That\'s not yours.', 'Who said you could?', 'Mind yourself.'] },
    { id: 'scold', at: -20, do: 'confront', for: 15, says: ['Leave that be! This is our house.', 'Stop that, or I\'ll call someone.', 'What do you think you\'re doing?'] },
    { id: 'fetch', at: -40, do: 'fetch', for: 90, fetches: 'job-guard', says: ['Right. I\'m getting the guard.', 'That\'s it. Guard!'] },
    { id: 'fight', at: -65, do: 'confront', for: 30, says: ['Out. Now, or I\'ll throw you out.', 'You\'ve done it now.'] },
    { id: 'hunt', at: -90, do: 'confront', for: 60, says: ['I\'ll see you dead for this.'] },
  ],
  fetched: { id: 'called', at: 0, do: 'confront', for: 40, says: ['What\'s all this, then?', 'You. A word.'] },
  perRelation: 5,
};

export default country;
