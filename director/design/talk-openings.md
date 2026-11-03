# Openings: why a thing can be said (for discussion)

*2026-11-03. From the director's [notes of the same day](../vision/2026-11-03-director-notes-2.md). **Not agreed, not built:** a proposal to talk through (Q40, Q41). Belongs to B3d (talking) and reaches into B3c (situations), D2 (quests) and D4 (found things).*

## The problem
Today a talk offers **every** social try the skill library has for who someone is: fourteen for a farmer, court manners included. That has two faults:
- **It's a menu, not a conversation.** Nothing in the world gives a reason to say anything.
- **It gives hints away** (principle 4: hints are optional). A list of everything that *could* work tells you what to try.

The director: some things you can talk about with anyone, even a peasant with no quest. **Most need a hook from outside.** Comforting someone makes sense only if something has happened to them. Law makes sense in a situation (you're carrying off their chair), not out of the blue. Hooks might be **collected**, by finding things in the world and through quests.

## The proposal: every try has an *opening*
An opening is what puts a try on the table. A try shows only while one of its openings holds. Five kinds:

| Opening | Puts on the table | Example | Where it comes from |
|---|---|---|---|
| **Always** | A few things you can do with anyone | Size them up, ask what they know about the place, their trade (buy from a merchant, a room from the innkeeper) | Nothing: it's the base. Q40 asks what belongs here |
| **Their state** | What answers how they are now | Grieving or frightened → *comfort*; drunk → *loosen their tongue*; angry with you → *calm them*, *apologise* | A state facet on the person (the people library already has a *state* dimension), set by what happened: an event, an effect (B7), something you did |
| **A situation** | What fits a moment between you | Caught carrying their chair → *argue it's yours*, *law*, *threaten*, *bribe*, *buy it*; haggling → *trade*; a fight about to start → *calm*, *frighten* | The situation is a challenge or conflict (the ways to take, B3b; consequences, B3c). It lists the efforts it opens. This is where law belongs |
| **A lead** | A topic to raise, with someone who might care | *Ask about the burnt mill*, *Show the seal*, *Ask after Wenna's brother* | **The collected hooks.** Found in the world (a notice, a letter, tracks, a body), heard (gossip, an overheard talk), given by another talk (an *ask* that goes well hands you a lead), or by a quest |
| **What you know** | A try your own skill notices | With Law, you see that taking the chair is theft by the town's custom, so a law try opens in that situation; with Insight, you see someone hiding grief, so *comfort* opens | Your sheet: a skill high enough opens its effort's tries where it applies, without saying they will work |

**Leads are the "hooks to collect."** A lead is knowledge, not an item: *the mill burnt down*, *the smith owes money*, *a stranger asked about you*. It's held by the hero and saved. A lead says who it might interest: anyone in the village, a kind of person (guards), or one person. It can open new tries (*ask about it*, *use it as leverage*) and lean old ones (knowing their debt makes a threat easier). A thing you find can carry one (a letter is an item, B6, and the lead it gives). A quest (D2) is, at heart, a lead that matters.

**Why this fits what we have:** each library hook gets an `opens` field (always, a state, a situation, a lead id, or a skill), read where today's list is made (`talkOffers`). States are facets we already have. Situations are the challenges and conflicts we already have, given a list of efforts they open. The one new foundation is **leads**: a small record in the save, and a way for outcomes to give them (`{ lead: 'mill-burnt' }`, beside `flag`).

**What it changes on screen:** a peasant met on the road offers three or four things, not fourteen. More turns up as the world gives reasons: they look grief-stricken, you found the letter, you're caught with their chair. Hidden reads (size up) stay open always: looking costs nothing.

## Open points (talk them through)
- **Q40:** what's open with anyone, always.
- **Q41:** how leads are held and seen: a journal you can read, topics you pick in a talk, or nothing shown at all.
- **Do failed tries close?** Today some do (out of tries). With openings, a try could stay open but cost more patience.
- **Does a lead run out?** Asking about the mill twice, or once everyone knows.
- **Are leads shared with the hooks on things?** A lead could also open a try on a thing (*search the mill's ashes*). Probably yes: the same opening works for things and people.
