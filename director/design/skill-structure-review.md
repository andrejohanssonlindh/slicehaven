# Skill hooks: structure review

*2026-10-27. A check on the **shape** of the skill tags, people library and hooks built in sessions 15–17, not on how much is done. The question: will it hold when we add many more efforts, people and scenes? Handover: [skill-map-handover.md](skill-map-handover.md).*

## Verdict
**The core is sound and worth keeping.** Five seams will cost more the more content we write, so fix them before the next big content pass (sweet-talk, comfort, deceive, sneak…). All five are a session or less, and the content survives them.

## What is good (keep)
- **Rules in `core/`, data in `content/`.** `core/skillweb.ts` and `core/people.ts` are small and pure. The hooks, tags, facets and leanings are plain tables.
- **Library hooks become ordinary checks** (`expandScene`). The scene engine, hints and "use a skill here" never needed to know the library exists, and saves only hold flags.
- **Most specific wins, one result per intention.** Easy to reason about, and a scene's own check always wins over the library.
- **Leanings are one-line rows with a reason**, capped at ±3, and the reason shows in the roll log. Easy to balance later.
- **Tests check the references**: every hook names real skills, kinds and facets, every leaning names a real effort, every skill has tags and examples. This is what makes it safe to let a cheaper model fill in content.
- **Hidden reads** (true text or its plausible twin) and **"nothing out of place"** as the safe default. These are good design rules, written down.

## The five seams

### 1. Two trees for "who someone is"
A person's type lives in two places: the **kind tree** (`human → rural → guard`, `outcast`) and the **facet tree** (`martial → job-guard`, `drunk`, `on-duty`). Peoples are in **both**. A kind always beats a facet, so a guard who is drunk gets the *guard's* threaten reply, never a *drunk* one, and authors have to guess where a new variant belongs.
**Fix:** kinds say what a thing *is* (humanoid, human, elf, animal, door, water). Everything social (calling, outcast, rural, on duty, drunk) is a facet. Move `rural`, `guard` and `outcast` into facets, and the guard's patience into a facet default.

### 2. Intentions and tags are two vocabularies
Hooks have an `intention`, skills have a `tag`, and leanings key on the tag. They mostly match, but not always: `intimidate` ≠ `threaten` (there's a shim, `effortOf`), the `bribe` tag is labelled "Barter", and `pick`, `force`, `calm`, `study`, `size-up` are intentions with no tag. So no leaning can ever touch picking a lock or calming an animal, and the Skill map can't show them.
**Fix:** one vocabulary. Every intention is a tag in `TAG_INFO` (add pick, force, tame…, rename intimidate → threaten, drop the shim), plus a test that every hook's intention is a tag.

### 3. Hooks hand-pick their skills
Tags are meant to be the single source for "which skills fit which effort". But the thing hooks use hand-written lists (`FORCE`, `PICK`, `TAME`, `STRUCTURE_LORE`…), and the outcast's `ask` hook uses the streetwise skills. When someone retags a skill, those hooks don't follow, and the Skill map says something different from what the game does.
**Fix:** a hook's skills default to "every skill with this intention's tag" (`skillsWith(intention)`). A hook may add or narrow with explicit `also: [...]` / `only: [...]`, so the exceptions are visible.

### 4. Files by when they were written, not by effort
Hooks are spread over `social.ts`, `outcomes.ts` and `outcomes-talk.ts` (plus `index.ts` and `things.ts`). The `social`/`say` helpers are defined three times, two of them differently. The order hooks show to the player comes from the order the files are spread into `LIBRARY`. Six more social efforts in this layout will be hard to find your way in.
**Fix:** `content/skillweb/hooks/<effort>.ts`: the general hook and all its variants together (`threaten.ts`, `ask.ts`, `climb.ts`…), one shared `helpers.ts`, and an explicit list of the order intentions are shown in.

### 5. Text that can't be translated yet
Every hook text and leaning reason is a plain English string. That's agreed for now (decision Q10), but there are already hundreds of them. If hook ids stay stable, keys can be made automatically later (`hook.<id>.success.0`). Leanings have **no ids** (they are keyed by position), so translations would break whenever a row is added.
**Fix (small, now):** decide the key scheme and give leanings ids. No language file yet.

## Smaller notes
- Which hook wins is a number (kind ×2, tag +1, facet just under 2). It works, but the "facet under 2" depends on how deep the facet tree is. A test should pin that.
- Conflicts and single rolls read the people library differently (skill-specific leanings are skipped in conflicts). The handover already lists it; keep it in mind when the skill is chosen round by round.

## Suggested order
1, 2 and 3 together (one session: they touch the same lines), then 4 (mechanical, half a session), then 5 (small). After that the next content pass ([handover §6](skill-map-handover.md)) can proceed as planned.
