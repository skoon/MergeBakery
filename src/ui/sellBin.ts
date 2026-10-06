/**
 * Sell bin UI (T2.10).
 *
 * A drop zone in the tray. For the undo window after a sale the same button reads
 * Undo, with the seconds left as a badge, so the tray never changes shape (T-R4).
 */

import type { GameStore } from './store';
import { styleTrayButton } from './trayButton';
import { registerDropZone } from './dropZones';

export function mountSellBin(tray: HTMLElement, store: GameStore): void {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sell-bin tray-btn--sell';
  const { label } = styleTrayButton(button, 'coin-pouch', 'Sell');
  const badge = document.createElement('span');
  badge.className = 'tray-btn__badge';
  button.appendChild(badge);

  registerDropZone(button, (cell) => {
    store.dispatch({ type: 'sell', cell });
  });

  /** Whole seconds left to undo the last sale; 0 when there is nothing to undo. */
  function undoSecLeft(): number {
    const { lastSale } = store.getState();
    if (lastSale === null) return 0;
    const leftMs =
      store.data.economy.sellUndoSec * 1000 - (Date.now() - lastSale.soldAt);
    return Math.max(0, Math.ceil(leftMs / 1000));
  }

  button.addEventListener('click', () => {
    if (undoSecLeft() > 0) store.dispatch({ type: 'undoSell' });
  });

  let timer: number | null = null;

  function render(): void {
    const sec = undoSecLeft();
    // While an item is being dragged the button is the Sell bin again.
    const undo = sec > 0 && !button.hasAttribute('data-dragging');
    label.textContent = undo ? 'Undo' : 'Sell';
    badge.hidden = !undo;
    badge.textContent = sec.toString();
    button.setAttribute(
      'aria-label',
      undo ? `Undo sale, ${sec.toString()} seconds left` : 'Sell',
    );

    if (sec > 0 && timer === null) {
      timer = window.setInterval(render, 250);
    } else if (sec === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  store.subscribe(render);
  render();
  tray.appendChild(button);
}
