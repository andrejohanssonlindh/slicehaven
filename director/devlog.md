# Devlog

## 2026-10-25 — Session 1: foundations

**Done**
- Created the repo, GitHub Pages deploy (every push to `main` goes live in about a minute).
- Rules engine skeleton (`src/core/`), with tests:
  - seeded RNG, so fights can be saved and replayed
  - hex grid math (distance, neighbours, reachable hexes, pixel ↔ hex)
  - dice: faces, gear modifiers (add/remove/replace face, +N to a kind), and the **spent → rest → lose a die** loop
  - versioned save with export/import code
- **Tech prototype** on the game page: one hero (Legoknekt, 4 dice), a hex map with hidden areas that open when you step on a door, two dummy skeletons. Tap a die to roll it, then act on the face. When all dice are spent you rest and pick one to lose.
- This Director's Room.

**Why this tech**
- **Phaser 4**: mature 2D engine. Handles sprites, tweens, cameras, input and pixel-art scaling, so we don't build that ourselves. Works well on phones.
- **TypeScript**: the rules are going to get complicated (dice modifiers, status effects, monster AI). Types catch mistakes before you ever see them.
- **Vite**: fast, simple builds to static files, which is all GitHub Pages can host.
- Rules live in plain TypeScript, apart from the engine, so they can be tested without a browser and the engine could be swapped later.

**Try it:** open the game, roll Boots to walk to the brown door hex, keep going to the grove, fight the skeletons.

**Next up (proposal)**
1. Your answers to the [questions](questions.md), especially dice per turn and party size.
2. Turn structure + monster AI (monsters act, you take damage, shield blocks).
3. First real pixel art: tiles, hero and skeleton sprites.
4. Overworld map scene with selectable locations.
