import type { BySkill } from './byskill';

/**
 * Crafts (trades). Each makes or mends something (the `craft` effort), and a few also help in
 * another effort, usually a social one through shop talk: bread knowledge to impress an innkeeper,
 * the farrier's eye for a horse, a tailor\'s eye for rank. Narrow on purpose: crafts are seldom
 * useful in social challenges, but sometimes they are.
 */
export const CRAFTS: BySkill = {
  'H:Arkitekt': {
    craft: ['Draw plans for a hall that will stand.', 'Spot the load-bearing wall in a ruin.'],
    analyse: ['Tell how a building was meant to be used.', 'Work out where a hidden room must be.'],
  },
  'H:Avlare': {
    craft: ['Breed a line of hardy hounds.', 'Pick the pair that will give the best foals.'],
    ride: ['Judge a horse\'s temper from its lineage.', 'Choose the mount that suits the rider.'],
  },
  'H:Bagare': {
    craft: ['Bake a loaf that keeps for a week on the road.', 'Make a good crust from poor flour.'],
    impress: ['Bring an innkeeper a fresh loaf and talk crumb.', 'Name the grain by the taste of the bread.'],
  },
  'H:Balsamerare': {
    craft: ['Preserve a body for the long journey home.', 'Mix the resins that keep a corpse from rotting.'],
    heal: ['Tell the cause of death from the body.', 'Know the signs of a person who is truly dead.'],
  },
  'H:Barberare': {
    craft: ['Give a close shave without a nick.', 'Trim a beard to suit the face.'],
    ask: ['Chat to the man in the chair until he talks.', 'Hear the town\'s gossip from every customer.'],
  },
  'H:Biodlare': {
    craft: ['Smoke a hive and take the honey.', 'Move a swarm into a new box.'],
    forage: ['Follow a wild bee back to its tree.', 'Find the honey in a hollow trunk.'],
  },
  'H:Blåsrörsmakare': {
    craft: ['Bore a straight pipe from a reed.', 'Make darts that fly true.'],
    poison: ['Judge how much a dart needs to carry.', 'Coat a dart so it holds the poison.'],
  },
  'H:Bläckmakare': {
    craft: ['Boil oak galls into good black ink.', 'Make ink that does not fade.'],
    deceive: ['Make ink that matches an old letter.', 'Age a page with a stain.'],
  },
  'H:Bokbindare': {
    craft: ['Stitch and bind a book that lasts.', 'Mend a broken spine.'],
    lore: ['Tell the age of a book by its binding.', 'Know what a rare binding says about the owner.'],
  },
  'H:Boskapsskötare': {
    craft: ['Calve a cow in the dead of night.', 'Drive the herd to market without a loss.'],
    comfort: ['Calm a nervous beast with a hand and a hum.', 'Be gentle with a frightened animal.'],
  },
  'H:Brodör': {
    craft: ['Stitch a crest so fine it looks painted.', 'Mend a tear so well the seam vanishes.'],
    lore: ['Read a family\'s story in its stitched banners.', 'Tell a forged tapestry by the thread.'],
  },
  'H:Bryggare': {
    craft: ['Brew an ale the whole village praises.', 'Save a batch that has begun to turn.'],
    impress: ['Bring a cask to the host and tell what makes it good.', 'Talk malt and hops with the innkeeper.'],
  },
  'H:Brännare': {
    craft: ['Run a still and take the clean middle cut.', 'Make a spirit that burns blue.'],
    poison: ['Strengthen a spirit into a medicine or a poison.', 'Taste a spirit and tell what it was made from.'],
  },
  'H:Byggare': {
    craft: ['Raise a wall that is true and plumb.', 'Brace a roof against the storm.'],
    search: ['Spot the patched wall where the door was.', 'Find the hollow behind a new plaster.'],
  },
  'H:Bågtillverkare': {
    craft: ['Shape a bow from seasoned yew.', 'Tiller a bow so it draws evenly.'],
    impress: ['Name the wood and maker of any bow at a glance.', 'Tune the string until it sings.'],
  },
  'H:Båtbyggare': {
    craft: ['Plank a hull that is tight as a drum.', 'Caulk the leak that sank the last trip.'],
    swim: ['Know where a boat will hold and where it will leak.', 'Judge a hull in a glance.'],
  },
  'H:Dockmakare': {
    craft: ['Carve and dress a doll that looks alive.', 'Give a toy a face a child loves.'],
    comfort: ['Give a crying child a doll from your pack.', 'Make a stuffed toy in an evening.'],
  },
  'H:Fiskodlare': {
    craft: ['Stock a pond and keep it clean.', 'Take fish from the pond without spoiling it.'],
    forage: ['Know where the fish gather at dusk.', 'Raise a quick meal from a stream.'],
  },
  'H:Florist': {
    craft: ['Tie a bouquet that keeps for a week.', 'Choose flowers to say what words cannot.'],
    'sweet-talk': ['Give the right flower for the right occasion.', 'Know what each bloom means to the person receiving it.'],
  },
  'H:Fyrverkerimakare': {
    craft: ['Mix a powder that flashes without exploding.', 'Pack a rocket that climbs straight.'],
    distract: ['Set off a bang at the far end of the square.', 'Light a flash that turns every head.'],
  },
  'H:Fågeluppfödare': {
    craft: ['Hand-raise a chick that stays tame.', 'Build a loft the birds come home to.'],
    track: ['Read what a bird\'s behaviour says about the weather.', 'Tell by the flight where something has disturbed them.'],
  },
  'H:Färgare': {
    craft: ['Dye cloth a deep blue that holds.', 'Make a red from madder root.'],
    streetwise: ['Tell from the stains on a hand where someone works.', 'Know which colours only the rich can wear.'],
  },
  'H:Förfalskare': {
    craft: ['Copy a seal in wax.', 'Age a page to match the rest of the book.'],
    deceive: ['Hand over a paper that holds up to a look.', 'Turn a small lie into a document.'],
  },
  'H:Garvare': {
    craft: ['Cure a hide until it is supple.', 'Tan a skin with oak bark.'],
    hide: ['Cover the smell of a cured hide with another.', 'Turn a skin into a cloak the colour of the wood.'],
  },
  'H:Gjutare': {
    craft: ['Pour a bell without a flaw.', 'Make a mould from wax and clay.'],
    analyse: ['Tell from a casting how it was made.', 'See the flaw hidden in a bronze.'],
  },
  'H:Glasblåsare': {
    craft: ['Blow a flask in one breath.', 'Draw a thin stem and pinch it off.'],
    impress: ['Spin a glass bird in front of the children.', 'Make a flask that rings when struck.'],
  },
  'H:Gobelängvävare': {
    craft: ['Weave a scene thread by thread.', 'Mend a worn patch in an old tapestry.'],
    lore: ['Read the story told in a tapestry.', 'Tell which workshop a tapestry came from.'],
  },
  'H:Gravör': {
    craft: ['Cut a fine line in metal.', 'Engrave a name in a ring.'],
    deceive: ['Cut a seal that matches another.', 'Alter the mark on a stolen piece.'],
  },
  'H:Grisodlare': {
    craft: ['Raise a litter through a cold spring.', 'Fatten a pig for the feast.'],
    forage: ['Find truffles with a pig\'s nose.', 'Turn scraps into a meal.'],
  },
  'H:Grovsmed': {
    craft: ['Forge a hinge, a hook and a hasp.', 'Weld a broken axle on the roadside.'],
    impress: ['Talk iron and temper with a soldier.', 'Straighten a bent sword in front of its owner.'],
  },
  'H:Gruvbrytare': {
    craft: ['Shore up a tunnel before the roof comes down.', 'Chip ore out of the face.'],
    travel: ['Find a way through underground passages.', 'Tell which tunnels have bad air.'],
  },
  'H:Guldsmed': {
    craft: ['Hammer gold leaf thin as a breath.', 'Set a stone in a ring.'],
    bribe: ['Name the worth of a trinket to the grain.', 'Pay in gold that is exactly what it says.'],
  },
  'H:Hattmakare': {
    craft: ['Shape a felt hat on the block.', 'Trim a hat with a feather and a band.'],
    etiquette: ['Know which hat belongs to which rank.', 'Tip your hat the way the place expects.'],
  },
  'H:Herde': {
    craft: ['Gather a flock with a whistle and a dog.', 'Shear a sheep without a nick.'],
    survey: ['Count the herd at a glance.', 'Spot the wolf\'s tracks before the sheep do.'],
  },
  'H:Hovslagare': {
    craft: ['Shoe a horse that does not want to be shod.', 'Trim a hoof and set a shoe in an hour.'],
    ride: ['Tell from a horse\'s gait what is wrong with its hoof.', 'Know which horse is lame before it is ridden.'],
  },
  'H:Instrumentmakare': {
    craft: ['Carve and string a lute.', 'Tune a pipe until it is true.'],
    perform: ['Mend an instrument and play a tune on it.', 'Know which instrument suits which player.'],
  },
  'H:Jordbrukare': {
    craft: ['Plough a straight furrow.', 'Read when the soil is ready for seed.'],
    forage: ['Know which weeds are food and which are a pest.', 'Judge good soil by the colour and smell.'],
  },
  'H:Juvelerare': {
    craft: ['Cut a gem to catch the light.', 'Set a stone so it does not fall out.'],
    bribe: ['Value a gem to the coin.', 'Spot a glass stone in a setting.'],
  },
  'H:Kalligraf': {
    craft: ['Write a clean, beautiful hand.', 'Letter a scroll so it looks sacred.'],
    deceive: ['Copy another\'s hand from a single page.', 'Write a note in a stranger\'s style.'],
  },
  'H:Kartograf': {
    craft: ['Draw a map of the valley from a hilltop.', 'Mark the route on a fresh sheet.'],
    travel: ['Read a map and see the way.', 'Tell from a map where a road must be.'],
  },
  'H:Kistmakare': {
    craft: ['Build a coffin quickly and neatly.', 'Fit a lid that no one can open without a tool.'],
    hide: ['Build a false bottom into a box.', 'Make a chest that hides its own seam.'],
  },
  'H:Klensmed': {
    craft: ['Mend a kettle, a lock and a hinge.', 'Beat out a dent in a pot.'],
    streetwise: ['Walk the lanes selling mending and hear the news.', 'Be let into any back yard.'],
  },
  'H:Kock': {
    craft: ['Turn scraps into a good meal.', 'Cook for forty on a single fire.'],
    impress: ['Serve a dish the host remembers for years.', 'Tell the innkeeper how to improve the stew.'],
  },
  'H:Kolare': {
    craft: ['Build and tend a charcoal stack.', 'Judge the burn by the colour of the smoke.'],
    hide: ['Be unnoticed in the forest for weeks.', 'Smell of smoke so you pass as a collier.'],
  },
  'H:Korgflätare': {
    craft: ['Weave a basket from willow.', 'Make a creel that holds water.'],
    forage: ['Make a fish trap from reeds.', 'Weave a carrying basket from green twigs.'],
  },
  'H:Kosmetiker': {
    craft: ['Mix a paint that makes a pale face glow.', 'Hide a scar under a powder.'],
    deceive: ['Change a face with paint and powder.', 'Hide a bruise before the audience.'],
  },
  'H:Krigsmaskinsbyggare': {
    craft: ['Build a ram that can break a gate.', 'Set a catapult\'s arm and tension.'],
    analyse: ['Work out how to break a wall.', 'See which gate a siege engine would break first.'],
  },
  'H:Kroppsmålare': {
    craft: ['Paint a pattern that follows the muscle.', 'Mark a body for a festival.'],
    impress: ['Paint a pattern that draws a crowd.', 'Dress as a figure from a legend.'],
  },
  'H:Krukmakare': {
    craft: ['Throw a pot on the wheel.', 'Fire a kiln without cracking the ware.'],
    lore: ['Tell the age and origin of a shard.', 'Know which region a pot came from.'],
  },
  'H:Kryddmakare': {
    craft: ['Grind and blend a spice for a dish.', 'Mix a blend that keeps for a year.'],
    poison: ['Know which spice masks a taste.', 'Notice a bitter note that does not belong.'],
  },
  'H:Körsnär': {
    craft: ['Dress and sew a fur coat.', 'Mend a pelt without a visible join.'],
    etiquette: ['Know which furs only the nobles may wear.', 'Tell rank from the furs on a cloak.'],
  },
  'H:Lampmakare': {
    craft: ['Shape a lantern that does not gutter.', 'Fit a shutter that blocks all light.'],
    sneak: ['Hood a lantern so it gives no glow.', 'Shield a flame from the wind and from watchers.'],
  },
  'H:Ljusstöpare': {
    craft: ['Dip a taper smooth and even.', 'Pour a candle that burns clean.'],
    streetwise: ['Know who burns the good candles in this town.', 'Tell the wealth of a house by its candles.'],
  },
  'H:Låssmed': {
    craft: ['File a key from the wax print.', 'Fit a lock that is hard to pick.'],
    steal: ['Know exactly how a lock is made, and so how to open it.', 'Spot the weak point in a door lock.'],
  },
  'H:Lädermakare': {
    craft: ['Cut and stitch a belt and a pouch.', 'Make a strap that outlasts the buckle.'],
    hide: ['Sew a hidden pocket into a coat.', 'Stitch a pocket into a belt.'],
  },
  'H:Maskmakare': {
    craft: ['Carve and paint a festival mask.', 'Mould a mask that fits the face.'],
    deceive: ['Wear a mask and be anyone.', 'Make a half-mask that hides a scar.'],
  },
  'H:Mattknytare': {
    craft: ['Knot a rug with a pattern.', 'Repair a worn corner invisibly.'],
    lore: ['Read a rug\'s pattern to find its clan.', 'Tell a handmade rug from a copy.'],
  },
  'H:Mejerist': {
    craft: ['Churn butter and press a cheese.', 'Salt a wheel for the winter.'],
    impress: ['Offer a farmhouse cheese and name its pasture.', 'Talk cheese with the innkeeper.'],
  },
  'H:Mekaniker': {
    craft: ['Build a gear train that runs smoothly.', 'Fix a stuck mill wheel.'],
    escape: ['Free a jammed mechanism.', 'Take apart a trap that has caught you.'],
  },
  'H:Metallurg': {
    craft: ['Smelt ore into a clean ingot.', 'Alloy bronze to the right hardness.'],
    analyse: ['Tell the metal from the sound it makes.', 'See that a "silver" cup is only plated.'],
  },
  'H:Mjölnare': {
    craft: ['Dress the stones and grind the grain.', 'Keep a mill running through the dry spell.'],
    streetwise: ['Hear everything farmers say in the mill.', 'Know who is selling and who is hoarding.'],
  },
  'H:Mosaikläggare': {
    craft: ['Lay a pattern of tiny tiles.', 'Mend a broken floor.'],
    lore: ['Read the story in a mosaic.', 'Tell the age of a floor by the tile.'],
  },
  'H:Murare': {
    craft: ['Lay a wall that stands true.', 'Point the joints against the rain.'],
    search: ['Find the stone that has been moved.', 'Spot new mortar in an old wall.'],
  },
  'H:Myntslagare': {
    craft: ['Strike a coin with a clean face.', 'Test the weight of a handful of coin.'],
    bribe: ['Know what a coin is really worth.', 'Spot a clipped or false coin at a glance.'],
  },
  'H:Målare': {
    craft: ['Paint a likeness that people recognise.', 'Mix a pigment from earth and egg.'],
    impress: ['Sketch the host in a few strokes.', 'Paint a sign for the inn on the spot.'],
  },
  'H:Nätknytare': {
    craft: ['Knot a net with an even mesh.', 'Mend a net in the dark by feel.'],
    forage: ['Cast a net where the fish run.', 'Catch birds in a mist net.'],
  },
  'H:Optiker': {
    craft: ['Grind a lens to focus light.', 'Fit a pair of spectacles.'],
    survey: ['Look through a spyglass and see the far shore.', 'Make out a banner at a mile.'],
  },
  'H:Parfymerare': {
    craft: ['Blend a scent from flowers and oils.', 'Capture a rose in a drop.'],
    'sweet-talk': ['Give a scent that suits the person.', 'Know what a noble likes to smell of.'],
  },
  'H:Pergamentmakare': {
    craft: ['Scrape and stretch a skin into a page.', 'Cut sheets for a book.'],
    deceive: ['Scrape an old page clean and write anew.', 'Tell an old page from a new one.'],
  },
  'H:Perukmakare': {
    craft: ['Knot a wig from real hair.', 'Dress a wig to fit a head.'],
    deceive: ['Disguise yourself with a wig.', 'Hide a bald patch or a shaved head.'],
  },
  'H:Piltillverkare': {
    craft: ['Straighten and fletch a dozen arrows.', 'Tip a shaft so it flies true.'],
    impress: ['Recognise any archer\'s arrow by its fletching.', 'Tell the maker from the feather.'],
  },
  'H:Repslagare': {
    craft: ['Twist a rope from hemp.', 'Splice a line that does not slip.'],
    climb: ['Choose a rope that will hold your weight.', 'Make a knotted line to climb.'],
  },
  'H:Rustmakare': {
    craft: ['Hammer and fit a breastplate.', 'Mend a dent in a helmet.'],
    impress: ['Name the smith of any suit of armour.', 'Tell a soldier what his harness is worth.'],
  },
  'H:Rörsmed': {
    craft: ['Bend and join a lead pipe.', 'Fit a pump that does not leak.'],
    'sneak': ['Know every pipe that runs under a house.', 'Find a route along the old drains.'],
  },
  'H:Sadelmakare': {
    craft: ['Stitch a saddle to fit horse and rider.', 'Mend a girth strap on the road.'],
    ride: ['Set a saddle so that long rides do not hurt.', 'Know which tack is best for which horse.'],
  },
  'H:Saftare': {
    craft: ['Boil berries to a clear syrup.', 'Preserve a harvest in jars.'],
    forage: ['Make a winter store from the woods.', 'Turn wild fruit into rations.'],
  },
  'H:Segelmakare': {
    craft: ['Stitch a sail from heavy cloth.', 'Patch a sail in a gale.'],
    travel: ['Read the wind from the cut of a sail.', 'Make a tent from spare canvas.'],
  },
  'H:Sjudare': {
    craft: ['Boil tallow and ash into soap.', 'Make a lye that cleans without burning.'],
    heal: ['Make a soap that is gentle on a wound.', 'Prepare a lye for cleaning.'],
  },
  'H:Skeppsbyggare': {
    craft: ['Lay the keel of a seagoing ship.', 'Judge timber for a mast.'],
    swim: ['Tell if a ship is sound by walking the deck.', 'Find where a hull will fail first.'],
  },
  'H:Skogshuggare': {
    craft: ['Fell a tree where you want it.', 'Split a log in a few blows.'],
    travel: ['Cut a trail through thick forest.', 'Find the path a woodcutter would have taken.'],
  },
  'H:Skomakare': {
    craft: ['Resole a boot in an hour.', 'Cut a shoe from a pattern.'],
    track: ['Tell from a footprint what kind of shoe left it.', 'Read a person\'s trade from the wear of their boots.'],
  },
  'H:Skrivare': {
    craft: ['Copy a document in a fair hand.', 'Write a letter for someone who cannot.'],
    law: ['Draft a contract that covers all sides.', 'Know the usual phrasing of a deed.'],
  },
  'H:Skräddare': {
    craft: ['Cut and stitch a coat to fit.', 'Alter a hem on the road.'],
    etiquette: ['Judge rank and wealth from the cut of a coat.', 'Dress a person so they pass at court.'],
  },
  'H:Skulptör': {
    craft: ['Carve a face from a block of stone.', 'Cast a figure in clay.'],
    impress: ['Carve a likeness in an evening.', 'Model the host\'s face in wax.'],
  },
  'H:Slaktare': {
    craft: ['Butcher an animal cleanly.', 'Cure meat for the winter.'],
    threaten: ['Handle a cleaver with the ease of habit.', 'Wipe your knife as you speak.'],
  },
  'H:Snickare': {
    craft: ['Plane a board true.', 'Cut a joint that needs no nails.'],
    search: ['Find the hidden compartment in a cabinet.', 'Spot a false back in a piece of furniture.'],
  },
  'H:Snidare': {
    craft: ['Carve a figure from a branch.', 'Whittle a whistle in a minute.'],
    comfort: ['Carve a small toy for a child.', 'Give a worry stone to someone who needs it.'],
  },
  'H:Spegelmakare': {
    craft: ['Silver a sheet of glass.', 'Polish a mirror until it shows true.'],
    distract: ['Flash a mirror to dazzle a watcher.', 'Signal across a valley with a glint.'],
  },
  'H:Spinnare': {
    craft: ['Spin an even thread.', 'Ply wool into yarn.'],
    perform: ['Spin a yarn as you spin wool.', 'Pass the evening with a story and a spindle.'],
  },
  'H:Stenhuggare': {
    craft: ['Split a block along the grain.', 'Dress a stone for an arch.'],
    search: ['Find the join in a stone door.', 'Read a mason\'s marks.'],
  },
  'H:Tandsmed': {
    craft: ['Pull a tooth fast and clean.', 'Make a false tooth from bone.'],
    heal: ['Ease the pain of a rotten tooth.', 'Clean a wound that has gone bad.'],
  },
  'H:Tatuerare': {
    craft: ['Ink a fine line into skin.', 'Cover an old mark with a new design.'],
    streetwise: ['Read a tattoo and tell who it belongs to.', 'Know which marks belong to which gang.'],
  },
  'H:Timmerman': {
    craft: ['Raise a frame with only wood pegs.', 'Hew a beam to the line.'],
    search: ['Read the age of a house from its timbers.', 'Find the rotten beam before it fails.'],
  },
  'H:Tryckare': {
    craft: ['Set type and pull a clean page.', 'Cut a block for a woodcut.'],
    deceive: ['Print a flyer that looks official.', 'Reproduce a notice in an hour.'],
  },
  'H:Trädgårdsmästare': {
    craft: ['Graft a branch onto a stock.', 'Prune a tree for fruit.'],
    forage: ['Tell which plants are food and which are poison.', 'Find a use for the weeds.'],
  },
  'H:Tunnbindare': {
    craft: ['Raise a barrel from staves.', 'Make a cask that does not weep.'],
    hide: ['Hide in an empty barrel.', 'Hide a small item in a false bottom.'],
  },
  'H:Vagnbyggare': {
    craft: ['Fit a wheel with iron tyre.', 'Mend an axle at the roadside.'],
    ride: ['Judge a cart\'s load and balance.', 'Know why a wagon pulls to one side.'],
  },
  'H:Vapensmed': {
    craft: ['Forge a blade and quench it.', 'Temper a sword to bend and not break.'],
    impress: ['Name the smith from the edge of the blade.', 'Hand a soldier his weapon back, truer than before.'],
  },
  'H:Vinjäsare': {
    craft: ['Press the grapes and manage the cask.', 'Save a vintage that has turned.'],
    impress: ['Talk vintage with a nobleman.', 'Tell the year and the vineyard from a sip.'],
  },
  'H:Vävare': {
    craft: ['Warp a loom and weave a bolt.', 'Mend a tear in a weave.'],
    lore: ['Tell the origin of a cloth by its weave.', 'Read a clan\'s plaid.'],
  },
};
