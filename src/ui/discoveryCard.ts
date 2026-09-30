/**
 * "New discovery!" card (T5.7): the first time the player makes an item, a
 * card celebrates it and files it in the Recipe Book. Pending discoveries are
 * saved with the game, so a card dismissed once never shows again, even after
 * a reload, and one not yet dismissed shows on the next load.
 */

import './discoveryCard.css';
import { setImageArt } from '../render/assets';
import type { ItemId } from '../core/types';
import type { GameStore } from './store';
import { reducedMotion, type SettingsStore } from './settings';

export function mountDiscoveryCard(
  overlayRoot: HTMLElement,
  store: GameStore,
  settings: SettingsStore,
): void {
  const backdrop = document.createElement('div');
  backdrop.className = 'discovery';
  backdrop.hidden = true;

  const card = document.createElement('div');
  card.className = 'discovery__card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'New discovery');

  const heading = document.createElement('p');
  heading.className = 'discovery__heading';
  heading.textContent = 'New discovery!';

  const art = document.createElement('img');
  art.className = 'discovery__art';
  art.alt = '';

  const name = document.createElement('h2');
  name.className = 'discovery__name';

  const chain = document.createElement('p');
  chain.className = 'discovery__chain';

  const note = document.createElement('p');
  note.className = 'discovery__note';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'discovery__button';
  button.textContent = 'Add to Recipe Book';

  card.append(heading, art, name, chain, note, button);
  backdrop.appendChild(card);
  overlayRoot.appendChild(backdrop);

  let showing: ItemId | null = null;

  button.addEventListener('click', () => {
    if (showing) {
      store.dispatch({ type: 'dismissDiscovery', itemId: showing });
    }
  });

  function render(): void {
    const next = store.getState().pendingDiscoveries[0] ?? null;
    if (next === showing) return;
    showing = next;

    if (next === null) {
      backdrop.hidden = true;
      return;
    }

    const item = store.data.items.get(next);
    if (!item) return;
    const chainName = store.data.chains.get(item.chainId)?.name ?? '';

    setImageArt(art, item.spriteKey);
    name.textContent = item.name;
    chain.textContent = `${chainName} · Tier ${item.tier.toString()}`;
    note.textContent = item.note ?? '';
    note.hidden = item.note === null;

    const reduced = reducedMotion(
      settings.get(),
      matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    card.dataset['motion'] = reduced ? 'fade' : 'pop';
    backdrop.hidden = false;
    // Restart the entrance animation for each new card.
    card.classList.remove('discovery__card--enter');
    void card.offsetWidth;
    card.classList.add('discovery__card--enter');
    button.focus();
  }

  store.subscribe(render);
  render();
}
