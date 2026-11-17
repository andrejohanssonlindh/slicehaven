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

## Next slices (not built)
1. **Wet people:** rain soaks you through the hours, a fire dries you; shown on the *You* sheet; protection against fire.
2. **Things that break** (the director's playtest note: a wall of stools in a doorway): damage and toughness on kinds, *broken* as a state, smashed in a fight with a weapon.
3. **Fear and other effects on the mind** with B8f and magic (B9): a spell is an ability that applies effects.
4. **People fleeing fire and fetching water** (behaviours).
5. **Houses burning** (thatch catches, a house fire is 3D6–5D6), grass and trees.
