# Magic (plan B9): a proposal

*2026-11-17. B9 was agreed as next after effects (2026-11-10). This page is the foundation, **not built yet**: it waits for your answer to [Q53](../questions.md). The rules are in our own words, from the base book's chapter on mysticism; nothing is copied. Earlier notes: [filaments](magic-filaments.md) (the field we have), [magic on the map](magic-on-map.md) (ideas per mystic skill).*

## What the rules ask of a caster
- **Being reshaped** (a base value in *Sensing*): only they feel the flow at all, and only they can learn magic.
- **Knowing the spell:** a spell is learned as part of a *mystery* (a group of three related spells).
- **The aspect's skill** (Pyrotropy, Hydrotropy…): you roll it against the spell's difficulty (its magnitude, 6 to 20 or so).
- **The flow where you stand** adds or takes dice, by seven levels: magic-dead (impossible), very weak −2D6, weak −1D6, normal ±0, strong +1D6, very strong +2D6, extreme +3D6. **Our filament field already has these seven levels per aspect** (−3 to +3).
- **Your own state** can add or take dice (for fire: hungry or **wet −1D6**, which B7 now tracks).
- **Advantages** make a spell reach further, last longer or hit harder.
- **A failed cast discharges** (a *dissipation*). How bad it is starts from the flow's strength (very weak 10 … extreme 35; normal 20). You roll *Harmonizing* (at least 1D6) and take it off; what's left is read on a table. Under 1: nothing but a show. 1–9: mild (dazed, a cry, a scratch). 10–19: troublesome. 20–29: dangerous to you and those near. 30+: crippling or deadly. A caster may also take some of it into their own body (*fading*, lasting harm) to soften it.
- **Being seen casting** depends on how openly it's done (words, gestures).

## The shape in the game
It's the same frame as everything else, so a fireball is one data file, as the [architecture page](architecture.md) promised:
- **A spell is a kind**, one file each in `content/magic/spells/`: its aspect, difficulty, what it targets (a thing, a person, a spot, yourself), range in metres, how long it lasts, and **what it does as outcomes the frame already has or B7 gave us**: set a state (`burning`), injure (damage of a type, by the wound tables), an effect on a person. And how it looks (a motion from the animator, a flash), and how loud and visible it is.
- **A mystery** is a file listing its spells. What a character knows comes from the creator (it already keeps learned mysteries); the map's people get them from their sheets.
- **Casting is an action** (offer → gates → roll → outcome). Every spell you know is offered where it fits, like the skill hooks are: on a thing, a person, or the spot you stand on. Its roll is the aspect skill **plus the flow at your feet** (read from the filament field) **plus your state**.
- **A dissipation** is a new kind of outcome (agreed with this page): intensity from the flow, a Harmonizing roll, then **our own short table per band** (one file per aspect later; one general table first), whose rows are effects the rules already know: dazed, bleeding, pain, fatigue, a fire breaking out around you.
- **Sensing** (*Feel the flow*): a roll that shows the flow around you on the map for a while, wider and clearer the better you roll (the groundwork from the 2D days, re-done in metres). Without it, the magic view stays hidden.

## First slice (if you say yes): fire
Fire first, because B7 just made fire real: what burns, how it spreads, wet against it. The fire aspect's flow is literally the fires around you (normal holding a torch or with a hearth lit in the room, strong beside a big fire, very strong ringed by fire, impossible under water).
1. **The frame:** spells and mysteries as data, casting as an action, the flow from the field, the dissipation outcome and a general table, a spell list on the *You* sheet.
2. **Two spells of our own**, from one fire mystery: ***Kindle*** (easy: set a flame on a hearth, candle or tinder at a touch; the aspect's everyday magic) and ***Call a flame*** (tricky: set something you can see within 10 m alight, 2D6, more with advantages).
3. **Feel the flow** (Sensing) for fire, shown on the map.
4. **A test caster:** a fire-touched hedge witch in the Hamlet (a kind of person with the mystery), and a creator character with Pyrotropy can cast too.

Not in the first slice: prayers (channelling), rituals, improvising, other aspects, magic items, unravelling others' spells, fading's lasting harm beyond the table.

## Your vision, checked
- *"Start very basic: no magic, later in the campaign new kinds unlock new characters"* (2026-10-25 notes). The engine can have magic while the **campaign** keeps it rare: the shepherd has none; only those reshaped can learn it; the first village might have one hedge witch. Unlocking comes with story (parked).
- *"Magic requires combat"* (2026-11-02 notes): fights, damage, wounds and effects are now built.
