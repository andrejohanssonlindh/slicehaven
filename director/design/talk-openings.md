# Openings: why a thing can be said (for discussion)

*2026-11-03. From the director's [notes of the same day](../vision/2026-11-03-director-notes-2.md). **Agreed** (Q40–Q42). The "always" openings are built; leads are plan item **B11**, built as data files (below). Belongs to B3d (talking) and reaches into B3c (situations), D2 (quests) and D4 (found things).*

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

## Answered so far
- **Q40, open with anyone:** sizing them up, asking what they know, and their work (asking about it needs no skill). Also **distracting** them and **threatening** them (robbing someone starts there). **Stealing** (picking a pocket) is started from **sneaking up on them**, never from a talk. *Built 2026-11-03:* only these are offered; everything else waits for an opening of its own.
- **Q41, leads:** several ways in. **Quests are leads.** There are **free leads** too: find a curious statue outside a town, and "Lead added". Thought through below, for the next round.

## Leads, thought through (agreed, Q41–Q42)
**What a lead is.** Something the hero knows that gives a reason to act: *a weathered statue of a woman holding a key, on the north road*. It isn't an item (a letter can carry one, but you know it even if the letter burns). It has three parts:
- **what you know:** a few lines, which grow as you learn more;
- **who might care:** anyone here, a kind of person (the old, the clergy, guards), one person, or a place;
- **what it opens:** tries with those people (*ask about the statue*, *show them the key*) and on things (*search the statue's base*, *study the inscription*).

**Where leads come from** (several ways, as you said):

| Way in | Example | How it would be made |
|---|---|---|
| **Found in the world** | The statue on the north road; a burnt-out farm; fresh graves; a notice on the inn door; tracks into the wood | A kind of thing can carry a lead (`lead` on the kind, or on one placed thing). Looking at it, or a successful study or search, gives it. A map rule can scatter *curiosities* (statues, cairns, ruins) the way it scatters trees |
| **Told** | *Ask what they know* goes well: the innkeeper mentions the stranger asking about you | Each person knows a few leads, from where they live, their calling and their kind (an innkeeper knows travellers' gossip, a priest knows the shrine's history). A good ask hands one over |
| **Overheard** | Walk past two farmers at the gathering: "…and the mill's been dark three nights" | People at a place or an event say lines among themselves; within hearing (B5), a line can carry a lead |
| **Carried** | A letter in a dead man's coat; a found map (D4) | An item gives its lead when read (B6) |
| **Your past** | Your sister went to the capital and never wrote | The creator's life events (Friends & Foes and the rest) become starting leads |
| **Asked of you** | The miller asks you to find out who's taking his grain | **A quest is a lead with someone waiting**: the same thing, plus a giver, stakes and a reward (D2) |

**How a lead grows.** Asking the right person about it adds a line and often a new lead: the old woman says the statue is Saint Hesma, who kept the well. That opens *search the statue's base*, which finds a key, which opens a lead about a door. A chain of leads is a quest with no quest giver: exploring rewarded by what you find out (principle 4: hints are optional).

**How a lead ends.** *Solved* (you found the door), *spent* (everyone who'd care has told you what they know), or *gone cold* (the stranger left town). A spent lead stays in the journal, greyed.

**How you see them** (Q41's options taken together):
- **"Lead added"** when you get one, the way "the hearth catches" shows now.
- **A journal** of leads, each with its lines.
- **Choices that appear by themselves** in a talk when this person might care. On easy, the journal could also say who might care. Harder settings leave that to you.

**Built 2026-11-03** (plan B11, first slice). Rules `core/world3d/leads.ts`; leads `content/leads/` (`statue-north.ts`, `hesma-well.ts`); a map's prop carries one with `"lead"`; the journal `src/spike3d/journal.ts`. The elder became a guard, and the next lead's answers are the miller and any dwarf. Asking is free (no roll, no patience), once per answer. **The first slice, as it was planned:** a lead record in the save, the journal, "Lead added". One curiosity on the Hamlet map (the statue, by the road out), two people who know about it (an elder and the innkeeper), and *ask about it* opened by the lead. Through the frame: a lead is an outcome (`{ lead: 'statue-north' }`) and an opening (`{ lead: 'statue-north' }`).

## Adding leads: one file each, and a lead note (agreed shape, Q42)
Leads are built so the tenth is as easy as the first: **a lead is a data file** (`content/leads/<id>.ts`, found by itself like kinds and verbs). Nothing about a particular lead is ever code. A file says:

| Part | What it says | Example (the statue) |
|---|---|---|
| `title` | What the journal calls it | The statue on the north road |
| `know` | What you know when you get it | A weathered statue of a woman holding a key, by the north road |
| `from` | Ways in: looking at or studying a kind of thing or one placed thing, a good *ask* with someone who knows it, a line overheard at a place, an item read, a creator life event, a quest given | Looking at the `statue` by the north road |
| `cares` | Who might care: anyone here, a kind or facet of person (elders, clergy, guards), one person, a place | Elders; the innkeeper |
| `answers` | What each of them says when asked: lines added to what you know, and maybe a **next lead** or a flag | The old woman: "Saint Hesma. She kept the well." → next lead: *the well under the statue* |
| `opens` | Tries it puts on the table, on people or things, through the frame (verbs and skill hooks as they are) | *Search the statue's base* |
| `ends` | When it's solved, spent or gone cold: a flag, everyone asked, an hour passed | Solved when the door is opened |

**What a lead needs from the engine is small and fixed:** a lead record in the save and the journal. *Gives a lead* is an outcome (`{ lead: id }`, beside `flag`) and *has a lead* is an opening (`{ lead: id }`), so any verb, hook, talk answer or quest can give one or need one. Curiosities to find are kinds of thing (a statue, a cairn, a ruin), placed by hand or scattered by a map rule. A new *way in* (overheard lines, say) is added once and then every lead can use it.

**A lead note** (what you send in, and I make it a file), like the action note:

> **Lead:** the statue on the north road · **You learn it by:** looking at it · **You know:** a woman holding a key, worn by weather · **Who cares:** old people, the innkeeper · **They say:** she's Saint Hesma, who kept the well · **It opens:** search the base · **Next:** a key, and a door it fits · **Ends:** when the door is opened

When a note needs a way in, an opening or an outcome the engine doesn't have yet, that one piece is added first (the pattern check).

## Open points (talk them through)
- **Do failed tries close?** Today some do (out of tries). With openings, a try could stay open but cost more patience.
- **Does a lead run out?** Asking about the mill twice, or once everyone knows.
- **Are leads shared with the hooks on things?** A lead could also open a try on a thing (*search the mill's ashes*). Probably yes: the same opening works for things and people.
