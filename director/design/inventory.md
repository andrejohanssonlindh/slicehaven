# Items and inventory (plan B6)

*2026-11-10. The foundation for gear, loot, tools, buying and pocketing. Built on what you decided in Q34 (shaped items in grids, add-ons that are items themselves, tap to place, turn, auto-pack) and on your note of 2026-11-10: **the backpack is a rectangle or square, with add-ons on the side.** First slice built the same day; what's below marked "later" isn't built yet.*

## What it is
- **Cells.** A cell is about a fist (10 cm). A **grid** is a rectangle of cells.
- **Your grids:** two **pockets** (2 × 2 each, pocket-sized things only), and the **pack** on your back (the backpack: 5 wide × 6 tall). The pack has **a side on the left and one on the right**, and each takes one **add-on**.
- **Add-ons are items.** A side pouch lies folded in the pack (2 × 2). *Fit it on a side* and it becomes a 2 × 4 grid beside the pack. You can only take it off when it's empty, and it then goes back into the pack.
- **Shapes.** Every item has a shape: a rectangle (a loaf 2 × 1, a waterskin 2 × 3) or an odd shape drawn in rows (the pan: its head 2 × 2 and a handle along one side). If a kind doesn't give a shape, its size does: pocket 1 × 1, bag 2 × 2. Things carried in the hands (a stool), strapped (weapons) or too heavy never go in a grid.
- **Weight.** Everything on you counts against what you can carry: what you hold, your weapons, the pack and everything in it. The sheet says "You carry 6.2 kg of 13 kg".

## What you start with (built 2026-11-10)
- **Everyone:** the backpack, a purse with your silver (see [money](money.md)), a side pouch, a loaf and a tinderbox.
- **Your equipment packages from the creator, each one bundle in the pack.** The book keeps packages loose on purpose: each holds "a reasonable amount" of the gear for its trade, with examples, not a list. So a package is one thing: *thief's tools* (a small sack of picks, files, wax and a grapnel, 2 × 1, 0.8 kg), *wilderness gear* (a big bag with a small tent, blankets, a lantern, dry food and a kettle, 3 × 4, 5 kg), *medical kit*, *writing kit*, *hunting gear*, *fishing gear*, a *musical instrument* in its case, and so on. Thirteen packages have a bundle, with our own sizes and weights. Their worth follows the book's rule of thumb for replacing a whole package (20, 50 or 100 s), and some shops sell them.
- **Not yet:** the *Animal* package waits for kinds of creature (C3). *Craft tools* are the portable roll of tools; the workshop the book gives you comes later.
- **The default shepherd** carries wilderness gear.
- **If it doesn't all fit,** the side pouch is fitted at the start, and anything still left over is put down at your feet.
- **Later:** what a bundle does. It should help the skills it's for (thief's tools for picking locks, a medical kit for treating wounds), when tools that help skills come.

## How you use it (phone first)
- **Pack** button, bottom left above *You*. The sheet shows the pockets, then the pack with its two side columns ("no add-on" when empty).
- **Tap a thing** to pick it, then **tap a cell** to put its top-left corner there. *Turn* turns it a quarter. *Take out* puts it in your hand, *Put down* lays it on the ground, *Fit on the side* fits an add-on, and *Auto-pack* lays everything out again, biggest first.
- **In the world:** a small thing offers *Put the … in your pack*. It goes where it first fits: small things into the pockets first. When you hold something small, the spot you stand on offers the same.
- **Stealing:** a thing slipped away unseen now goes into your pack if it fits; otherwise it's held out of sight as before. Something of someone else's put in your pack in front of them is **taken**, and answered as such. Your own things (your kit, things given to you) never are.
- Things in your pockets or pack are **out of sight**: nobody recognises them on you. Take them out, and they're carried openly again.

## Where it lives (for the pattern check)
- Rules: `src/core/world3d/inventory.ts` (cells, turning, fits, find a spot, auto-pack, the grids from pockets, pack and add-ons).
- On kinds: `shape`, `bag` (`{ grid: [5, 6], sides: 2 }`), `addon` (`{ grid: [2, 4] }`). Packs and add-ons: `content/things/kinds/packs.ts`; small goods: `goods.ts`. Each has a model so it can lie on the ground.
- What you start with: `content/things/kit.ts` (pockets, the pack, what everyone has), and the package bundles in `content/things/kinds/kits.ts` (`package` on the kind; `packageKinds` in `content/things/gear.ts`).
- Saved on the loose things (`Loose.in`, `worn`, `fitted` in `carry.ts`). The world's part is `engine3d/world/pack.ts`, the sheet is `src/spike3d/packsheet.ts`, and the verbs are `pack` and `pack-held`.
- **A new item:** an entry in `goods.ts` with size, shape, weight and value, plus a model file. **A new pack or add-on:** an entry in `packs.ts`.

## Later (not built)
- **Bundles that help skills** (tools; see above).
- **Weapons in the grid and on straps:** a weapon strap as an add-on, a quiver. Today, weapons you own are carried "on you" outside the grid, as before.
- **Taking off the pack** and putting it down, and containers (a chest) as grids you open.
- **Over capacity → base fatigue**, once fatigue from load comes (the carried-weight rule wasn't found, so we start without it). Until then, nothing over capacity can be picked up.
- **Lifting** something heavy is a Physique roll.
- Pictures of items instead of coloured shapes, when the art style is set.
