# Director's Room

This is the backstage area for Slicehaven: not part of the game, but where I (Claude) put proposals, questions, sketches and progress for you to review from your phone.

*We are in a design stage and building the engine in small vignettes. Nothing is finished; what you try in the app is testing.*

## Start here
- **[Questions for you](questions.md)**: things I need your call on. Answer in chat whenever.
- **[Devlog](devlog.md)**: what got done, session by session.
- **[Decisions](decisions.md)**: what we've locked in, and why.
- **[Code review 2026-10-29](design/review-2026-10-29.md)**: what in the 3D world will hurt us later, and in what order to fix it.

## Try it
- [The 3D world](https://andrejohanssonlindh.github.io/slicehaven/spike3d/): the live 3D pixel world (`?map=hamlet`, `?map=wilds` for Eastgate and the big map).
- [Character creator](https://andrejohanssonlindh.github.io/slicehaven/chargen/)
- [Skill map](https://andrejohanssonlindh.github.io/slicehaven/skills/): how skills relate (tags, examples, hooks, conflicts, counters, every way a skill can be used).

## Your vision
- [Director's notes 2026-10-25](vision/2026-10-25-director-notes.md): movement, party traits, progression, the shepherd story. Ambitions to build on, not a checklist.

## Design
- [Game design overview](design/game-design.md): where we are, what exists, what's undecided.

**The 3D world**
- [How the world is put together](design/world-structure.md): kinds of thing in a tree, maps as files, the plan. **Start here.**
- [Handover](design/world3d-handover.md): where it stands, the code map, the traps, what's next.
- [Brief: the live 3D pixel world](design/voxel-engine-brief.md): pipeline, shells, sprite people, light, weather, tiers, milestones.
- [M0: the spike](design/world3d-m0.md): the first milestone's choices and numbers.
- [Authoring maps and rooms](design/world3d-authoring.md): maps, houses and rooms as rules, not coordinates.
- [Scale](design/world3d-scale.md): how a map can be kilometres across.

**Rules: hero, skills, people, magic**
- [Character creator](design/character-creator.md): plan, status, handover notes.
- [Creator: next design pass](design/creator-next.md): pre-set characters, event cards, life events as game hooks.
- [Skill map handover](design/skill-map-handover.md): skills, the people library and hooks.
- [Skill web](design/skill-web.md): how skills meet the world.
- [Ways a skill can be used](design/ways-of-use.md)
- [People library](design/people-library.md)
- [Skill hooks: structure review](design/skill-structure-review.md) (2026-10-27)
- [Backlog (ranked)](design/backlog.md): open work in the creator and skills.
- [Magic: filaments](design/magic-filaments.md) and [magic on the map](design/magic-on-map.md)

## World
- [World notes (Eon)](world/eon-notes.md): what we borrow and where we start.

## Archive
The 2D hex engine (the sandbox, the gate scene page, Reedwater, the Art Lab) was removed on 2026-10-29. Its code is kept in git under the tag `2d-archive`.
- [The 2D art and pages, as pictures](archive/2d-art.md)
- Old design pages: [game design (hex days)](archive/game-design-2026-10-26.md), [roadmap](archive/roadmap-2026-10-26.md), [the gate scene](archive/exploration-scenes.md), [Reedwater](archive/village-reedwater.md), [2D art direction](archive/art-direction-2d.md)

## Roles I'm filling
Programmer · game designer · level designer · pixel artist · writer · (later) sound. You're the producer/director: you set direction, I propose and build, you veto.
