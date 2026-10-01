/**
 * Rise & Shine Bakery — core type contracts (task T1.1).
 *
 * FROZEN once approved. Handed-off tasks must not edit this file; if a
 * contract looks wrong, stop and describe the change needed instead.
 *
 * Approved changes (T-O1): `rushCooldown` and `cooldownRushed`, for rushing a
 * generator's cooldown with gems (T6.5, Scott, Sep 30).
 *
 * Conventions every core function follows:
 * - Core functions are pure: they never mutate their inputs and return new
 *   objects. No DOM, rendering, storage, or Date.now() calls in src/core.
 * - Static game data arrives as the first parameter, `data: GameData`.
 * - Time arrives as `now: Timestamp`; randomness arrives as `rng: Rng`.
 * - A player action that breaks a game rule returns `{ ok: false, reason }`.
 *   A programming error (unknown id, impossible state) throws.
 * - Durations in data files are seconds (`...Sec`); timestamps in state are
 *   milliseconds since the Unix epoch.
 */

// ─── Identifiers and primitives ─────────────────────────────────────────────

export type ItemId = string;
export type ChainId = string;
export type RecipeId = string;
export type OvenId = string;
export type CustomerId = string;
export type ChapterId = string;
export type TaskId = string;
export type SceneId = string;
export type OrderId = number;

/** Milliseconds since the Unix epoch, as from Date.now(). */
export type Timestamp = number;

/** Board position, row-major: index = row * board.cols + col. */
export type CellIndex = number;

/** Seeded random source (T1.9). */
export interface Rng {
  /** A float in [0, 1). */
  next(): number;
  /** Internal state to store in GameState.rngState so the sequence resumes after a save. */
  getState(): number;
}

// ─── Static data: items and chains (items.json) ─────────────────────────────

/**
 * How a chain's items behave.
 * - ingredient, baked: merge up the chain; customers order them.
 * - generator: merge up the chain; tapping spawns items (see GeneratorDef).
 * - bonus: tapping collects `Item.collectReward` and removes the item.
 * - wildcard: the Golden Whisk; merging it into an ingredient or baked item
 *   up to `Economy.goldenWhiskMaxTier` turns the whisk into a copy of that item.
 */
export type ChainKind =
  'ingredient' | 'baked' | 'generator' | 'bonus' | 'wildcard';

export interface Chain {
  readonly id: ChainId;
  readonly name: string;
  readonly kind: ChainKind;
  /** Hex color for placeholder art and the Recipe Book tab, e.g. "#f7d774". */
  readonly color: string;
  /** Gems granted once, when every item in the chain is discovered. */
  readonly completionGems: number;
}

export interface Item {
  readonly id: ItemId;
  readonly name: string;
  readonly chainId: ChainId;
  /** 1-based. Tiers within a chain are contiguous from 1. */
  readonly tier: number;
  readonly spriteKey: string;
  /** Coins from the Sell bin. 0 means the item cannot be sold. */
  readonly sellValue: number;
  /** Grandma's Recipe Book note; null until written. */
  readonly note: string | null;
  /** Bonus items only: what tapping the item grants. */
  readonly collectReward: CollectReward | null;
}

export interface CollectReward {
  readonly energy: number;
  readonly coins: number;
}

export interface ItemsFile {
  readonly chains: readonly Chain[];
  readonly items: readonly Item[];
}

// ─── Static data: generators (generators.json) ──────────────────────────────

/** One row of a weighted table. Weights in a table sum to 100. */
export interface WeightedEntry {
  readonly itemId: ItemId;
  readonly weight: number;
}

/** Tap behavior for one generator item (an item whose chain kind is "generator"). */
export interface GeneratorDef {
  /** The generator item this row describes, e.g. "flour-mill-2". */
  readonly itemId: ItemId;
  readonly spawnTable: readonly WeightedEntry[];
  /** Taps available before a cooldown. */
  readonly charges: number;
  readonly cooldownSec: number;
}

/** Rolled on every generator tap: chancePercent of taps spawn from `table` instead. */
export interface RareDropTable {
  readonly chancePercent: number;
  readonly table: readonly WeightedEntry[];
}

export interface GeneratorsFile {
  readonly generators: readonly GeneratorDef[];
  readonly rareDrops: RareDropTable;
}

// ─── Static data: recipes and ovens (recipes.json, ovens.json) ──────────────

export interface Recipe {
  readonly id: RecipeId;
  readonly name: string;
  /** Items consumed; repeats mean more than one of that item. */
  readonly inputs: readonly ItemId[];
  /** The tier 1 item of a baked chain. */
  readonly output: ItemId;
  /** Bake time in a tier 1 oven, before the oven's multiplier. */
  readonly bakeSec: number;
}

export interface OvenDef {
  readonly id: OvenId;
  readonly name: string;
  /** 1-based. Merging two ovens of tier n makes the oven of tier n + 1. */
  readonly tier: number;
  readonly slots: number;
  /** Bake time = recipe.bakeSec × this. */
  readonly bakeTimeMultiplier: number;
  readonly spriteKey: string;
}

export interface RecipesFile {
  readonly recipes: readonly Recipe[];
}

export interface OvensFile {
  readonly ovens: readonly OvenDef[];
}

// ─── Static data: customers (customers.json) ────────────────────────────────

/** Regulars are named townsfolk unlocked by renovation; walk-ins are an always-available pool. */
export type CustomerKind = 'regular' | 'walkIn';

export interface Customer {
  readonly id: CustomerId;
  readonly name: string;
  readonly kind: CustomerKind;
  readonly portraitKey: string;
  /** Items this customer asks for more often. */
  readonly favoriteItems: readonly ItemId[];
}

export interface CustomersFile {
  readonly customers: readonly Customer[];
}

// ─── Static data: chapters (chapter1.json) ──────────────────────────────────

export type Unlock =
  /** Places a generator item: nearest empty cell to the board center, else the Pantry. */
  | { readonly kind: 'generator'; readonly itemId: ItemId }
  /** Adds an oven to the Kitchen. */
  | { readonly kind: 'oven'; readonly ovenId: OvenId }
  /** A regular starts placing orders. */
  | { readonly kind: 'customer'; readonly customerId: CustomerId };

export interface RenovationTask {
  readonly id: TaskId;
  readonly name: string;
  readonly starCost: number;
  /** Tappable spot in the location view, as fractions (0–1) of the scene's width and height. */
  readonly spot: { readonly x: number; readonly y: number };
  readonly prerequisites: readonly TaskId[];
  readonly unlocks: readonly Unlock[];
  /**
   * Items orders favor while this is the next task: the first incomplete task,
   * in chapter order, whose prerequisites are complete.
   */
  readonly featuredItems: readonly ItemId[];
  readonly beforeSpriteKey: string;
  readonly afterSpriteKey: string;
  /** Dialogue scene played when the task completes. */
  readonly sceneId: SceneId | null;
}

export interface Chapter {
  readonly id: ChapterId;
  readonly name: string;
  readonly sceneKey: string;
  /** Dialogue scene played when the chapter starts. */
  readonly introSceneId: SceneId | null;
  readonly tasks: readonly RenovationTask[];
}

// ─── Static data: economy (economy.json) ────────────────────────────────────

export interface LevelDef {
  readonly level: number;
  /** Total XP needed to reach this level. Level 1 is 0. */
  readonly xpTotal: number;
  /** Gems granted on reaching this level. */
  readonly gems: number;
}

export interface OrderKindRules {
  readonly minItems: number;
  readonly maxItems: number;
  /** Highest item tier requested; orders also never ask for undiscovered items. */
  readonly maxTier: number;
  /** Stars paid, indexed by item count - 1. Length equals maxItems. */
  readonly starsByItemCount: readonly number[];
  /** Coins paid = sum of the wanted items' sellValue × this. */
  readonly coinMultiplier: number;
  /** XP paid = sum of the wanted items' tiers × this. */
  readonly xpPerTier: number;
}

export interface OrderRules {
  /** Open orders shown at once. */
  readonly maxOpen: number;
  /** Delay before a filled order is replaced. */
  readonly refillDelaySec: number;
  /** Chance a new order comes from an unlocked regular instead of a walk-in. */
  readonly regularChancePercent: number;
  /** Weight multiplier for items the next renovation task features. */
  readonly featuredWeight: number;
  readonly walkIn: OrderKindRules;
  readonly regular: OrderKindRules;
}

export interface Economy {
  readonly energy: {
    readonly cap: number;
    readonly regenSec: number;
    readonly perTap: number;
  };
  /** XP for a merge = tier of the two items merged × this. */
  readonly xpPerMergeTier: number;
  /** Ordered by level, starting at level 1. */
  readonly levels: readonly LevelDef[];
  readonly pantry: {
    readonly startSlots: number;
    /** Coin cost of each extra slot, in purchase order. Max slots = startSlots + slotCosts.length. */
    readonly slotCosts: readonly number[];
  };
  /** Rush cost = remaining whole minutes, rounded up, × this. */
  readonly rushGemsPerMinute: number;
  readonly sellUndoSec: number;
  readonly goldenWhiskMaxTier: number;
  readonly orders: OrderRules;
}

// ─── Static data: new game (newGame.json) ───────────────────────────────────

export type LockKind = 'crate' | 'flourSack';

export interface NewGameConfig {
  readonly cols: number;
  readonly rows: number;
  readonly locks: readonly {
    readonly cell: CellIndex;
    readonly lock: LockKind;
  }[];
  readonly items: readonly {
    readonly cell: CellIndex;
    readonly itemId: ItemId;
    readonly cobwebbed: boolean;
  }[];
  readonly ovens: readonly OvenId[];
  readonly coins: number;
  readonly gems: number;
  readonly chapterId: ChapterId;
  readonly unlockedCustomers: readonly CustomerId[];
}

// ─── Loaded, validated data (T1.7) ──────────────────────────────────────────

export interface GameData {
  readonly items: ReadonlyMap<ItemId, Item>;
  readonly chains: ReadonlyMap<ChainId, Chain>;
  /** Each chain's items, sorted by tier. */
  readonly chainItems: ReadonlyMap<ChainId, readonly Item[]>;
  /** Keyed by generator item id. */
  readonly generators: ReadonlyMap<ItemId, GeneratorDef>;
  readonly rareDrops: RareDropTable;
  readonly recipes: ReadonlyMap<RecipeId, Recipe>;
  readonly ovens: ReadonlyMap<OvenId, OvenDef>;
  readonly customers: ReadonlyMap<CustomerId, Customer>;
  readonly chapters: ReadonlyMap<ChapterId, Chapter>;
  readonly economy: Economy;
  readonly newGame: NewGameConfig;
}

// ─── Game state ─────────────────────────────────────────────────────────────

export interface GeneratorCharge {
  readonly charges: number;
  /** Set when charges reach 0; at or after this time charges refill to the max. */
  readonly cooldownEndsAt: Timestamp | null;
}

/** An item instance on the board or in the Pantry. */
export interface BoardItem {
  readonly itemId: ItemId;
  /** Cobwebbed items can't be dragged; only a matching merge into them frees them. */
  readonly cobwebbed: boolean;
  /** Non-null exactly when the item is a generator. */
  readonly generator: GeneratorCharge | null;
}

export type Cell =
  | { readonly kind: 'empty' }
  /** Opens when a merge lands on an orthogonally adjacent cell. */
  | { readonly kind: 'locked'; readonly lock: LockKind }
  | { readonly kind: 'item'; readonly item: BoardItem };

export interface Board {
  readonly cols: number;
  readonly rows: number;
  /** Length cols × rows, row-major. */
  readonly cells: readonly Cell[];
}

export interface Pantry {
  readonly capacity: number;
  readonly items: readonly BoardItem[];
}

/**
 * Energy is stored as a value at a moment; regen accrues from `updatedAt`.
 * When spending, advance `updatedAt` by whole regen periods only, so partial
 * progress toward the next point is kept.
 */
export interface EnergyState {
  readonly value: number;
  readonly updatedAt: Timestamp;
}

export interface Order {
  readonly id: OrderId;
  readonly customerId: CustomerId;
  /** Repeats mean more than one of that item. */
  readonly wants: readonly ItemId[];
  readonly reward: OrderReward;
}

export interface OrderReward {
  readonly coins: number;
  readonly stars: number;
  readonly xp: number;
}

export interface Bake {
  readonly recipeId: RecipeId;
  readonly startedAt: Timestamp;
  /** Fixed when the bake starts; oven upgrades don't change it. Done when now >= endsAt. */
  readonly endsAt: Timestamp;
}

export interface OvenState {
  readonly ovenId: OvenId;
  /** Length equals the oven's slot count; null is an empty slot. */
  readonly slots: readonly (Bake | null)[];
}

/** Addresses one bake slot: kitchen.ovens[oven].slots[slot]. */
export interface BakeSlotRef {
  readonly oven: number;
  readonly slot: number;
}

export interface LastSale {
  readonly item: BoardItem;
  readonly cell: CellIndex;
  readonly coins: number;
  readonly soldAt: Timestamp;
}

export type TutorialStep =
  'firstTap' | 'firstMerge' | 'firstOrder' | 'firstRenovation' | 'done';

/** The whole saved game. Plain JSON-serializable data only. */
export interface GameState {
  readonly board: Board;
  readonly pantry: Pantry;
  readonly energy: EnergyState;
  readonly coins: number;
  readonly stars: number;
  readonly gems: number;
  /** Total XP earned; level is derived from Economy.levels and stored for display. */
  readonly xp: number;
  readonly level: number;
  /** At most economy.orders.maxOpen. */
  readonly orders: readonly Order[];
  /** When the next order arrives; null when the queue is full. */
  readonly nextOrderAt: Timestamp | null;
  readonly kitchen: { readonly ovens: readonly OvenState[] };
  /** The last sale, kept for the undo window. */
  readonly lastSale: LastSale | null;
  /** Items made at least once; drives the Recipe Book and order eligibility. */
  readonly discovered: readonly ItemId[];
  /** Newly discovered items whose discovery card hasn't been dismissed. */
  readonly pendingDiscoveries: readonly ItemId[];
  /** Chains whose completion gems were paid. */
  readonly rewardedChains: readonly ChainId[];
  readonly chapterId: ChapterId;
  readonly completedTasks: readonly TaskId[];
  /** Regulars who can place orders. Walk-ins are always available. */
  readonly unlockedCustomers: readonly CustomerId[];
  readonly tutorialStep: TutorialStep;
  /** Stored Rng state; see Rng.getState. */
  readonly rngState: number;
  /** Next OrderId to hand out. */
  readonly nextOrderId: OrderId;
}

// ─── Actions, results, and events ───────────────────────────────────────────

type ActionBody =
  /** Drag from one cell to another: merge, swap, move, or Golden Whisk copy. */
  | { readonly type: 'drop'; readonly from: CellIndex; readonly to: CellIndex }
  | { readonly type: 'tapGenerator'; readonly cell: CellIndex }
  /** Tap a bonus item (energy jar, coin pouch). */
  | { readonly type: 'collectBonus'; readonly cell: CellIndex }
  | { readonly type: 'sell'; readonly cell: CellIndex }
  | { readonly type: 'undoSell' }
  | { readonly type: 'storeInPantry'; readonly cell: CellIndex }
  | {
      readonly type: 'takeFromPantry';
      readonly pantryIndex: number;
      readonly to: CellIndex;
    }
  | { readonly type: 'buyPantrySlot' }
  | { readonly type: 'deliverOrder'; readonly orderId: OrderId }
  | {
      readonly type: 'loadRecipe';
      readonly slot: BakeSlotRef;
      readonly recipeId: RecipeId;
      readonly cells: readonly CellIndex[];
    }
  | { readonly type: 'collectBake'; readonly slot: BakeSlotRef }
  | { readonly type: 'rushBake'; readonly slot: BakeSlotRef }
  /** Pay gems to end a generator's cooldown now (T6.5). */
  | { readonly type: 'rushCooldown'; readonly cell: CellIndex }
  /** Merge kitchen.ovens[from] into kitchen.ovens[to]. */
  | { readonly type: 'mergeOvens'; readonly from: number; readonly to: number }
  | { readonly type: 'completeTask'; readonly taskId: TaskId }
  | { readonly type: 'dismissDiscovery'; readonly itemId: ItemId }
  | { readonly type: 'setTutorialStep'; readonly step: TutorialStep }
  /** Time passing: order refills and cooldowns. Sent on an interval and on load. */
  | { readonly type: 'tick' };

/** Every action carries the time it happened so the reducer stays pure. */
export type Action = ActionBody & { readonly now: Timestamp };

export type ActionType = Action['type'];

export type RejectReason =
  | 'emptyCell'
  | 'sameCell'
  | 'locked'
  | 'cobwebbed'
  | 'notMergeable'
  | 'notAGenerator'
  | 'notCollectible'
  | 'notSellable'
  | 'noEnergy'
  | 'coolingDown'
  | 'boardFull'
  | 'pantryFull'
  | 'pantryMaxed'
  | 'notEnoughCoins'
  | 'notEnoughGems'
  | 'notEnoughStars'
  | 'nothingToUndo'
  | 'undoExpired'
  | 'missingItems'
  | 'slotBusy'
  | 'slotEmpty'
  | 'bakeNotReady'
  | 'ovensDontMatch'
  | 'ovenMaxTier'
  | 'prerequisitesMissing'
  | 'alreadyCompleted';

/** What happened, for animation, audio, and UI cards. The state is the source of truth. */
export type GameEvent =
  | {
      readonly type: 'merged';
      readonly itemId: ItemId;
      readonly cells: readonly CellIndex[];
    }
  | {
      readonly type: 'spawned';
      readonly itemId: ItemId;
      readonly cell: CellIndex;
      readonly rare: boolean;
    }
  | { readonly type: 'cellsUnlocked'; readonly cells: readonly CellIndex[] }
  | {
      readonly type: 'collected';
      readonly itemId: ItemId;
      readonly reward: CollectReward;
    }
  | { readonly type: 'sold'; readonly itemId: ItemId; readonly coins: number }
  | {
      readonly type: 'saleUndone';
      readonly itemId: ItemId;
      readonly cell: CellIndex;
    }
  | { readonly type: 'orderArrived'; readonly orderId: OrderId }
  | {
      readonly type: 'orderDelivered';
      readonly orderId: OrderId;
      readonly reward: OrderReward;
    }
  | { readonly type: 'levelUp'; readonly level: number; readonly gems: number }
  | { readonly type: 'discovered'; readonly itemId: ItemId }
  | {
      readonly type: 'chainCompleted';
      readonly chainId: ChainId;
      readonly gems: number;
    }
  | {
      readonly type: 'bakeStarted';
      readonly slot: BakeSlotRef;
      readonly recipeId: RecipeId;
    }
  | {
      readonly type: 'bakeCollected';
      readonly slot: BakeSlotRef;
      readonly itemId: ItemId;
      /** Where the baked item went. */
      readonly to: { readonly cell: CellIndex } | 'pantry';
    }
  | {
      readonly type: 'ovenUpgraded';
      readonly oven: number;
      readonly ovenId: OvenId;
    }
  | { readonly type: 'taskCompleted'; readonly taskId: TaskId }
  | {
      readonly type: 'cooldownRushed';
      readonly cell: CellIndex;
      readonly gems: number;
    };

export type ActionResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly GameEvent[];
    }
  | { readonly ok: false; readonly reason: RejectReason };

/**
 * The reducer (T1.8). It builds an Rng from state.rngState, routes the action
 * to its core function, and stores rng.getState() in the returned state.
 */
export type Dispatch = (
  data: GameData,
  state: GameState,
  action: Action,
) => ActionResult;
