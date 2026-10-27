/**
 * The ways a skill can be used, as we have considered them so far (director/design/ways-of-use.md).
 * "Built" modes exist in the code and the Skill map shows which of them a skill takes part in.
 * "Planned" ones are agreed or discussed but not built; they are listed so nothing is forgotten.
 */
export interface UseMode {
  label: string;
  what: string;
  /** The shape of the roll(s). */
  shape: string;
  status: 'built' | 'planned';
  /** Where it lives (code) or what it needs (planned). */
  where: string;
}

export const USE_MODES: Record<string, UseMode> = {
  check: {
    label: 'A single roll on a thing',
    what: 'You try something on one thing (climb the boulder, size up a person, persuade the guard).',
    shape: 'One roll against a difficulty the circumstances set. Fail, success, strong success (2+ advantages). Mood, how their people see yours and kept advantages change the difficulty.',
    status: 'built',
    where: 'content/skillweb hooks (library) and scene checks; core/scene attempt',
  },
  'hidden-read': {
    label: 'A read you cannot verify',
    what: 'Knowledge, insight and lore: you get an answer, and are not told if it is right.',
    shape: 'One roll, result hidden. Success gives the truth, failure a believable wrong answer. One try.',
    status: 'built',
    where: 'hooks marked hidden (size up, study)',
  },
  'look-around': {
    label: 'Looking around',
    what: 'Searching or alertness with nothing right in front of you: what do you notice nearby?',
    shape: 'One roll against what each thing is worth noticing (harder with distance). One look per spot.',
    status: 'built',
    where: 'core/scene lookAround',
  },
  'conflict-lead': {
    label: 'Starting a round against someone',
    what: 'In a social conflict you pick the skill that opens a round.',
    shape: 'Opposed roll against what they have. 1 Control to the winner, +1 per 5 won by. Round 1 and 3.',
    status: 'built',
    where: 'core/social playRound',
  },
  'conflict-answer': {
    label: 'Answering a round',
    what: 'They open a round and you answer with a skill that fits.',
    shape: 'The same opposed roll, from the other side. Round 2.',
    status: 'built',
    where: 'core/social playRound',
  },
  'locked-roll': {
    label: 'The locked roll',
    what: 'The roll a conflict or challenge requires you to make once (usually an attribute).',
    shape: 'Free of the attribute budget; forced in the last roll if unused.',
    status: 'built',
    where: 'core/social, core/challenge',
  },
  'challenge-roll': {
    label: 'A roll against a place',
    what: 'You against the world: survey an area, find your way, make something.',
    shape: 'Three rolls against one difficulty. 1 Control per roll that reaches it, +1 per advantage. The total is read off a result list.',
    status: 'built',
    where: 'core/challenge',
  },
  edge: {
    label: 'An edge (an upper hand)',
    what: 'An ability that changes the footing: darkvision at night.',
    shape: '+2 Control in a challenge (or −2 for a weak position). Also rollable.',
    status: 'built',
    where: 'core/challenge edges',
  },
  'attribute-fallback': {
    label: 'Your own nature',
    what: 'An attribute roll when no skill fits.',
    shape: 'Locked roll free; Presence natural, Physique when aggressive; a few more by difficulty; any at −2D6 if nothing else fits.',
    status: 'built',
    where: 'core/attributes',
  },
  assist: {
    label: 'Helping someone',
    what: 'A party member lends a skill to another character\'s roll.',
    shape: 'A bonus or a shared roll; repeats penalise the whole side.',
    status: 'planned',
    where: 'needs the party in scenes',
  },
  gear: {
    label: 'With the right tools',
    what: 'Thieves\' tools for lockpicking; a good instrument for a performance.',
    shape: 'A bonus from an item, chosen before the roll.',
    status: 'planned',
    where: 'needs package contents as items with a skill bonus',
  },
  drive: {
    label: 'Because of who you are',
    what: 'A character\'s drives favour some intentions and forbid others.',
    shape: 'Bonuses, penalties or locked choices from the drive.',
    status: 'planned',
    where: 'needs drive hooks (45 drives)',
  },
  terrain: {
    label: 'On this ground, in this weather',
    what: 'Sneaking on grass or on dry twigs; climbing in rain; seeing in fog.',
    shape: 'Difficulty modifiers from the tile, weather and light.',
    status: 'planned',
    where: 'needs tile data and the weather system as inputs',
  },
  consequence: {
    label: 'What the Control buys',
    what: 'A won conflict can reveal a secret, change an opinion, or leave you holding something over them.',
    shape: 'Spend Control on a consequence from a table; the loser may refuse one for +2 Control.',
    status: 'planned',
    where: 'consequence tables for social conflicts',
  },
  dialogue: {
    label: 'A skill as a line in a conversation',
    what: 'Law lets you cite the statute; Court Life lets you greet the household properly.',
    shape: 'Opens an option or changes how a talk goes, with or without a roll.',
    status: 'planned',
    where: 'needs skill-gated talk options',
  },
  craft: {
    label: 'Making and mending',
    what: 'Crafts and expertise that produce things.',
    shape: 'A challenge with a result list (quality, time, cost).',
    status: 'planned',
    where: 'needs items and a craft challenge template',
  },
  focus: {
    label: 'Putting your back into it',
    what: 'Spending Focus for extra dice, and talents that add a die.',
    shape: 'A cost for a bonus on one roll.',
    status: 'planned',
    where: 'needs Focus and Wellbeing in scenes',
  },
  time: {
    label: 'Taking your time',
    what: 'Doing something slowly or in a hurry changes the difficulty.',
    shape: 'More time: easier; less: harder.',
    status: 'planned',
    where: 'needs a clock in scenes',
  },
};

/** What a use can result in: what the outcome lists can do. */
export const OUTCOME_TYPES: { id: string; label: string; status: 'built' | 'planned' }[] = [
  { id: 'say', label: 'Something is said or described', status: 'built' },
  { id: 'flag', label: 'A fact is set (they know you read them; the cart was searched)', status: 'built' },
  { id: 'mood', label: 'How they feel about you moves (and is shown as a note)', status: 'built' },
  { id: 'token', label: 'A kept advantage for a later roll (against a person, for a kind of effort)', status: 'built' },
  { id: 'reveal', label: 'Things nearby are pointed out', status: 'built' },
  { id: 'silver', label: 'You lose (or gain) silver', status: 'built' },
  { id: 'time', label: 'Time passes', status: 'built' },
  { id: 'remove', label: 'Someone or something leaves the scene', status: 'built' },
  { id: 'enter', label: 'You get through: the scene ends', status: 'built' },
  { id: 'talks', label: 'They run out of patience (limited talks)', status: 'built' },
  { id: 'item', label: 'You get an item, a pass, a clue', status: 'planned' },
  { id: 'relation', label: 'A relationship changes (an opinion of a third person; a hold over them)', status: 'planned' },
  { id: 'harm', label: 'Wellbeing or health changes', status: 'planned' },
  { id: 'unlock', label: 'A new option opens (a route, a talk line, a place)', status: 'planned' },
];
