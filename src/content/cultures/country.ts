import type { CultureDef } from '../../core/world3d/standing';

/**
 * Country folk (a hamlet, a village): they know each other's things, mind them, and fetch the guard if it comes to
 * that. Balance data, a first guess to tune by playing. Walking into someone's home or sitting down in it uninvited
 * earns a grumble; putting out their hearth in front of them, a scolding; do it again and they fetch the guard (the
 * bold square up to you themselves). Views fade a point a day: being fetched for (−40) is forgotten in about six weeks.
 */
const country: CultureDef = {
  id: 'country',
  about: 'Country folk: neighbours who mind their own things and fetch the guard when it comes to that.',
  acts: { enter: 6, sit: 6, use: 10, meddle: 22, move: 15, take: 35, steal: 45, harm: 60 },
  owner: 1,
  others: 0.5,
  town: 0.6,
  // (Walk the streets, sit on a bench, light a torch: no one minds. Putting the torches out, they do.)
  townMay: ['enter', 'sit', 'use'],
  answers: [
    { id: 'grumble', at: -5, do: 'watch', for: 8, says: ['Hey! What are you doing?', 'Who said you could?', 'Mind yourself.'] },
    { id: 'scold', at: -20, do: 'confront', for: 15, afraid: 'grumble', says: ['Leave that be! This is our house.', 'Stop that, or I\'ll call someone.', 'What do you think you\'re doing?'] },
    { id: 'fetch', at: -40, do: 'fetch', for: 90, fetches: 'job-guard', bold: 'fight', says: ['Right. I\'m getting the guard.', 'That\'s it. Guard!'] },
    { id: 'fight', at: -65, do: 'confront', for: 30, afraid: 'fetch', says: ['Out. Now, or I\'ll throw you out.', 'You\'ve done it now.'] },
    { id: 'hunt', at: -90, do: 'confront', for: 60, afraid: 'fetch', says: ['I\'ll see you dead for this.'] },
  ],
  fetched: { id: 'called', at: 0, do: 'confront', for: 40, says: ['What\'s all this, then?', 'You. A word.'] },
  perRelation: 5,
  // (Whole points: the scale holds whole numbers.)
  fade: { bad: 1, good: 1 },
  // Country folk bow to their betters: a noble's wrongs are answered much later.
  rank: { nobility: 20 },
  fear: { gap: 6, later: 15 },
  boldAt: 2,
};

export default country;
