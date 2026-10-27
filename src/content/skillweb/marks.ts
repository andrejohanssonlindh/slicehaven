import type { BySkill } from './byskill';

/**
 * Marks (looks, voices, quirks). Narrow skills: each one helps a few efforts, in the way it would
 * help a skill ("Scars" when threatening, "Cute" when asking). Tags and examples side by side;
 * tags.ts and examples.ts merge this in. The marks with an earlier entry there are not repeated.
 */
export const MARKS: BySkill = {
  'K:Alldagligt utseende': {
    hide: ['Blend into any crowd of ten.', 'Be described by witnesses as "somebody, I think".'],
    deceive: ['Pass as the cousin everyone half remembers.', 'Wear a stranger\'s coat and be taken for its owner.'],
  },
  'K:Allvarlig uppsyn': {
    persuade: ['Say it with a straight face, and be believed.', 'Let a long, solemn pause carry the point.'],
    threaten: ['Do not smile while you mention the consequences.', 'Look at them as at a problem that will be dealt with.'],
  },
  'K:Androgyn': {
    deceive: ['Pass as either, as the moment needs.', 'Slip into a place meant for the other sort of guest.'],
    distract: ['Be a puzzle no one can stop looking at.', 'Draw eyes away from your friend by standing out.'],
  },
  'K:Avvikande ögonfärg': {
    impress: ['Meet their eye and let them notice.', 'Let the rumour of a strange gift follow you.'],
    threaten: ['Stare without blinking, odd eyes and all.', 'Let them wonder what those eyes have seen.'],
  },
  'K:Balanssinne': {
    climb: ['Walk the narrow ledge as if it were a road.', 'Stand upright on the swaying branch.'],
    jump: ['Land on a thin beam and hold still.', 'Take the stepping stones at a run.'],
  },
  'K:Barnvän': {
    comfort: ['Get a frightened child to talk.', 'Sit down at their level and wait.'],
    ask: ['Ask the kids what the adults will not say.', 'Win a child\'s trust with a small toy.'],
  },
  'K:Bedårande handstil': {
    impress: ['Write a note so lovely they keep it.', 'Sign a name with a flourish.'],
    deceive: ['Write a letter that looks like a clerk\'s work.', 'Copy a seal and a hand with ease.'],
  },
  'K:Blek & kall': {
    threaten: ['Stand very still in the dark.', 'Say it quietly, with ice in your voice.'],
    hide: ['Lie still and pass for dead.', 'Hold your breath while a hand feels for a pulse.'],
  },
  'K:Bollsinne': {
    impress: ['Catch whatever is thrown, without looking.', 'Keep a ball in the air with your knee.'],
    distract: ['Toss a ball into the crowd and let them play.', 'Start a game of catch in the courtyard.'],
  },
  'K:Bystig': {
    impress: ['Be noticed the moment you enter.', 'Wear the dress that gets a second look.'],
    distract: ['Lean on the counter at just the right moment.', 'Make a guard forget what he was saying.'],
  },
  'K:Böjlig': {
    escape: ['Slide out of a loosened grip.', 'Wriggle through the gap between two bars.'],
    hide: ['Fold up inside a cupboard or a barrel.', 'Lie flat under a bed.'],
  },
  'K:Chevaleresk': {
    etiquette: ['Offer an arm, hold a door, give up your seat.', 'Bow to exactly the depth that is correct.'],
    impress: ['Defend someone\'s honour with a word.', 'Return a dropped handkerchief with a flourish.'],
  },
  'K:Det var bättre förr': {
    ask: ['Get an old-timer started on the good old days.', 'Reminisce, and let them correct you.'],
    teach: ['Recall how it used to be done and show them.', 'Use an old proverb to make the lesson stick.'],
  },
  'K:Djuriska drag': {
    threaten: ['Bare your teeth and growl.', 'Let a dog see you as one of its own.'],
    impress: ['Show an uncanny gift for animals.', 'Move in a way that makes children stare.'],
  },
  'K:Djurvän': {
    ride: ['Win a strange horse\'s trust at a touch.', 'Make a nervous mule follow you.'],
    sneak: ['Hush a guard dog with a low word.', 'Pass the geese without a honk.'],
  },
  'K:Djärva visioner': {
    rally: ['Paint a picture of what could be, and make them want it.', 'Say "why not us?" and mean it.'],
    persuade: ['Sell a wild plan as an opportunity.', 'Put the idea so big it makes the small objections shrink.'],
  },
  'K:Finlemmade händer': {
    impress: ['Let a hand rest on the table where all can see it.', 'Pour the wine with a slow, graceful motion.'],
    etiquette: ['Offer a hand to be kissed, perfectly held.', 'Handle the fine cup as one used to fine cups.'],
  },
  'K:Flamboyant': {
    impress: ['Sweep in with a grand gesture.', 'Wear something no one has seen before.'],
    perform: ['Make a speech into a show.', 'Add a twirl to the bow.'],
  },
  'K:Flink tunga': {
    impress: ['Tie a cherry stem in a knot with your tongue.', 'Roll a tongue-twister off at speed, three times.'],
    'sweet-talk': ['Let a quick tongue make it sound like an offer.', 'Tease them with a very nimble remark.'],
  },
  'K:Folklig uppsyn': {
    'sweet-talk': ['Chat as one of the village.', 'Share a joke about the weather and the lord.'],
    streetwise: ['Pass unnoticed in any marketplace.', 'Be told the truth by ordinary people.'],
  },
  'K:Formbart ansikte': {
    deceive: ['Make your face say what you need it to.', 'Change expression the moment they look away.'],
    perform: ['Pull the face that makes the room roar.', 'Show a dozen moods in a dozen seconds.'],
  },
  'K:Fräknar': {
    'sweet-talk': ['Look so open that people want to help.', 'Be mistaken for a farm lad or lass, and used to it.'],
    impress: ['Be called charming the moment you step in the light.', 'Get a smile from a stern shopkeeper.'],
  },
  'K:Ful i mun': {
    provoke: ['Curse so inventively that they stare.', 'Call them what everyone else is thinking.'],
    streetwise: ['Swear in the dockside manner and be taken for one of them.', 'Speak the way rough crowds expect.'],
  },
  'K:Föraktfull min': {
    provoke: ['Look at them as you would at something on a boot.', 'Sniff, and look away.'],
    threaten: ['Make them feel small before you speak.', 'Treat the threat as beneath you.'],
  },
  'K:Förfinad vokabulär': {
    etiquette: ['Use the polite form for every rank.', 'Choose the word a courtier would choose.'],
    persuade: ['Make the argument sound learned.', 'Quote a phrase from a famous author.'],
  },
  'K:Förnäm uppsyn': {
    etiquette: ['Carry yourself as someone who is announced.', 'Receive a bow and know how deep to return it.'],
    impress: ['Be taken for someone of rank, on sight.', 'Walk through the door as if it opened for you.'],
  },
  'K:Genomträngande blick': {
    threaten: ['Hold their eye and say nothing.', 'Make them look away first.'],
    'read-people': ['See through the first answer.', 'Watch the face rather than the mouth.'],
  },
  'K:Gestikulerande': {
    perform: ['Tell the story with the whole body.', 'Act out the argument with both hands.'],
    etiquette: ['Give the greeting of three nations, each correctly.', 'Make a deep, dignified bow that suits the rank.'],
  },
  'K:God lyssnare': {
    ask: ['Say nothing, nod, and let them fill the silence.', 'Repeat the last thing they said, as a question.'],
    'read-people': ['Catch the change in their voice mid-sentence.', 'Notice what they would rather not speak of.'],
  },
  'K:Gott minne': {
    lore: ['Recall a name heard once, years ago.', 'Remember the exact words of the old contract.'],
    analyse: ['Hold every figure in your head.', 'Notice that the story differs from the one told yesterday.'],
  },
  'K:Graciös': {
    impress: ['Cross the room as if gliding.', 'Take a step in the dance without effort.'],
    perform: ['Add a graceful turn to any act.', 'Move so smoothly the watchers go quiet.'],
  },
  'K:Gänglig': {
    jump: ['Cover the ditch in a single long stride.', 'Reach the high ledge without a leap.'],
    climb: ['Use long limbs to reach the next hold.', 'Stretch across the wall from one window to another.'],
  },
  'K:Grotesk fantasi': {
    perform: ['Tell of monsters so odd that people shiver and laugh.', 'Invent a creature on the spot.'],
    deceive: ['Make a lie so wild it must be true.', 'Spin an absurd story, with a straight face.'],
  },
  'K:Grotesk uppenbarelse': {
    threaten: ['Step out of the shadows and let them look.', 'Smile with the half of your face that can.'],
    provoke: ['Stare at them from close range.', 'Be the thing they cannot bear to see.'],
  },
  'K:Hånskratt': {
    provoke: ['Laugh at their best argument.', 'Let a snort carry across the room.'],
    threaten: ['Laugh at their weapon.', 'Laugh once and then stop, flat.'],
  },
  'K:Inställsam': {
    'sweet-talk': ['Agree before they finish speaking.', 'Fetch the chair, the cup, the cushion.'],
    persuade: ['Plant the idea so that it becomes theirs.', 'Steer from behind the throne and take no credit.'],
  },
  'K:Isande tystnad': {
    threaten: ['Stay silent until they cannot bear it.', 'Let the quiet say what you intend.'],
    ask: ['Wait out the pause until they fill it.', 'Let them stew in the silence.'],
  },
  'K:Klingande skratt': {
    comfort: ['Laugh softly and make them smile too.', 'Make a grim hour feel lighter.'],
    distract: ['Laugh loud and draw every head.', 'Let the laugh ring out across the square.'],
  },
  'K:Klåfingrig': {
    steal: ['Palm the trinket as you admire it.', 'Take what the table offers and leave nothing.'],
    search: ['Open every drawer in one pass.', 'Touch and shift things until something gives.'],
  },
  'K:Klär i allt': {
    impress: ['Wear the borrowed finery as if it were yours.', 'Make a plain cloak look expensive.'],
    'sweet-talk': ['Look so good that people want to say yes.', 'Be forgiven because of how you look.'],
  },
  'K:Kroppssmycken': {
    impress: ['Jingle in with rings, studs and chains.', 'Show off a piece with a story.'],
    streetwise: ['Read a stranger\'s family and rank from their piercings.', 'Wear the ring that tells locals who you are.'],
  },
  'K:Luktar gott': {
    'sweet-talk': ['Draw people closer without knowing why.', 'Be pleasant to stand next to for long.'],
    impress: ['Arrive in a cloud of fine scent.', 'Be remembered as the one who smelled of spice.'],
  },
  'K:Luktar illa': {
    provoke: ['Step close and let them back away.', 'Clear a seat on a crowded bench.'],
    distract: ['Make the guards turn their noses and not their heads.', 'Make people look away.'],
  },
  'K:Lättroad': {
    comfort: ['Giggle at the right moment and lighten the mood.', 'Find the funny side of a bad day.'],
    'sweet-talk': ['Laugh at their joke so they like you.', 'Be easy company.'],
  },
  'K:Missbildning': {
    threaten: ['Let your shape say what you will do.', 'Show a crooked hand that has done terrible things.'],
    distract: ['Make people look, and look away.', 'Draw the stare while your friend moves on.'],
  },
  'K:Monoton stämma': {
    deceive: ['Lie in a flat voice that gives nothing away.', 'Say it without the tells of feeling.'],
    etiquette: ['Drone like a clerk, and be taken for one.', 'Fit in at the office by sounding exactly like it.'],
  },
  'K:Musa': {
    perform: ['Be the one an artist is inspired by.', 'Turn a song into an event.'],
    rally: ['Make the weary feel it was all worth it.', 'Give a face to the cause.'],
  },
  'K:Nedsättande': {
    provoke: ['Praise them in the way that stings.', 'Compliment their courage for turning up.'],
    threaten: ['Remark how small a problem they are.', 'Say "run along" and mean it.'],
  },
  'K:Obegriplig handstil': {
    deceive: ['Hand over a note no one can check.', 'Claim it says what you need it to.'],
    hide: ['Write your plans where no one else can read them.', 'Leave a record that tells nothing.'],
  },
  'K:Onaturlig hårfärg': {
    impress: ['Be the one with the hair they remember.', 'Be known across three towns for it.'],
    distract: ['Draw the eye away from the hands.', 'Let it be the thing witnesses talk about.'],
  },
  'K:Patriotisk': {
    rally: ['Raise a toast to the homeland and watch it spread.', 'Remind them what they are fighting for.'],
    persuade: ['Make the case as a duty to the realm.', 'Appeal to what the locals hold dear.'],
  },
  'K:Pedant': {
    analyse: ['Notice the small error that undoes the whole.', 'Check the sums once more.'],
    law: ['Find the clause that was missed.', 'Quote the rule to the letter.'],
  },
  'K:Perfekt hy': {
    impress: ['Be remarked on by all.', 'Look rested after a night on the road.'],
    'sweet-talk': ['Be given the benefit of the doubt.', 'Be offered a seat by the fire.'],
  },
  'K:Proper': {
    etiquette: ['Keep the napkin folded and the pose upright.', 'Never speak with a full mouth.'],
    persuade: ['Look so correct that no one doubts you.', 'Be taken at your word by the serious.'],
  },
  'K:Romantiker': {
    'sweet-talk': ['Mention the moonlight and the old song.', 'Treat the request as a matter of the heart.'],
    perform: ['Sigh over a sunset until others do too.', 'Recite a love poem with feeling.'],
  },
  'K:Sammetsstämma': {
    'sweet-talk': ['Say yes so softly it sounds like their idea.', 'Purr the request.'],
    comfort: ['Calm a room with a murmur.', 'Read a bedtime tale to a scared child.'],
  },
  'K:Ser dum ut': {
    deceive: ['Play the fool and let them talk freely.', 'Be underestimated by every clerk.'],
    steal: ['Be ignored while you pocket the pen.', 'Be waved through because you seem harmless.'],
  },
  'K:Ser oskyldig ut': {
    deceive: ['Look as if butter would not melt.', 'Be believed because of your face.'],
    escape: ['Be let go with a warning.', 'Be taken for a bystander and left alone.'],
  },
  'K:Sjukligt utseende': {
    deceive: ['Lean on a stick and cough.', 'Be pitied and left alone.'],
    ask: ['Be given food and a place to sit.', 'Be told things by those sorry for you.'],
  },
  'K:Skamlös': {
    provoke: ['Do the outrageous thing in front of them.', 'Ask the question nobody would dare.'],
    distract: ['Strip off to bathe in the middle of the street.', 'Shrug when your secret is read aloud.'],
  },
  'K:Skrämmande utseende': {
    threaten: ['Loom out of the dark.', 'Make children hide.'],
    provoke: ['Step in close and say nothing.', 'Be a thing no one wants near.'],
  },
  'K:Slagfältsblick': {
    threaten: ['Stare through them at something far away.', 'Go still and distant, and let them wonder what you see.'],
    comfort: ['Sit beside a veteran and share the silence.', 'Draw the pity of an old soldier.'],
  },
  'K:Smednävar': {
    travel: ['Walk the stony path barefoot.', 'Ignore the nettles and the midges.'],
    impress: ['Lift the hot iron lid with a bare hand.', 'Pick up a coal and set it back.'],
  },
  'K:Snusförnuftig': {
    teach: ['Explain, patiently, how it is done.', 'Tell them the right way to do it.'],
    provoke: ['Correct their grammar in the middle of a quarrel.', 'Say "actually" and take a deep breath.'],
  },
  'K:Spetsöra': {
    deceive: ['Pass for part-elf among the elves.', 'Sweep the hair back to show the ears at the right moment.'],
    impress: ['Be admired as a beauty among elves and half-elves.', 'Be welcomed by a stranger who sees the ears.'],
  },
  'K:Stenansikte': {
    gamble: ['Show nothing, win or lose.', 'Bluff with no tells.'],
    deceive: ['Look blank while you lie.', 'Take bad news without a flicker.'],
  },
  'K:Stenhjärta': {
    bribe: ['Refuse to be moved by their plea.', 'Name a hard price and not blink.'],
    gamble: ['Take the pot from a tearful opponent.', 'Raise, unmoved by the sob story.'],
  },
  'K:Stolt hållning': {
    impress: ['Stand with your chin up when others stoop.', 'Never lower your eyes.'],
    etiquette: ['Hold yourself as an equal to anyone.', 'Take your place at the table without being shown.'],
  },
  'K:Storväxt': {
    threaten: ['Fill the doorway.', 'Look down at them from a great height.'],
    impress: ['Lift the child onto your shoulders.', 'Duck under the lintel and be a spectacle.'],
  },
  'K:Strukturerat sinne': {
    analyse: ['Sort the problem into neat parts.', 'Spot the pattern in the mess.'],
    teach: ['Lay the lesson out in order.', 'Make a list and walk through it.'],
  },
  'K:Sympatisk': {
    'sweet-talk': ['Be liked on sight.', 'Be told "you seem decent" within a minute.'],
    ask: ['Get people to open up on the first meeting.', 'Have strangers tell you their story.'],
  },
  'K:Söt': {
    'sweet-talk': ['Flutter and smile.', 'Be forgiven for a small fault.'],
    ask: ['Ask nicely and be given the biscuit.', 'Be handed the thing you asked for.'],
  },
  'K:Taktfull': {
    etiquette: ['Know what not to say at the table.', 'Change the subject before it turns sour.'],
    ask: ['Ask without causing offence.', 'Come to the point by a gentle road.'],
  },
  'K:Tandglugg': {
    'sweet-talk': ['Grin and be disarming.', 'Wear the gap as if it were a charm.'],
    perform: ['Whistle a sharp tune through the gap.', 'Spit a cherry stone across the room.'],
  },
  'K:Tatuering': {
    impress: ['Show the mark that tells where you have been.', 'Roll up a sleeve and let them read it.'],
    threaten: ['Show the sign of a feared company.', 'Let them see which gang you belong to.'],
  },
  'K:Tunnelseende': {
    analyse: ['Lose yourself in the problem and surface with the answer.', 'Ignore the noise and finish the proof.'],
    craft: ['Work through the night on a single piece.', 'Notice nothing but the detail under your hands.'],
  },
  'K:Uppkäftig': {
    provoke: ['Answer back to the sergeant.', 'Say what the others only think.'],
    distract: ['Start a quarrel so loud everyone turns.', 'Heckle the speaker.'],
  },
  'K:Utbrott': {
    threaten: ['Slam a fist down and shout.', 'Let them see you are on the edge.'],
    provoke: ['Throw a plate for effect.', 'Make them wonder what you will do next.'],
  },
  'K:Utmärglad': {
    escape: ['Squeeze between the bars.', 'Slip out of a loosened chain.'],
    hide: ['Turn sideways and vanish behind a post.', 'Fit into a gap too small for a man.'],
  },
  'K:Vacker': {
    impress: ['Walk into a hall and let it fall quiet.', 'Be the one the painter asks to sit.'],
    distract: ['Draw every eye to you.', 'Let a guard forget what he came to do.'],
  },
  'K:Vassa naglar': {
    threaten: ['Drag a nail slowly along the table.', 'Show the hand with the sharpened tips.'],
    climb: ['Dig in on the rough wall.', 'Hang on by the fingertips.'],
  },
  'K:Vassa tänder': {
    threaten: ['Smile with all your teeth.', 'Snarl, and be believed.'],
    provoke: ['Grin at them and nip the air.', 'Bite into an apple, slowly, watching.'],
  },
  'K:Vemodig stämma': {
    comfort: ['Sing low to the grieving.', 'Say "I know" in a voice that proves it.'],
    persuade: ['Make an appeal that moves them to pity.', 'Let the sadness in your voice carry the plea.'],
  },
  'K:Vildhjärna': {
    escape: ['Keep a cool head when the whole room erupts.', 'Dodge, duck and talk at once.'],
    distract: ['Juggle three problems and an argument at once.', 'Keep a crowd busy while a friend works.'],
  },
  'K:Välformad kropp': {
    impress: ['Strip to the waist for the wrestling and win cheers.', 'Show a body made by work.'],
    distract: ['Pose and let eyes slide off the task.', 'Wear less than the weather calls for.'],
  },
  'K:Välgödd': {
    travel: ['Sleep out in the cold without a shiver.', 'Walk on through a lean week.'],
    impress: ['Be welcomed at a feast, a hearty laugh at the head.', 'Be admired by those who have been hungry.'],
  },
  'K:Välkomnande leende': {
    'sweet-talk': ['Greet them as if they were expected.', 'Make a stranger feel invited.'],
    comfort: ['Smile at the frightened newcomer.', 'Make the tired traveller feel at home.'],
  },
  'K:Välvårdat hår': {
    impress: ['Run a hand through a perfect head of hair.', 'Be seen with every lock in place after a ride.'],
    etiquette: ['Look as one who attends to detail.', 'Be taken for someone who knows the rules.'],
  },
  'K:Ärr': {
    threaten: ['Let the scar speak of the last man who tried.', 'Touch the old wound and say nothing.'],
    impress: ['Tell a short story of how you got it.', 'Show it to a child, who stares in awe.'],
  },
  'K:Ögon i nacken': {
    search: ['Notice the tail you did not see.', 'Feel a gaze on your back and turn.'],
    poison: ['Sniff the cup before you drink.', 'Eat only what you saw being cooked.'],
  },
};
