# The map maker (plan C5)

*2026-11-11. Agreed with the director (Q51, A, plus notes): a map maker we both use, built before the start village (D3). Phone: place things, markers and text. Computer: most of what Claude can do. Claude uses it too.*

## What it is
A page, `/mapmaker/`, that opens a map file (`src/content/maps/<name>.json`, the same files the game plays) **seen from above as a plan**, and edits it. The plan is drawn from the compiled map, so what you see is what the game builds: the ground (lake, streams, roads, mud), every house's footprint with its door, every tree and thing, where people start, named places, the hero's start.

**Why a plan and not the 3D world:** on a phone, from above, everything is tappable and nothing hides behind a roof; it opens at once; and it reads the same for Claude (below). A **Look in 3D** button opens the 3D world on the map as it is in the maker, to walk it.

## The two kinds of thing on a map
- **Placed by hand** (bright): things, trees and houses at a spot (`props`, `trees`, `houses` with `x, z`). Tap to pick; drag to move; turn; remove.
- **Made by a rule** (faded): a street of houses, scattered trees, torches along a road, a palisade. Tapping one says which rule made it. The rule itself is edited as a whole (later slice: its area drawn as a shape you drag).

Authoring by intent still holds: the rules lay out most of a place, and hand placing is for what has to be just there (the well in the square, the statue by the road).

## Notes: talking about places
A **note** is a pin on the map with text: "the smithy should face the square", "more trees here", "a hidden cellar under this house". It can cover an area (a circle) and says who wrote it (you or Claude) and whether it's done. Notes live **in the map file** (`"notes"`), so they travel with the map, Claude reads them where they stand, answers by writing its own beside them, and ticks them off. The game ignores them.

## Where a map lives while you work
- **The draft**, in the browser: every change is kept at once (and undoable). A map with a draft says so in the list; *Drop the draft* goes back to the file.
- **Getting it to Claude:**
  - On the phone: **Copy for Claude** puts the whole map file on the clipboard; paste it into the chat and Claude saves it as the file. (A smoother way, sending straight to the repository, is Q52.)
  - On the computer, with the dev server running: **Save to file** writes the map file directly.
- **From Claude to you:** Claude edits the file and pushes; the maker opens it from the list (a draft of yours is kept until you drop it).

## How Claude uses it
- Claude **writes and edits the map files** (by rules, intent, and placed things) as today.
- Claude **sees** a map through the same plan: `npm run map:shot -- <name>` renders the maker's plan to a picture (and a list of every note with its spot), so Claude can check a layout and read your notes against the place.
- The editing itself is plain functions in `core/world3d/mapedit.ts` (add, move, turn, remove, note), tested, the same ones the page calls.

## Phone and computer
| | Phone | Computer |
|---|---|---|
| Move about | drag, pinch to zoom | drag, wheel |
| Pick | tap | click |
| Move a thing | drag it once picked | drag |
| Add | **+ Thing** (search the kinds of thing), **+ Note** | the same, and keys: Del removes, R turns, Ctrl+Z undoes |
| Save | in the browser; Copy for Claude | in the browser; Save to file (dev server) |

## Slices
1. ✅ **The plan, picking, moving, turning, removing, adding things and notes, the draft, Look in 3D, Copy / Save to file, Claude's picture** (2026-11-11).
2. Rules as shapes: drag a scatter's area, a street's ends, a palisade's oval; add a rule from a list.
3. Roads, streams, the lake and mud drawn and edited; houses added and turned (by road or at a spot); people and places.
4. Sending from the phone straight to the repository (Q52), if wanted.
