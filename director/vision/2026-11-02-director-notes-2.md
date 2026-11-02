# Director's notes, 2026-11-02 (second set: inventory, B3, found maps, vision)

*Original text kept verbatim below, then an English digest. These are ambitions to build on, not a checklist. Where each one went: [the plan](../todo.md), and the sketch in [actions](../design/actions.md).*

## Original

> #Inventory
> I think id like this to have some inventory management. Items are x*y boxes and or have different shapes, you have pockets, a bag, perhaps an addon bag to that, a strap that makes it possible to strap on a weapon etc. Addon baggs and straps are items in them selves that you can build on your bag.
>
> Besides this weight is an issue - but there are rules for this that we can follow, that add "grund utmattning"
>
> #B3
> On B3. I think we underestimate how large this is. Perhaps the initial run should create the frame for how it is done but it will not be able to do all things, because this ties in to skills, items etc.
>
> e.g. imagine interacting with a furnace. You first would need the permissio of the smith (e.g. some type of social interaction), then you could potentially smith things assuming you have the skills and the items and toole (perhaps you can borrow from the smith?). e.g. some of theese will take some time to implement.
>
> That is - interactions can be complex. Are you allowed to use the item? If not, what happends if you do regardless? What if you are allowed, what CAN Be done with it, what skills can be used? Depending on skill what can then be done? What would that require in skill checks etc?
>
> There are ofcourse other simpler tests, say you are outside city bounds and try to make a fire. Simple. A quick roll on the adequate skill and push the time forward 10 mins.
>
> Another one is stair. One can sit in a stair. Steal the stair. Use it as a weapond. Stealing it brings about another interesting parameter. "Large" enough objects shouldnt be stashable in an inventory. To take those you'd have to carry them.
>
> Interacting with people is a can of worms aswell. As stated above. The whole thing needs to be made as a skeleton system that we can build on. Likely we will build like 10-20% of it initially then ill add stuff and send it in to a prompt and we will expand it. IF that is a smart thing
>
> #Other:
> Id like maps to be a thing one can find, they *COULD* on easy dificulty lead to an unlockage in the world map but most likely id like them to be disconected from the main map as per se, they might show mountains, an x, a road etc. It is the players objective to interpret this. Kingdom Come deliverance did something like this and i liked it alot
>
> Vision, pure rule wise it should be a roll affecting perhaps cone width and length of sight. This should be rolled every now and then. Entering new zones. Every 6h. something like that. At key instances.
>
> Smoke over houses are visible when in houses.
> Torches are visible on the outside of houses.

## Digest
- **Inventory as a puzzle of space.** Items take a shape (x × y, or odd shapes). You have pockets and a bag; add-ons (a side bag, a weapon strap) are items you fit onto the bag. Weight matters too, through the ruleset's encumbrance, which raises base fatigue. → plan B6.
- **B3 is bigger than one step.** Build the frame first, knowing it will do only part of what's wanted, because actions tie into skills, items and people. The questions any action asks: *are you allowed? what if you do it anyway? what can be done with it, with which skills, and what does each need?* Simple ones exist too (a fire outside town: one roll, ten minutes pass). A stair can be sat on, stolen, swung. Things too large for a bag must be carried in the hands. Talking to people is its own large area. Build perhaps 10–20 % first, then grow it by sending in notes. → B3 split into B3a–B3d; [actions sketch](../design/actions.md).
- **Maps you find**, as in Kingdom Come: a drawing (mountains, a road, an X) that the player has to interpret against the world; not tied to the world map, except perhaps on easy, where it may mark it. → plan D4.
- **Sight is rolled now and then**: an Alertness roll at key moments (a new area, every six hours) sets how far and wide the cone reaches until the next roll. → plan B5.
- **Two visual faults:** chimney smoke shows while you are inside a house; torches on the outside walls show from inside. → plan "Small fixes".
