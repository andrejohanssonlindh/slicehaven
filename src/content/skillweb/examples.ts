import { TAGGED } from './tags';

/**
 * Examples of how a skill is used for each kind of effort (tag). This is the model for the full
 * map: for a tag and a skill, a few short, concrete things a character might actually do with it.
 * They make the tags readable ("Physique to impress" is not obvious until you see "lift something
 * that others struggled with") and they are the raw material for outcome texts and hooks.
 *
 * Rules for writing them (see director/design/skill-map-handover.md):
 * - our own words, one short line each, something you could *see* a character do;
 * - 2–3 per skill and tag, different in kind from each other;
 * - only skills that carry the tag (a test checks this).
 * Ids are the creator's ("attr:…" attribute, "E:" expertise, "K:" mark, "F:" ability).
 */
export type Examples = Record<string, Record<string, string[]>>;

export const EXAMPLES: Examples = {
  persuade: {
    Argumentera: ['Lay out the facts in order and let them reach the conclusion themselves.', 'Point out, calmly, what they stand to lose by refusing.'],
    Berättarkonst: ['Tell a story of someone in their shoes who made the same choice.', 'Use a well-known legend to make the point without saying it.'],
    Ledarskap: ['Speak as someone used to being followed.', 'Present it as a plan the whole group is already behind.'],
    'attr:Intryck': ['Be sincere and hold their gaze.', 'Ask plainly, like someone who expects a yes.'],
  },
  impress: {
    Charm: ['Ask about their day and mean it.', 'Pay a compliment that is specific and true.'],
    'attr:Kroppsbyggnad': ['Flex a muscle, or lift something heavy that others struggled with.', 'Win an arm-wrestle, then let them win the rematch.'],
    'attr:Intryck': ['Walk in as if the room had been waiting for you.', 'Stay calm and warm while everyone else is not.'],
    'Sång & musik': ['Start a tune the whole room knows.', 'Play something that suits the mood of the place.'],
    Dansa: ['Pull someone into the circle.', 'Pick up their local dance step on the spot.'],
    'E:Akrobatik': ['Tumble over a table to catch a falling cup.', 'Walk the rail of the bridge while the children cheer.'],
    'E:Flörta': ['Let a look linger a moment too long.', 'Tease lightly and see whether they tease back.'],
    Svärd: ['Run through a clean set of cuts for anyone watching.', 'Split a thrown apple in the air.'],
    Båge: ['Hit the far post three times running.', 'Split an arrow already in the target.'],
    Dolk: ['Flip a knife and catch it without looking.', 'Peel an apple in a single ribbon.'],
    Kastvapen: ['Pin a leaf to a tree from across the yard.', 'Hit a swinging lantern with a thrown stone.'],
    Spjut: ['Throw a spear into the same mark twice.', 'Hold a spear steady at arm\'s length for a long time.'],
    Yxa: ['Split a log in one stroke.', 'Bury an axe in the post from ten paces.'],
  },
  'sweet-talk': {
    Charm: ['Be friendly first and ask for the favour as an afterthought.', 'Share a little of yourself so they feel they know you.'],
    Berättarkonst: ['Tell the story of your long road and why you must be home tonight.', 'Make them curious about how it ends.'],
    Argumentera: ['Show that letting you through harms no one.', 'Answer every worry before they voice it.'],
    'E:Lova': ['Promise something small and believable, and mean to keep it.', 'Swear on something they respect.'],
    'K:Smort munläder': ['Have a ready answer to every objection.', 'Turn their own words into a reason to say yes.'],
  },
  distract: {
    Charm: ['Ask loudly for directions while a friend slips past.', 'Be so pleasant they forget what they were watching.'],
    Berättarkonst: ['Start a story and pause at the best part.', 'Tell a tall tale that draws a small crowd.'],
    'Sång & musik': ['Strike up a song that turns every head.', 'Drop a string and make a show of it.'],
    Dupera: ['Point at something that is not there.', 'Stage a small accident across the room.'],
    'attr:Intryck': ['Be so friendly they cannot look away.', 'Make a scene that is harmless but impossible to ignore.'],
    'attr:Kroppsbyggnad': ['Heave a barrel onto a cart in front of the watchers.', 'Pick a loud, harmless fight with a friend.'],
    'Spel & dobbel': ['Start a dice game on the steps.', 'Offer odds on a bet that draws a crowd.'],
  },
  ask: {
    Argumentera: ['Put the question as a favour between equals.', 'Show them that telling you costs nothing.'],
    Charm: ['Share a drink first and ask second.', 'Let them feel they are doing you a kindness.'],
    Berättarkonst: ['Tell your half of the story and wait for them to fill in theirs.', 'Offer a rumour of your own to trade.'],
    'attr:Intryck': ['Ask directly and wait without filling the silence.', 'Be the person people end up confiding in.'],
    Genomskåda: ['Ask something you know the answer to and watch the reply.', 'Press where they went quiet.'],
    'Injaga fruktan': ['Ask the question again, softer, and let the pause do the work.', 'Make clear what happens to people who stay silent.'],
    Skumraskaffärer: ['Drop a name from the right circle.', 'Pay for the answer in the coin the street uses.'],
  },
  bribe: {
    Handel: ['Haggle the price down by pointing at the flaws.', 'Offer a trade of goods instead of coin.'],
    'E:Muta': ['Pass a coin along with a handshake.', 'Offer a gift "for the trouble".'],
    Skumraskaffärer: ['Know who to ask for, and how to word it.', 'Offer a favour owed instead of silver.'],
    Argumentera: ['Explain how both sides come out ahead.', 'Show that taking it is the safe choice.'],
    Dupera: ['Make a poor offer sound generous.', 'Make it look as if someone else already paid.'],
    'E:Lova': ['Promise payment later, convincingly.', 'Name a price you can plausibly meet.'],
  },
  threaten: {
    'attr:Kroppsbyggnad': ['Step into their space and stay there.', 'Crack your knuckles at the right moment.'],
    'Injaga fruktan': ['Describe what will happen without raising your voice.', 'Let them see you are not afraid of what comes after.'],
    Slagsmål: ['Break a plank over your knee as if by habit.', 'Show a scarred hand and say nothing.'],
    Ledarskap: ['Speak as though many stand behind you.', 'Give an order as if it were already done.'],
    Dupera: ['Bluff about friends who are on their way.', 'Make a small threat sound like a known fact.'],
    'K:Hotfull stämma': ['Drop to a low voice that carries.', 'Say their name slowly.'],
    'K:Stark stämma': ['Bellow so the whole yard hears.', 'Call out the charge in front of their neighbours.'],
    Svärd: ['Lay a bared blade across your knees and say nothing.', 'Let the point drift to their belt buckle.'],
    Spjut: ['Lower the spear until it points at their chest.', 'Plant the butt and lean on it, always facing them.'],
    Yxa: ['Bury the axe in the table between you.', 'Test the edge on a thumbnail where they can see.'],
    Dolk: ['Clean your nails with the point while you talk.', 'Slide the knife out an inch and back.'],
    Båge: ['Nock an arrow and keep it there.', 'Draw, and hold the draw.'],
  },
  etiquette: {
    Hovliv: ['Give the right bow for the right rank.', 'Address the household by title and know who speaks first.', 'Know where each guest is seated, and why.'],
  },
  streetwise: {
    Skumraskaffärer: ['Know which tavern the right person drinks in.', 'Read the chalk marks locals leave on doorposts.'],
    Charm: ['Buy a round for the right table.', 'Ask the barmaid, not the owner.'],
    Handel: ['Know what things really cost round here.', 'Spot a fence by how they handle goods.'],
    'attr:Intryck': ['Look like you belong.', 'Keep your voice low and your answers short.'],
  },
  'read-people': {
    Genomskåda: ['Notice the lie behind a too-quick answer.', 'See what they carefully avoid looking at.'],
    'attr:Vaksamhet': ['Catch a nervous glance toward the door.', 'Notice who in the room is watching whom.'],
  },
  search: {
    Genomsöka: ['Lift the tarp and check under the sacks.', 'Run a hand along the seam for a hidden pocket.'],
    'attr:Vaksamhet': ['Spot the one thing that is out of place at a glance.', 'Notice fresh scratches on an old lock.'],
  },
  climb: {
    Klättra: ['Use the ivy as a rope.', 'Find hand- and footholds in rough stone.'],
    'E:Akrobatik': ['Swing from a beam to the next ledge.', 'Vault a low wall and keep going.'],
    'K:Apfotad': ['Use your feet like hands.', 'Scramble up a trunk without slowing down.'],
    'K:Starka nypor': ['Hold on by the fingertips and pull.', 'Haul yourself up a sheer edge.'],
  },
  deceive: {
    Dupera: ['Tell a small lie with a straight face and a true detail in it.', 'Back the story up with a forged-looking paper.'],
    Charm: ['Smile warmly so they never think to check.', 'Make the lie sound like a confidence between friends.'],
    Berättarkonst: ['Spin a story with so many details it must be true.', 'Tell it as something that happened to a cousin.'],
    Argumentera: ['Build a case on a premise they will not question.', 'Turn their doubts into proof that you are honest.'],
    'E:Skådespel': ['Wipe a tear at the right moment.', 'Play the weary traveller, limp and all.'],
    'E:Förklädnad': ['Swap your cloak and walk differently.', 'Wear the tabard of the house you claim to serve.'],
    'K:Smort munläder': ['Answer a hard question with an easy, ready smile.', 'Never pause where a liar would.'],
    'K:Ärligt ansikte': ['Meet their eyes without blinking.', 'Look so plain and trustworthy no one asks twice.'],
    'attr:Intryck': ['Lie with total calm.', 'Say it as though you were bored by the question.'],
  },
  rally: {
    Ledarskap: ['Give one clear order and take the first step yourself.', 'Name each person\'s task so no one hesitates.'],
    'Sång & musik': ['Strike up a marching song to carry tired legs.', 'Hum a low tune that calms the frightened.'],
    Berättarkonst: ['Remind them of the victory their grandparents won.', 'Tell what waits for them at the end of the road.'],
    'K:Stark stämma': ['Call across the field and be heard by everyone.', 'Shout a name and have the whole line turn.'],
    'attr:Intryck': ['Stand where they can all see you, calm and sure.', 'Meet each eye in turn and nod.'],
  },
  gamble: {
    'Spel & dobbel': ['Count the cards that have fallen.', 'Fold early and keep the table guessing.'],
    Dupera: ['Look pleased with a poor hand.', 'Sigh like you hold nothing at all.'],
    Genomskåda: ['Catch the tell when they reach for their cup.', 'Notice who bets bigger when the hand is weak.'],
    'E:Fuska': ['Palm a die as the cup goes round.', 'Mark the corner of a card with a thumbnail.'],
    Handel: ['Work out the odds of the pot against the coin.', 'Know when a bet is a bargain.'],
  },
  survey: {
    Genomsöka: ['Comb the ground nearby for signs of passage.', 'Check the edges of the place for anything left behind.'],
    Speja: ['Watch the road from a high spot.', 'Count who comes and goes, and when.'],
    Orientering: ['Take your bearings from the stars and the landmarks.', 'Work out which way the road bends before you see it.'],
    Naturlära: ['Read the plants and the animal tracks.', 'Tell from the birds whether the wood is quiet or watched.'],
    Spåra: ['Follow what passed this way.', 'Tell old tracks from fresh ones.'],
    'F:Mörkersyn': ['See across the field as if it were dusk.', 'Pick out faces at the far edge of the firelight.'],
    'F:Nattsyn': ['Spot a lantern long before the others do.', 'Make out the shape of the wall in the dark.'],
    'attr:Vaksamhet': ['Notice what changes between one glance and the next.', 'Hear what the others have stopped hearing.'],
  },
};

/** The examples for one skill, per tag it carries. */
export function examplesOf(skill: string): { tag: string; ways: string[] }[] {
  return Object.keys(EXAMPLES)
    .filter((tag) => EXAMPLES[tag][skill])
    .map((tag) => ({ tag, ways: EXAMPLES[tag][skill] }));
}

/** Tagged skills that have no example yet: what is left to write. */
export function missingExamples(): { tag: string; skill: string }[] {
  const out: { tag: string; skill: string }[] = [];
  for (const [tag, ids] of Object.entries(TAGGED)) for (const skill of ids) if (!EXAMPLES[tag]?.[skill]) out.push({ tag, skill });
  return out;
}
