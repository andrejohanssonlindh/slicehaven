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
    Fingerfärdighet: ['Pull a coin from a child\'s ear.', 'Juggle three knives and let one slip nearby.'],
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
  sneak: {
    Smyga: ['Step only where the boards are nailed down.', 'Move when the watchman turns, freeze when he looks back.'],
    Gömma: ['Keep to the shadow side of the wall.', 'Stay low and let the crowd cover your passing.'],
    'E:Takvägar': ['Cross the street over the rooftops.', 'Slip along a gutter above the guards\' heads.'],
    'E:Bakhåll': ['Pick the bend where the road forces them to slow.', 'Wait in the ditch until the last one passes.'],
  },
  hide: {
    Gömma: ['Burrow under the hay and pull it over you.', 'Press flat into a doorway as the patrol passes.'],
    Smyga: ['Back out of sight without a sound.', 'Hold your breath and stay out of the lantern light.'],
    'E:Förklädnad': ['Hide in plain sight in a servant\'s apron.', 'Pull a hood and a stoop over your height.'],
    'E:Bakhåll': ['Cover the hide with branches until it looks like brush.', 'Choose a spot with a clear view and only one way in.'],
    Fingerfärdighet: ['Tuck a small knife into a sleeve.', 'Pass a note from palm to boot without a glance.'],
  },
  steal: {
    Fingerfärdighet: ['Lift a purse during a jostle in the crowd.', 'Palm the key from the table while talking.'],
    Smyga: ['Take the keys from the sleeping guard\'s belt.', 'Lift the loaf from the stall when the seller turns.'],
    'E:Låsdyrkning': ['Work the lock with two bent pins.', 'Listen to the tumblers until they click.'],
    Skumraskaffärer: ['Know who buys it before you take it.', 'Know which watchman looks the other way for a fee.'],
  },
  escape: {
    Undvika: ['Twist out of the grabbing hand.', 'Duck under the arm and run.'],
    Fingerfärdighet: ['Slip your wrists out of the cord.', 'Work the rope loose while they argue.'],
    'E:Rep & knopar': ['Find the knot that gives and pull it.', 'Slide a loop free over a shoulder.'],
    'E:Flyktvägar': ['Know the back door and the drain behind it.', 'Leave a cart across the alley mouth behind you.'],
    'E:Akrobatik': ['Roll under the swinging door.', 'Wriggle through a window too small to look possible.'],
    'attr:Reaktion': ['Be through the gap before it closes.', 'Throw yourself clear at the first shout.'],
  },
  jump: {
    Hoppa: ['Clear the ditch with a running start.', 'Leap from the cart to the wall top.'],
    'E:Akrobatik': ['Spring over the stall and land in a roll.', 'Leap between rooftops and keep running.'],
    Undvika: ['Hop the sweep of a low blow.', 'Vault the table when it is overturned.'],
    'attr:Förflyttning': ['Take the stream in a quick, easy bound.', 'Jump down from the ledge without breaking stride.'],
  },
  swim: {
    Simma: ['Cross the river in a steady crawl.', 'Dive for something dropped off the quay.'],
    Sjömannaskap: ['Stay with the boat and pull yourself back aboard.', 'Read the current and swim with it, not against it.'],
    'E:Ro & paddla': ['Paddle across on a floating log.', 'Take the oars and work the boat against the stream.'],
    'attr:Kroppsbyggnad': ['Keep going on strength when form has failed.', 'Haul a friend through the water by the collar.'],
  },
  ride: {
    Rida: ['Keep your seat when the horse shies.', 'Gallop over broken ground without losing it.'],
    'E:Djurträning': ['Calm a nervous mount with a low voice and a hand.', 'Make a stubborn mule move.'],
    'E:Köra vagn': ['Turn the wagon in a narrow lane.', 'Take the cart down the steep road without losing the load.'],
    Naturlära: ['Pick the right mount for the road.', 'Read when the horse has had enough.'],
  },
  travel: {
    Marsch: ['Keep a steady pace all day and arrive fit.', 'Pick the dry line through the marsh.'],
    Vildmarksvana: ['Choose a camp out of the wind with water near.', 'Know which valley will hold snow.'],
    Orientering: ['Take your bearings from the sun and the lie of the land.', 'Cut across country to meet the road ahead.'],
    Rida: ['Pace the horse so it lasts the day.', 'Find the ford the horses can cross.'],
    'E:Genvägar': ['Know the goat track that skips the long bend.', 'Cut through the market to lose the crowd.'],
    'E:Navigation': ['Plot the day\'s distance from the map and the stars.', 'Tell where you are by the depth of the water.'],
    'attr:Livskraft': ['Keep walking when everyone else needs a rest.', 'Shrug off a cold wet night and set off at dawn.'],
  },
  track: {
    Spåra: ['Follow bent grass and broken twigs.', 'Tell how many passed, and which way.'],
    Naturlära: ['Read what a deer track says about what chased it.', 'Know which animal left the droppings, and how old they are.'],
    'Jakt & fiske': ['Know where the game will come to drink.', 'Follow a wounded animal by the blood.'],
    Orientering: ['Guess where the trail must go from the lie of the valley.', 'Get ahead of the quarry by crossing the ridge.'],
  },
  forage: {
    'Jakt & fiske': ['Set a line in the slow water.', 'Bring down a hare and dress it on the spot.'],
    Naturlära: ['Pick the mushrooms that are safe to eat.', 'Find the roots a hungry person can dig.'],
    Vildmarksvana: ['Find fresh water by following the birds.', 'Build a lean-to with what is lying around.'],
    'E:Fällor': ['Set snares on the runs the rabbits use.', 'Make a deadfall from a flat stone and a stick.'],
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
