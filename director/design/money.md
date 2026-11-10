# Money and trade (plan B6)

*2026-11-10. The second half of B6 after [pockets and the pack](inventory.md). First slice built the same day. The figures are first takes, to tune by playing.*

## What it is
- **Silver.** All money and prices are counted in **silver (s)**, as in the character creator and the ruleset's price list. Each realm has its own coins, worth so much silver (a daler is a silver, a styver a sixth of one). Later, the map's culture can name the local coins; for now everything says "s".
- **The purse.** Your silver is coins in a **purse**, a real thing in your first pocket. Drop it, sell your pack with it inside, or have it stolen (later), and the silver goes with it. With two purses you pay out of both.
- **Starting silver:** what the creator gave your character, minus what you bought there. The default shepherd has 8 s.
- **Prices:** a kind's worth is its price in silver. Where the ruleset's price list has the thing we use its price (a backpack 15 s, an iron pan 20 s, flint and steel 3 s, a waterskin 2 s, a purse 1 s, a belt pouch 1.5 s for the side pouch). Where it doesn't, the price is ours (a loaf 0.2 s).

## Shops
- **A shop's room kind says what it sells.** The people who live there sell it during its open hours (the shop's hours, 8–19; the inn's, 6–24). They buy the same kinds back from you at **half** price, but never something that is theirs already.
- **What sells what now:** the inn sells loaves and waterskins (and rooms). The bakery sells loaves, the herbalist herbs, and the general store packs, side pouches, waterskins, pans, tinderboxes, purses and baskets. The smithy sells a dagger, hand axe, short sword, arming sword, buckler and pan. The fishmonger and the weaver have nothing yet (no fish or cloth as things).
- **Hamlet got its shopkeepers:** a storekeeper (Businessperson) in the store, a miller who bakes in the bakery, and a dwarf smith in the smithy. Each goes about their shop in open hours and is home after. The herbalist's and fishmonger's houses already had people living in them.

## In a talk
- **See what … sells…** lists their wares at their price for you. **Sell something to …** lists what of yours they'd take. You can buy or sell several things in a row; the list stays open.
- **Haggle with … over prices** is one Trade roll a day per seller (other dealing skills work too). It's easier if they like you. Done well: 10 % off, plus 10 % more for each advantage, up to 30 %, for the rest of the day (and their buying prices go up). Done badly: 10 % more that day.
- **How they feel about you moves prices:** 5 % off for each step they like you (up to 15 %), 15 % more for each step they don't.
- **A bought thing** goes into the pack where it first fits. A weapon or shield is carried on you, anything else in your hand. With no room for it, you can't buy it.
- **A room at the inn costs 1 s a night** (our own figure: the book only prices rooms by the month, a furnished room 10 s). Without the silver, the keeper says what it costs.

## Where it lives (for the pattern check)
- Rules: `src/core/world3d/trade.ts` (prices, haggling, paying from purses); the talk offers are in `core/world3d/talk.ts` (`TradeCase`, `tradeAsks`, `BUY`/`SELL`/`HAGGLE`).
- On kinds: `sells` (a shop's room kind; the lists are in `content/things/kinds/rooms.ts`), `purse`, and `value` as the price in silver. Purse and goods are in `kinds/goods.ts`.
- Saved: `Loose.coins` on a purse, and the day's haggle in the talk memory. The world side is in `engine3d/world/pack.ts` (`money`, `pay`, `receive`, `buy`, `sell`) and `talking.ts` (`tradeOf`).
- **A new shop:** a `sells` line for its room kind. **A new ware:** an entry in `goods.ts` with a price.

## Later (not built)
- **Local coin names** from the map's culture, with the exchange into silver.
- **Sellers' own purses and stock**, so they can run out or be unable to buy.
- **Prices by place** (dearer in a city, cheap where a thing is made), and by your status.
- **Stealing a purse** (pickpocketing), and paying for other services (a meal, a healer, a ferry).
- **The creator's equipment packages as kits.**
