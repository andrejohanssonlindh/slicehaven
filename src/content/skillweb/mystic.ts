import type { BySkill } from './byskill';

/**
 * Mystic skills. Narrow and mostly about magic itself, so what they do beyond casting is a few
 * everyday uses: Sensing searches like Search does for magic, an aspect gives an element-flavoured
 * hand at ordinary tasks. The map side (casting, flows, dissipation) is in design/magic-on-map.md;
 * these are the plain, non-casting uses so that a mystic character has things to do in a scene.
 */
export const MYSTIC: BySkill = {
  Ceremoni: {
    etiquette: ['Know the right words and gestures for a rite.', 'Lead a harvest festival without a hitch.'],
    comfort: ['Conduct a funeral that eases the family\'s grief.', 'Bless a marriage so the couple feel it holds.'],
    lore: ['Tell what a ritual is for from its tools.', 'Read a rite\'s steps from an old text.'],
  },
  Förnimma: {
    search: ['Feel for the trace of magic in a room.', 'Find the enchanted object among a pile of ordinary ones.'],
    survey: ['Sense the lie of the magic over a whole valley.', 'Notice that something is working a spell nearby.'],
    lore: ['Tell what kind of working made this mark.', 'Touch the spirit plane and see what stirs.'],
  },
  Förvränga: {
    analyse: ['See where a ward is weakest.', 'Work out how to unpick a half-woven spell.'],
    escape: ['Tear a binding spell apart from the inside.', 'Spoil a charm that holds you.'],
  },
  Harmonisera: {
    comfort: ['Settle a frayed temper with a breath.', 'Steady someone whose magic is running wild.'],
    analyse: ['Keep several workings in mind at once.', 'Feel when an energy is about to slip.'],
  },
  Kanalisera: {
    comfort: ['Say a prayer over the wounded.', 'Open the mind and draw peace from the world.'],
    rally: ['Lead a prayer that stiffens the nerves of a group.', 'Offer a blessing before the march.'],
    lore: ['Hear what a shrine\'s faithful have asked for.', 'Feel which god is honoured here.'],
  },
  Ataxotropi: {
    provoke: ['Let disorder spread among the quarrellers.', 'Make a neat plan come loose.'],
    distract: ['Cause a small commotion with things falling over.', 'Shake the shelves so every head turns.'],
  },
  Nomotropi: {
    hide: ['Hold perfectly still, even the dust around you.', 'Stop a sound from carrying.'],
    comfort: ['Calm a storm of nerves into stillness.', 'Hold a spilled cup in the air until it is caught.'],
  },
  Kronotropi: {
    travel: ['Nudge the hours so the road feels shorter.', 'Know exactly how much time is left.'],
    escape: ['Slow the falling beam for a heartbeat.', 'Gain a second before the blow lands.'],
  },
  Topotropi: {
    travel: ['Fold a short step across the gap.', 'Find the shortest way through twisting streets.'],
    escape: ['Slip out of reach by a hand\'s breadth.', 'Step through a door that was not there.'],
  },
  Termotropi: {
    forage: ['Cook the meal over a small, steady warmth.', 'Dry a soaked cloak without a fire.'],
    travel: ['Keep warm on a cold night.', 'Heat a stone to carry in a pocket.'],
  },
  Kryotropi: {
    forage: ['Chill a catch so it keeps.', 'Make water from a block of ice.'],
    travel: ['Freeze a stream to cross it.', 'Cool a hot axle on the road.'],
  },
  Fototropi: {
    survey: ['Light up the cellar and see all of it.', 'Make a far hill glow so the group can find it.'],
    distract: ['Flash a bright spark where all will look.', 'Shine a dazzle into a watcher\'s eyes.'],
    impress: ['Let a glow rise from your hands in the dark inn.', 'Cast a soft light on a painting to show it off.'],
  },
  Skototropi: {
    hide: ['Draw the shadows round yourself.', 'Darken a doorway so none see it.'],
    sneak: ['Put out the lantern ahead of you.', 'Walk through a patch of moving dark.'],
  },
  Pyrotropi: {
    threaten: ['Let a flame leap from a finger.', 'Make a candle blaze up when you glare at it.'],
    impress: ['Light a hundred candles at once.', 'Lift a small flame into a bird and let it fly.'],
  },
  Pneumotropi: {
    jump: ['Ride a gust up to the ledge.', 'Soften a fall with a cushion of air.'],
    travel: ['Fill a sail where there is no wind.', 'Send a whisper on the breeze to someone far away.'],
  },
  Hydrotropi: {
    swim: ['Part the water a little as you cross.', 'Breathe through a bubble for a moment.'],
    forage: ['Find the water in a dry country.', 'Draw drinkable water from damp stone.'],
  },
  Geotropi: {
    climb: ['Raise a handhold out of the rock face.', 'Pull a step from the cliff.'],
    hide: ['Sink into soft earth until only the dust shows.', 'Make a mound to hide behind.'],
  },
  Heliotropi: {
    heal: ['Warm a wound with a patient light.', 'Ease a fever with morning sun.'],
    impress: ['Make the room feel like noon.', 'Let sunlight gather in your hair.'],
  },
  Astrotropi: {
    travel: ['Find the road by the stars on a cloudy night.', 'Know the hour and heading from the sky.'],
    lore: ['Read what the stars hold for this evening.', 'Tell which constellation rules the day.'],
  },
  Selenotropi: {
    sneak: ['Move in the shadow of moonlight.', 'Make your steps as soft as the moon\'s.'],
    lore: ['Tell what the moon promises for the month.', 'Sense which tide the water will take.'],
  },
  Kosmotropi: {
    threaten: ['Let the cold nothing look out of your eyes.', 'Open a patch of dark that swallows sound.'],
    hide: ['Go quiet and unseen in the void.', 'Vanish from the notice of a watcher.'],
  },
  Biotropi: {
    heal: ['Knit a wound with a touch.', 'Coax a pale plant back to green.'],
    forage: ['Make a fruit tree bear out of season.', 'Find a hidden patch of edible roots.'],
  },
  Nekrotropi: {
    threaten: ['Let a shiver of death pass over them.', 'Wilt the flowers on the table as you talk.'],
    lore: ['Tell what killed a corpse.', 'Hear a faint echo of the last hours of the dead.'],
  },
  Ikonotropi: {
    analyse: ['Spot the pattern hidden in a tapestry.', 'Notice that two seals share a meaning.'],
    deceive: ['Draw a sign that passes for a real seal.', 'Make a symbol look older than it is.'],
  },
  Semotropi: {
    analyse: ['Read the meaning behind a strange mark.', 'See what a gesture really signals.'],
    lore: ['Recall what a symbol meant in another age.', 'Tell the omen from the ordinary.'],
  },
};
