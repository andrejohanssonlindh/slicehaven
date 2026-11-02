# Director's notes, 2026-11-02 (weekend notes)

*Original text kept verbatim below, then an English digest. These are ambitions to build on, not a checklist. Where each one went: [the plan](../todo.md).*

## Original

> MAP STUFF
> Just nu har alla hus skorsten, vilket är rimligt, men i ex wilds har inte alla öppen spis och därmed ryker det inte hos alla. Bra att det inte ryker hos alla men tror det mer bör ha o göra med annat. Typ att elden är igång. Bra sak att börja med "interact" att starta en brasa. Kanske något npc skall göra med vid en viss tidpunkt.
>
> Just nu är husen placerade längs en väg, men vi bör även ha regler för gårdar där det lär vara ett antal mindre hus. På tal om detta behöver vi även grödor som växer. Vete, något markväxande osv.
>
> Does the current map generator handle hand placed maps? We could make a map maker tool..
>
> # People redesign:
> We need to redesign people. super simple polygon with shells over. first shell hue of clothes, second  with overlap to cause pixelation - especially over limbs.
>
> Riding horses, NPC's rising horses
>
> riding carriage.
>
> Do NPC's have sight cone? - they will have to have that for sneak etc.
>
> # Skills and interacting with the world
>
> # Combat:
> När combat implementeras, planera för visuella skador som gör att man kan förstå på vilket vis fiender och en själv är skadade så långt det går.
>
> # Magic:
> Requires combat likely.
>
> # First village:
> Jag tror att staden vi skall börja bygga sen som ligger vid en sjö så bör kartan vara rätt stor. Den kan inkludera byn innanför palisad, lite hus utanför och gårdar en liten bit ifrån, en del gräsmark (med mer högväxande gräs) med padockar där djur går och betar utanför.
>
> # Dice and doing rolls..
> We want to have two + ways to do rolls. Currently there are perhaps two different implementations and I wish to have one overarching.
>
> So currently the character creation has one, and roll for skills in the gate example has one.
>
> I'd like there to be I think a few levels.
> 1. Most immersive. You see the Dice, as if there was a piece of glass on top of the game you roll them. They show the results and the combined result. In the case of OB, sixes split in to two dice.
> 2. Milder. Icons of dice just spin and you get the result.
> 3. You just get the result.
>
> Note that the dice, we want to be able to skin those later. Perhaps that's s reward you can find/get.
>
> # Overworld:
> Overworld like Fallout 2.
> Vissible how you travvle, horse, carriage, walking.
>
> # Quests
> Main quests
> Side quests
> Perhaps a third level here to sort out simpler side quests?
>
> If game dificuly easy - give quest markers.

Added in chat the same day:

> I have an idea that we should be able to pan around and look from different angles, this would solve so much of the map design in q20. Possible just two arrows to pan right/left.

> My ambition is still to work on functionality. When enough is done we will look at creating the first real village where we will test out stuff.

## Digest
- **Chimney smoke** should come from a fire actually burning, not from whether the house has a hearth. Lighting a fire is a good first "interact"; an NPC might light it at a set hour.
- **Farmsteads:** a map rule for farms (a few small buildings), not only houses along a road. **Crops** that grow: wheat, ground crops.
- **Hand-placed maps** and maybe a **map maker tool**.
- **People redesign:** a very simple polygon body with shells over it: the first shell gives the clothes their colour, the second overlaps to pixelate the edges, especially on the limbs.
- **Riding:** the hero and NPCs on horses; riding in a carriage.
- **NPC sight cones**, needed for sneaking.
- **Combat:** plan for visible injuries from the start, so you can see how you and your enemies are hurt.
- **Magic** probably needs combat first.
- **The first village:** by a lake, on a fairly large map: the village inside a palisade, some houses outside it, farms a little way off, grassland with taller grass and paddocks where animals graze.
- **One roll system** for the creator and for skills, shown at three levels: dice rolled on a pane of glass over the game (sixes splitting into two in open rolls), spinning dice icons, or just the result. Dice can be skinned later (maybe a reward).
- **Overworld** like Fallout 2, showing how you travel: walking, horse, carriage.
- **Quests:** main, side, maybe a third tier for small errands. Quest markers on the easy difficulty.
- **Turning the view:** pan round to see from other angles, maybe just two arrows (left/right). It would solve much of the map design trouble in Q20.
- **Direction:** keep working on functionality; the first real village comes when enough is in place, and is where things get tested.
