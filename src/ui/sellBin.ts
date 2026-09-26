/**
 * Sell bin UI (T2.10).
 */

import './sellBin.css';
import type { GameStore } from './store';
import { registerDropZone } from './dropZones';

export function mountSellBin(tray: HTMLElement, store: GameStore): void {
  // Create the main sell button
  const button = document.createElement('button');
  button.className = 'sell-bin';
  button.textContent = 'Sell';

  // Create container for undo button (initially hidden)
  const undoContainer = document.createElement('div');
  undoContainer.className = 'sell-bin-undo-container';
  undoContainer.style.display = 'none';

  const undoButton = document.createElement('button');
  undoButton.className = 'sell-bin-undo';

  const countdown = document.createElement('span');
  countdown.className = 'sell-bin-countdown';

  undoButton.appendChild(countdown);
  undoContainer.appendChild(undoButton);

  // Register as drop zone
  registerDropZone(button, (cell) => {
    store.dispatch({ type: 'sell', cell });
  });

  // Handle undo button click
  undoButton.addEventListener('click', (e) => {
    e.stopPropagation();
    store.dispatch({ type: 'undoSell' });
  });

  // Subscribe to state changes
  let undoInterval: number | null = null;

  const updateUI = () => {
    const state = store.getState();
    const now = Date.now();
    const { lastSale } = state;
    const { sellUndoSec } = store.data.economy;

    // Check if sale is expired
    const isExpired =
      lastSale === null || now - lastSale.soldAt > sellUndoSec * 1000;

    if (isExpired) {
      undoContainer.style.display = 'none';
      if (undoInterval !== null) {
        clearInterval(undoInterval);
        undoInterval = null;
      }
    } else {
      undoContainer.style.display = '';

      // Update countdown text
      if (lastSale !== null) {
        const elapsedMs = now - lastSale.soldAt;
        const remainingSec = Math.ceil((sellUndoSec * 1000 - elapsedMs) / 1000);
        countdown.textContent = `Undo (${Math.max(0, remainingSec)}s)`;
      }
    }
  };

  // Initial UI update
  updateUI();

  // Set up countdown interval
  const startCountdown = () => {
    if (undoInterval !== null) {
      clearInterval(undoInterval);
    }
    undoInterval = window.setInterval(updateUI, 100);
  };

  // Subscribe to store updates
  store.subscribe((_state, events) => {
    // Check if a sale just happened
    const saleEvent = events.find((e) => e.type === 'sold');
    if (saleEvent) {
      startCountdown();
    }

    // Check if undo just happened
    const undoEvent = events.find((e) => e.type === 'saleUndone');
    if (undoEvent) {
      updateUI();
    }

    // Regular update
    updateUI();
  });

  tray.appendChild(button);
  tray.appendChild(undoContainer);
}
