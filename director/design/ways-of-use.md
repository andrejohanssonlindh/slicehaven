# Ways a skill can be used

*2026-10-27. Everything we have considered so far for what "using a skill" can mean, built and planned. The same list is on the [Skill map](../skills/) (data in `src/content/skillweb/uses.ts`), where each skill also shows which of these it takes part in.*

A use has three parts: **what you are trying** (the intention and the kind of effort: [tags](skill-map-handover.md)), **how it is rolled** (the mode below), and **what it can result in** (outcomes).

## How it is rolled (modes)
**Built**
1. **A single roll on a thing.** One roll against a difficulty set by circumstances. Fail, success, strong success (2+ advantages). Mood, how their people see yours, and kept advantages change the difficulty. *Climb the boulder, persuade the guard.* (Library hooks and scene checks.)
2. **A read you can't verify.** Knowledge, insight, lore. The roll is hidden; success gives the truth and failure a believable wrong answer; one try. *Size up a person, study a rock.*
3. **Looking around.** Search or alertness with nothing in front of you. One roll against what each nearby thing is worth noticing (harder with distance); one look per spot.
4. **Starting a round against someone** (social conflict). Opposed roll against what *they* have. 1 Control to the winner, +1 per 5 won by.
5. **Answering a round.** The same, from the other side. The lead alternates: you, them, you.
6. **The locked roll.** The roll a conflict or challenge requires once, usually an attribute. Free of the attribute budget.
7. **A roll against a place** (challenge). Three rolls against one difficulty, counted in Control, read off a result list. *Survey the area.*
8. **An edge.** An ability that changes the footing: darkvision at night is +2 Control.
9. **Your own nature** (attribute fallback). Presence is natural; Physique when aggressive; a few more by game difficulty; any attribute at −2D6 if no skill fits.

**Rules that shape any use:** using the same skill again costs −2D6; attributes are limited by difficulty; people have limited patience (talks) and a mood; the game difficulty decides whether starting Control is shown and how many side tries you get on someone with a social challenge.

**Planned**
- **Helping someone** (party members lend a skill), needs the party in scenes.
- **With the right tools** (thieves' tools for lockpicking), needs packages as items with a skill bonus.
- **Because of who you are** (drives favour or forbid intentions), needs the 45 drives wired in.
- **On this ground, in this weather** (sneaking on grass or twigs, climbing in rain), needs tile and weather inputs.
- **What the Control buys** (secrets, changed opinions, a hold over them; the loser may refuse one for +2), needs consequence tables.
- **A skill as a line in a conversation** (law lets you cite the statute), needs skill-gated talk options.
- **Making and mending** (crafts), needs items and a craft challenge template.
- **Putting your back into it** (spend Focus for dice; talents), needs Focus and Wellbeing in scenes.
- **Taking your time** (more time, easier), needs a clock.

## What a use can result in (outcomes)
**Built:** something said; a fact set (they know you read them); how they feel about you moves (shown as a note); a kept advantage for a later roll against a person or for a kind of effort (social, sneak, pickpocket, barter); things nearby pointed out; silver lost; time passing; someone or something leaving; getting through (scene ends); running out of someone's patience.
**Planned:** an item, pass or clue; a changed relationship or a hold over someone; wellbeing or health changes; a new option opening (a route, a talk line).

## Intentions we have so far
From the library: **persuade, impress, distract, ask, intimidate, etiquette, size up, climb, study** (and, as conflict approaches, **bribe, threaten, sweet-talk**; as a challenge, **survey**). Search is "look around" and the cart's check. More come with the content pass.

## Kinds of effort (tags)
persuade, impress, sweet-talk, distract, ask, barter, threaten, etiquette, streetwise, read people, search, climb, survey. Weapon skills are tagged for **threaten** and **impress** (a drawn blade, a clean shot, a trick throw). More kinds are listed as wanted in the [handover](skill-map-handover.md).

## Where each lives
Code: `src/core/` (`scene`, `skillweb`, `social`, `challenge`, `attributes`, `difficulty`). Data: `src/content/skillweb/` (`tags`, `examples`, `uses`, `social`, `index`, `relations`, `challenges`), `src/content/npcs/`.
