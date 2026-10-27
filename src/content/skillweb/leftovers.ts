import type { BySkill } from './byskill';

/**
 * Narrow expertise and the odd skill or mark that fit no larger group. Same shape as marks.ts.
 * Mystic skills are not here: they belong to the filaments and are done with the magic.
 */
export const LEFTOVERS: BySkill = {
  'E:Begravningsriter': {
    comfort: ['Say the right words at the graveside.', 'Sit with the bereaved until the dawn.'],
    lore: ['Know how the dead are laid to rest here.', 'Tell the rite that was meant from the body\'s state.'],
  },
  'E:Flagellera': {
    impress: ['Kneel in the square and bear the lash without a sound.', 'Let the devout see what you endure.'],
    threaten: ['Show that pain means little to you.', 'Show the scars, and ask if they want more.'],
  },
  'E:Frossa': {
    impress: ['Eat a whole roast in front of a cheering hall.', 'Win the feast by clearing every plate.'],
    forage: ['Eat what the others will not touch.', 'Make a meal of scraps and gristle.'],
  },
  'E:Lappa & laga': {
    craft: ['Patch a coat so that it lasts another winter.', 'Sew up a torn pack by lamplight.'],
    travel: ['Mend a strap on the road and keep walking.', 'Make a worn-out boot last one more day.'],
  },
  'E:Lekar': {
    comfort: ['Start a game that makes the children forget.', 'Teach a lonely child a counting rhyme.'],
    distract: ['Draw a crowd of kids into a game.', 'Start a clapping game at the gate.'],
  },
  'E:Perversiteter': {
    provoke: ['Say the shocking thing with a calm smile.', 'Make the prim blush and the bold look away.'],
    ask: ['Learn their secret desires and offer a trade.', 'Win a confession by naming the thing they hide.'],
  },
  'E:Soldatliv': {
    rally: ['Share the old marching jokes and the mood lifts.', 'Know how to make a tired squad keep going.'],
    lore: ['Tell a regiment by its badge.', 'Know how a camp is laid out.'],
  },
  'E:Studentliv': {
    lore: ['Tell the university from its gown.', 'Recall the old student rhymes.'],
    streetwise: ['Know which tavern the students favour.', 'Find a bed for the night among scholars.'],
  },
  'E:Städa & tvätta': {
    craft: ['Scrub a floor until it shines.', 'Wash blood out of linen.'],
    hide: ['Clear away signs that anyone was here.', 'Wipe the table, and the evidence with it.'],
  },
  'E:Vinkonnässör': {
    impress: ['Name the vintage with a sip.', 'Choose the right wine for the dish.'],
    poison: ['Taste the faint wrongness in a cup.', 'Notice a sour note that should not be there.'],
  },
  'E:Ölkännare': {
    impress: ['Tell the brewery by the head of the ale.', 'Praise the tap and know why it is good.'],
    ask: ['Talk ale at the bar until the barman talks back.', 'Be trusted by the regulars.'],
  },
  Sköld: {
    threaten: ['Bang the sword on the shield.', 'Lock shields and advance as one.'],
    escape: ['Cover your head and bull through the crowd.', 'Hold a doorway with the shield at the front.'],
  },
  'K:Födelsemärke': {
    impress: ['Show the mark that proves your descent.', 'Let a mark on the neck start a rumour.'],
    deceive: ['Claim the mark as proof of a noble birth.', 'Pass for a long-lost heir.'],
  },
  'K:Knakande leder': {
    travel: ['Feel the rain coming in your knees.', 'Know the weather turns by the ache.'],
    survey: ['Warn the party of the coming storm.', 'Say "it will snow by morning" and be right.'],
  },
  'F:Gudomlig motståndskraft': {
    lore: ['Stand calm while a cleric curses.', 'Know what a god\'s wrath feels like.'],
    escape: ['Shrug off a holy ward.', 'Walk through a blessing meant to stop you.'],
  },
  'F:Magisk motståndskraft': {
    escape: ['Break free of a mage\'s hold.', 'Shake off a charm.'],
    threaten: ['Stand unmoved while the magician fumes.', 'Walk through a spell as if through mist.'],
  },
};
