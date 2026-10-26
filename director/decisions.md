# Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-10-25 | Web game on GitHub Pages, repo `slicehaven` | Director's brief; playable from the phone. |
| 2026-10-25 | Dice replace cards; spent dice → rest → lose one die | Core concept from the brief (Gloomhaven exhaustion with Slice & Dice dice). |
| 2026-10-25 | Gear can modify the hero *or* a die (add/remove/buff faces) | Brief: "+1 attack on a die", "D6 → D5". |
| 2026-10-25 | Saves in **localStorage** + manual Save button + export/import code | Brief said cookies; cookies max out around 4 KB and get sent with every request. localStorage has the same "stays on your device" property and room for a whole campaign. The export code is a backup if the browser clears data. |
| 2026-10-25 | Tech: Vite + TypeScript + Phaser 4 | See [devlog](devlog.md) for reasoning. |
| 2026-10-25 | Phone-first portrait layout | Director plays and reviews on the phone. |
| 2026-10-25 | Eon PDFs never committed | Copyrighted; the repo is public. |
| 2026-10-25 | Use Eon/Mundana names directly (non-commercial fan project) | Director's call. Keep names in content files so they're easy to find. |
| 2026-10-25 | Party size variable, max 4 (early 1, later usually 2) | Director's call. |
| 2026-10-25 | Game text in English | Director's call. |
| 2026-10-25 | Story starts with one hero, a shepherd; early village jobs recruit companions | Director's notes, see [vision notes](vision/2026-10-25-director-notes.md). |
| 2026-10-25 | Art direction #1 approved: forest tiles, hex size, red obstacle borders, dice cube → cross → detail | Director: "tiles are near perfect". |
| 2026-10-25 | Reuse tiles with other palettes for other forest types (old-school recolouring) | Director's idea. Palette swap already works for characters (herbalist = recoloured shepherd). |
| 2026-10-25 | Own canvas engine instead of Phaser | Art, lighting and weather are all per-pixel; our own renderer gives full control and saves ~1.3 MB. |
| 2026-10-25 | Weather is a core system (clear/cloudy/rain/storm, day/dusk/night, wind) | Director: ties into Eon's magic, which draws power from the surroundings. |
| 2026-10-25 | Lightning storms are rare, special-occasion weather | Director: it gets chaotic fast. |
| 2026-10-25 | Wind is its own setting: force 0–6 (Eon scale) + direction | Director asked for wind; it drives visuals and pneumotropy. |
| 2026-10-25 | Filaments per hex, −3..+3, from terrain + neighbours + time/weather/wind + indoors | Director's brief, built on Eon's seven-level flow table (which maps exactly to −3..+3). Extremes kept uncommon. |
| 2026-10-25 | The world moves between turns: clouds drift, fire spreads/burns out, max one lightning bolt per turn | Director: makes weather readable and tames lightning. |
| 2026-10-25 | Filament sources radiate up to 2 hexes (falloff + cap per kind); object shadows and clouds count | Director: things should affect their surroundings. |
| 2026-10-25 | Clear day = light +1 (+2 near water) | Director. |
| 2026-10-25 | Bodies stay on the field and radiate necrotropy | Director. |
| 2026-10-25 | Radiation must be felt next to the source (fire +1 adjacent, rock +1 adjacent, friends' life reaches neighbours) | Director: weak radiation "won't be usable". |
| 2026-10-25 | The game mixes turn-based and free-flowing time | Director: e.g. continuously drifting clouds suit free-flowing parts. |
| 2026-10-25 | Filaments are a hidden layer of bonuses; nature & magic are "good enough" for now | Director. |
| 2026-10-25 | Engine sandbox approved as the base to build on | Director: "this is what I envisioned". |
| 2026-10-25 | When real game work starts, begin with the first missions and use them to work out the mechanics | Director's plan. The director has changes to the earlier ideas coming (basics stay). |
| 2026-10-26 | Character creator: living standard removed | Director: it won't be used. Silver comes from archetypes and events only. |
| 2026-10-26 | Character creator: archetype and environment are separate steps | Director: the archetype step held too many decisions that weren't about the archetype. |
| 2026-10-26 | No "book" references or step numbering in the creator's UI | Director's review. |
| 2026-10-26 | Money is **silver** | Director (Q16). Matches the rules and the character creator. |
| 2026-10-26 | "Useful here" skill marks are a **Hints** setting; the standard game will likely hide them | Director (Q14): both are useful. Hidden by default later; searching nearby gives in-world hints instead. |
| 2026-10-26 | Skill lists grouped by skill group in fold-outs; expertise, marks, crafts, abilities last | Director (Q14). |
| 2026-10-26 | One approach per try in social conflicts, each approach with several reasonable skills | Director (Q15): simplicity, but an approach can still mix e.g. Argue and Charm. |
| 2026-10-26 | Scenes aren't linear: finishing one route must not close the others | Director: e.g. after bribing your way in you can still sleep at the fire. Write conditions on what *you've done*, not on which route is "the" one. |
| 2026-10-26 | Almost everything is clickable (flowers, ground…), with Use a skill on all of it; most attempts just do nothing | Director. Not needed in the gate scene; the direction for scenes from now on. |
| 2026-10-26 | **Use a skill where you stand**, no need to tap a thing: it acts on what's next to you; Search looks around and describes what's interesting nearby | Director. Built in the gate scene. |
