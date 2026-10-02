/**
 * The Shop screen (T7.8): spend coins on extra generators, energy and Pantry
 * slots.
 */

import './shopScreen.css';
import { setImageArt } from '../render/assets';
import type { RejectReason } from '../core/types';
import { shopModel } from './shopModel';
import type { GameStore } from './store';

const WHY: Partial<Record<RejectReason, string>> = {
  boardFull: 'No room on the board or in the Pantry. Clear a space first.',
  notEnoughCoins: 'Not enough coins yet.',
};

export function mountShop(container: HTMLElement, store: GameStore): void {
  const coins = document.createElement('p');
  coins.className = 'shop-coins';
  const message = document.createElement('p');
  message.className = 'shop-message';
  message.setAttribute('role', 'status');
  const list = document.createElement('div');
  list.className = 'shop-list';
  container.append(coins, message, list);

  function row(
    spriteKey: string,
    name: string,
    detail: string,
    price: number,
    affordable: boolean,
    buy: () => RejectReason | null,
  ): HTMLElement {
    const el = document.createElement('div');
    el.className = 'shop-row';

    const art = document.createElement('img');
    art.className = 'shop-row__art';
    art.alt = '';
    setImageArt(art, spriteKey);

    const text = document.createElement('div');
    text.className = 'shop-row__text';
    const title = document.createElement('p');
    title.className = 'shop-row__name';
    title.textContent = name;
    const sub = document.createElement('p');
    sub.className = 'shop-row__detail';
    sub.textContent = detail;
    text.append(title, sub);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shop-row__buy';
    button.textContent = `${price.toString()} coins`;
    button.disabled = !affordable;
    button.addEventListener('click', () => {
      const reason = buy();
      message.textContent = reason ? (WHY[reason] ?? '') : '';
    });

    el.append(art, text, button);
    return el;
  }

  function render(): void {
    const model = shopModel(store.data, store.getState());
    coins.textContent = `${model.coins.toString()} coins`;

    const rows = model.rows.map((r) =>
      row(r.spriteKey, r.name, r.detail, r.price, r.affordable, () => {
        const result = store.dispatch({
          type: 'buyShopItem',
          shopItemId: r.id,
        });
        return result.ok ? null : result.reason;
      }),
    );
    if (model.pantrySlot) {
      const slot = model.pantrySlot;
      rows.push(
        row(
          'corner-shop-varnish-shelves-after', // the shop's shelf art fits a Pantry slot
          'Pantry slot',
          `Room for ${(slot.capacity + 1).toString()} items in the Pantry`,
          slot.price,
          slot.affordable,
          () => {
            const result = store.dispatch({ type: 'buyPantrySlot' });
            return result.ok ? null : result.reason;
          },
        ),
      );
    }
    list.replaceChildren(...rows);
  }

  store.subscribe(render);
  render();
}
