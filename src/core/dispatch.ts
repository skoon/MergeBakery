/**
 * The reducer that builds an Rng from state.rngState and routes each action
 * to its handler (T1.8). See types.ts `Dispatch` for the contract.
 */

import { collectBake, rushBake } from './bakes';
import { deliverOrder } from './deliver';
import { dismissDiscovery } from './discovery';
import { applyDrop } from './drop';
import { collectBonus, tapGenerator } from './generators';
import { loadRecipe } from './kitchen';
import { refillOrders } from './orders';
import { mergeOvens } from './ovens';
import { completeTask } from './renovation';
import { setTutorialStep } from './tutorial';
import { buyPantrySlot, storeInPantry, takeFromPantry } from './pantry';
import { createRng } from './rng';
import { sellItem, undoSell } from './sell';
import type {
  Action,
  ActionResult,
  ActionType,
  Dispatch,
  GameData,
  GameState,
  Rng,
} from './types';

export type Handlers = {
  [T in ActionType]: (
    data: GameData,
    state: GameState,
    action: Extract<Action, { type: T }>,
    rng: Rng,
  ) => ActionResult;
};

export function createDispatch(handlers: Handlers): Dispatch {
  return (data: GameData, state: GameState, action: Action): ActionResult => {
    const rng = createRng(state.rngState);
    const result = routeAction(handlers, data, state, action, rng);

    if (!result.ok) {
      return result;
    }

    // Keep the state object when nothing changed, so an idle `tick` every
    // second doesn't look like a change to every store subscriber.
    const rngState = rng.getState();
    if (result.state === state && rngState === state.rngState) {
      return result;
    }

    return {
      ...result,
      state: { ...result.state, rngState },
    };
  };
}

function routeAction(
  handlers: Handlers,
  data: GameData,
  state: GameState,
  action: Action,
  rng: Rng,
): ActionResult {
  switch (action.type) {
    case 'drop':
      return handlers.drop(data, state, action, rng);
    case 'tapGenerator':
      return handlers.tapGenerator(data, state, action, rng);
    case 'collectBonus':
      return handlers.collectBonus(data, state, action, rng);
    case 'sell':
      return handlers.sell(data, state, action, rng);
    case 'undoSell':
      return handlers.undoSell(data, state, action, rng);
    case 'storeInPantry':
      return handlers.storeInPantry(data, state, action, rng);
    case 'takeFromPantry':
      return handlers.takeFromPantry(data, state, action, rng);
    case 'buyPantrySlot':
      return handlers.buyPantrySlot(data, state, action, rng);
    case 'deliverOrder':
      return handlers.deliverOrder(data, state, action, rng);
    case 'loadRecipe':
      return handlers.loadRecipe(data, state, action, rng);
    case 'collectBake':
      return handlers.collectBake(data, state, action, rng);
    case 'rushBake':
      return handlers.rushBake(data, state, action, rng);
    case 'mergeOvens':
      return handlers.mergeOvens(data, state, action, rng);
    case 'completeTask':
      return handlers.completeTask(data, state, action, rng);
    case 'dismissDiscovery':
      return handlers.dismissDiscovery(data, state, action, rng);
    case 'setTutorialStep':
      return handlers.setTutorialStep(data, state, action, rng);
    case 'tick':
      return handlers.tick(data, state, action, rng);
    default:
      return assertNever(action);
  }
}

function assertNever(action: never): never {
  throw new Error(`Unhandled action type: ${JSON.stringify(action)}`);
}

export const dispatch: Dispatch = createDispatch({
  drop: (data, state, action) =>
    applyDrop(data, state, action.from, action.to, action.now),
  tapGenerator: (data, state, action, rng) =>
    tapGenerator(data, state, action.cell, rng, action.now),
  collectBonus: (data, state, action) =>
    collectBonus(data, state, action.cell, action.now),
  sell: (data, state, action) => sellItem(data, state, action.cell, action.now),
  undoSell: (data, state, action) => undoSell(data, state, action.now),
  storeInPantry: (data, state, action) =>
    storeInPantry(data, state, action.cell),
  takeFromPantry: (data, state, action) =>
    takeFromPantry(data, state, action.pantryIndex, action.to),
  buyPantrySlot: (data, state) => buyPantrySlot(data, state),
  deliverOrder: (data, state, action) =>
    deliverOrder(data, state, action.orderId, action.now),
  loadRecipe: (data, state, action) =>
    loadRecipe(
      data,
      state,
      action.slot,
      action.recipeId,
      action.cells,
      action.now,
    ),
  collectBake: (data, state, action) =>
    collectBake(data, state, action.slot, action.now),
  rushBake: (data, state, action) =>
    rushBake(data, state, action.slot, action.now),
  mergeOvens: (data, state, action) =>
    mergeOvens(data, state, action.from, action.to),
  completeTask: (data, state, action) =>
    completeTask(data, state, action.taskId),
  dismissDiscovery: (data, state, action) =>
    dismissDiscovery(data, state, action.itemId),
  setTutorialStep: (data, state, action) =>
    setTutorialStep(data, state, action.step),
  tick: (data, state, action, rng) =>
    refillOrders(data, state, rng, action.now),
});
