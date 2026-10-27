import type { BySkill } from './byskill';

/**
 * Abilities (innate gifts, senses, auras). Narrow like marks: each one helps a few efforts.
 * Senses and magical gifts mostly serve the hidden-read efforts (search, survey, lore), so their
 * examples allow for a wrong or partial reading; the supernatural ones are developed further with
 * the mystic skills. Mörkersyn and Nattsyn also keep their entries under Survey in examples.ts.
 */
export const ABILITIES: BySkill = {
  'F:Andeförnimmelse': {
    survey: ['Feel that something unseen is in the room.', 'Sense where a spirit lingers by the chill.'],
    lore: ['Tell what kind of presence it is.', 'Feel why the dead stay in this place.'],
  },
  'F:Aura av obehag': {
    threaten: ['Let the unease creep over the room.', 'Make them look away without knowing why.'],
    provoke: ['Make a crowd shift and mutter.', 'Make a dog growl at nothing.'],
  },
  'F:Automatskrift': {
    lore: ['Let the pen write what you did not know.', 'Wake to find a page of someone else\'s hand.'],
    ask: ['Put a question to the unseen and read the answer.', 'Get a message that may or may not be true.'],
  },
  'F:Berusad insikt': {
    analyse: ['See the answer after a cup too many.', 'Solve it by the third mug.'],
    ask: ['Drink with them until the truth falls out.', 'Say foolish things and hear wise ones back.'],
  },
  'F:Biotropisk aura': {
    comfort: ['Make the sick feel stronger beside you.', 'Make plants lean toward you.'],
    heal: ['Speed the mending of those who rest near.', 'Keep a fever from rising overnight.'],
  },
  'F:Djurtunga': {
    ask: ['Ask the crow what it saw.', 'Get the dog to tell who passed by.'],
    track: ['Have the wolf tell you where the herd went.', 'Hear a horse name the rider\'s fear.'],
  },
  'F:Dominera': {
    threaten: ['Say "kneel" in a voice that is obeyed.', 'Put a hand on their shoulder and push down.'],
    persuade: ['Give an order that sounds like a decision already made.', 'Make a refusal feel like a mistake.'],
  },
  'F:Dödens kall': {
    threaten: ['Name the day they will die.', 'Let the dead whisper in the room.'],
    lore: ['Know how and when someone died.', 'Hear what the dead remember.'],
  },
  'F:Eidetiskt minne': {
    lore: ['Recall a page read once.', 'Remember every face seen in the crowd.'],
    analyse: ['Compare the scene with how it looked yesterday.', 'Replay the conversation word for word.'],
  },
  'F:Ekohörsel': {
    survey: ['Hear the shape of a room by its echo.', 'Judge a cavern\'s size from a clap.'],
    search: ['Find a hollow behind the wall by its sound.', 'Hear where a hidden door must be.'],
  },
  'F:Eldförnimmelse': {
    survey: ['Feel where a fire burns beyond the wall.', 'Sense the hearths of a whole village.'],
    search: ['Find the hidden stove by the warmth.', 'Feel the heat of a recently doused fire.'],
  },
  'F:Entropisk aura': {
    provoke: ['Let things fray and break around you.', 'Make a tight knot come undone.'],
    threaten: ['Let the candles gutter as you speak.', 'Leave a trail of small ruin.'],
  },
  'F:Erotisk aura': {
    'sweet-talk': ['Make them want to say yes.', 'Make a lie easier to believe.'],
    distract: ['Make every eye follow you.', 'Draw guards from their post.'],
  },
  'F:Falköga': {
    survey: ['See the far ridge as if it were near.', 'Count the riders on the distant road.'],
    search: ['Spot a glint on a far hillside.', 'Pick out a hidden watcher among the trees.'],
  },
  'F:Flyktig': {
    escape: ['Slip away through a crowd.', 'Be gone before they turn.'],
    sneak: ['Pass through without leaving a mark.', 'Be forgotten the moment you leave.'],
  },
  'F:Gränslandsvandrare': {
    travel: ['Step into the borderland and cross a mile in a moment.', 'Find the path that only the wanderers use.'],
    sneak: ['Pass between the worlds unseen.', 'Step through the veil.'],
  },
  'F:Hibernera': {
    travel: ['Sleep through a blizzard in the snow.', 'Go for days on little food or warmth.'],
    forage: ['Make a thin winter last.', 'Wait out the hunger in torpor.'],
  },
  'F:Inger lugn': {
    comfort: ['Quiet a panic with your presence.', 'Make the room breathe out.'],
    persuade: ['Make them think calmly again.', 'Let them hear reason after a shock.'],
  },
  'F:Inspirerande aura': {
    rally: ['Put heart into the weary.', 'Be the one they follow into the dark.'],
    impress: ['Make people feel they could do more.', 'Leave a room better than you found it.'],
  },
  'F:Jordförnimmelse': {
    survey: ['Feel the tremor of a distant march.', 'Sense hollows and caves under the ground.'],
    track: ['Feel the passage of heavy feet.', 'Tell where a thing has dug.'],
  },
  'F:Järnmage': {
    forage: ['Eat what would sicken anyone else.', 'Keep down the meal of last week\'s scraps.'],
    poison: ['Shrug off a dose that would fell another.', 'Drink the suspect cup first.'],
  },
  'F:Koagulering': {
    heal: ['Let the bleeding stop itself.', 'Close a cut in minutes.'],
    travel: ['Keep going on a wounded leg.', 'Walk on while the wound seals.'],
  },
  'F:Kraftig benstomme': {
    threaten: ['Take the blow and keep standing.', 'Loom heavily in the doorway.'],
    impress: ['Break a plank with your elbow.', 'Carry two where others carry one.'],
  },
  'F:Känna fiendskap': {
    'read-people': ['Know who in the room wishes you ill.', 'Feel a stranger\'s hostility before a word is said.'],
    survey: ['Sense an ambush before it is sprung.', 'Feel that the crowd has turned.'],
  },
  'F:Locksång': {
    perform: ['Sing, and small birds come to listen.', 'Make a whole room tap its feet.'],
    distract: ['Draw a crowd by singing a charm.', 'Make guards sway to a tune.'],
  },
  'F:Luftförnimmelse': {
    survey: ['Taste the wind and read what it carries.', 'Know who passed upwind.'],
    track: ['Tell from the wind what happened in the east.', 'Follow a scent a wind has carried.'],
  },
  'F:Luktsinne': {
    track: ['Follow a trail by smell.', 'Tell which way the stag went.'],
    search: ['Smell the spoiled meat behind the wall.', 'Catch the fresh paint on an old door.'],
    poison: ['Smell the bitter almond in the wine.', 'Notice the sweet note of a drug.'],
    'read-people': ['Smell fear on a liar.', 'Tell a disguise by the wrong scent.'],
  },
  'F:Läkande beröring': {
    heal: ['Lay hands on the wound and feel it close.', 'Soothe a fever with a touch.'],
    comfort: ['Quiet the pain of the dying.', 'Ease the shaking of a trembling child.'],
  },
  'F:Magisyn': {
    search: ['Spot the glow of an enchanted object.', 'See the trace of a ward on the lintel.'],
    lore: ['Tell what kind of magic made it.', 'See whether a thing is blessed or cursed.'],
  },
  'F:Naturlig exorcist': {
    threaten: ['Lay a hand on the possessed and push.', 'Name the spirit and tell it to leave.'],
    lore: ['Know what a spirit wants.', 'Tell a possession from madness.'],
  },
  'F:Nekrotropisk aura': {
    threaten: ['Let flowers wither as you pass.', 'Smile as the milk sours.'],
    provoke: ['Make a crowd cringe and leave.', 'Sour the mood of a feast.'],
  },
  'F:Repellera': {
    threaten: ['Drive off the beast with a look.', 'Keep the spirit at arm\'s length.'],
    escape: ['Slip away while the creature hesitates.', 'Keep a pack at bay while you retreat.'],
  },
  'F:Sanndrömmar': {
    lore: ['Wake with a clue about what is coming.', 'Dream a place before you see it.'],
    survey: ['Know a place from a dream.', 'Warn the camp of what the dream showed.'],
  },
  'F:Ser svagheter': {
    'read-people': ['Spot the vice that rules them.', 'See what they cannot say no to.'],
    ask: ['Press on the sore spot until they talk.', 'Offer what they crave and wait.'],
  },
  'F:Sjätte sinne': {
    search: ['Feel the trap before the step.', 'Sense the unseen watcher.'],
    escape: ['Duck before the arrow flies.', 'Leave the room a moment before the ambush.'],
  },
  'F:Sprida tvedräkt': {
    provoke: ['Whisper a word that turns friends to rivals.', 'Cast a look that sparks a quarrel.'],
    deceive: ['Sow doubt with a sideways remark.', 'Let two people each think the other lied.'],
  },
  'F:Späcklager': {
    swim: ['Float for hours in cold water.', 'Cross the icy river without a shiver.'],
    travel: ['Walk through snow in thin clothes.', 'Sleep outside in the frost.'],
  },
  'F:Telepatisk kommunikation': {
    ask: ['Speak to a mind across the room.', 'Ask a question no one else hears.'],
    rally: ['Pass an order silently to a whole group.', 'Warn a friend without a sound.'],
  },
  'F:Tidigare liv': {
    lore: ['Recognise a place you have never seen.', 'Remember an old rite from nowhere.'],
    ask: ['Greet a stranger with a name from another life.', 'Know an old song that no one taught you.'],
  },
  'F:Tidskänsla': {
    travel: ['Know the hour with no sun or clock.', 'Wake exactly at dawn every day.'],
    perform: ['Keep the beat through any dance.', 'Time the pause in a tale to the heartbeat.'],
  },
  'F:Trollbindande blick': {
    'sweet-talk': ['Hold their gaze until they melt.', 'Make a stranger fall for a moment.'],
    distract: ['Pull a guard\'s eyes to yours.', 'Freeze a bystander with a look.'],
    impress: ['Meet an eye and make it linger.', 'Leave an impression that does not fade.'],
  },
  'F:Trollbindande stämma': {
    'sweet-talk': ['Say it with a voice that wants to be obeyed.', 'Make dull facts sound fascinating.'],
    distract: ['Talk a guard into forgetting his post.', 'Hold a room with the sound alone.'],
  },
  'F:Trädtunga': {
    ask: ['Ask the oak who walked by.', 'Learn from the old tree what the forest remembers.'],
    forage: ['Ask which plant is safe to eat.', 'Have the willow point to the stream.'],
  },
  'F:Utan ansikte': {
    deceive: ['Be taken for whoever they expect.', 'Walk through a crowd and be forgotten.'],
    hide: ['Leave no description behind.', 'Fade into any group.'],
  },
  'F:Vattenförnimmelse': {
    forage: ['Find water in a dry land.', 'Feel the spring under the stones.'],
    survey: ['Sense a river long before you see it.', 'Know when rain is on its way.'],
  },
  'F:Väsenvän': {
    ask: ['Be heard by the creatures you befriended.', 'Call on a favour from the fey.'],
    ride: ['Be carried by a creature that likes you.', 'Pass through a forest with their blessing.'],
  },
  'F:Alviska ögat': {
    survey: ['See more of a landscape than a human could.', 'Notice the elf-paths in the forest.'],
    search: ['Spot the glimmer of a hidden thing.', 'See through a glamour.'],
  },
  'F:Empatisk beröring': {
    'read-people': ['Touch a hand and feel what they feel.', 'Know the lie by the pulse.'],
    comfort: ['Take a share of their pain.', 'Calm a mourner with a touch.'],
  },
  'F:Mörkersyn': {
    search: ['Find the loose stone in a lightless cellar.', 'Read marks on a wall in the dark.'],
    sneak: ['Move through a pitch-black passage without a light.', 'Keep watch while the others sleep, unseen.'],
  },
  'F:Nattsyn': {
    search: ['Find the dropped coin by moonlight.', 'Read a book by a dying fire.'],
    sneak: ['Slip along the street with no lantern.', 'Spot the guard before the guard spots you.'],
  },
};
