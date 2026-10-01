/**
 * "Rush — N gems" bubble (T6.5): tapping a generator that is cooling down
 * opens a small bubble over it offering to end the cooldown now for gems.
 */

import './rushBubble.css';
import { cooldownRushCost } from '../core/generators';
import { getCell } from '../core/board';
import type { CellIndex, Timestamp } from '../core/types';
import type { BoardView } from '../render/boardView';
import type { GameStore } from './store';

export function mountRushBubble(
  overlayRoot: HTMLElement,
  store: GameStore,
  board: BoardView,
  clock: () => Timestamp,
): void {
  const bubble = document.createElement('div');
  bubble.className = 'rush-bubble';
  bubble.hidden = true;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'rush-bubble__button';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'rush-bubble__close';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close');

  bubble.append(button, close);
  overlayRoot.appendChild(bubble);

  let cell: CellIndex | null = null;

  function hide(): void {
    cell = null;
    bubble.hidden = true;
  }

  /** The cooling generator's rush cost, or null once there's nothing to rush. */
  function currentCost(): number | null {
    if (cell === null) return null;
    const boardCell = getCell(store.getState().board, cell);
    if (boardCell.kind !== 'item' || !boardCell.item.generator) return null;
    const cost = cooldownRushCost(
      store.data,
      boardCell.item.generator,
      clock(),
    );
    return cost > 0 ? cost : null;
  }

  function render(): void {
    const cost = currentCost();
    if (cost === null || cell === null) {
      hide();
      return;
    }
    const gems = store.getState().gems;
    button.disabled = gems < cost;
    button.textContent =
      gems < cost
        ? `Need ${cost.toString()} gems`
        : `Rush — ${cost.toString()} gems`;

    const { x, y } = board.cellCenter(cell);
    bubble.style.left = `${x.toString()}px`;
    bubble.style.top = `${(y - board.cellSize() * 0.55).toString()}px`;
    bubble.hidden = false;
  }

  board.onCoolingTap((tapped) => {
    cell = tapped;
    render();
  });

  button.addEventListener('click', () => {
    if (cell !== null) {
      store.dispatch({ type: 'rushCooldown', cell });
    }
    hide();
  });
  close.addEventListener('click', hide);

  // A tap anywhere else closes it. Pointerdown on the canvas also starts a new
  // tap, which may reopen it on another cooling generator.
  document.addEventListener('pointerdown', (event) => {
    if (!bubble.hidden && !bubble.contains(event.target as Node)) hide();
  });

  store.subscribe(render);
  // The price drops minute by minute, and the cooldown can end on its own.
  window.setInterval(() => {
    if (!bubble.hidden) render();
  }, 1000);
}
