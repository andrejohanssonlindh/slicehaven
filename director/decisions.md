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
| 2026-10-25 | Engine sandbox approved as the base to build on | Director: "this is what I envisioned". |
| 2026-10-25 | When real game work starts, begin with the first missions and use them to work out the mechanics | Director's plan. The director has changes to the earlier ideas coming (basics stay). |
