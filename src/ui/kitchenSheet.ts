/**
 * Oven button and Kitchen sheet (T4.4).
 *
 * The button sits in the middle of the tray, shows the most advanced bake as a
 * ring and finished bakes as a badge, accepts dropped board items, and toggles
 * a half-height sheet where bakes are started, rushed and collected and ovens
 * upgraded.
 *
 * The sheet is rebuilt on every store notification. The once-a-second tick only
 * rewrites the timer texts and bars in place: rebuilding every second would
 * swap a button out from under a press that straddles the rebuild, and the
 * click would be lost.
 */

import './kitchenSheet.css';
import { setImageArt } from '../render/assets';
import type { Timestamp } from '../core/types';
import { registerDropZone } from './dropZones';
import { kitchenModel, recipeForDrop, type KitchenModel } from './kitchenModel';
import { readSettings, writeSettings } from './settings';
import type { GameStore } from './store';

const SVG_NS = 'http://www.w3.org/2000/svg';
const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Changes here need a rebuild; everything else is a timer update. */
function structureKey(model: KitchenModel): string {
  return JSON.stringify([
    model.ovens.map((oven) =>
      oven.slots.map((s) => [s.status.kind, s.rushCost, s.canAffordRush]),
    ),
    model.recipes.map((r) => [r.cells !== null, r.inputs.map((i) => i.ready)]),
    model.freeSlot,
    model.upgrade,
  ]);
}

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

function art(spriteKey: string, className: string): HTMLImageElement {
  const img = el('img', className);
  img.alt = '';
  setImageArt(img, spriteKey);
  return img;
}

/**
 * "Notify me when bakes finish" (T4.9). Built once and re-attached on every
 * render, so a rebuild can't drop the answer to a pending permission prompt.
 * Null when the browser has no Notification API.
 */
function notificationToggle(): HTMLElement | null {
  if (typeof Notification === 'undefined') return null;

  const label = el('label', 'kitchen-toggle-setting');
  const checkbox = el('input', 'kitchen-toggle-setting__input');
  checkbox.type = 'checkbox';
  checkbox.checked =
    readSettings(localStorage).notifications &&
    Notification.permission === 'granted';
  label.append(
    checkbox,
    document.createTextNode('Notify me when bakes finish'),
  );

  checkbox.addEventListener('change', () => {
    void (async () => {
      let on = checkbox.checked;
      if (on && Notification.permission !== 'granted') {
        on = (await Notification.requestPermission()) === 'granted';
      }
      checkbox.checked = on;
      writeSettings(localStorage, {
        ...readSettings(localStorage),
        notifications: on,
      });
    })();
  });

  return label;
}

export function mountKitchen(
  tray: HTMLElement,
  overlayRoot: HTMLElement,
  store: GameStore,
  clock: () => Timestamp,
): void {
  // ─── Oven button ────────────────────────────────────────────────
  const button = el('button', 'kitchen-toggle');
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');

  const ring = document.createElementNS(SVG_NS, 'svg');
  ring.setAttribute('class', 'kitchen-toggle__ring');
  ring.setAttribute('viewBox', '0 0 36 36');
  ring.setAttribute('aria-hidden', 'true');
  const track = document.createElementNS(SVG_NS, 'circle');
  const fill = document.createElementNS(SVG_NS, 'circle');
  for (const circle of [track, fill]) {
    circle.setAttribute('cx', '18');
    circle.setAttribute('cy', '18');
    circle.setAttribute('r', RING_RADIUS.toString());
  }
  track.setAttribute('class', 'kitchen-toggle__track');
  fill.setAttribute('class', 'kitchen-toggle__fill');
  fill.setAttribute('stroke-dasharray', RING_CIRCUMFERENCE.toString());
  ring.append(track, fill);

  const label = el('span', 'kitchen-toggle__label', 'Oven');
  const badge = el('span', 'kitchen-toggle__badge');
  badge.hidden = true;
  button.append(ring, label, badge);
  tray.appendChild(button);

  // ─── Sheet ──────────────────────────────────────────────────────
  const sheet = el('div', 'kitchen-sheet');
  sheet.hidden = true;
  sheet.setAttribute('aria-label', 'Kitchen');
  overlayRoot.appendChild(sheet);

  let lastKey = '';
  let open = false;
  const extras = el('div', 'kitchen-extras');
  const toggle = notificationToggle();
  if (toggle) extras.appendChild(toggle);

  function setOpen(next: boolean): void {
    open = next;
    sheet.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    if (open) render();
  }

  button.addEventListener('click', () => {
    setOpen(!open);
  });

  registerDropZone(button, (cell) => {
    const drop = recipeForDrop(store.data, store.getState(), cell);
    if (drop) {
      store.dispatch({ type: 'loadRecipe', ...drop });
    } else {
      setOpen(true);
    }
  });

  function updateButton(model: KitchenModel): void {
    const progress = model.ringProgress;
    fill.style.opacity = progress === null ? '0' : '1';
    fill.setAttribute(
      'stroke-dashoffset',
      (RING_CIRCUMFERENCE * (1 - (progress ?? 0))).toString(),
    );
    badge.hidden = model.doneCount === 0;
    badge.textContent = model.doneCount.toString();
    button.setAttribute(
      'aria-label',
      model.doneCount > 0
        ? `Oven, ${model.doneCount.toString()} ready`
        : 'Oven',
    );
  }

  function render(): void {
    const model = kitchenModel(store.data, store.getState(), clock());
    lastKey = structureKey(model);
    updateButton(model);
    if (!open) return;

    sheet.replaceChildren();

    for (const oven of model.ovens) {
      const section = el('section', 'kitchen-oven');
      section.appendChild(el('h3', 'kitchen-oven__name', oven.name));

      for (const view of oven.slots) {
        const row = el('div', 'kitchen-slot');
        row.dataset['slot'] =
          `${view.slot.oven.toString()}-${view.slot.slot.toString()}`;
        const { status } = view;

        if (status.kind === 'empty') {
          row.appendChild(el('span', 'kitchen-slot__empty', 'Empty'));
        } else if (status.kind === 'baking') {
          const info = el('div', 'kitchen-slot__info');
          info.append(
            el('span', 'kitchen-slot__name', view.recipeName ?? ''),
            el('span', 'kitchen-slot__time', view.timeLeft ?? ''),
          );
          const bar = el('div', 'kitchen-slot__bar');
          const barFill = el('div', 'kitchen-slot__bar-fill');
          barFill.style.width = `${(status.progress * 100).toString()}%`;
          bar.appendChild(barFill);

          const rush = el(
            'button',
            'kitchen-button kitchen-button--secondary',
            `Rush — ${(view.rushCost ?? 0).toString()} gems`,
          );
          rush.type = 'button';
          rush.disabled = !view.canAffordRush;
          rush.addEventListener('click', () => {
            store.dispatch({ type: 'rushBake', slot: view.slot });
          });
          row.append(info, bar, rush);
        } else {
          const info = el('div', 'kitchen-slot__info');
          info.append(
            el('span', 'kitchen-slot__name', view.recipeName ?? ''),
            el('span', 'kitchen-slot__ready', 'Ready'),
          );
          const collect = el('button', 'kitchen-button', 'Collect');
          collect.type = 'button';
          collect.addEventListener('click', () => {
            store.dispatch({ type: 'collectBake', slot: view.slot });
          });
          row.append(info, collect);
        }
        section.appendChild(row);
      }
      sheet.appendChild(section);
    }

    if (model.upgrade) {
      const { from, to, nextName } = model.upgrade;
      const upgrade = el(
        'button',
        'kitchen-button kitchen-upgrade',
        `Upgrade to ${nextName}`,
      );
      upgrade.type = 'button';
      upgrade.addEventListener('click', () => {
        store.dispatch({ type: 'mergeOvens', from, to });
      });
      sheet.appendChild(upgrade);
    }

    const recipes = el('section', 'kitchen-recipes');
    recipes.appendChild(el('h3', 'kitchen-oven__name', 'Recipes'));
    for (const recipe of model.recipes) {
      const card = el('div', 'kitchen-recipe');

      const head = el('div', 'kitchen-recipe__head');
      head.append(
        art(recipe.outputSpriteKey, 'kitchen-recipe__output'),
        el('span', 'kitchen-recipe__name', recipe.name),
        el('span', 'kitchen-recipe__time', recipe.bakeTime),
      );

      const inputs = el('div', 'kitchen-recipe__inputs');
      for (const input of recipe.inputs) {
        const chip = el('span', 'kitchen-input');
        chip.title = input.name;
        chip.dataset['ready'] = String(input.ready);
        chip.appendChild(art(input.spriteKey, 'kitchen-input__art'));
        if (input.ready)
          chip.appendChild(el('span', 'kitchen-input__check', '✓'));
        inputs.appendChild(chip);
      }

      const send = el('button', 'kitchen-button', 'Send to Oven');
      send.type = 'button';
      const { cells } = recipe;
      const slot = model.freeSlot;
      send.disabled = cells === null || slot === null;
      send.addEventListener('click', () => {
        if (cells && slot) {
          store.dispatch({
            type: 'loadRecipe',
            slot,
            recipeId: recipe.recipeId,
            cells,
          });
        }
      });

      card.append(head, inputs, send);
      recipes.appendChild(card);
    }
    sheet.appendChild(recipes);

    sheet.appendChild(extras);
  }

  function tick(): void {
    const model = kitchenModel(store.data, store.getState(), clock());
    if (structureKey(model) !== lastKey) {
      render();
      return;
    }
    updateButton(model);
    if (!open) return;

    for (const oven of model.ovens) {
      for (const view of oven.slots) {
        if (view.status.kind !== 'baking') continue;
        const row = sheet.querySelector(
          `[data-slot="${view.slot.oven.toString()}-${view.slot.slot.toString()}"]`,
        );
        const time = row?.querySelector('.kitchen-slot__time');
        const barFill = row?.querySelector<HTMLElement>(
          '.kitchen-slot__bar-fill',
        );
        if (time) time.textContent = view.timeLeft ?? '';
        if (barFill) {
          barFill.style.width = `${(view.status.progress * 100).toString()}%`;
        }
      }
    }
  }

  store.subscribe(() => {
    render();
  });
  window.setInterval(tick, 1000);
  render();
}
