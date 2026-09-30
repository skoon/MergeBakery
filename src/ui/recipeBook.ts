/**
 * The Recipe Book screen (T5.6): one tabbed page per ingredient and baked
 * chain, with every item shown, undiscovered ones as silhouettes.
 */

import './recipeBook.css';
import { setImageArt } from '../render/assets';
import type { ChainId } from '../core/types';
import { recipeBookPages } from './recipeBookModel';
import type { GameStore } from './store';

const NO_NOTE = "Grandma hasn't written about this one yet.";

export function mountRecipeBook(
  container: HTMLElement,
  store: GameStore,
): void {
  const tabs = document.createElement('div');
  tabs.className = 'book-tabs';
  tabs.setAttribute('role', 'tablist');

  const page = document.createElement('div');
  page.className = 'book-page';

  container.append(tabs, page);

  let selected: ChainId | null = null;

  function render(): void {
    const pages = recipeBookPages(store.data, store.getState());
    const current = pages.find((p) => p.chainId === selected) ?? pages[0];
    if (!current) return;
    selected = current.chainId;

    tabs.replaceChildren(
      ...pages.map((p) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'book-tab';
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', String(p.chainId === selected));
        tab.style.setProperty('--chain-color', p.color);
        tab.textContent = `${p.name} ${p.discoveredCount.toString()}/${p.items.length.toString()}${p.rewarded ? ' ✓' : ''}`;
        tab.addEventListener('click', () => {
          selected = p.chainId;
          render();
        });
        return tab;
      }),
    );

    const grid = document.createElement('div');
    grid.className = 'book-grid';
    for (const item of current.items) {
      const tile = document.createElement('div');
      tile.className = 'book-tile';
      tile.dataset['discovered'] = String(item.discovered);

      const art = document.createElement('img');
      art.className = 'book-tile__art';
      art.alt = '';
      setImageArt(art, item.spriteKey);

      const name = document.createElement('p');
      name.className = 'book-tile__name';
      name.textContent = item.name ?? '?';

      const tier = document.createElement('p');
      tier.className = 'book-tile__tier';
      tier.textContent = `Tier ${item.tier.toString()}`;

      tile.append(art, name, tier);
      if (item.discovered) {
        const note = document.createElement('p');
        note.className = 'book-tile__note';
        note.textContent = item.note ?? NO_NOTE;
        tile.appendChild(note);
      }
      grid.appendChild(tile);
    }

    const footer = document.createElement('p');
    footer.className = 'book-footer';
    footer.textContent = current.rewarded
      ? 'Page complete'
      : `Complete the page: +${current.completionGems.toString()} gems`;

    page.replaceChildren(grid, footer);
  }

  store.subscribe(render);
  render();
}
