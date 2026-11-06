# Combat and damage: the ruleset, in our words

*2026-11-04. A working summary of the ruleset's fight and damage chapters, so Claude can build from this page instead of the book. Mechanics only, written in our own words; nothing is copied. Book pages are given (book numbering) so the director can check a rule. Where the book leaves something open, or I had to read between lines, it says **(reading)**. How we turn this into a live 3D game is [the combat plan](combat.md); this page is only what the rules say.*

*Ids in code: skills and attributes keep the creator's Swedish ids (`Livskraft`, `Reaktion`, `Undvika`, `Sköld`); weapon, shield and armour rows are in `content/chargen/equipment.ts`.*

## 1. The shape of a fight (p. 82)
- A fight goes in **rounds**. A round has four **phases** in order: **ranged**, **melee**, **mystic**, **end**.
- At the start of each phase you say whether you are **active** in it. You can be active in **one phase a round**.
- In your active phase you get a **side action** (move, draw, aim, load) and a **main action** (attack, mystic act, other). Everyone's side actions come before anyone's main action.
- **Defending is not an action**: you can always defend, in any phase, if you know the attack is coming and are able to. One defence roll counts for the whole phase against every attacker.
  - Defending **outside your active phase** costs **+1 fatigue** (no shock roll for it). Attacked in two such phases: +2.
  - Choosing not to defend counts as a defence of 0.
- **Order** inside a phase, when it matters: everyone rolls **Reaktion**; highest first. A tie: what makes sense, or highest Reaktion value wins (p. 83). The order holds only for that phase; roll again next time.
- **Tactics may be chosen hidden** when it matters (p. 88). **Our rule (the director, 2026-11-04): choices are declared in reverse order**, lowest first, so whoever is ahead knows what those behind mean to do. The book text we have doesn't say this outright; it is the director's call. In a melee the attacker is ahead; free, nobody is (both choose blind), and Reaktion is rolled when it matters: as blades cross, or when two go for the same thing (director, 2026-11-06).
- **Drawing** a weapon, shield or anything else: −1D6 on your next main action or defence, unless it is *quick-draw* (`Snabbdragen`).

### The attack, in short
1. The attacker rolls the skill for the weapon (open roll) **plus a D10** that isn't added: it says where the blow lands if it hits.
2. The defender rolls a defence (a weapon skill to parry, `Sköld` to block, `Undvika` to dodge).
3. **Attack ≥ defence → hit.** A tie goes to the attacker.
4. Every full 5 the attack beats the defence by is one **Advantage** (as everywhere: `advantages()` in `core/dice.ts`). Advantages buy **edges** (section 5).
5. Damage is rolled; base armour and worn armour on that body part come off; the rest is read on the **damage table** (section 6).

## 2. Distance and moving (pp. 85–86)
The book uses five bands instead of metres. **We play in metres** (decision: no hexes, distances are metres), so the bands become ranges we choose (see the plan). The bands:

| Band | What it is | Ranged difficulty |
|---|---|---|
| **Adjacent** | Close enough to touch. No ranged attacks | — |
| **Short** | About ten steps: across a small room or a road | 6 |
| **Medium** | Across a hall or a glade | 10 |
| **Long** | Across a square; most thrown weapons fall short | 14 |
| **Very long** | Across a battlefield or a village; only made bows and engines | 18 |

- **Moving** one band is a side action, no roll. **Two bands** needs being active in the melee phase and a `Förflyttning` roll: easy ground 6, rough (light hills, thin wood) 10, hard (bog, thick wood) 14; wrong light +2. Fail: one band.
- Melee needs **adjacent**.

## 3. Ranged (pp. 85, 87)
- Only if you are **free** (not in a melee). Choose your target before anyone rolls.
- To hit: reach the **higher of** the range difficulty and the target's defence roll. A bad defence can't make you easier to hit.
- Defence against ranged: **only `Undvika` or `Sköld`**.
- Range difficulty modifiers:
  - **Target size**: very large (horse) −4; large (human, elf, tirak, trukh) ±0; medium (dwarf, gûrd, missla) +4; small (raven, cat) +8; very small (mouse) +12.
  - **Cover**: in a melee +4, running +4, flying +8, holding a hostage +8 (a miss may hit the hostage), behind a parapet +8, in an arrow slit +12.
  - **Shield**: its *cover* value is added to the range difficulty always, aware or not; its *ranged bonus* is added to a block roll against ranged (Bucklare +2 cover … Välvd sköld +10; in `SHIELDS`).
  - **Wind** (medium range and beyond): fresh breeze +2, strong breeze +6, gale +8, storm impossible.
- Side actions in the ranged phase: move one band; draw a thrown weapon; load a crossbow (a roll against its reload difficulty; under 3 advantages it costs the main action too); **aim** (+2 to the attack); nock an arrow (no roll).
- A hit in the ranged phase takes effect at once, so it can spoil the victim's own shot that phase.

## 4. Melee (pp. 88–91)
- **Roles**: in a melee one side is the **attacker**, the other the **defender**. Opening a melee (adjacent): both roll `Reaktion`, the higher is attacker. Whoever is active in another phase is automatically defender. All fighters on one side share a role.
- Only the **attacker** gets a main action: a melee attack (with a tactic) or **retreat** (become free, move one band away; not in the round you opened). The defender only defends. A free fighter gets a side action (move).
- **Who attacks next round** depends on the defence tactic and the result.

### Tactics (p. 89)
| Attack tactic | Fatigue | Attack dice | Damage |
|---|---|---|---|
| Standard | 0 | ±0 | ±0 |
| **Quick** | +1 | +1D6 | −1D6 |
| **Powerful** | +2 | −1D6 | +2D6 |
| **Group** (2+ defenders, one roll against all) | +1 | −1D6 | ±0 |

| Defence tactic | Fatigue | Defence dice | Becomes attacker next round if |
|---|---|---|---|
| Standard | 0 | ±0 | defence beats the attack |
| **Defensive** | +1 | +1D6 | defence beats it by 2 advantages |
| **Counter** | +1 | −1D6 | always, hit or not |

- Tactic fatigue never causes a shock roll.
- A defender not active in the melee phase must take **Standard** and +1 fatigue; if the defence holds, they attack next round.
- **Ways to defend**: **block** (shield; its melee bonus), **parry** (weapon, or bare hands at −2D6 against a weapon), **dodge** (`Undvika`; hurt by load; can't counter).

### Several fighters (pp. 90–91)
- Split into **sub-fights**: one fighter against one to four.
- **Outnumbering**: two or more against one get **+1D6 on all Reaktion and skill rolls** (not more for more).
- Opening: the many take their best Reaktion against the lone one's.
- **Alone against several defenders**: pick one (the others don't roll, and roles swap next round automatically), or use **Group** against all; any one defender succeeding swaps the roles.
- **Alone against several attackers**: one defence roll against all; compare it with the highest attack to see if roles swap.
- Advantages: a lone fighter compares with the highest opposing roll; in a group attack the attacker shares them out.
- **Joining**: onto the side against a lone fighter, you take their role, no roll. Joining the lone fighter: the fight splits, a new sub-fight opens (who goes where depends on who is attacking).

## 5. Edges: what advantages buy (p. 96; weapon properties p. 97)
Always at least 1 advantage, even if a weapon lowers the cost to 0.

**Simple** (melee; the ranged ones marked ⟶):
- **Find a gap** [4] ⟶: only base armour counts.
- **Mark** [1]: no damage, but everyone sees you could have. With another edge (not *more damage*) it costs 0.
- **Precision** [2] ⟶: choose the body part instead of the D10.
- **Break** [the item's Fragile value]: a fragile weapon or shield breaks for the rest of the fight. Damage as usual.
- **Follow-up** [3]: a second hit with another damage type of the same weapon, or the off-hand weapon; new location and damage.
- **More damage** [1+] ⟶: +2 damage each (with *Dangerous* `Vådlig`: +1D6 each).

**Advanced** (base cost works on a foe up to 2D6 more Physique than yours; +1 each per extra D6; damage as usual):
- **Disarm** [2+]: their item flies a short way, or into your free hand.
- **Move the fight** [1+]: one band in any sensible direction (towards a ledge, not through a wall).
- **Trip** [2+]: they **fall**.
- **Grab** [2+]: they are **grabbed** (+1: **locked**). +1 cost without two free hands.
- **Throw** [2+]: base damage only, as fall damage. +1 without two free hands.
- Group fights only: **share advantages** among attackers on one foe. Mounted only: **ride through** [1].

**Weapon properties that matter for the rules above** (in `PROP_INFO`): *Precise X* (find a gap −X), *Measured X* (precision −X), *Disarming X*, *Snaring X* (trip −X), *Shattering X* (break −X), *Reach X* (+X D6 Reaktion when opening), *Quick* (quick attack costs no fatigue), *Powerful* (+1D6 damage on a powerful attack), *Countering* (counter without −1D6), *Outmanoeuvring* (group attack without −1D6), *Flexible* (−1D6 to parry or block it), *Weak* (−1D6 to parry with it), *Piercing X (type)* (armour incl. base armour −X against that type), *Cutting X* (Piercing X against the unarmoured), *Brutal X* (+X fatigue when it causes any), *Wounding X* (+X on the serious-wound table), *Double grip* (+2 damage two-handed), *Unwieldy* (no quick attack), *Shallow* (never a serious wound), *Unarmed* (serious wounds from the brawl table), *Secure* (can't be dropped; disarm +1), *Fragile X*, *Limited* (vs. monsters), reload/magazine/aim properties for bows and crossbows.

## 6. Damage (pp. 100–101)
**Damage types**: cut (`Hugg`), crush (`Kross`), thrust (`Stick`), **brawl** (unarmed; crush armour counts against it), **fall**, **burn**.

**Steps when a blow lands:**
1. **Body part** from the attack's D10 (or chosen by *precision*): 1 head · 2–4 torso · 5–6 left arm · 7–8 right arm · 9 left leg · 10 right leg.
2. **Damage roll**: the weapon's dice, which usually include your **base damage** (G, from Physique), plus tactic and *more damage*. Roll **a D10 with it** that isn't added: it picks the serious wound if there is one. All D6 rolls are open (sixes split), damage too.
3. **Armour**: take off **base armour** (from Physique) plus worn armour on that part against that type. 0 or less: nothing happens.
4. **Fatigue** from what is left:

| Damage | Fatigue | Serious wound |
|---|---|---|
| 1–4 | 1 | — |
| 5–9 | 2 | — |
| 10–14 | 4 | D10 |
| 15–19 | 6 | D10+2 |
| 20–24 | 8 | D10+4 |
| 25–29 | 10 | D10+6 |
| … each +5 | +2 | +2 |

5. **Serious wound** at 10 or more: read the D10 (+ the bonus above, + *Wounding*) on the table for the **type** and **part** (head, torso, arm-or-leg; fall and burn are for the whole body). Rows 1–20; 20 and above is the last row.
6. **Death roll**: many rows carry a difficulty. Roll **`Livskraft`** against it **at once**. Fail: dead. On the top rows the difficulty is "result + 10".
7. **After-effects** of the row (section 7) take hold after the phase, if they lived.
8. **Shock roll** at the end of the phase whenever damage gave fatigue: `Livskraft` against your **total fatigue** (base fatigue included). Fail: **knocked out** for the rest of the scene.

| Type | Table per body part | Base armour counts | Worn armour counts |
|---|---|---|---|
| Cut, crush, thrust, brawl | yes | yes | yes |
| Fall | no | yes | **no** |
| Burn | no | yes | as fewer or more **dice** (below) |

### Fatigue (p. 101)
- Adds up without limit. You can't die of it, only fall unconscious (and then be killed with a **mercy stroke**: no defence, armour no help against cut and thrust).
- **Base fatigue**: the floor it can't go under (heavy armour's load, an infection).
- All fatigue recovers when the **scene** ends (a short rest). Not during a fight.
- **Knocked out**: no actions, no defence. Wakes at the end of the scene, or when someone rolls `Läkekonst` against their total fatigue (they keep the fatigue).

### Falling (p. 106)
- Height: 2 m 2D6 · 5 m 4D6 · 10 m 6D6 · 15 m 8D6 · 20 m 10D6 · 30 m 12D6 · 50 m 14D6 · 75 m 16D6 · 100 m 18D6 · each +50 m +2D6.
- Ground: sharp rock +2D6 · hard (street, earth floor) +1D6 · soft (bushes, tall grass) ±0 · very soft (hay, snow) −2D6 · deep water −8D6. A `Reaktion` roll against 10: −2D6.
- Worn armour doesn't help; base armour does. One table for the whole body; a limb not named is odd left, even right.

### Burns (pp. 107–110)
- Source dice: torch 1D6 · hearth, campfire 2D6 · burning house, pyre 3D6 · fully burning house 5D6 · inferno 6D6 (dragon fire 7D6; others in the book). Hot coals, boiling water, acid 1D6; boiling oil, lava, white-hot steel 2D6; molten steel 3D6.
- **Protection and weakness are in dice**, taken off or added before rolling: in a lake −8D6, downpour −4D6, soaked cloth all over −2D6, padded or soaked clothes −1D6, most clothes ±0, airy clothes or naked +1D6, soaked in oil +2D6. Zero dice: no roll.
- **Lasting exposure gets worse**: +1D6 each round (the GM may cap it).
- No base damage added to a burning weapon (a torch swung): the source's dice.
- Kinds: fire (the table as written), lightning (serious ones also cause shaking), rot (ignite → infection), cold, radiance, acid (serious ones always also damage armour).
- **Burning materials**: roll the fire's damage against: straw, paper, oil, wax 2 · cotton, twigs, linen 6 · hard wood, fur, clothes, a wooden deck 10 · silk, wool 14 · leather 18. Advantages: it goes faster or further.

## 7. After-effects (pp. 111–117)
"Until the end of their next active phase" is shortened to **(next phase)**.

**"−1D6 on everything" below means on every *action*** (the book says "all actions", and words "all rolls" differently where it means that). A shock or death roll is no action, so the short effects don't weigh on it; the book's own worked example rolls a shock roll right after *dazed* at full dice. A defence isn't an action either in the book's sense (you can always defend), but we still take the dice off it (reading). Pain names what it hits, and Vitality isn't there: no pain on shock or death rolls (checked 2026-11-06, the director asked).

| After-effect | What it does | Goes away |
|---|---|---|
| **Dazed** (`Omtöcknad`) | −1D6 on everything | next phase |
| **Knocked back** (`Tillbakaknuffad`) | −1D6 on everything; deadly at a ledge | next phase |
| **Drops** (`Tappar`) | −1D6; drops what is in the hit arm (a short way off) unless held two-handed; a head, torso or whole-body hit drops everything. *Secure* items stay | next phase |
| **Falls** (`Faller`) | −1D6; can't move (no retreat, mount, move) until up | next phase, then standing |
| **Armour damage** (`Rustningsskada`) | −1D6; the worn armour on that part counts as gone (never base armour) | penalty next phase; mend in a scene, no roll |
| On arm/leg tables, **drops/falls** | drops if an arm was hit, falls if a leg | |
| **Pain** (`Smärta`) N | −N D6 on mystic, movement and combat skills and on Förflyttning, Kroppsbyggnad, Reaktion, Vaksamhet (others at the GM's word) | 1 a day |
| **Wound** (`Sår`) N (part) | −1D6 each on: head → shock rolls; torso → death rolls; arm → combat skills with that arm (two-handed weapons too); leg → Förflyttning and movement skills. Max 3 a part; a fourth turns into infection 3/20, each after that +0/+2. Leaves a scar | 1 every 10 days, per part |
| **Bleeding** (`Blödning`) rate/difficulty | end phase: +rate fatigue (shock roll). `Läkekonst` against difficulty stops it. One at a time: a new one takes the higher rate and higher difficulty, then difficulty +2. Knocked out while bleeding: death roll against it at once; pass, it stops; fail, **dying**: one `Läkekonst` try in this scene, or dead | rate 0 or stopped |
| **Ignited** (`Antänd`) heat/difficulty (fire only) | end phase: +heat fatigue (shock roll). Put out by `Förflyttning` against difficulty (water helps: small bucket or wool blanket +1D6, big bucket +3D6, lake +8D6), not defending while you do; another can help (one roll a round). Merges like bleeding. Knocked out: a death roll against it each round; 1 advantage puts it out | heat 0 or put out |
| **Infection** (`Infektion`) level/difficulty | base fatigue +level. A death roll a **day** against difficulty (+4 if a whole day in bed); 2 advantages: healed. A healer's `Läkekonst` may replace it. Merges like bleeding. Dying from it: −1D6 on everything that last day | |
| **Internal injury** (`Inre skada`) | no penalty, but obviously grave (gut: can't move; head: out or confused). A D10 a day: 1 heals, 2–10 a death roll 6, 8 … 20, 30. Several: one roll each | a 1, or surgery |
| **Break risk** (`Brytrisk`) N (area) | 3D6 (open) against N; under it, broken: neck (paralysed, 2 pain, never heals) · skull (1 pain, −1D6 speaking, soft food; 30 days) · ribs (1 pain, −1D6 combat and upper-body movement; 30) · spine (2 pain; fail by 5+ paralysed from the waist; never heals) · hip (can't walk; 2 pain; 90) · arm (useless; 1 pain; 60) · leg (useless, a crutch: Förflyttning 1D6; 1 pain; 60). *Focus* can be used | |
| **Amputation risk** (`Amputationsrisk`) N (area) | 3D6 against N; under it, it's gone, as permanent wounds: neck or torso: dead · hand, forearm: 1 wound, 1 pain, bleed 1/10 · elbow 2, bleed 1/10 · upper arm 2, 1/12 · shoulder 3, 2/24 · foot, calf 1, 1/14 · knee 2, 1/14 · thigh 2, 2/18 · hip 3, 2/28 | never |
| **Face feature lost** (`Avhugget ansiktsdrag`) | −1 `Intryck` or `Vaksamhet` (they choose) | never |
| **Eye lost** (`Öga förstört`) | −2 Reaktion, −2 Vaksamhet, −1D6 ranged unless aiming. Odd left, even right. Both: blind | never |
| **Teeth** (`Tänder utslagna`) N | sore eating; pull the stumps or pain and rot (only elves regrow them, half a year) | |
| **Genitals destroyed** | infertile | never |
| **Blinded** (`Förblindad`) | −2D6 on what needs sight | one round |
| **Grabbed** (`Greppad`) | −1D6 (next phase), standard defence only, no reach weapons between them. Breaking free: an opposed `Slagsmål` or `Kroppsbyggnad` roll at −1D6; win, you're the attacker next round. The grabber may upgrade on winning | |
| **Locked** (`Fastlåst`) | no actions needing limbs; defence counts 0. Breaking free as above. Upgrades to a **choke**: as locked, 4 lack of air a round (8 with a garrotte), no −1D6 to break free (−2D6 with a garrotte) | |
| **Falls from the saddle** | 2D6 fall damage (+1D6 at speed), `Reaktion` or `Rida` against 14 (rider hit) or 18 (mount fell) | |
| **Bolts** (`Skenar`, mounts) | the mount flees on its own | |

**Several short effects at once:** the book doesn't say. **Decided (Q47): negative effects stack**, the same one twice too: *dazed* and *drops* from one row are −2D6.

## 8. Strain (p. 118)
Hunger, thirst, cold, lack of air count in their own points. Each increase: a shock roll against them; fail, knocked out (or −3 well-being; not for air). Once out, the shock rolls turn into death rolls. Lack of air: 4 a round, 4 back a round once breathing (not until the next scene if knocked out).

## 9. Load (p. 86)
Armour's **load** (in `ARMOUR`) gives a penalty on `Förflyttning`, `Reaktion` and movement skills (dodge too, **not** combat skills) and base fatigue: 0–8 none, 0 · 9–16 none, 1 · 17–24 −1D6, 2 · 25–32 −2D6, 4 · 33–40 −2D6, 6 · 41–48 −2D6, 8 · 49–56 −3D6, 10 (`ENCUMBRANCE` in `core/chargen/tables.ts`). Carried kilograms add load points (built in B6: `carry.ts`).

## 10. The end phase (p. 93)
First: fire (heat → fatigue, shock) and bleeding (rate → fatigue, shock; bleeding elves may roll `Livskraft` against it to stop). Then free fighters who did nothing earlier get a main action; those who chose the end phase a side and a main action: swap weapons, pick a lock (10), put out a fire, stop a bleed (`Läkekonst`), light a fire (10; 1D6 fire), wake someone (`Läkekonst` against the higher of their fatigue and the shock that put them out).

## 11. Mounted, mystic (pp. 92, 94)
Parked with riding (C4) and magic (B9). In short: rider and mount act as one fighter but count as two for sub-fights and outnumbering; a charge (moved and opened the same round) +1D6 damage; the mount attacks or defends at the lower of its value and the rider's `Rida`. Mystics act in their phase, need their voice and both hands (a held item other than a focus −1D6), and can be disturbed.
