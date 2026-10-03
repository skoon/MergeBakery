/**
 * Balancing simulator (T-O3): a bot plays the real game — the real `dispatch`,
 * the real JSON data, a seeded random source — in short sessions spread over
 * simulated days, and reports how the pacing compares with the GDD's targets.
 *
 * The bot is a reasonable but tireless player: it never misclicks or wanders
 * off mid-session. Treat its pace as a fast player's, so real players will
 * take somewhat longer than the numbers here.
 */

import { bakeStatus } from '../core/bakes';
import { dispatch } from '../core/dispatch';
import { megabunScore } from '../core/events';
import { matchOrderItems } from '../core/deliver';
import { canMerge } from '../core/merge';
import { createNewGame } from '../core/newGame';
import { shopItemsFor } from '../core/shop';
import { nextTask } from '../core/orders';
import type {
  CellIndex,
  ChainId,
  GameData,
  GameState,
  GameEvent,
  Timestamp,
} from '../core/types';
import { recipeAvailable } from '../ui/kitchenModel';
import type { ActionInput } from '../ui/store';

/** Seconds each kind of action takes a player, roughly. */
const ACTION_SEC = {
  tap: 1.2,
  merge: 2.5,
  deliver: 3,
  sell: 2,
  bonus: 1.5,
  buy: 3,
  bake: 4,
  task: 5,
} as const;
type ActionKind = keyof typeof ACTION_SEC;

export interface SimOptions {
  seed: number;
  days: number;
  /** Hours after midnight each session starts. */
  sessionStarts: readonly number[];
  /** A session ends at this length even if there's more to do. */
  maxSessionMin: number;
}

export const DEFAULT_OPTIONS: SimOptions = {
  seed: 1,
  days: 3,
  sessionStarts: [8, 12.5, 17, 21],
  maxSessionMin: 10,
};

export interface SessionReport {
  day: number;
  index: number;
  minutes: number;
  taps: number;
  merges: number;
  orders: number;
  stars: number;
  tasks: string[];
  /** Shop rows bought this session. */
  bought: string[];
  coinsAtEnd: number;
  /** Minutes from the session's start until energy first ran out, or null if it didn't. */
  energyEmptyAtMin: number | null;
  /** Orders delivered before energy first ran out. */
  ordersOnFullBar: number;
  levelUps: number;
  endedBecause: 'out of moves' | 'time cap';
}

/** One MegaBun event the bot played, start to finish. */
export interface EventRun {
  eventId: string;
  startDay: number;
  won: boolean;
  points: number;
  /** MegaBun's final score, which the player must reach. */
  target: number;
  /** Sessions from the event's start until the bot's points reached the target, or null. */
  sessionsToTarget: number | null;
  /** Sessions the bot played while the event ran. */
  sessionsRun: number;
}

export interface SimReport {
  seed: number;
  events: EventRun[];
  /** Catering orders that arrived, were delivered, and ran out of time, and generator upgrades from them. */
  catering: {
    arrived: number;
    delivered: number;
    expired: number;
    upgrades: number;
  };
  sessions: SessionReport[];
  tasksDone: number;
  /** Day and session each chapter's last task completed in, by chapter id. */
  chapterDoneAt: Record<string, { day: number; session: number }>;
  /** Simulated minutes of play before the first croissant went into the oven, or null. */
  firstCroissantAtMin: number | null;
  /** The state when the last session ended, for diagnosing where a run got stuck. */
  finalState: GameState;
  finalLevel: number;
  finalStars: number;
  finalCoins: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

class Bot {
  state: GameState;
  now: Timestamp;
  playedMs = 0;
  readonly bought = new Set<string>();
  purchases: string[] = [];
  /** Catering orders seen (every action, so none slip by between steps), and how they ended. */
  readonly catering = { arrived: 0, delivered: 0, expired: 0, upgrades: 0 };
  private readonly cateringIds = new Set<number>();
  firstCroissantAtMin: number | null = null;
  private events: GameEvent[] = [];
  private readonly data: GameData;

  constructor(data: GameData, seed: number, start: Timestamp) {
    this.data = data;
    this.state = createNewGame(data, seed, start);
    this.now = start;
  }

  /** Dispatches; on success keeps the state, advances the clock, and returns true. */
  private act(kind: ActionKind | null, body: ActionInput): boolean {
    const result = dispatch(this.data, this.state, {
      ...body,
      now: this.now,
    });
    if (!result.ok) return false;
    this.state = result.state;
    this.events.push(...result.events);
    for (const o of result.state.orders) {
      if (o.catering && !this.cateringIds.has(o.id)) {
        this.cateringIds.add(o.id);
        this.catering.arrived++;
      }
    }
    for (const e of result.events) {
      if (e.type === 'cateringExpired') this.catering.expired++;
      if (e.type === 'generatorUpgraded') this.catering.upgrades++;
      if (e.type === 'orderDelivered' && this.cateringIds.has(e.orderId)) {
        this.catering.delivered++;
      }
    }
    if (kind) {
      const ms = ACTION_SEC[kind] * 1000;
      this.now += ms;
      this.playedMs += ms;
    }
    return true;
  }

  takeEvents(): GameEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  energy(): number {
    // Energy regenerates lazily; this matches what a spend would see.
    const { value, updatedAt } = this.state.energy;
    const { cap, regenSec } = this.data.economy.energy;
    if (value >= cap) return value;
    const gained = Math.floor((this.now - updatedAt) / (regenSec * 1000));
    return Math.min(cap, value + gained);
  }

  /** Board cells holding items an open order or an available recipe needs. */
  private reserved(): Set<CellIndex> {
    const cells = new Set<CellIndex>();
    for (const order of this.state.orders) {
      for (const cell of matchOrderItems(this.state, order.wants)) {
        if (cell !== null) cells.add(cell);
      }
    }
    for (const recipe of this.data.recipes.values()) {
      if (!recipeAvailable(this.data, this.state, recipe)) continue;
      for (const cell of matchOrderItems(this.state, recipe.inputs)) {
        if (cell !== null) cells.add(cell);
      }
    }
    return cells;
  }

  /** Chains the open orders and available recipes still need, most-needed first. */
  private neededChains(): ChainId[] {
    const counts = new Map<ChainId, number>();
    const add = (itemIds: readonly string[]) => {
      const matches = matchOrderItems(this.state, itemIds);
      itemIds.forEach((itemId, i) => {
        if (matches[i] !== null) return;
        const chain = this.data.items.get(itemId)?.chainId;
        if (chain) counts.set(chain, (counts.get(chain) ?? 0) + 1);
      });
    };
    for (const order of this.state.orders) add(order.wants);
    for (const recipe of this.data.recipes.values()) {
      if (recipeAvailable(this.data, this.state, recipe)) add(recipe.inputs);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }

  private deliver(): boolean {
    for (const order of this.state.orders) {
      if (this.act('deliver', { type: 'deliverOrder', orderId: order.id })) {
        return true;
      }
    }
    return false;
  }

  private renovate(): boolean {
    const task = nextTask(this.data, this.state);
    return (
      task !== null &&
      this.state.stars >= task.starCost &&
      this.act('task', { type: 'completeTask', taskId: task.id })
    );
  }

  private kitchen(): boolean {
    const ovens = this.state.kitchen.ovens;
    for (let oven = 0; oven < ovens.length; oven++) {
      const slots = ovens[oven]?.slots ?? [];
      for (let slot = 0; slot < slots.length; slot++) {
        const ref = { oven, slot };
        const status = bakeStatus(this.state, ref, this.now);
        if (
          status.kind === 'done' &&
          this.act('bake', { type: 'collectBake', slot: ref })
        ) {
          return true;
        }
        if (status.kind !== 'empty') continue;
        for (const recipe of this.data.recipes.values()) {
          const cells = matchOrderItems(this.state, recipe.inputs);
          if (cells.some((c) => c === null)) continue;
          if (
            this.act('bake', {
              type: 'loadRecipe',
              slot: ref,
              recipeId: recipe.id,
              cells: cells as CellIndex[],
            })
          ) {
            if (
              recipe.id === 'bake-croissant' &&
              this.firstCroissantAtMin === null
            ) {
              this.firstCroissantAtMin = this.playedMs / 60_000;
            }
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Shop: a generator row the first time it's affordable (cheapest first),
   * and the biggest energy pack affordable once energy has run out.
   */
  private shop(): boolean {
    const rows = shopItemsFor(this.data, this.state);
    const generators = rows
      .filter((r) => r.kind === 'generator' && !this.bought.has(r.id))
      .sort((a, b) => a.price - b.price);
    for (const row of generators) {
      if (this.state.coins < row.price) break; // keep saving for the cheapest
      if (this.act('buy', { type: 'buyShopItem', shopItemId: row.id })) {
        this.bought.add(row.id);
        this.purchases.push(row.id);
        return true;
      }
    }
    if (this.energy() >= this.data.economy.energy.perTap) return false;
    const packs = rows
      .filter((r) => r.kind === 'energy' && r.price <= this.state.coins)
      .sort((a, b) => b.price - a.price);
    for (const row of packs) {
      if (this.act('buy', { type: 'buyShopItem', shopItemId: row.id })) {
        this.purchases.push(row.id);
        return true;
      }
    }
    return false;
  }

  private collectBonus(): boolean {
    const cells = this.state.board.cells;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (cell?.kind !== 'item') continue;
      const item = this.data.items.get(cell.item.itemId);
      if (
        item?.collectReward &&
        this.act('bonus', { type: 'collectBonus', cell: i })
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * A Golden Whisk dropped on the highest-tier single item that could merge
   * further: the whisk becomes a copy, and the pair merges next.
   */
  private useWhisk(): boolean {
    const cells = this.state.board.cells;
    const whisk = cells.findIndex(
      (c) =>
        c.kind === 'item' &&
        this.data.chains.get(this.data.items.get(c.item.itemId)?.chainId ?? '')
          ?.kind === 'wildcard',
    );
    if (whisk === -1) return false;
    let best: { cell: CellIndex; tier: number } | null = null;
    cells.forEach((c, i) => {
      if (c.kind !== 'item' || c.item.cobwebbed || c.item.generator) return;
      const def = this.data.items.get(c.item.itemId);
      const kind = this.data.chains.get(def?.chainId ?? '')?.kind;
      if (!def || (kind !== 'ingredient' && kind !== 'baked')) return;
      if (def.tier > this.data.economy.goldenWhiskMaxTier) return;
      if (!canMerge(this.data, def.id, def.id)) return;
      if (best && def.tier <= best.tier) return;
      best = { cell: i, tier: def.tier };
    });
    return (
      best !== null &&
      this.act('merge', {
        type: 'drop',
        from: whisk,
        to: (best as { cell: CellIndex }).cell,
      })
    );
  }

  /** The lowest-tier pair that merges, leaving items an order or recipe needs alone. */
  private merge(): boolean {
    const cells = this.state.board.cells;
    const reserved = this.reserved();
    let best: { from: CellIndex; to: CellIndex; tier: number } | null = null;
    for (let from = 0; from < cells.length; from++) {
      const a = cells[from];
      if (a?.kind !== 'item' || a.item.cobwebbed || reserved.has(from))
        continue;
      if (a.item.generator) continue; // merging generators trades charges for tier; leave it
      const tier = this.data.items.get(a.item.itemId)?.tier ?? 99;
      if (best && tier >= best.tier) continue;
      for (let to = 0; to < cells.length; to++) {
        const b = cells[to];
        if (to === from || b?.kind !== 'item' || reserved.has(to)) continue;
        if (canMerge(this.data, a.item.itemId, b.item.itemId)) {
          best = { from, to, tier };
          break;
        }
      }
    }
    return (
      best !== null &&
      this.act('merge', { type: 'drop', from: best.from, to: best.to })
    );
  }

  /**
   * Fallback when nothing else merges: items held back for a lower-tier order
   * can block a higher-tier want in the same chain (syrup kept for one order
   * while another needs the cocoa bean they'd merge into). Merge a spare pair
   * of any item below the highest tier an open order wants in its chain.
   */
  private mergeTowardNeed(): boolean {
    const cells = this.state.board.cells;
    const wants = this.state.orders.flatMap((o) => o.wants);
    const topWanted = new Map<ChainId, number>();
    for (const id of wants) {
      const def = this.data.items.get(id);
      if (def) {
        topWanted.set(
          def.chainId,
          Math.max(topWanted.get(def.chainId) ?? 0, def.tier),
        );
      }
    }
    for (let from = 0; from < cells.length; from++) {
      const a = cells[from];
      if (a?.kind !== 'item' || a.item.cobwebbed || a.item.generator) continue;
      const def = this.data.items.get(a.item.itemId);
      if (!def || def.tier >= (topWanted.get(def.chainId) ?? 0)) continue;
      const copies: CellIndex[] = [];
      cells.forEach((c, i) => {
        if (c.kind === 'item' && !c.item.cobwebbed && c.item.itemId === def.id)
          copies.push(i);
      });
      const kept = wants.filter((id) => id === def.id).length;
      if (copies.length < kept + 2 || !canMerge(this.data, def.id, def.id))
        continue;
      const [x, y] = copies.slice(-2);
      if (
        x !== undefined &&
        y !== undefined &&
        this.act('merge', { type: 'drop', from: x, to: y })
      ) {
        return true;
      }
    }
    return false;
  }

  private tap(): boolean {
    if (this.energy() < this.data.economy.energy.perTap) return false;
    if (!this.state.board.cells.some((c) => c.kind === 'empty')) return false;

    const wanted = this.neededChains();
    const generators: { cell: CellIndex; rank: number }[] = [];
    this.state.board.cells.forEach((cell, i) => {
      if (cell.kind !== 'item' || !cell.item.generator || cell.item.cobwebbed)
        return;
      const def = this.data.generators.get(cell.item.itemId);
      const chain =
        def && this.data.items.get(def.spawnTable[0]?.itemId ?? '')?.chainId;
      const rank = chain ? wanted.indexOf(chain) : -1;
      generators.push({ cell: i, rank: rank === -1 ? 99 : rank });
    });
    generators.sort((a, b) => a.rank - b.rank);
    for (const { cell } of generators) {
      if (this.act('tap', { type: 'tapGenerator', cell })) return true;
    }
    return false;
  }

  /** Board full: sell the cheapest item nothing needs. */
  private sell(tidy = false): boolean {
    // `tidy`: a player clears dead weight before the board is quite full.
    const empties = this.state.board.cells.filter(
      (c) => c.kind === 'empty',
    ).length;
    if (empties > (tidy ? 12 : 0)) return false;
    const reserved = this.reserved();
    const cells = this.state.board.cells;
    // An item of tier 3+ with no twin on the board, or at the top of its chain, is dead weight: selling
    // only the cheapest spawns would leave the board clogged with them.
    const hasTwin = (i: number, id: string) =>
      cells.some(
        (c, j) => j !== i && c.kind === 'item' && c.item.itemId === id,
      );
    let cheapest: { cell: CellIndex; value: number } | null = null;
    let stuck: { cell: CellIndex; value: number } | null = null;
    cells.forEach((cell, i) => {
      if (cell.kind !== 'item' || cell.item.generator || reserved.has(i))
        return;
      const def = this.data.items.get(cell.item.itemId);
      const value = def?.sellValue ?? 0;
      if (value === 0) return;
      if (!cheapest || value < cheapest.value) cheapest = { cell: i, value };
      if (
        (def?.tier ?? 0) >= 3 &&
        (!hasTwin(i, cell.item.itemId) ||
          !canMerge(this.data, cell.item.itemId, cell.item.itemId)) &&
        (!stuck || value > stuck.value)
      )
        stuck = { cell: i, value };
    });
    cheapest = tidy ? stuck : (stuck ?? cheapest);
    return (
      cheapest !== null &&
      this.act('sell', {
        type: 'sell',
        cell: (cheapest as { cell: CellIndex }).cell,
      })
    );
  }

  /** One useful move, in the order a sensible player would look for them. */
  step(): boolean {
    this.act(null, { type: 'tick' });
    return (
      this.deliver() ||
      this.renovate() ||
      this.kitchen() ||
      this.shop() ||
      this.collectBonus() ||
      this.useWhisk() ||
      this.merge() ||
      this.mergeTowardNeed() ||
      this.sell(true) ||
      this.tap() ||
      this.sell()
    );
  }
}

export function simulate(
  data: GameData,
  options: SimOptions = DEFAULT_OPTIONS,
): SimReport {
  const start = Date.UTC(2026, 0, 1);
  const bot = new Bot(data, options.seed, start);
  const allTasks = [...data.chapters.values()].flatMap((c) => c.tasks);
  const lastTasks = new Map(
    [...data.chapters.values()].map((c) => [c.tasks.at(-1)?.id, c.id]),
  );
  const sessions: SessionReport[] = [];
  const chapterDoneAt: SimReport['chapterDoneAt'] = {};
  const eventRuns: EventRun[] = [];
  let sessionCount = 0;
  let running: { id: string; startDay: number; startSession: number } | null =
    null;
  let reachedAt: number | null = null;

  for (let day = 1; day <= options.days; day++) {
    options.sessionStarts.forEach((hour, index) => {
      bot.now = Math.max(bot.now, start + (day - 1) * DAY_MS + hour * HOUR_MS);
      const sessionStart = bot.now;
      const report: SessionReport = {
        day,
        index: index + 1,
        minutes: 0,
        taps: 0,
        merges: 0,
        orders: 0,
        stars: 0,
        tasks: [],
        bought: [],
        coinsAtEnd: 0,
        energyEmptyAtMin: null,
        ordersOnFullBar: 0,
        levelUps: 0,
        endedBecause: 'out of moves',
      };
      const starsBefore = bot.state.stars;
      let starsSpent = 0;
      bot.takeEvents();
      bot.purchases = [];
      sessionCount++;

      while (bot.step()) {
        for (const event of bot.takeEvents()) {
          if (event.type === 'spawned') report.taps++;
          if (event.type === 'merged') report.merges++;
          if (event.type === 'levelUp') report.levelUps++;
          if (event.type === 'eventStarted') {
            running = {
              id: event.eventId,
              startDay: day,
              startSession: sessionCount,
            };
            reachedAt = null;
          }
          if (event.type === 'eventEnded' && running) {
            const def = data.events.get(running.id);
            const result = bot.state.eventResult;
            eventRuns.push({
              eventId: running.id,
              startDay: running.startDay,
              won: event.won,
              points: result?.points ?? 0,
              target: Math.round(def ? megabunScore(def, def.durationSec) : 0),
              sessionsToTarget:
                reachedAt === null
                  ? null
                  : reachedAt - running.startSession + 1,
              sessionsRun: sessionCount - running.startSession + 1,
            });
            running = null;
          }
          if (event.type === 'orderDelivered') {
            report.orders++;
            if (report.energyEmptyAtMin === null) report.ordersOnFullBar++;
          }
          if (event.type === 'taskCompleted') {
            const taskId = event.taskId;
            report.tasks.push(taskId);
            starsSpent += allTasks.find((t) => t.id === taskId)?.starCost ?? 0;
            const finished = lastTasks.get(taskId);
            if (finished && !chapterDoneAt[finished]) {
              chapterDoneAt[finished] = { day, session: index + 1 };
            }
          }
        }
        if (
          report.energyEmptyAtMin === null &&
          bot.energy() < data.economy.energy.perTap
        ) {
          report.energyEmptyAtMin = (bot.now - sessionStart) / 60_000;
        }
        if (bot.now - sessionStart >= options.maxSessionMin * 60_000) {
          report.endedBecause = 'time cap';
          break;
        }
      }

      if (running && reachedAt === null) {
        const def = data.events.get(running.id);
        const points = bot.state.event?.points ?? 0;
        if (def && points >= megabunScore(def, def.durationSec)) {
          reachedAt = sessionCount;
        }
      }
      report.bought = bot.purchases;
      report.coinsAtEnd = bot.state.coins;
      report.minutes = (bot.now - sessionStart) / 60_000;
      report.stars = bot.state.stars - starsBefore + starsSpent;
      sessions.push(report);
    });
  }

  return {
    seed: options.seed,
    events: eventRuns,
    catering: bot.catering,
    sessions,
    tasksDone: bot.state.completedTasks.length,
    chapterDoneAt,
    firstCroissantAtMin: bot.firstCroissantAtMin,
    finalState: bot.state,
    finalLevel: bot.state.level,
    finalStars: bot.state.stars,
    finalCoins: bot.state.coins,
  };
}
