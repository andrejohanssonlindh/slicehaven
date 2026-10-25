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
