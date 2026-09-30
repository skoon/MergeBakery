/**
 * Counter strip: shows the customers' orders above the board (T3.9).
 */

import './counterStrip.css';
import { setImageArt } from '../render/assets';
import type { GameStore } from './store';
import { counterCards } from './counterModel';

/** The strip only has room for this many cards on a 320 px wide screen. */
const MAX_CARDS = 4;

export function mountCounterStrip(
  counter: HTMLElement,
  store: GameStore,
): void {
  const strip = document.createElement('div');
  strip.className = 'counter-strip';
  counter.appendChild(strip);

  const render = (): void => {
    strip.innerHTML = '';

    const cards = counterCards(store.data, store.getState()).slice(
      0,
      MAX_CARDS,
    );

    for (const card of cards) {
      const cardEl = document.createElement('div');
      cardEl.className = 'counter-card';
      // The tutorial (T5.12) finds a ready order's card by this.
      cardEl.dataset.orderId = String(card.orderId);

      const portrait = document.createElement('img');
      portrait.className = 'counter-card-portrait';
      portrait.alt = card.customerName;
      setImageArt(portrait, card.portraitKey);
      cardEl.appendChild(portrait);

      const name = document.createElement('div');
      name.className = 'counter-card-name';
      name.textContent = card.customerName;
      cardEl.appendChild(name);

      const wantsEl = document.createElement('div');
      wantsEl.className = 'counter-card-wants';
      for (const want of card.wants) {
        const wantEl = document.createElement('div');
        wantEl.className = 'counter-card-want';
        wantEl.dataset.ready = String(want.ready);

        const art = document.createElement('img');
        art.className = 'counter-card-want-art';
        art.alt = want.name;
        setImageArt(art, want.spriteKey);
        wantEl.appendChild(art);

        if (want.ready) {
          const check = document.createElement('span');
          check.className = 'counter-card-want-check';
          check.setAttribute('aria-hidden', 'true');
          check.textContent = '✓';
          wantEl.appendChild(check);
        }

        wantsEl.appendChild(wantEl);
      }
      cardEl.appendChild(wantsEl);

      const reward = document.createElement('div');
      reward.className = 'counter-card-reward';
      reward.textContent = `${card.coins}c ${card.stars}★`;
      cardEl.appendChild(reward);

      const deliverButton = document.createElement('button');
      deliverButton.className = 'counter-card-deliver';
      deliverButton.type = 'button';
      deliverButton.textContent = 'Deliver';
      deliverButton.disabled = !card.fillable;
      deliverButton.addEventListener('click', () => {
        store.dispatch({ type: 'deliverOrder', orderId: card.orderId });
      });
      cardEl.appendChild(deliverButton);

      strip.appendChild(cardEl);
    }
  };

  render();
  store.subscribe(() => {
    render();
  });
}
