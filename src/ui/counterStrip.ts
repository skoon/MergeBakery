/**
 * Counter strip: shows the customers' orders above the board (T3.9).
 */

import './counterStrip.css';
import { setImageArt } from '../render/assets';
import type { GameStore } from './store';
import { counterCards, type OrderCard } from './counterModel';
import { formatTimeLeft } from './eventModel';

/** Catering first (it expires), then event orders, then the regular queue. */
const priority = (c: OrderCard): number =>
  c.timed !== undefined ? 0 : c.eventPoints !== undefined ? 1 : 2;

export function mountCounterStrip(
  counter: HTMLElement,
  store: GameStore,
): void {
  const strip = document.createElement('div');
  strip.className = 'counter-strip';
  counter.appendChild(strip);

  const render = (): void => {
    strip.innerHTML = '';

    // The strip scrolls sideways past four cards, so none are dropped.
    const cards = counterCards(store.data, store.getState())
      .map((card, i) => ({ card, i }))
      .sort((a, b) => priority(a.card) - priority(b.card) || a.i - b.i)
      .map(({ card }) => card);

    for (const card of cards) {
      const cardEl = document.createElement('div');
      cardEl.className = 'counter-card';
      if (card.eventPoints !== undefined)
        cardEl.classList.add('counter-card--event');
      if (card.timed !== undefined) {
        cardEl.classList.add('counter-card--catering');
      }
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
      if (card.timed !== undefined) {
        // A timed card trades the name for its countdown; the portrait's alt keeps the name.
        name.classList.add('counter-card-timer');
        name.dataset.expiresAt = String(card.timed.expiresAt);
        name.dataset.label = card.timed.label;
        name.textContent = `${card.timed.label} ${formatTimeLeft(card.timed.expiresAt - Date.now())}`;
      }
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

        if (card.batch) {
          const count = document.createElement('span');
          count.className = 'counter-card-want-count';
          count.textContent = `${card.batch.have.toString()}/${card.batch.need.toString()}`;
          wantEl.appendChild(count);
        }

        wantsEl.appendChild(wantEl);
      }
      cardEl.appendChild(wantsEl);

      const reward = document.createElement('div');
      reward.className = 'counter-card-reward';
      reward.textContent =
        card.eventPoints === undefined
          ? `${card.coins}c ${card.stars}★`
          : `${card.coins}c +${card.eventPoints} pride`;
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
  // Catering countdowns tick in place; a rebuild every second could swallow a press.
  window.setInterval(() => {
    for (const timer of strip.querySelectorAll<HTMLElement>(
      '.counter-card-timer',
    )) {
      const left = Number(timer.dataset.expiresAt) - Date.now();
      timer.textContent = `${timer.dataset.label ?? ''} ${formatTimeLeft(left)}`;
    }
  }, 30_000);
}
