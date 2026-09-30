/**
 * First-time flow hints (T5.12): a bouncing pointer and one line of text for
 * each tutorial step, and advancing the step as the player does each thing.
 *
 * The overlay never blocks the game — only its "Skip tutorial" link takes
 * taps — and it stands aside while a story scene, a discovery card or a drag
 * is in progress.
 */

import './tutorialHints.css';
import { canMerge } from '../core/merge';
import { availableTasks } from '../core/renovation';
import { tutorialStepAfter } from '../core/tutorial';
import type { CellIndex, GameState } from '../core/types';
import type { BoardView } from '../render/boardView';
import { counterCards } from './counterModel';
import type { Router } from './router';
import type { GameStore } from './store';

interface Hint {
  /** Target point, in overlay coordinates. */
  x: number;
  y: number;
  text: string;
}

function firstGenerator(state: GameState): CellIndex | null {
  const index = state.board.cells.findIndex(
    (c) => c.kind === 'item' && c.item.generator !== null && !c.item.cobwebbed,
  );
  return index === -1 ? null : index;
}

/** The first two board items that merge, with the one to drag first. */
function firstPair(
  store: GameStore,
  state: GameState,
): [CellIndex, CellIndex] | null {
  const cells = state.board.cells;
  for (let a = 0; a < cells.length; a++) {
    const ca = cells[a];
    if (ca?.kind !== 'item' || ca.item.cobwebbed || ca.item.generator) continue;
    for (let b = 0; b < cells.length; b++) {
      const cb = cells[b];
      if (b === a || cb?.kind !== 'item') continue;
      if (canMerge(store.data, ca.item.itemId, cb.item.itemId)) return [a, b];
    }
  }
  return null;
}

export function mountTutorialHints(
  overlayRoot: HTMLElement,
  store: GameStore,
  board: BoardView,
  router: Router,
): void {
  const layer = document.createElement('div');
  layer.className = 'tutorial';
  layer.hidden = true;

  const pointer = document.createElement('div');
  pointer.className = 'tutorial__pointer';
  pointer.textContent = '👇';
  pointer.setAttribute('aria-hidden', 'true');

  const bubble = document.createElement('div');
  bubble.className = 'tutorial__bubble';
  bubble.setAttribute('role', 'status');
  const text = document.createElement('p');
  text.className = 'tutorial__text';
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'tutorial__skip';
  skip.textContent = 'Skip tutorial';
  skip.addEventListener('click', () => {
    store.dispatch({ type: 'setTutorialStep', step: 'done' });
  });
  bubble.append(text, skip);

  layer.append(pointer, bubble);
  overlayRoot.appendChild(layer);

  /** An element's center, in overlay coordinates. */
  function centerOf(selector: string): { x: number; y: number } | null {
    const element = document.querySelector(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const root = overlayRoot.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - root.left,
      y: rect.top + rect.height / 2 - root.top,
    };
  }

  function hintFor(state: GameState): Hint | null {
    const onBoard = router.current() === 'board';

    switch (state.tutorialStep) {
      case 'firstTap': {
        const cell = firstGenerator(state);
        if (!onBoard || cell === null) return null;
        return {
          ...board.cellCenter(cell),
          text: 'Tap the Flour Mill to get some wheat.',
        };
      }
      case 'firstMerge': {
        if (!onBoard) return null;
        const pair = firstPair(store, state);
        if (pair) {
          return {
            ...board.cellCenter(pair[0]),
            text: 'Drag one onto the other to merge them.',
          };
        }
        const cell = firstGenerator(state);
        return cell === null
          ? null
          : {
              ...board.cellCenter(cell),
              text: 'Tap again for a matching one.',
            };
      }
      case 'firstOrder': {
        if (!onBoard) return null;
        const ready = counterCards(store.data, state).find((c) => c.fillable);
        const target = ready
          ? centerOf(
              `[data-order-id="${ready.orderId.toString()}"] .counter-card-deliver`,
            )
          : centerOf('#counter');
        if (!target) return null;
        return {
          ...target,
          text: ready
            ? 'This order is ready. Tap Deliver.'
            : 'Make what a customer asks for.',
        };
      }
      case 'firstRenovation': {
        const next = availableTasks(store.data, state)[0];
        if (!next) return null;
        if (router.current() === 'bakery') {
          const spot = centerOf('.location-spot[data-state="available"]');
          return (
            spot && { ...spot, text: 'Tap the glowing spot to fix it up.' }
          );
        }
        if (state.stars >= next.starCost) {
          const tab = centerOf('[data-screen="bakery"]');
          return (
            tab && {
              ...tab,
              text: "You've earned stars! Spend them in the Bakery.",
            }
          );
        }
        if (!onBoard) return null;
        const counter = centerOf('#counter');
        return counter && { ...counter, text: 'Fill orders to earn stars.' };
      }
      case 'done':
        return null;
    }
  }

  /** Something else has the player's attention: a scene, a card, or a drag. */
  function busy(): boolean {
    return (
      document.querySelector('.dialogue:not([hidden])') !== null ||
      document.querySelector('.discovery:not([hidden])') !== null ||
      document.querySelector('[data-dragging]') !== null
    );
  }

  function render(): void {
    const hint = busy() ? null : hintFor(store.getState());
    if (!hint) {
      layer.hidden = true;
      return;
    }
    layer.hidden = false;
    text.textContent = hint.text;

    // The pointer sits just above the target, pointing down at it.
    pointer.style.left = `${hint.x.toString()}px`;
    pointer.style.top = `${hint.y.toString()}px`;

    // The bubble goes on whichever side of the target has more room.
    const height = overlayRoot.clientHeight;
    const below = hint.y < height / 2;
    bubble.dataset['side'] = below ? 'below' : 'above';
    bubble.style.top = below
      ? `${(hint.y + 28).toString()}px`
      : `${(hint.y - 56).toString()}px`;
  }

  store.subscribe((state, events) => {
    const next = tutorialStepAfter(state.tutorialStep, events);
    if (next !== state.tutorialStep) {
      // Dispatch after this notification finishes, not in the middle of it.
      queueMicrotask(() => {
        store.dispatch({ type: 'setTutorialStep', step: next });
      });
    }
    render();
  });
  router.subscribe(() => {
    // Let the new screen lay out before measuring it.
    requestAnimationFrame(render);
  });
  window.addEventListener('resize', render);
  // Items move and screens change size; keep the pointer on its target.
  window.setInterval(render, 1000);
  render();
}
