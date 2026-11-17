# How bodies move: the animator

*2026-11-17. The director: "Currently it is rather robotic… a framework for movement that is much, much better, with a skeleton, slight movement on stand still and during combat… a framework we can build onwards to. If the current framework holds but just needs better animation, build on that."*

**The answer: the framework held, and it's built on.** Bodies were already one skinned mesh on a skeleton, with movement as data (loops of poses, and motions that play once). What made it robotic was what sat between the data and the screen. That part is new: **the animator**.

## What was robotic, and what changed
| Before | Now |
|---|---|
| 11 joints: the head sat stiff on the neck, the trunk was one block, hands and feet were fixed to forearms and shins | **17 joints.** New: a **chest** over the waist (the body bends and twists in the middle), a **head** on the neck, **wrists** (a hand, and the weapon in it, turns), **ankles** (a foot rolls from heel to toe) |
| Standing was one two-pose loop, and everyone breathed in step | **Nobody stands quite still.** Breath, weight shifting from foot to foot (hips over one foot, the free knee easing, shoulders tipping the other way, feet staying put), arms that drift, a head that looks about in glances. **Each person has their own tempo, size of movement and posture**, from their seed |
| Walk ↔ stand switched in one frame; so did any motion starting or ending, picking something up, sitting down | **Nothing snaps.** The legs ease in and out of a walk; any change of stance, hold or motion eases out of the last pose shown. Getting up from the ground takes 0.7 s instead of one frame |
| One gait: running was a walk played at double speed (nearly five steps a second) | **Gaits blended by speed:** short steps when slow, a walk, and a **run** with its own poses (leaning in, arms pumping, under three steps a second) |
| In a fight the legs stood as in the street; only the arms were on guard | **A fighting stance:** one foot forward, knees bent, side-on, bouncing slowly, the weapon wandering a little, breathing harder |
| Motions went straight from key to key at constant speed | **Curves:** a motion flows through its keys and slows only where it turns round. A key can say `ease: 'in'`: a blow **speeds up all the way in and stops dead**. Strikes do |
| Heads never turned | **Heads turn to what matters:** the foe in a fight, the one you're talking to, the hero passing close in front; a short dwarf looks up at a tall tirak. Turning the body, **the head goes first** |
| The senseless and the dead lay the same | **The senseless breathe; the dead lie still** |
| After a run, nothing | **Effort:** breath runs deeper and faster after running or fighting, and settles slowly |

## How it is put together
Every frame, for every person, the animator (`core/world3d/animate.ts`, pure and tested) builds the pose in four layers:

1. **A stance blended with a gait.** A *stance* is a way of being still (at ease, on guard, sitting). A *gait* is a way of moving (walk, run), picked and blended by speed over the ground.
2. **A hold** over the arms (carrying in both arms, a weapon held up).
3. **A motion** over that (`content/motions/`: strike, parry, fall…), eased into.
4. **Life**: breath, weight shift, arm drift, the head. A motion says how much of it plays over it (`life: 'full' | 'breath' | 'none'`).

The engine only says what the person is doing (how far they moved, seated or fighting, what they hold, which motion, what they look at) and shows the pose it gets back. One state record per person, never saved.

## Building on it
| To add | Do this |
|---|---|
| A way of standing (leaning on a wall, arms crossed, kneeling, a guard at attention) | A `Stance` in `content/people/poses.ts`: a pose or a slow loop, and how much sway, looking and arm drift suits it |
| A way of moving (sneak, limp, trudge with a load, sprint) | A `Gait` in the same file: four poses, the speed it is for, its stride. Gaits are blended by speed today; choosing one by state (sneaking, a hurt leg) is one small input to add when the first one comes |
| A thing held differently (a torch up, a bow, a tray) | A hold in `HOLDS` |
| A one-off movement (get up, pick up, wave, drink, cast a spell) | A motion file in `content/motions/`, as before; now with `ease` on keys, `blend`/`leave` seconds, and `life` |
| A new small movement (shivering in rain, a limp, trembling when afraid) | A layer in `lifePose` with its sizes in `LIFE`. This is where **effects (B7)** will show on a body |
| A kind of person carrying themselves differently (the old stoop, a guard stands straight) | `Manner` is from the seed today; a kind can give its own later (a property on the kind, not an `if`) |

**Judge it on `/models/`:** People → the second button cycles *Standing, Walking, Running, On guard*; Motions plays any motion over the fighting stance, slowed down.

## Not done, on purpose
- **Feet aren't pinned to the ground** (no leg solver). They slide a little when a stance changes, and don't adapt to slopes or stairs. A two-bone leg solver is the natural next step if it shows.
- **Whole-body motions (dodge, stagger, fall) still start from straight legs**, so there is a small ease from the bent fighting stance into them. They should be re-keyed from the stance, with the new joints, when the fight is next looked at.
- **Fidgets** (scratching, stretching, shifting a pack) would be idle motions picked now and then. The motion library is by fight act today; an `idle` act is the way in.
- **The motion library uses the new joints only a little** (wrists in the overhead strikes, the chest in the plain strike). All 20-odd motions are worth a tuning pass by eye.
- **Bending is still stiff at the joints** (each part follows one bone). It suits the blocky look; soft joints are possible later without changing any data.
- **Faces** don't move.
