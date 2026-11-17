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
Every frame, for every person, the animator (`core/world3d/animate.ts`, pure and tested) builds the pose in five layers:

1. **A stance blended with a gait.** A *stance* is a way of being still (at ease, on guard, sitting). A *gait* is a way of moving (walk, run), picked and blended by speed over the ground.
2. **A hold** over the arms: carrying in both arms, or the weapon held the way its kind is held (see below).
3. **A motion** over that (`content/motions/`: strike, parry, fall…), eased into.
4. **Life**: breath, weight shift, arm drift, the head. A motion says how much of it plays over it (`life: 'full' | 'breath' | 'none'`).
5. **Reaching** (`core/world3d/skeleton.ts`): a limb is turned so its end lands on a point. The **feet** are put back where the stance stands them, flat on the ground, whatever the layers above did to the hips; the **second hand** takes hold of a weapon held in both.

The engine only says what the person is doing (how far they moved, seated or fighting, what they hold, which motion, what they look at) and shows the pose it gets back. One state record per person, never saved.

## Building on it
| To add | Do this |
|---|---|
| A way of standing (leaning on a wall, arms crossed, kneeling, a guard at attention) | A `Stance` in `content/people/poses.ts`: a pose or a slow loop, and how much sway, looking and arm drift suits it |
| A way of moving (sneak, limp, trudge with a load, sprint) | A `Gait` in the same file: four poses, the speed it is for, its stride. Gaits are blended by speed today; choosing one by state (sneaking, a hurt leg) is one small input to add when the first one comes |
| A weapon held differently (a bow, a two-handed spear held high, a lance) | An entry in `WEAPON_HOLDS` (`content/people/poses.ts`) for its way of moving: the arm at ease, on guard, and how far up it the second hand goes. Every fight motion then starts and ends on it by itself |
| A one-off movement (get up, pick up, wave, drink, cast a spell) | A motion file in `content/motions/`: keys with `ease`; `base: 1` on a key where the body's own pose shows (start and end); `add: true` for a jolt laid on top of whatever the body does; `blend`/`leave` seconds; `life` |
| Something else a hand or foot must reach (a door handle, a rein, a ladder rung, a stair) | A target for `reach` in the animator, like the second hand and the feet |
| A new small movement (shivering in rain, trembling when afraid) | A layer in `lifePose` with its sizes in `LIFE`. This is where **effects (B7)** will show on a body |
| A new way a condition shows (a wince of pain, a hunch over broken ribs, blindness groping) | A field on `Condition` (`core/world3d/condition.ts`, read from the injuries) and its sizes in `WEAR` |
| A kind of person carrying themselves differently (the old stoop, a guard stands straight) | `Manner` is from the seed today; a kind can give its own later (a property on the kind, not an `if`) |

**Judge it on `/models/`** (rebuilt 2026-11-17: three tabs on top, and it opens on the one you used last):
- **People:** everyone on stands, *Standing / Walking / Running / On guard*, with any weapon and shield put in their hands, and any condition.
- **Motions:** one body. Pick what is in the right hand and on the left arm, then an **act** (strike, parry, block, dodge…): it plays **the motion the game would play for that weapon** and says which file that is (`strike → strike-spear`). Slow it down, loop it, see it from the side or front.
- **Furniture:** every model.

## Weapons in the hands (your review of 2026-11-17)
*"Animations do not work well with different types of weapons, everything is held one-handed. Spears are not pointed with but are just moved forward."* Both were true, and for one reason: there was one way to hold a weapon (upright in the right fist), and every motion started from it.

**Now each way a weapon moves has its own hold**, at ease and on guard:

| Way (`moves` on the weapon kind) | At ease | On guard | Strike |
|---|---|---|---|
| Blade (swords, dagger) | low at the side, point forward and down | up in front, point toward the foe | over the shoulder and down, the wrist snapping it through |
| Axe and mace | hanging by the leg | cocked back by the shoulder | lifted high behind, the weight dropped on the blow |
| **Spear** | upright, like a walking staff | **couched low by the hip in both hands, point at the foe** | **a thrust: drawn back level, driven out along its own line**, the shaft running through the front hand |
| Staff | upright | slanted across the body in both hands | wound back over the shoulder, swept round |
| Two-hander (greatsword, great axe, long hammer: anything too heavy for one hand) | resting back on the shoulder | both hands low in front, blade up and forward | both hands overhead, chopped down |
| Bare hands | arms free | both fists up | a punch |
| A shield on the left arm | hanging | up in front of the body, with any of the above in the right hand | (block: thrust up and forward) |

How it holds together:
- **The wrist** (a new joint) tips the weapon: square to the forearm for a sword on guard, straight on along the forearm for a spear. That's the whole difference between "moved forward" and "pointed".
- **The second hand finds the weapon by itself** (the reaching layer). A motion only says what the weapon arm does; in every strike and parry the other hand follows the shaft, and lets the arm stretch when the weapon goes out of reach (a spear thrust). A shield on that arm keeps it off. Where exactly it holds is on the weapon's model (`grip2`: a greatsword's pommel, well up a great axe's haft).
- **The guard is now a hold, not a motion.** Every motion starts and ends on `base: 1`, "wherever this body stands with whatever it holds", so one parry works from a sword's guard and a spear's. Flinch, stagger and dodge are **added** on top of stance and guard, so they are the same jolt for everyone.
- **Feet stay on the ground.** The stance says where the feet stand; breath, weight shift, sagging when spent and the fighting stance's bounce move the hips, and the knees give to keep the feet there. Outdoors each foot follows the ground under it (a slope).

Still rough, and worth your eye in the Motions view: a shield is held up but small bucklers barely show; parries for axe and mace use the sword's.

### Your second review (2026-11-17), done
- **Weapons too heavy for one hand are held in both, whatever their family.** A Binderakk hammer is a club by its skill, so it was swung like a mace. Now a weapon moves as a two-hander when its row has no one-handed use, or one only the very strong manage (5D6 Physique or more; the hammer needs 7D6, a greatsword 6D6). The hammer has its own long model, which also stands in for the other two-handed clubs.
- **Shields are closed at the back.** Round shields had no underside (lying on the ground it never showed), so on an arm you saw through them from behind.
- **The edge or the point.** With a weapon worth striking with more than one way, you pick how, above the tactics: *Thrust 4D6+3 · Cut 3D6+2* for a rapier. It stays picked from round to round. A way is offered when its damage is within about two dice of the weapon's best, so a sword offers edge and point but not its pommel. Armour differs by kind of damage, so the weaker way can be the better blow. The log says *You thrust*, and **a thrust has its own motion**: a sword's lunge, a long blade run forward in both hands, an axe's or hammer's spike jabbed; a spear's thrust is its strike. Others still deal their weapon's best way.
- **A killing stroke for each kind of weapon**, all aimed down at someone lying at your feet, with a held breath before the blow and the body going down with it:
  - a sword is turned point down, raised, and driven down;
  - an axe or mace is swung up from behind and brought down;
  - a greatsword, great axe or long hammer goes back over the head in both hands, then down;
  - a spear or staff is lifted upright in both hands, point down, and thrust down;
  - with bare hands, a fist is dropped from over the shoulder.

## Injuries you can see (your follow-up, built the same day)
*"Is it possible to wire in so that injuries, for example to an arm or a leg, are visible in the animations? Could we add states for the resting movement in combat based on exhaustion, perhaps 0–10, 11–20, 30+? Could we add visual bleeding?"* Yes to all three. Nothing in the rules changed: the rules already keep fatigue, wounds per body part, breaks, lost parts and bleeding for everyone. A small pure step (`core/world3d/condition.ts`) turns that into **the shape a body is in**, and the animator and the engine show it.

| What | How it shows | Where the numbers are |
|---|---|---|
| **Exhaustion, in bands of fatigue:** fresh 0–10, winded 11–20, worn 21–30, spent 31+ | More and more bent over from the waist, head hanging, shoulders rounded, **the guard sinking** (the weapon drops toward the ground), lower on the legs, rocking on the feet, breathing hard. A new band comes on over a second or so. It shows outside fights too, walking included | `TIRED_BANDS` and `WEAR.spent` in `content/people/condition.ts` |
| **A hurt arm** (by thirds per wound; broken or lost is useless) | Held in across the belly, and it does less of whatever the body asks: a strike with a wounded sword arm is a weak, short one | `WEAR.arm`, `armHold` |
| **A hurt leg** | Standing, the weight stays on the good leg and the hurt knee hangs easy. Walking, **a limp**: the hurt knee hardly bends, and each step on it dips and lurches over it | `WEAR.leg` |
| **Blood on the body** | The wounded part's clothes and skin redden with each wound, more while it bleeds | `stains` in the condition; `rig.stain` |
| **Bleeding** | Drops fall from the worst wound, faster the faster the rules say they bleed, and **stain the ground**; standing or lying still, the stains grow into a pool; walking leaves a trail. Stains dry away after four minutes. The dead stop bleeding | `engine3d/blood.ts`; the world's part `engine3d/world/bleeding.ts` |

| **A part cut off** (added 2026-11-17) | Gone from the body: a hand, a forearm (a stump of half the bone stays), an arm, a foot, a leg. What that hand held goes with it | `gone` in the condition; `rig.lose` |

**See it:** `/models/` → the *Condition* row: *Fatigue* (the four bands), *Hurt* (each arm and leg, the body, the head), *Bleeding*, *Lost* (a few cuts). They work in People and in Motions. In play: the arena, as the fight wears on.

**Stains are saved** with the world (save version 13), and **rain washes away** those under the open sky (a downpour clears them in seconds; under a roof they only dry).

**Limits for now:** someone who has lost a leg still stands on it as if it were there (the rules put them on the ground; a crutch or hopping is a stance to make). A wounded head or body reddens but changes no movement; pain could be a wince or a hunch when wanted. Exactly which wound bleeds isn't kept by the rules, so blood runs from the most-wounded part.

## Not done, on purpose
- **Feet don't step.** They are kept on the ground where the stance stands them, but when a stance changes (at ease to on guard) they glide to the new spots instead of taking a step, and a body turning on the spot turns its feet with it. Stepping is the next thing a leg solver gives.
- **Stairs:** feet follow sloping ground outdoors; indoors and on stairs the floor is taken as flat.
- **Fidgets** (scratching, stretching, shifting a pack) would be idle motions picked now and then. The motion library is by fight act today; an `idle` act is the way in.
- **The motions are a first pass by numbers and still pictures.** Each weapon's guard and strike reads right in stills; the timing and flow need your eye at ¼ speed.
- **Bending is still stiff at the joints** (each part follows one bone). It suits the blocky look; soft joints are possible later without changing any data.
- **Faces** don't move.
