# Phase 1 ID sheet

Every Phase 1 task uses these ids exactly. Ids are kebab-case. Each item's `spriteKey` equals its id.

## Chains and items

Items are listed tier 1 first. `sellValue` is in coins.

| Chain id       | Name         | Kind       | Color     | completionGems |
| -------------- | ------------ | ---------- | --------- | -------------- |
| `flour`        | Flour        | ingredient | `#e8c07d` | 8              |
| `dairy`        | Dairy        | ingredient | `#a8d8f0` | 7              |
| `egg`          | Eggs         | ingredient | `#f7d774` | 6              |
| `sugar`        | Sugar        | ingredient | `#f27ba0` | 7              |
| `fruit`        | Fruit        | ingredient | `#e05a5a` | 6              |
| `cookie`       | Cookies      | baked      | `#b07a45` | 4              |
| `croissant`    | Croissants   | baked      | `#e0a458` | 3              |
| `cupcake`      | Cupcakes     | baked      | `#f5a3c0` | 4              |
| `flour-mill`   | Flour Mill   | generator  | `#9c5b2e` | 0              |
| `dairy-fridge` | Dairy Fridge | generator  | `#9ed9c3` | 0              |
| `hen-coop`     | Hen Coop     | generator  | `#d9a05c` | 0              |
| `sugar-tin`    | Sugar Tin    | generator  | `#c9557c` | 0              |
| `energy-jar`   | Energy Jar   | bonus      | `#7fc8f8` | 0              |
| `coin-pouch`   | Coin Pouch   | bonus      | `#f2c94c` | 0              |
| `golden-whisk` | Golden Whisk | wildcard   | `#ffd700` | 0              |

**Ingredient chains.** `sellValue` doubles per tier from 1: tier 1 = 1, tier 2 = 2, tier 3 = 4, tier 4 = 8, tier 5 = 16, tier 6 = 32, tier 7 = 64, tier 8 = 128.

| Chain   | Items (id · name), tier 1 → top                                                                                                                                                                                               |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flour` | `wheat-stalk` Wheat stalk · `wheat-bundle` Wheat bundle · `flour-scoop` Flour scoop · `flour-bag` Flour bag · `flour-sack` Flour sack · `dough-ball` Dough ball · `bread-loaf` Bread loaf · `sourdough-boule` Sourdough boule |
| `dairy` | `milk-splash` Milk splash · `milk-bottle` Milk bottle · `cream-jug` Cream jug · `butter-pat` Butter pat · `butter-block` Butter block · `cheese-wedge` Cheese wedge · `cheese-wheel` Cheese wheel                             |
| `egg`   | `egg` Egg · `egg-pair` Egg pair · `egg-carton` Egg carton · `whisked-eggs` Whisked eggs · `custard-cup` Custard cup · `creme-brulee` Crème brûlée                                                                             |
| `sugar` | `sugar-cube` Sugar cube · `sugar-bowl` Sugar bowl · `syrup-bottle` Syrup bottle · `caramel` Caramel · `cocoa-bean` Cocoa bean · `chocolate-bar` Chocolate bar · `truffle-box` Truffle box                                     |
| `fruit` | `berry` Berry · `berry-bunch` Berry bunch · `apple` Apple · `apple-basket` Apple basket · `jam-jar` Jam jar · `fruit-tart-filling` Fruit tart filling                                                                         |

**Baked chains.** Tier 1 is worth 2 × the sell value of its recipe inputs, then doubles per tier.

| Chain       | Items (id · name · sellValue), tier 1 → top                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| `cookie`    | `cookie` Cookie · 22 → `cookie-stack` Cookie stack · 44 → `cookie-tin` Cookie tin · 88 → `gift-hamper` Gift hamper · 176  |
| `croissant` | `croissant` Croissant · 96 → `pain-au-chocolat` Pain au chocolat · 192 → `pastry-platter` Pastry platter · 384            |
| `cupcake`   | `cupcake` Cupcake · 28 → `cake-slice` Cake slice · 56 → `layer-cake` Layer cake · 112 → `wedding-cake` Wedding cake · 224 |

**Generator, bonus, and wildcard chains.** All have `sellValue` 0.

| Chain          | Items (id · name), tier 1 → top                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `flour-mill`   | `flour-mill-1` Flour Mill · `flour-mill-2` Flour Mill II · `flour-mill-3` Flour Mill III             |
| `dairy-fridge` | `dairy-fridge-1` Dairy Fridge · `dairy-fridge-2` Dairy Fridge II · `dairy-fridge-3` Dairy Fridge III |
| `hen-coop`     | `hen-coop-1` Hen Coop · `hen-coop-2` Hen Coop II · `hen-coop-3` Hen Coop III                         |
| `sugar-tin`    | `sugar-tin-1` Sugar Tin · `sugar-tin-2` Sugar Tin II · `sugar-tin-3` Sugar Tin III                   |
| `energy-jar`   | `energy-jar` Energy jar (tier 1 only)                                                                |
| `coin-pouch`   | `coin-pouch` Coin pouch (tier 1 only)                                                                |
| `golden-whisk` | `golden-whisk` Golden Whisk (tier 1 only)                                                            |

**Other item fields.** `note` is `null` for every item. `collectReward` is `{ "energy": 20, "coins": 0 }` for `energy-jar`, `{ "energy": 0, "coins": 25 }` for `coin-pouch`, and `null` for every other item.

## Recipes

| Recipe id        | Name      | Inputs                               | Output      | bakeSec |
| ---------------- | --------- | ------------------------------------ | ----------- | ------- |
| `bake-cookie`    | Cookie    | `flour-bag`, `sugar-bowl`, `egg`     | `cookie`    | 60      |
| `bake-croissant` | Croissant | `dough-ball`, `butter-block`         | `croissant` | 300     |
| `bake-cupcake`   | Cupcake   | `flour-bag`, `egg-pair`, `cream-jug` | `cupcake`   | 900     |

## Ovens

| Oven id        | Name         | Tier | Slots | bakeTimeMultiplier |
| -------------- | ------------ | ---- | ----- | ------------------ |
| `toaster-oven` | Toaster Oven | 1    | 1     | 1.0                |
| `brick-oven`   | Brick Oven   | 2    | 2     | 0.8                |
| `deck-oven`    | Deck Oven    | 3    | 3     | 0.64               |

## Chapters and customers

The only chapter id is `chapter1`. There are no customers until T3.5.
