# Devlog

*Newest first. Everything up to the start of 2026-11-02 is in the [archive](archive/devlog-to-2026-11-02.md).*

## 2026-11-05 — B8g stage F2: the fight view and the new layout

- **The view swings side-on** when a fight starts: you on the left, your foe on the right. You can still turn, zoom and pan; **⚔ Back to fight** (top of the view) swings it back.
- **Every move is shown, in groups.** *Offensive*: Standard, Quick, Powerful (each with its dice and what it costs), Retreat. *Defensive*: a grid of **parry, block (with a shield) and dodge** × **standard, careful, counter**, each with its dice. **You now choose how to defend**: before, the game picked the best for you. (Dodge can't counter, so that square is empty.) *Move*: walking, running, picking up, drawing, holding your ground, asking to yield.
- **Whichever group isn't yours this round is greyed, and says why**: *"You're defending: they won the last exchange"*, *"…they were quicker when blades crossed"*, *"Not in reach: close in first."* The role swaps that used to happen out of sight are now spelled out.
- **The foe's column mirrors yours.** When you're quicker, their move **lights up** and a line says what they mean to do; when they're quicker, it shows **?** and says they'll see what you do. Their dice show only on easy.
- **On the phone (portrait)** it's all in the bottom sheet for now: the foe's column is one line, and the group you can't use folds to its reason. The proper phone layout (view on top, tabs, tap twice) is F5. **Hold the phone sideways** to see the computer layout.
- **Rules:** one addition, the choice of parry, block or dodge. Everyone else still defends the best way.
- **Checked:** unit tests (a new one for the chosen defence), the fight browser test rewritten for the new layout (the side-on view, every defence offered, the reason shown, the foe's intent), pictures on a phone and a wide screen.
- **Next:** F3, fast mode: the exchange plays at once with the new motions (parry, block, dodge, flinch…), damage floats up, body outlines with wound icons.

## 2026-11-05 — B8g stage F1: the motion library (first pass)

- **Sixteen new motions**, three files in `content/motions/`. **Strikes** for each way of moving that needed one: two-hander (chopped down with both hands), staff (swept round, shoulders turning), spear (drawn back, driven straight), axe and mace (leaning back, then the whole weight dropped), bare hands (a punch). A blade keeps the plain strike. **Defences:** parry (the weapon arm sweeps across; their own for staff, spear and two-hander held in both hands, and for bare hands), block (the shield thrust up and forward), dodge (slips aside and back, leaning off the line). **Reactions:** flinch (a light hit), stagger (a hard one, rocked back), fall (knees go, tips onto its back and lands in `down`), and **finish**, the killing stroke (weapon high, a held breath, all the weight thrown down).
- Each has a contact mark where the blow lands or is met. The page doesn't ask for most of them yet: that is F3. In the fight today only strike (and finish, which is the strike until now) plays.
- **First passes, built from the angles, not drawn by eye.** Judge them on `/models/` → Motions (side and front, slow). Send what reads wrong and it gets tuned.
- **Trap found:** vitest caches the motions folder's index, so a *new* file wasn't seen until `node_modules/.vite/vitest` and `.vitest-cache` were deleted. If the library count looks stale, clear them.
- **Checked:** unit tests (no library problems), the models browser test for every motion at its contact, looked at the pictures.

## 2026-11-04 — B8g stage F0: motions as data

- **Fight animations are data now**, not code. Each one is a small file in `content/motions/`: how long it takes, a few key poses, which part of the body it moves, what follows it, and marks such as **contact** (the moment the blade meets, for timing the parry and the floating damage later). The swing, the guard and lying down were moved out of the code into four files, with the same angles.
- **Which one plays is looked up**, never written as an `if`: by what happens (strike, parry, fall…), by how the weapon moves (every weapon now says: blade, two-hander, staff, spear, axe and mace, shield; bare hands when nothing is held) and, if wanted, by fighting style. The most specific wins; a gladiator can get flashier strikes later with one file and no code. A killing stroke plays the strike until it has its own.
- **Lying down is a motion too**: the body is tipped over by the motion's data, so the renderer's own special case for lying is gone. A dodge can step back the same way.
- **New on `/models/`: Motions.** Tap the first button (*People*) until it says *Motions*. Pick a body, what they hold and a motion; play it at full, half or quarter speed, loop it, look from the side or the front. The time shows, and *CONTACT* lights up as it passes. This is where the motion library (F1, for Sonnet) gets made and where you can judge it.
- **Looks the same in a fight**, apart from one small thing: on guard, the knees no longer bend (the guard only moves the upper body now, so the legs walk normally under it).
- **Checked:** unit tests for the rules and the library (it must have no problems), the fight browser test, and a new browser test that pictures every motion at its contact from the side and the front.
- **Next:** F1, the motion library (Sonnet, brief in the [design](design/fight-feel.md)), and F2, the fight camera and layout, which can be built beside it.

## 2026-11-04 — Planned: how a fight looks and feels (B8g)

- **Talked through your redesign** and wrote it up: [how a fight looks and feels](design/fight-feel.md). The rules don't change; the page, the camera and the animations do. It's on the plan as **B8g, next up, not started**, before B8b edges (the edges will land in the new Offensive group).
- **Agreed:** the side-on fight view, every move shown in three groups with the foe's mirrored, body outlines with wound icons, fast mode by default, one tap on a computer and two on a phone, the attacker's swing as soon as you've picked, the timer (none on easy, normal later, hard 8 s, tunable).
- **Checked the animations:** joints and looping poses are data, but **the swing is written in code**, and the fight poses are a fixed list. So stage **F0** makes motions data (one file each, looked up by act, weapon and style, with a viewer on `/models/`). **F1, the motion library, is for Sonnet**, with a brief in the design.
- **Q50 answered:** numbers float up on easy only; on normal and hard a word does.

## 2026-11-04 — B8a: shields, and a sword and shield together

- **Five shields** as things, with models: **buckler** (small, iron), **small round shield**, **large round shield**, **knight's shield** (pointed, painted), **curved shield** (tall, square). Each reads its row in the shield table: its block bonus and properties. The table gives no weights, so I set them myself (1.5 to 7 kg).
- **The left hand.** A shield goes on the **left forearm**, beside a one-handed weapon in the right hand. A two-handed weapon, or something you carry in both arms (a stool), leaves no hand for a shield, and the other way round: with a shield on, you can't pick up a greatsword until it's off. *Pick up*, *Take from the rack*, *Draw* and *Put away* all follow this. With both hands full, *Put down* and *Put away* take the weapon first, then the shield.
- **The weapon rack has the shields too**, with your Shield skill and each one's block bonus. **Shields from the creator** are carried like your weapons, and you draw them the same way (*Draw a weapon or shield*).
- **In a fight** your card says *"arming sword and buckler"*. When you defend, the best of **parry, block (Shield skill + the shield's bonus) or dodge** is used, as the rules already had. A blow to the left arm can make you drop the shield. You can pick a shield up or draw one as the side action, in or out of reach of your foe.
- **The gladiator** now fights with a shield **three times in four** (a small round shield, a buckler or a large round one) and has some Shield skill. Strike the gong for a fresh one to get the other roll.
- **Not checked by eye:** at the phone's zoom a buckler is a few pixels. The test checks that it's on the left forearm, not how it looks. Tell me if it sits wrong on the arm.

## 2026-11-04 — B8a: your own weapons from the creator

- **Your hero carries the weapons they own**: every weapon chosen or bought in the creator (the default shepherd has the quarterstaff). They're at the belt or on the back, not in your hand.
- **Tap yourself → Draw a weapon.** If you own more than one, it asks which, with your skill and dice for each. **Put away the {weapon}** puts it back. A weapon taken from the arena's rack is yours too, so it can be put away as well.
- **In a fight:** with empty hands you get **Draw your quarterstaff** (one button per weapon you carry). It's the side action and, as the rules say, −1D6 on your next roll unless the weapon is quick to draw. If you start a fight with nothing drawn, the log tells you to draw.
- A dropped weapon of yours lies on the sand like any other until you pick it up. **Shields from the creator** are carried too once shields exist (next). Bows have no model yet, so they're left out.
- **Not yet:** what you carry at the belt doesn't count towards how much you can carry. That comes with pockets and the bag (B6).

## 2026-11-04 — Fighting styles as "when this, do that"

- **How people fight is now data** ([fight minds](design/fight-minds.md)), as you suggested. A style is a list of lines, *"when this holds, do that"*, like people's days. For each part of a round (moving, the blow, the defence, offering to yield), the first line that holds decides.
- **The gladiator's lines:** finish a foe who's down. Ask to yield when wrecked. Pick up a weapon at your feet. Run in. **Press a flagging foe with powerful blows** (new). Otherwise strike and defend by its usual weights.
- **A new style to show how it builds:** the **coward** is the default way of fighting with two lines on top. It asks to yield as soon as it goes badly, defends carefully, and is easy to talk down. A map gives it to someone with `"fights": "coward"`. Nobody has it yet.
- **Ten conditions and eight choices** to build styles from, one file each. A style naming one that doesn't exist fails the tests.
- The fights play as before. The one change is the gladiator pressing harder when you're flagging.

## 2026-11-04 — B8a: seeing the fight, and moving on purpose

- **The panel no longer covers the fight.** On a phone it stays at the bottom, and the view now keeps the fighters in the part above it. On a computer (a wide window) it docks on the right, clear of the zoom and turn buttons, and the fight sits in the rest of the screen. The view follows the fight: halfway between you and your foe, but never more than 5 m from you, so you stay in view when you're far apart. If you drag the view away, your next tap or round brings it back.
- **Tap to move.** While you're not in reach of your foe, tap the ground: a ring marks the spot and you get **Walk there (3.2 m)**, or for a far spot **Walk there (5 of 8.4 m)** and **Run there (a roll)**. Tap a weapon lying on the sand and you get **Walk / Run to the hunting spear**, which stops beside it, and then **Pick up** once you're within 3 m. With empty hands, the two nearest weapons are offered as buttons too. A line says *"Tap the ground to go there, or a weapon to go to it."*
- **In reach of a foe** a tap only tells you that you have to break off (retreat) first, as the rules say. You can still pick up a weapon lying within reach.
- **Tried:** the arena test taps a spot and checks the choice, the view's aim on a phone and on a wide screen (pictures `fight-plan`, `fight-wide`).

## 2026-11-04 — B8a: the upper hand sees the other's choice

- **Choices are declared in reverse order** (your note). At the start of each round, whoever has the upper hand knows what the other means to do before choosing. The line sits above your buttons: *"Arruns means to strike with all their strength."*
- **Who has it:** in a melee, the **attacker** (no roll: they have the fight in hand). Before blades cross, the two of you roll **Reaktion** once you're within 12 m (a run and a reach). Further apart nobody has it, and both choose blind. The log says *"You are quicker: you see what Arruns means to do"* or *"Arruns is quicker: they will see what you do."*
- **When they have it, they choose knowing yours.** Counter or defend carefully, and they're likelier to strike quickly. Strike hard, and they're likelier to defend carefully or counter. A fighter whose style never counters still won't.
- **That Reaktion roll also decides who attacks if blades cross that round**, so there's no second roll. **The quicker side also goes first in side actions**: if you both go for the sword on the sand, they get it.
- **A note on the book:** the text we have says turn order is by Reaktion and tactics *may* be chosen hidden. I didn't find "declared in reverse order" written out, so it's down as your rule (decisions).
- **Tried:** unit tests for who has it, the roles, the sword race, the answers; the arena test now makes the hero quick and checks the line shows.

## 2026-11-04 — B8a: your notes on the third fight

- **No walking through each other.** A move now stops where it first comes within reach of a foe, so two fighters closing in meet in the middle.
- **The first blow gets a tactic.** When blades cross, the round pauses ("Choose how to strike or defend") and you pick a strike or a defence in your role. Then the round goes on.
- **The log waits for the dice.** The line about a blow is written after the glass dice land, not before.
- **Advantages as dice:** each is +2 damage, and every +4 is a die, so 2 advantages are +1D6 and 5 are +2D6+2. With a Dangerous weapon each is +1D6, as before.
- **Yielding costs your weapon.** If your plea is granted you lay your weapon down, and it stays on the sand. **Each time you've yielded to someone, your next plea to them is 6 harder.** This is remembered and saved.
- **A beaten foe asks to yield.** When they're far enough gone (fatigue against their shock roll, wounds, broken bones, being on the ground, empty hands), they lower their weapon and ask. You get **Accept their surrender**; any other choice fights on, and they won't ask again until they're worse off. The gladiator holds out longer than most. A badly hurt gladiator from an earlier fight asks at once.
- **A broken leg, hip or spine puts them on the ground**: they lie there awake, can't move or retreat, and fight at −1D6 ("on the ground" in the details). **A broken arm drops what it holds.** You, the hero, limp on outside a fight (as if on a crutch) so you're never stuck before healing exists.
- **Broken bones and pain:** the rules give a broken leg or arm only **1 pain** (−1D6 on fighting and moving); a hip or spine 2. That's on top of the wound itself, and the leg now also keeps them down. On normal you see "in pain" on the gladiator's card, not the number.
- **The knocked out see nothing** now (they used to notice you).
- **The far-away sheet shows their face.**
- **Moved to B8f** (fights out in the world): a foe waking up deciding to flee or talk their way out, and **attacking someone lowering their view of you** (attacking is a wrong already in the standing rules, as *harm*; it just isn't hooked to fights yet).

## 2026-11-04 — B8a: your notes on the second fight; a weapon rack and a gong

- **A weapon rack** stands by the west gate (north side). Tap it → *Take something from the weapon rack* → a list of **17 weapons**, each with your skill and dice for it and its properties: arming sword, short sword, sabre, rapier, bastard sword, greatsword, dagger, hand axe, battle axe, great axe, hunting spear, cudgel, steel mace, morning star, war hammer, flail, quarterstaff. The one you pick is in your hand. Put it down (tap yourself) to take another. Any kind can be a rack: it says what family it stocks (`stock`), so an armoury's rack later is the same thing.
- **A gong** stands by the west gate (south side). Tap it → *Strike the gong: call a fighter* → **novice, capable, skilled or master**. A fresh gladiator rolled at that level takes the old one's place, healed (or alive again). The level isn't saved yet: after a reload it's the map's novice again.
- **Attack from anywhere.** Tapping someone far off now asks *Walk up and talk* or **Attack**, so you don't walk up first. In a talk the button is *Attack* too (it was *Fight*).
- **Ask to yield**, every round: the best of Argue and Charm against how hard your foe is to talk down. The gladiator is hard (16); anyone else is easier (8). It gets easier the more tired and hurt they are than you, but never below 6. On easy the button shows the number. If they grant it, the fight ends and they spare you. If they refuse, an attacker has lost the blow and a defender still defends.
- **A serious wound says what it does**, in our own short words: "a wound to the right arm, bleeding 2 a round, dazed, may break the ribs". This shows in the third step and in the log.
- **The dead and the senseless don't talk.** Tapping them says "Arruns is dead" or "lies senseless", with no skills to try.
- **Your questions:**
  - *Melee, ranged or mystic phase?* Not yet. There is only melee. Choosing the phase comes with ranged (B8d), and mystic with magic (B9).
  - *1 against 2?* Not yet; that's B8c, after 1v1 feels right, as you said.
  - *Does the weapon count in the opening roll?* Yes, one property does: **Reach** adds its number in D6 to the Reaktion roll when blades first cross. The hunting spear (Reach 2) and the greatsword (Reach 1) now let you try it. Nothing else about a weapon counts there.
  - *A heavy hit kept them the attacker even though it was parried?* If it hit, it wasn't parried. Each blow is attack against defence, and a tie goes to the attacker. With a plain defence, **you take over only if your defence beats the attack**. *Defend carefully* needs to beat it by 10. *Counter* always takes over, hit or not. So after a blow that landed, the attacker keeps going. The log line now says "against your parry … : it hits", which may have read as a parry.

## 2026-11-04 — B8a: your notes on the first fight

- **You throw only your own dice.** The gladiator's rolls are written beside yours, not thrown.
- **A blow comes in steps**, each waiting for OK: first **who hits** (attack against defence, and any advantages), then **where and how much** (the D10 for where it lands, the damage dice, the extra damage from advantages on its own, less armour: "Damage 12 + 2 extra (1 advantage) − armour 6 = 8 gets through: 2 fatigue"), then on a serious wound **its D10** and the death roll.
- **The log gives each pool and its make-up**: "You strike: 2D6 (Sword 2D6 untrained) = 13 against Arruns's parry 2D6+2 (Sword 2D6+2) = 6: it hits." Tactics, picking up, pain and wounds show as their own +1D6 or −1D6.
- **Equal attack and defence:** the rules already give a tie to the attacker (now a test says so, and the log says "a tie: the attacker wins it"). What looked like a dodge was most likely a hit that glanced off the gladiator's armour; the log now says that in numbers.
- **Each side has a card**: weapon and skill dice, a fatigue bar (full: where most people fail the shock roll), and how they are. **By difficulty**: easy, both sides in numbers; normal, yours in numbers and the gladiator's in words ("tired", "in pain"); hard, your own fatigue in words too.
- **Your condition** (the new **You** button bottom left, or tap your card in a fight): fatigue and where each point came from ("6 / 9 from blows taken, 2 / 9 from powerful strikes"), the shock roll it's against, how fast it comes back, the dice taken off each kind of roll and why, and the wounds, pain, bleeding and breaks. On easy, tap the gladiator's card for theirs.
- **Q48: untrained is 2D6** now, as you said. The shepherd with a sword is less hopeless.
- **Q49:** the fight ends when no one is left to fight and you press **OK** (it was *Walk away*). Nothing is restored then. **Fatigue comes back one point at a time**: a point every 1, 2 or 4 minutes of world time (easy, normal, hard), three times as fast **sitting down**. With the clock stopped, a real second counts as a world minute so it still comes back.
- **The knocked-out gladiator stays down** until their fatigue is gone (they used to get up when you walked away). If you're the one knocked out and spared, you lie there until you come round.
- Save version 8 (fatigue now remembers where it came from).

## 2026-11-04 — B8a: a fight to the death in the arena (first playable)

- **Try it:** `/spike3d/?map=arena`. Weapons lie on the sand by the west gate: an arming sword, a quarterstaff, a hand axe, a cudgel. Tap one → *Pick up*. Walk to the gladiator at the far end, tap them → **Fight**. (The default shepherd fights best with the **quarterstaff**: staff is their skill. With a sword they roll 1D6, see Q48.)
- **One choice a round**, in a panel low on the screen: *close in* (walk up to 5 m) or *run in* (10 m, a roll), *pick up* a weapon within 3 m, and once blades cross either a strike (*standard*, *quick*, *powerful*) or a defence (*defend*, *defend carefully*, *counter*), or *retreat*. The panel shows the round, the distance, your role, and both sides: weapon, skill dice, fatigue, wounds, pain, bleeding, what holds you back.
- **The rules run it** (`core/combat.ts`, new, tested): a melee opens within 2 m on Reaktion rolls; attack against the best defence you have (parry, block, or dodge); tactics change the dice and cost fatigue; who attacks next round follows the defence tactic; hits go through the wound tables and death rolls; the end of each phase brings bleeding and the shock roll. Advantages all buy **more damage** for now (choosing edges is B8b).
- **The world plays it out.** The clock stops and everyone else waits. The fighters walk round pillars to where the round sent them, the striker swings, a blow that makes you drop puts the weapon on the sand 1–3 m away (pick it up as your round's side action), the knocked out and the dead lie on their backs.
- **To the death (Q46).** The gladiator finishes you if you go down. If you win, you choose: *Finish them* or *Walk away*. Who died stays dead through a reload (injuries are saved on everyone, save version 7). A dead hero gets only *New game*.
- **Weapons are things now:** each is a kind (under a new `weapon` family) that names its row in the weapon table, so its skill, damage and properties come from there. They lie where they fall and are saved. Held, a weapon is in the **right hand** (the arm forward, the blade out), and doesn't slow you like something in both arms. Things a map lays outdoors can now be picked up generally.
- **The gladiator** is a new kind of person (a soldier: sword main, dodge side, soft leather), novice here so you have a chance. How someone fights when nobody steers them is a **fighting style** (`content/combat/styles.ts`): the gladiator presses hard, runs in, and finishes what it starts; anyone else doesn't kill someone who is down.
- **Anyone can be fought**: *Fight* is in everyone's talk sheet. Fighting villagers has no consequences yet (that's B8f).
- **Not yet:** shields and the left hand, armour on the hero, wounds shown on the hero card or on bodies (B8e), edges (B8b), several fighters (B8c).
- **Questions:** Q48 (rolling an untrained combat skill), Q49 (when the scene ends after a fight).

## 2026-11-04 — Combat prework: the rules, damage and wounds, an arena

- **The rules in our words.** I read the fight and damage chapters and wrote them up as a working summary: [combat rules](design/combat-rules.md). It covers rounds and phases, melee roles and tactics, several fighters, ranged, edges, weapon properties, damage, the after-effects, falls and burns. It's mechanics only, with book pages so you can check a rule. Where the book is unclear, the page says "reading".
- **Damage and wounds are built** (`core/damage.ts`). A blow lands on a body part, armour comes off, and the damage table gives fatigue. At 10 or more there's a serious wound from one of six tables (cut, crush, thrust, brawl, fall, burn; all 280 rows, mechanics only, no book text). Then the death roll, break and amputation risks, and the after-effects on the person: pain, wounds per part, bleeding, infection, fire, broken bones, lost eyes and teeth. Bleeds, fires and infections merge as the rules say. Injuries weigh on the right rolls (a wounded sword arm on combat, a torso wound on death rolls). At the end of a phase come bleeding, fire and the shock roll, and the end of the scene clears fatigue. Fall and burn dice are in too. It's all tested, but not yet in the world: nothing hits anyone until combat (B8a).
- **The plan:** [combat](design/combat.md) maps the rules onto our live world in metres (the bands become ranges, cover is real geometry, NPCs fight by behaviour, visible injuries read the same data). It sets the order of vignettes: sparring, then edges, several fighters, ranged, visible injuries, fights out in the world.
- **An arena to test in:** `/spike3d/?map=arena` is a 30 × 15 m oval behind a palisade with gates east and west. Inside are four pillars (they block sight, for archers later), two low walls (they don't), barrels, crates and a woodpile. Map rule `oval` (written by a Sonnet helper) places a wall round an ellipse with gaps for gates; new kinds `pillar` and `lowwall`.
- **Questions:** Q45 (the bands in metres), Q46 (start with a sparring match where no one dies?), Q47 (do two short effects from one blow add up?).

## 2026-11-04 — B6, first slice: weight and carrying capacity

- **The rule (your call today):** you carry 5 kg for each die of Physique and 1 kg for each pip, without trouble. 3D6+2 carries 17 kg; the default shepherd (2D6+3) carries 13.
  - **Toil and haul** (*Slita & släpa*, the expertise the book gives for heavy loads and rough work) adds half as much for its own dice: 4D6 adds 10 kg.
  - **Dwarves** carry 8 kg more. Their *Short and stout* trait takes 8 off their load, and one kilogram over is one load point. It's a new grant in the creator (`belastning -8`), so map dwarves have it too.
- **What I found in the book:** there's no rule for turning kilograms into load, as you said. But there is a **load scale** that armour, heat and mounts already use, in steps of 8 points (minus dice on movement, reaction and movement skills, and base fatigue). When fatigue comes, each kilogram over your capacity becomes a load point on that scale, so armour, heat and what you carry all add up in one place.
- **For now nothing over capacity can be carried.** Picking something up says why: "it weighs 20 kg, and you can carry 13 kg".
- **Everything that can be taken has a weight:** a stool 3 kg, a keg 16, a sack of grain 20, a footlocker 12, herbs 0.2. Tables, beds and anvils are still too bulky to carry alone, whatever you can lift.
- **Shown:** tap a thing for what it weighs; tap the hero for what you can carry.
- **Next in B6:** items as kinds with shapes, and the pockets and bag grid.
- **Try it:** Hamlet. Tap the hero (13 kg with the shepherd), then try to pick up the sacks in a house (20 kg) or a keg (16). A stool or a footlocker (12) works.

## 2026-11-04 — B3b done: borrow, give back, argue, threaten; found things go home; arms that carry

- **Talk about what you hold.** Holding a stool from a house, tap one of the people who live there:
  - **Give it back**: no roll. If it was taken, they think a little better of you again.
  - **Ask to borrow it**: a friend says yes, someone cross says no, anyone else needs asking well. It's yours until this time tomorrow. Not home by then, they count it as taken, whether they see it or not.
  - **Argue it's yours to keep**: a persuading roll, harder for something that matters to them. If it fails, they like you less.
  - **Threaten them into letting you keep it**: harder against the bold (a guard, a tirak), easier if they're afraid of you. If it works they like you less; if it fails, they answer it (maybe a guard is fetched).
- **Found things go home.** Leave something lying out of place and someone of its household who comes near carries it back where it stood. Anyone who likes order (dwarves, guards, officials, the devout) does it for anyone's things.
- **Rough edges fixed:**
  - **The arms hold it.** Anyone carrying has their arms forward over the thing, walking or standing, and it sits at their chest.
  - **A moved thing stops your feet where it lies**, and its old spot is free to walk on.
- **Moved on:** buying needs money, and showing a weapon needs weapons. Both come with items (B6).
- **Next up: B6, items and inventory.** The grid and items can start, but I need the page of the carried-weight rule from you for how kilograms count.
- **Try it:** Hamlet. Pick up a stool in a house, then tap one of the people who live there. Or put it down in the street near one of them and watch them bring it home.

## 2026-11-03 — B3b, first slice: picking things up, carrying, stealing unseen; Q43

- **Pick things up.** Tap a stool, a broom, a keg, sacks, a basket, a footlocker… → *Pick up*. It's in the hero's arms (small for now, with no carrying pose yet). You walk slower and can't sit, light a fire or take something else until you **put it down** (tap the hero → *Put down the stool*). It stays where you put it, through a reload. Tables, benches, beds and the anvil are offered too, and are too heavy to carry alone. Hearths and shelves can't be taken.
- **Where it goes decides what it is.** Moving a stool about its own room is fine. Carried into another room of the house, it's *moved*; out of the house, *taken*, for whoever sees it go. After that **its household know it** whenever they see you with it ("That's our stool!").
- **Steal unseen.** Small things (herbs, a basket) can be *slipped away unseen*: a sleight-of-hand roll, easy alone, harder for something bag-sized or with anyone watching. Done well, no one ever knows, and it's never recognised on you. Fumbled, you still have it, but whoever was looking saw you steal it.
- **What it's worth to them.** A wrong to a thing weighs more for its value against the owner's wealth (a poor family's keg matters; a rich house barely notices), and more again for its importance. Prices are a first guess until money comes (B6).
- **Leave** to make yourself at home now covers moving things about, not taking them away.
- **Q43 (your answer B):** on easy, the eye or question mark now floats over anyone within 30 m who noticed you, even in the dark or behind a wall.
- **Still to come in B3b:** borrow and give back, argue it's yours, threaten for it, buy (needs money), people bringing found things home, and weapons you show (needs weapons). Known gap: a moved piece's old spot still stops your feet, and the new one doesn't.
- **Try it:** Hamlet, panel → Game: easy. Walk into a house, tap a stool → *Pick up*, walk out past someone who lives there, then tap the hero → *Put down*.

## 2026-11-03 — B3c done: rooms off limits, fading, fight or fetch, whose is this; a door fixed

- **Fix: a door seen from inside.** In the houses across the road from the inn, the door is in the far wall, and from inside you saw a blank wall. It was only drawn on the outside face. Now it's drawn on the inside too, with a frame.
- **Whose is this.** Stepping into a house, or into another room of it, now tells you whose it is and whether it's open to you, e.g. "Someone's house: guest room. Not yours to be in without leave." On easy it names the household ("Adriel and Tam's house"). A tapped thing says it too.
- **Parts of houses are off limits** (your question). Each kind of room says what it welcomes and when. In the inn, the taproom is open to anyone, 6 to midnight. The guest rooms and landing upstairs aren't, until you **ask the innkeeper for a room for the night**. That's a yes unless they're wary of you; no coin changes hands yet, since there's no money. Shops are open in their hours; a home is only its household's.
- **Being where you aren't welcome is a wrong too**, for whoever sees you there, once a visit. Walk into a villager's home at night with them in and you get a grumble.
- **Views fade** (your Q44): a point a day for country folk. Being fetched for is forgotten in about six weeks. Each culture sets its own pace.
- **Who you are, and fight or fetch:**
  - Rank gets off lightly: a noble's wrongs are answered much later.
  - Fear: each witness weighs how dangerous you look (your physique, plus marks like scars or a frightening look) against their own nerve. A trukh frightens a farmer, but not a tirak. Someone afraid answers later; instead of walking up to scold they stare, and instead of squaring up they fetch help.
  - The bold (a tirak, a guard) square up to you themselves instead of fetching the guard.
  - Weapons you show come with items.
- **B3c is done.** An item's value against the owner's wealth, and its importance, move to B3b, where taking things comes in.
- **Try it:** Hamlet, panel → Game: easy. Go up the inn's stairs (it says it isn't yours), then ask the innkeeper for a room. Or by night, walk into a villager's home while they're in.
- **Next:** B3b, the ways to take.

## 2026-11-03 — B3c, first slice: owners, how people see you, and what they do about it

- **Things have owners now.** What stands in a house is its household's; what stands among the houses outdoors is the town's; the wild is no one's.
- **Doing it anyway is never blocked.** But whoever **sees** you (from B5) thinks less of you. Each person holds **their own view of you, −100 to +100** (your Q38), and it's kept in the save. The owner minds most, a neighbour half as much.
- **What they do depends on where their view lands.** The Hamlet's country folk **grumble** (they stop and stare), then **scold** (they walk up to you), then **fetch the guard** (they go to the nearest guard and tell them, and the guard comes to you). Past that they **square up**, which stands in for fighting until there's combat. Each says a line. **Who you are** counts: if their people are cold to yours (country folk and a tirak), they react sooner.
- **Word spreads** when two people stand together, about once an hour, good or bad. You can be in trouble with someone who never saw you do anything.
- **Not everything is a wrong.** You can sit down in the inn (6 to midnight) or a shop in its opening hours, sit on the town's benches and light its torches. Putting the torches out is a wrong.
- **Ask leave:** talk to someone with a home → *Ask … if you may make yourself at home.* If they like you it's a yes; if they're cross, a no; otherwise you have to persuade them. It lasts until midnight.
- **Advantages count** (Q38): a talk that wins someone over moves their view more, the more advantages you rolled.
- **On easy:** after a wrong you see who saw it and by how much, and in talk their number ("Their view of you: −13").
- **Each place has a culture file** (only *country* for now) with the weights and where each reaction starts. It's a first guess, so tell me what feels too harsh or too soft.
- **Saves from before today are dropped.**
- **Try it:** Hamlet, panel → Game: easy. In the inn, put out the hearth while the innkeeper is looking (they scold you), light it and put it out again. Or by night, in front of the guard by the green, put out a street torch.
- **Q44:** should a bad view fade with time?
- **Next:** B3c's second slice: fight or fetch by how dangerous you look (physique, weapons shown, scars) against their leaning; rank and fear (a trukh).

## 2026-11-03 — Leads: ask anyone, coax the reluctant, study the statue

*Recorded:* the statue and Saint Hesma's well are **test leads** (your call): the well has no ending on purpose.

*Fix, same day:* studying first fell back on **Wisdom** at −2D6 for heroes with no knowledge skill. Wisdom is never rolled (your note), so now **Study the statue only shows if you have one of the knowledge skills**. The checks now flag any verb or lead that tries to roll Wisdom.

Your three notes on leads, built:
- **Ask anyone.** Talking to anyone now offers **Ask about something you know…**, which lists every open lead. Most people say they don't know ("Can't help you there, sorry"), so the menu no longer gives away who cares.
- **Some need coaxing.** The miller on the lane knows about Saint Hesma's well but holds back ("Old stories. Best left where they are."). Then **Press him about Saint Hesma's well** appears: a persuading or charming roll, easier if he likes you, and a failure sours him a little.
- **Study the statue.** Once you have its lead, tapping the statue offers **Study the statue**: occultism, cultural knowledge, theology, history or legends, against 14. It's a hidden read, as you decided for knowledge rolls: one try, no dice shown, and a failure gives a plausible wrong reading that goes into your journal as if it were true. Read right, it tells you the key is a well-key and that she faces west into the brambles, and it gives you the well lead.
- **Quests next to leads:** recorded on D2. A quest is a lead with someone waiting for it, in the same journal.
- **Lead notes** now have room for "needs coaxing" and "studying it" ([template](design/talk-openings.md#adding-leads-one-file-each-and-a-lead-note-agreed-shape-q42)).

## 2026-11-03 — B11, first slice: leads

- **A statue stands by the Hamlet's west road**, a weathered stone woman holding out a key. **Tap it:** "Lead added: The statue by the west road."
- **Asking comes by itself.** Talk to someone who might care (the innkeeper, a guard) and *Ask about the statue by the road* is among the choices. No roll: they care, so they tell. The innkeeper's answer hands over **the next lead**, Saint Hesma's well, which the miller walking the lane and any dwarf can be asked about. Anyone else isn't offered it.
- **The journal:** a **Leads** button bottom left. Each lead shows what you know, growing as you're told more. It's greyed once nobody has more to say (or it's solved). On easy it also says who might still know more.
- **Built to be added to,** as agreed (Q42): each lead is one file. Send me a **lead note** (template in [openings](design/talk-openings.md#adding-leads-one-file-each-and-a-lead-note-agreed-shape-q42)) and it becomes one. Actions can give a lead too, and an action can need one (*search the statue's base* only once you know why).
- **Not yet:** overheard and carried leads, your past, quests, leads going cold, and anything that solves the well. **Saves from before today are dropped** (the save now keeps leads).
- **Try it:** Hamlet, walk west along the road to the statue and tap it, then go back to the innkeeper in the inn.
- **Next:** B3c, owners, the scale and consequences.

## 2026-11-03 — B5: people see and hear you

- **Sight is rolled** (your Q35): Alertness against 8 when you enter a map and every six hours of world time. A failure gives a narrow, short view; each advantage reaches farther and wider. Waking will roll it too once there's sleep; until then the panel has a **Roll sight** button.
- **Everyone in a map rolls too**, with their own sheet, and **sees** you: in their cone and range, on their side of the walls. Night shortens it, unless they're a tirak with darkvision (that goes for you too). A flame you carry shows you from far.
- **They hear you:** your footsteps (a few metres), lighting or putting out a fire, and **Call out**, new when you tap the hero (about 40 m). Walls muffle sound.
- **They react** (new behaviour files): **watch** (stop and face you) and **investigate** (go and look where the noise was). In the Hamlet: at night the guard watches you if they see you and goes to look at what they hear. By day a shout turns the villagers on the green and brings the guard over.
- **On easy** (new **Game: easy** button in the panel): the sight roll shows, with a word for how sharp your sight is, and an **eye** or a **question mark** floats over whoever sees or heard you. On normal and hard it's all rolled unseen. **Q43** asks whether the marks should show on people you can't see yourself.
- **Moved on:** owners recognising their things carried openly needs carrying and owners, so it's now part of B3c/B3b.
- **Try it:** Hamlet map, panel → Game: easy. Set Night and walk up to the guard by the green. By day, tap the hero → Call out.
- **Next:** B11, leads (the statue on the Hamlet road).

## 2026-11-03 — Leads agreed and in the plan (B11)

- **Q42 answered: the shape is agreed.** Leads are built to be easy to add to: **each lead is one data file** (title, what you know, ways in, who cares, what they say, what it opens, when it ends). You can send in a **lead note**, like the action notes, and I make it a file. Template and table: [openings → adding leads](design/talk-openings.md#adding-leads-one-file-each-and-a-lead-note-agreed-shape-q42).
- **In the plan as B11**, after perception (B5), since overheard leads need hearing. It can be pulled forward if you want it sooner.
- **Next:** B5, perception.

## 2026-11-03 — Talk offers only what's open; the portrait is 3D, finer; leads thought through

- **Your answers** ([decisions](decisions.md)). Q39: **3D, finer** is the portrait; the switch and the painted one are gone. Q40: with anyone you can **ask about their work** (no roll), **size them up**, **ask what they know**, **keep them busy** and **frighten them**. Picking a pocket will start from sneaking. Q41: several ways in, quests are leads, and free leads can be found.
- **Talk now offers only those.** Comfort, persuade, law and the rest wait until something opens them: their state, a situation, a lead. A villager now has five choices, not fourteen.
- **Leads, thought through** as you asked ([openings](design/talk-openings.md#leads-thought-through-agreed-q41q42)): what a lead is, six ways in (found, told, overheard, carried, your past, asked of you), how one leads to the next, how it ends, how you see them. Then a small first slice to build. **Q42** asks whether that's the shape.

## 2026-11-03 — Talk fixes; openings for talk, for discussion

- **The log no longer hides behind the choices:** they sit under it, overlapping only by a soft fade.
- **The guard's portrait shows his face.** The camera aimed at the top of what he carried (a spear held upright); it now aims between his shoulders and crown, from the body's own joints.
- **Your notes on hooks** are kept as written ([vision](vision/2026-11-03-director-notes-2.md)) and worked into a proposal for discussion: [openings](design/talk-openings.md). Every try gets an *opening*, the reason it's on the table: **always** (a few things with anyone), **their state** (grieving → comfort), **a situation** (caught with their chair → law, argue, threaten), **a lead** (the hooks you collect: something found, heard, given by a talk or a quest), or **what you know** (your Law notices it's theft). Nothing built yet.
- **Two questions:** Q40 (what's open with anyone) and Q41 (how leads are held and seen).

## 2026-11-03 — Fires easier indoors and on embers; B3d: talking to people

- **Lighting a fire** (your note): **easier indoors** (−2: dry, sheltered, kindling at hand) and **much easier on embers** (−4). A fire you put out keeps its embers; once lit, they're gone. A villager's hearth at dawn is now a 4 (or a 2 on embers) instead of a 6. Embers don't cool with time yet: that waits for days on the clock (C2).
- **Tap a villager to talk.** The hero walks up; they stop and turn to you. The panel shows their **portrait**, name, people and calling, and how they seem to feel about you, with the **log** below and the **choices laid over it**.
- **The choices** are every social try the skill library has for who they are, the same rules as the 2D skill map: size up (hidden: you never know whether you read them right), ask, make your case, show you know the land, sweet-talk, frighten, lie, keep them busy, and more. Each is rolled with your sheet and made easier or harder by their mood, how their people see yours and what their calling leans to (the log says why). Their patience runs out, and **what each one remembers of you is saved**.
- **Three portraits to compare** (Q37; the small button on the portrait switches them, and the choice is kept):
  - **3D**: their own body close up, lit where they stand (so a face with the sun behind it is dark).
  - **3D, finer**: the same at twice the pixels. It shows how blocky the bodies are up close.
  - **Painted**: drawn per pixel from their look (skin, hair, beard, hat, clothes, a tirak's jaw and tusks, an elf's ears, a missla's big eyes).
- **Try it:** Hamlet map, by day, tap someone on the green. **Saves from before today are dropped** (the save now keeps what people remember).
- **Still to come in B3d:** social conflicts (the several-round kind), rolls opposed by their own sheet, and leave as an outcome (that joins B3c).
- **Next:** your pick of portrait, then B5, perception.

## 2026-11-03 — B4: everyone in a map has their own character sheet

- **Every person in a map has their own sheet**, rolled from who they are, the same every time. Their **level** is what the map says, or drawn: mostly capable, a quarter novices, a few skilled, a rare master.
- **A people's gifts are fixed** (your answer to Q27): a tirak always has darkvision and keen smell at 4D6, novice or master. Gifts that are rules (claws & tusks, poison-tough) are listed by name, for when the rules need them.
- **Everyone has the basic skills** a new character starts with (2D6), unless their people can't: dwarves neither ride nor swim.
- **Villagers roll with their own sheet** when they light their hearth at dawn. Most have no Survival, so they use **Agility at −2D6**, as the rules allow anyone without a fitting skill (now true for the hero too). A villager may fumble a few tries before the fire takes.
- **See it:** *Kinds of person* page → **Show: Who lives in Hamlet** → tap anyone for their sheet. Or pick *Tirak* and any kind: their gifts have a section of their own.
- **Your answers are recorded** ([decisions](decisions.md)): the portrait gets chosen by trying three side by side when B3d starts (Q37); how people see you is held by each person and spreads when people meet, with advantages in a challenge scaling it (Q38).
- **Next:** B3d, talking in 3D.

## 2026-11-03 — Your notes on people, taking things and consequences, sorted into the plan

- **Your notes** are kept as written in [vision](vision/2026-11-03-director-notes.md), with a digest. Nothing was built from them yet, as you asked.
- **New order** ([decisions](decisions.md)): **B4** sheets on people → **B3d** talking (portrait, log, choices over it) → **B5** perception (owners recognising their things) → **B3c** owners, the scale and consequences → **B3b** the ways to take. **Inventory (B6) moves later**, until you've found the carried-weight rule.
- **The design sketch** is in [actions](design/actions.md), under "Taking things, and what follows". The stair's six ways (argue or threaten, borrow, move, buy, just take, steal unseen), each mapped to a roll mode we already have. One scale per person, moved by the kind of act, the value against the owner's wealth, and importance. Consequences that start at different points by culture and by who you are. Fight or fetch help, by their leaning against how dangerous you look. Most of it rests on parts the 2D skill map already has (mood, relations between peoples, leanings, social conflicts).
- **Two questions** for later: Q37 (what the portrait is) and Q38 (who holds the scale).
- **Next:** B4, sheets on map people.

## 2026-11-02 — B3a: tap a thing, and do something with it

- **Tap a thing** in the 3D world (or close to it: thin torches are easy to hit) and a sheet comes up with what it is and what you can try. Choose, and the hero walks up to it and does it; if it takes a roll, the dice show it. Tap the **hero** for what you can do where you stand.
- **What you can do so far:** **light** a fire that is out and **put out** one that burns (hearths, ovens, forges, torch posts, door torches, campfires). Lighting is an easy Survival roll (harder in the rain out of doors) and takes ten minutes of world time; a fire put out has no light, flame, smoke or fire for the magic. **Sit** on a stool, a bench, an inn bench or a bed; walking gets you up. **Make a fire here**, but not indoors and not among the houses (three or more within 20 m count as the village). The **skill library's tries** on things show up too (search a footlocker, climb a tree, and so on), rolled with your best fitting skill.
- **The villagers light their hearths at dawn**, through the very same action: on the Hamlet map, put out a house's hearth (or the inn's) at night; between six and eight they go to it and light it.
- **Built as a frame** that later actions plug into as files ([what was built and how to add to it](design/actions.md)): offer, gates, roll, outcome. **Owners are a stub** (everything is allowed) until B3c; villagers have no sheets yet (B4), so they roll 3D6.
- **The hero who acts** is the character open in the creator, if it has skills; otherwise the default shepherd.
- **Gone:** the panel's *Nearest hearth* button (tapping does it now). **Saves from before today are dropped** (the save now keeps flags too).
- **To tune when you've tried it:** a stool is sat on facing its own front, so at a table you may sit with your back to it.
- **Next:** B6, items and inventory. When we get there I need the page of the carried-weight rule.

## 2026-11-02 — Q33–Q36 answered; smoke and door torch hidden inside their own house

- **Inside a house, its own chimney smoke thins away and its door torch is hidden** (F1, F2, your answer to Q36). The neighbours' smoke and torches stay. **Try it:** walk into the home on the Spike map, or the inn, at dusk.
- **Answers recorded** ([decisions](decisions.md)): the action frame and order (Q33); inventory by tap and auto-pack, being over-encumbered gives base fatigue, lifting is a Physique roll (Q34); sight rolled against 8, shown on easy only (Q35).
- **One small ask for later (B6):** I can't find the carried-weight rule in the text I have (only armour's encumbrance table and gear weights). When we get to inventory, the page number would help.
- **Next:** B3a, the frame for actions, and lighting a fire.

## 2026-11-02 — Your notes on inventory, B3, found maps and sight, sorted into the plan

- **Your notes** are kept as written in [vision](vision/2026-11-02-director-notes-2.md), with a digest.
- **B3 is split into a frame and slices** (B3a–B3d), sketched in [actions](design/actions.md): offer → gates → resolve → outcome. A lot of it exists from the 2D days (the skill hooks); what's new is permission, requirements and changing the world.
- **Inventory (B6) grew** (shapes, pockets, bag, add-ons, weight → base fatigue) and moved up beside B3. **Crafting (B10)** is new, from your smith example. **Maps you find (D4)** are new. **Rolled sight** went into perception (B5). The smoke and torch faults are **small fixes F1, F2**.
- **Questions Q33–Q36**: the new order, inventory on a phone and how carried weight counts, how sight is rolled, and what exactly is wrong with smoke and torches.

## 2026-11-02 — Dice: dropped from higher, rethrown when they land badly, OK to close; D10+n

- **Dropped from a height** along the longer side of the screen (from the side on a wide phone, from the bottom when it's tall), so they bounce more before they roll out.
- **A die that stops on another die, or tilted, is thrown again**, as at a table: it hops up and is tossed back toward the middle. Before you see anything, the game tries up to four throws and picks one where every die ends flat on the glass.
- **The dice fit the screen:** they're smaller on a small or wide screen and when many are thrown, so a wide phone with ten dice has room for them all side by side.
- **OK or auto:** a new setting. By default the result stays until you press **OK**, which floats at the right in the game's button style. The other choice is to let the result go by itself, as before.
- **Sums of other dice:** a roll like D10+2 now works next to 3D6+2 (`rollPool` takes the die size). The panel has *Roll D10+2* and *Roll 10D6+2* to try them.
- **Why the result is rolled first and then the faces are painted on**, instead of reading the dice: see the decision of the same date.
- **Try it:** 3D world panel → Game row: *Rolls: press OK / go by themselves*, and the test rolls.

## 2026-11-02 — Dice on glass with physics; D100 as two D10s

- **The glass dice are physical now:** they are thrown in from the bottom, tumble, bounce off the edges of the screen and off each other, and roll to a stop, with soft shadows on the glass. The rules still decide: the whole throw is worked out first, then each die's faces are laid on so that it comes to rest on what was rolled. A six that splits glows when it settles and stays put; its two dice drop out of it and bounce off it.
- **A D100 is two D10s**, real ten-sided dice: one with 00, 10 … 90 and one with 0 … 9 (00 and 0 make 100). A D10 roll in the creator is one D10. The icons show a D100 as two numbers too.
- **On glass is the default** (your answer to Q32). If you've set another level, that choice stays.
- **New dependency:** `cannon-es`, a small physics library (about 90 kB, loaded only when dice are thrown on glass).
- **B3 waits** for the talk you want to have first.

## 2026-11-02 — B2: one roll system, shown three ways

- **Every roll goes through one place** (`core/dice.ts`): open rolls (a six is taken away and rolls two new dice), plain pools, and the creator's table rolls. A roll comes back as plain data that says what each die showed and which six it split from, so it can be shown and saved. The skill checks and the creator use it; seeded rolls come out exactly as before.
- **Shown at the level you pick** (one setting for every page): **dice on glass**, real 3D dice thrown up over the game that tumble and land on what was rolled (a D6 is a rounded cube; a D100 or D10 is a ten-sided token with its number); **icons**, small dice spinning in a row; or **just the result**. A six that splits glows as it lands and its two new dice come out of it. A tap lands the dice; the next closes the result.
- **Skins** are kept apart from the rolling: *bone* and *ember* for now, one file each in `content/dice/skins/`.
- **The character creator** rolls through it too: its dice now land on the real numbers (before, they flickered at random and the result appeared afterwards).
- **Try it:** in the 3D world, panel → **Game** row: *Dice:* changes the level, *Skin:* the dice, *Roll 4D6 vs 14* rolls a skill test (keep rolling to see sixes split), *Roll D100* a table roll. In the creator, any 🎲 button.
- **Your call:** which level should be the default (it's *icons* now), and whether a D100 should be two ten-sided dice (tens and ones) as at the table rather than one token.
- **Next:** B3, actions on things: tap the hearth, light it with a roll.

## 2026-11-02 — A2 and A3 done; B1: things remember, the world is saved

- **The flat cards are gone** (your call: A2 done). Every piece of furniture must have a model now; the card painters, the sprite atlas and the "old card" in the gallery are removed (about 2,000 lines). The stable's horse goes with them, so **the stalls are empty** until horses come back as kinds of creature (C3).
- **A3 settled** as you said: only combat goes to rounds; everything else plays live.
- **B1, state on placed things:** a kind says which states its things can be in and how they start (every fire is `lit`, starting lit; the oven is now a kind of fire too). A placed thing only stores what differs, under an id that is the same every time the map is built.
- **B1, the saved world:** one save per map: where the hero is (and on which storey), the clock, what has been seen, and the things' states. Written every 5 seconds and when you leave the page; a save from another version is dropped.
- **A hearth that is out** has no glow, no chimney smoke and gives no fire to the magic field.
- **Try it:** open the panel → **Game** row. *Nearest hearth* puts out (or lights) the hearth of the closest house; walk somewhere, close the page, open it again: you're where you were, at the same hour, the hearth still out, the map you've seen still grey. *New game* starts the map over. (Tapping the hearth itself comes with B3.)
- **Next:** B2, one roll system.

## 2026-11-02 — All the furniture in 3D, and bodies in the world

- **Everyone in the 3D world is a 3D body**, and the old flat people are gone (your call): no Bodies button, no old card beside the farmer in the gallery. Only the stable's horses are still cards.
- **Noted, not fixed:** the inn's two flights of stairs meet with no landing between them (minor; the bigger buildings get redesigned, C6).
- **Lighter bodies:** each body is now one skinned mesh on its skeleton (three draw calls a person instead of about thirty). With everyone in a body, the hamlet draws in about 360 calls (it was about 290 with cards, and 590 with the first bodies).
- **36 more pieces of furniture**, made by three Sonnet helpers working from the how-to: stools, pallets, chests, baskets, sacks, the hearth and the oven, rugs and straw, the inn's long tables, benches and ale kegs, counters (with their goods), the whole smithy, the loom, racks of fish and herbs, nets, hay. Every house is now furnished in 3D except the stable's horses. I went over them in the gallery: nothing broken or floating, all inside their footprints, but they are first passes from the descriptions, so tell me which ones read wrong.
- **Next:** your notes on the pieces; then the horse waits for kinds of creature (C3).

## 2026-11-02 — Furniture models: four examples and a how-to for Sonnet

- **Your notes on the bodies, fixed:** the walk no longer pauses where the legs pass (the motion was easing to a stop at every pose; now it flows through them); every torso has sloping shoulders, so the tirak aren't pointy; the gallery opens without the outline.
- **Furniture as models:** the **table, keg, bed and shelf** are 3D now, in every house. Each turns to face out from the wall it stands against (cards always faced the front). Beds being models means an inn may face any way now.
- **The gallery's Furniture view** (the first button switches People / Furniture): each model turning beside its old card, with its size and triangle count. Drag to look around; `?only=bed` shows one piece.
- **For Sonnet:** [how to make a furniture model](design/models-authoring.md): one file per piece, a kit of shapes, real sizes, colours, a budget, and a checklist. A test holds every model to the rules (on the floor, inside its footprint, under 450 triangles) and a browser test takes two pictures of each next to its old card. The other ~40 pieces are listed in six batches.
- **Next:** the batches.

## 2026-11-02 — A2 begins: a 3D body for every people

- **Try it:** the new **Models** page (from the start page): eight people on turning stands, one of each people and the tirak in their three sizes, with the old flat card beside the farmer. Buttons: turning, walking or standing, shells 0–2, the old card, the outline. In the 3D world, the **Bodies** button (Look row in the panel, or `?bodies` in the address) puts everyone on the map in their body.
- **Each people its own body** (your answer to Q31): humans the reference; elves longer-limbed and narrower with pointed ears; dwarves a big head, short legs, broad shoulders and big hands (bearded women too); tirak heavy-set with a jaw, claws and red eyes; misslor a big head and big eyes. **Sizes come from the rules' typical height and weight** for each people and for women and men (the same table the character creator uses): a dwarf 1.14 m, a human 1.6–1.7 m, the tirak 1.08, 1.87 and 2.26 m.
- **Dressed from the looks the kinds of person already have** (clothes, colours, hair, hats, aprons, cloaks, held tools): no person is made by hand. Two shells over cloth and hair for the ragged pixel edge. Walking and standing are poses stored as data.
- **Not yet:** faces are simple (eyes, a nose, a jaw); held things are rough; people walking through each other's skirts; no sitting or working yet. The cards stay until you're happy.
- **Fixed:** the graphics-memory browser test (it counted shapes made once and reused as a leak; nothing leaked).
- **Next:** your verdict on the bodies, then furniture examples and the how-to for Sonnet.

## 2026-11-02 — A1: turning the view

- **Try it:** in the 3D world, hold **⟲ / ⟳** (under the zoom buttons) or twist two fingers on the map. On a keyboard: Q and E. The camera turns round what it looks at, at any angle.
- **The cut-away works from every side:** each outer wall of a house (and its timbers, windows and door) knows which side it is on. The walls facing the camera fade when you go in; the far ones stay. So you can look into a house from behind or from the side.
- **People** turn with the view (front, back or profile, by where they walk relative to the camera). **Furniture cards** turn to whichever side of the house is nearest the camera, so they are never seen edge-on. Beds and horses are still painted from the front, so from other sides they read a little wrong; A2 (models) fixes that.
- **To judge on the phone:** does the pixel look shimmer while turning? It settles crisp as soon as you stop (the view snaps to whole pixels at every angle). If turning feels too fast or slow, say so (now about 80° a second).
- **Pattern:** the view's turn is engine state (`world.yaw`); the rule for "which wall faces the camera" lives in `core/world3d/view.ts` and is tested.
- **Next:** A2, a low-poly person next to today's card, once you've judged the turning.
- **After your first try:** two walls are now down from almost every angle; only within 5° of square onto a wall is it just one. On a computer, a sideways two-finger swipe on the trackpad turns the view (Safari also takes the trackpad twist; Chrome doesn't pass it to pages).
- **Browser tests:** from now on only the files a change can affect are run, not the whole 9-minute suite.

## 2026-11-02 — One plan, a pattern check, and a sparse Director's Room

- **Why:** two large refactors in October came from adding feature after feature without deciding how they should be built.
- **[How we build things](design/architecture.md):** the game's principles, the layers, every established pattern (where it lives, how to add one, what test guards it), and the foundations still missing. Before any new ask, Claude checks it against this page; if no pattern fits, the foundation is designed and agreed first.
- **[The plan](todo.md):** the director's weekend notes ([kept here](vision/2026-11-02-director-notes.md)) and the missing foundations in one list, ordered by what shapes the most: A (turning the view, low-poly models instead of cards, free time with fights in rounds), B (state, one roll system, actions, perception, items, effects, combat, magic), C (farms, crops, pasture, mounts, map maker), D (overworld, quests, the first village by a lake).
- **Questions:** Q25, Q27, Q28, Q29, Q30 answered, Q21 dropped, Q20 and Q11 parked; all in the [archive](archive/questions-answered.md), decisions recorded.
- **Director's Room cut down:** the front page lists only the plan, questions, decisions, devlog, vision notes and one page per area. Moved to the [archive](archive/README.md): the old overview, the code review, the M0 page, the brief, the structure review, the old backlog, the session-by-session 3D handover and the long devlog. The 3D handover is rewritten as one current-state page; the world structure page lost its old plan. The page picker no longer lists the archive, and the top bar no longer links to the skill map.
- **Next:** A1, turning the view freely.
