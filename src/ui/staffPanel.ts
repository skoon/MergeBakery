/**
 * The Staff panel on the Bakery screen (T10.4): company reputation, and who
 * can be hired, with a chain to point each tapper at.
 *
 * Rebuilt on every store notification, which is fine here: nothing on the panel
 * counts down, so no press is lost to a rebuild.
 */

import './staffPanel.css';
import { setImageArt } from '../render/assets';
import type { GameStore } from './store';
import { staffModel } from './staffModel';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function mountStaffPanel(
  container: HTMLElement,
  store: GameStore,
): void {
  const panel = el('section', 'staff-panel');
  panel.setAttribute('aria-label', 'Staff');
  container.appendChild(panel);

  function render(): void {
    const model = staffModel(store.data, store.getState());
    panel.hidden = model.rows.length === 0;
    if (panel.hidden) return;

    panel.replaceChildren();
    const head = el('div', 'staff-panel__head');
    head.append(
      el('h2', 'staff-panel__title', 'Staff'),
      el(
        'span',
        'staff-panel__rep',
        `Reputation ${model.reputation.toString()}`,
      ),
    );
    panel.appendChild(head);

    for (const row of model.rows) {
      const card = el('div', 'staff-card');
      const portrait = el('img', 'staff-card__portrait');
      portrait.alt = '';
      setImageArt(portrait, `${row.portraitKey}-neutral`);

      const text = el('div', 'staff-card__text');
      text.append(
        el('p', 'staff-card__name', row.name),
        el('p', 'staff-card__blurb', row.blurb),
      );

      const action = el('div', 'staff-card__action');
      if (!row.hired) {
        const hire = el(
          'button',
          'staff-card__hire',
          `Hire · ${row.hireCost.toString()}c`,
        );
        hire.type = 'button';
        hire.disabled = row.hireBlocked !== null;
        hire.addEventListener('click', () => {
          store.dispatch({ type: 'hireStaff', staffId: row.staffId });
        });
        action.appendChild(hire);
        if (row.hireBlocked) {
          action.appendChild(el('p', 'staff-card__why', row.hireBlocked));
        }
      } else if (row.role === 'oven') {
        const select = el('select', 'staff-card__select');
        select.setAttribute('aria-label', `${row.name}'s recipe`);
        const rest = el('option', '', 'Resting');
        rest.value = '';
        select.appendChild(rest);
        for (const option of row.recipeOptions) {
          const o = el('option', '', option.name);
          o.value = option.recipeId;
          select.appendChild(o);
        }
        select.value = row.assignedRecipe ?? '';
        select.addEventListener('change', () => {
          store.dispatch({
            type: 'assignStaff',
            staffId: row.staffId,
            chainId: null,
            recipeId: select.value === '' ? null : select.value,
          });
        });
        action.appendChild(select);
      } else if (row.role === 'tapper') {
        const select = el('select', 'staff-card__select');
        select.setAttribute('aria-label', `${row.name}'s generator`);
        const rest = el('option', '', 'Resting');
        rest.value = '';
        select.appendChild(rest);
        for (const option of row.chainOptions) {
          const o = el('option', '', option.name);
          o.value = option.chainId;
          select.appendChild(o);
        }
        select.value = row.assignedChain ?? '';
        select.addEventListener('change', () => {
          store.dispatch({
            type: 'assignStaff',
            staffId: row.staffId,
            chainId: select.value === '' ? null : select.value,
          });
        });
        action.appendChild(select);
      } else {
        action.appendChild(el('p', 'staff-card__on', 'On the job'));
      }

      card.append(portrait, text, action);
      panel.appendChild(card);
    }
  }

  store.subscribe(render);
  render();
}
