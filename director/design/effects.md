# Effects (plan B7)

*2026-11-17. Agreed as next on 2026-11-10 (B7, then magic B9, then the start village). This page is the foundation, and its first slice is built alongside it; say if the shape is wrong and it changes before more rests on it.*

## What an effect is
Something that happens **to** a thing or a person, lasts a while, and changes what it does or how it looks: burning, wet, charred, broken, afraid, poisoned. Fire spreading and rain putting it out are effects meeting each other.

The rules already have most of this **for people**, from the fight rules: *ignited* (heat and difficulty, fatigue at the end of each phase, put out with Speed, water helps), bleeding, infection, pain, wounds (`core/damage.ts`, `Injuries`). What was missing is **effects on things**, and **effects in live time** (outside a fight's rounds). So B7 is mostly about things, built on what's there.

## The shape
- **An effect on a thing is a state on its kind.** States are already saved, redrawn when they change and readable by gates (plan B1). A kind gets an effect's states by having what the effect needs: anything with a **material** can be `burning` (the fire's dice, 0 when not) and `burnt`. No new save machinery, and a gate like "only offered while burning" is the existing `state` gate.
- **An effect's rules live in one pure file each** in `core/world3d/effects.ts` (catching, growing, spreading, going out), with its numbers as data in `content/effects/` (one file per effect: `burning.ts` today). The rules take what stands near what and give back what changed; they never touch three.js.
- **The world part** `engine3d/world/effects.ts` gathers what stands (the streamed chunks and houses, like torches: out of sight is out of mind), runs the rules every **round of 4 seconds** of play (the rules' "phase"; the same in and out of a fight), sets the states, and draws what they mean: a flame and light on what burns, black on what burnt.
- **Materials** are the rules' own list (*Burning materials*): straw, paper, oil, wax 2 · cotton, twigs, linen 6 · hard wood, fur, clothes, a deck 10 · silk, wool 14 · leather 18. A kind says its material (`material: 'wood'`); stone and iron say nothing and never burn.
- **Wetness** is the weather's for now: rain and storm soak whatever is out of doors (the rules' protection in dice: downpour −4D6, rain −2D6), and it dries over a few hours. A person's own wetness comes with the next slice (wet clothes protect against fire, −1D6 / −2D6).

## Burning things (first slice, built)
- **Catching:** each round, a fire near a thing that can burn rolls its dice (a torch 1D6, a hearth or campfire 2D6, something burning its own dice) less the wet, against the material's difficulty. It catches at 1D6.
- **Growing:** "lasting exposure gets worse": +1D6 a round, up to what the material can give (straw 3D6, wood 4D6…).
- **Spreading:** whatever burns is a fire to what stands near it (within about 1 m plus a bit for each die), indoors and out. A dry hayloft goes up fast; a wet stool hardly at all.
- **Going out:** when its fuel is spent (straw in under a minute, a table in a few) it is **burnt**: black, still standing in the way, worth nothing. Rain takes its dice each round (a storm puts most fires out). Someone can **beat it out** (*Put out the flames*: a Speed roll against its dice × 3; holding a bucket of water +3D6, as the rules give a big bucket).
- **Setting fire to something:** *Set fire to the …* on anything with a material, with your tinderbox (Survival, easy, ten seconds), or by putting it on a hearth. It's a wrong to its owner (harm).
- **Shown:** the pixel fire and a light on it, sized by its dice; burnt things go black.

## People and fire (second slice, built 2026-11-17)
- **Standing in a fire** (within about half a metre of something burning, or of a campfire) burns you every round, by the rules: its dice less the wet, **+1D6 for each round you stay**, on the burn table, so it may set your clothes alight (*ignited*). Indoors and out, anyone of the map too. Not in a fight (a fight runs its own rounds).
- **Alight**, you try to put it out each round: Speed against its difficulty, **+3D6 with a bucket in your hands** (the rules' big bucket). What isn't put out burns at the end of the round (the fire's fatigue, a shock roll), and someone senseless and still burning makes a death roll.
- A flame follows whoever is alight. The hero is told: *The fire burns you*, *Your clothes catch fire!*, *You beat out the flames on you.*
- **Not yet:** a choice to put yourself out (it's done for you, as anyone would), rolling on the ground, others helping; the map's people fleeing a fire or fetching water (a behaviour under `sees`).

## Wet people (third slice, built 2026-11-17)
- Out in the rain your clothes soak: wet (−1D6 against fire) in about two and a half minutes of play, soaked through (−2D6) in five, twice as fast in a storm. Standing out in a downpour is −4D6 while you're in it (the rules' numbers).
- Under a roof you dry in about ten minutes, by a lit fire (a hearth too) in two; out of doors when the rain stops, slower.
- The *You* sheet says how wet you are. Everyone of the map gets wet the same way. Not saved yet (a reload dries you).

## Things that break (fourth slice, built 2026-11-17)
*Your playtest note: a wall of stools in a doorway.*
- A kind with **toughness** can be smashed, and gets the state `broken`. Standing furniture of a material has one: the material's own (straw 4, cloth 6, wool 8, wood 10, leather 12) and a point for every 4 kg. A pallet 5, a stool 11, a table 18, a bed 20.
- ***Smash the …*:** Physique, tricky; +6 for something sturdy (15 or more), −4 for something flimsy (7 or less). Loud, and harm to the owner.
- **Broken**, it lies as wreckage (flattened, askew), stops no one's feet, and can't be sat on or picked up. It can still burn.
- **Not yet:** outdoor props (fences, carts, barrels: they stop feet through another index, which knows no ids), smashing in a fight with a weapon (damage against toughness), mending.

## Next slices (not built)
1. **Fear and other effects on the mind** with B8f and magic (B9): a spell is an ability that applies effects.
2. **People fleeing fire and fetching water** (behaviours).
3. **Houses burning** (thatch catches, a house fire is 3D6–5D6), grass and trees.
