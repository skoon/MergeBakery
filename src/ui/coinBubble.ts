/**
 * "Needs N coins" bubble (T13): a generator merge the player can't afford
 * shows the price over the target generator for a moment.
 */

import './rushBubble.css';
import { mergeCoins } from '../core/drop';
import type { BoardView } from '../render/boardView';
import type { GameStore } from './store';

const SHOW_MS = 2000;

export function mountCoinBubble(
  overlayRoot: HTMLElement,
  store: GameStore,
  board: BoardView,
): void {
  const bubble = document.createElement('div');
  bubble.className = 'rush-bubble coin-bubble';
  bubble.setAttribute('role', 'status');
  bubble.hidden = true;
  overlayRoot.appendChild(bubble);

  let timer: number | undefined;

  board.onMergeUnaffordable((from, to) => {
    const coins = mergeCoins(store.data, store.getState(), from, to);
    bubble.textContent = `Needs ${coins.toString()} coins`;
    const { x, y } = board.cellCenter(to);
    bubble.style.left = `${x.toString()}px`;
    bubble.style.top = `${(y - board.cellSize() * 0.55).toString()}px`;
    bubble.hidden = false;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      bubble.hidden = true;
    }, SHOW_MS);
  });
}
