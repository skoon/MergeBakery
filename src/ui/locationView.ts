/**
 * The Bakery screen (T5.3): Grandma's Corner Shop with its renovation spots.
 * The player spends stars on an available spot and watches it change from
 * before to after.
 */

import './locationView.css';
import { setImageArt } from '../render/assets';
import type { TaskId } from '../core/types';
import { locationModel, type SpotView } from './locationModel';
import type { GameStore } from './store';
import { reducedMotion, type SettingsStore } from './settings';

export function mountLocationView(
  container: HTMLElement,
  store: GameStore,
  settings: SettingsStore,
): void {
  function prefersReducedMotion(): boolean {
    return reducedMotion(
      settings.get(),
      matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  }

  const header = document.createElement('div');
  header.className = 'location-header';

  const scene = document.createElement('div');
  scene.className = 'location-scene';

  const backdrop = document.createElement('img');
  backdrop.className = 'location-scene__art';
  backdrop.alt = '';

  const spots = document.createElement('div');
  spots.className = 'location-spots';

  const popover = document.createElement('div');
  popover.className = 'location-popover';
  popover.hidden = true;

  scene.append(backdrop, spots, popover);
  const shelf = document.createElement('p');
  shelf.className = 'location-trophies';
  container.append(header, scene, shelf);

  let selected: TaskId | null = null;
  /** Each spot's state at the last render, to spot the one that just completed. */
  let previous = new Map<TaskId, SpotView['state']>();

  function showPopover(spot: SpotView): void {
    popover.replaceChildren();
    const title = document.createElement('p');
    title.className = 'location-popover__title';
    title.textContent = spot.name;
    popover.appendChild(title);

    if (spot.state === 'locked') {
      const why = document.createElement('p');
      why.className = 'location-popover__text';
      why.textContent = `First: ${spot.waitingFor ?? 'an earlier task'}.`;
      popover.appendChild(why);
    } else {
      const cost = document.createElement('p');
      cost.className = 'location-popover__text';
      cost.textContent = `★ ${spot.starCost.toString()}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'location-popover__button';
      const short = spot.starCost - store.getState().stars;
      button.disabled = !spot.canAfford;
      button.textContent = spot.canAfford
        ? 'Do it'
        : `Need ${short.toString()} more ★`;
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        selected = null;
        store.dispatch({ type: 'completeTask', taskId: spot.taskId });
      });
      popover.append(cost, button);
    }

    // Keep the popover inside the scene: open it on whichever side has room.
    popover.style.left = `${(Math.min(Math.max(spot.x, 0.2), 0.8) * 100).toString()}%`;
    popover.style.top = `${(spot.y * 100).toString()}%`;
    popover.dataset['below'] = String(spot.y < 0.35);
    popover.hidden = false;
  }

  function render(): void {
    const model = locationModel(store.data, store.getState());

    header.replaceChildren();
    const name = document.createElement('p');
    name.className = 'location-header__name';
    name.textContent = model.chapterName;
    const progress = document.createElement('p');
    progress.className = 'location-header__progress';
    progress.textContent = `${model.doneCount.toString()}/${model.total.toString()} done · ★ ${model.stars.toString()}`;
    header.append(name, progress);

    shelf.hidden = model.trophies.length === 0;
    shelf.textContent = `Trophies: ${model.trophies.join(', ')}`;

    setImageArt(backdrop, model.sceneKey);

    spots.replaceChildren();
    for (const spot of model.spots) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'location-spot';
      button.dataset['state'] = spot.state;
      button.style.left = `${(spot.x * 100).toString()}%`;
      button.style.top = `${(spot.y * 100).toString()}%`;
      button.setAttribute(
        'aria-label',
        `${spot.name}, ${spot.state === 'done' ? 'done' : `${spot.starCost.toString()} stars`}`,
      );

      const art = document.createElement('img');
      art.className = 'location-spot__art';
      art.alt = '';
      setImageArt(art, spot.spriteKey);
      button.appendChild(art);

      const justDone =
        spot.state === 'done' &&
        previous.has(spot.taskId) &&
        previous.get(spot.taskId) !== 'done';
      if (justDone && !prefersReducedMotion()) {
        // The before picture fades off the after one, with a small bounce.
        const before = document.createElement('img');
        before.className = 'location-spot__art location-spot__before';
        before.alt = '';
        const task = store.data.chapters
          .get(store.getState().chapterId)
          ?.tasks.find((t) => t.id === spot.taskId);
        if (task) setImageArt(before, task.beforeSpriteKey);
        before.addEventListener('animationend', () => {
          before.remove();
        });
        button.appendChild(before);
        button.classList.add('location-spot--bounce');
      }

      if (spot.state === 'available') {
        const tag = document.createElement('span');
        tag.className = 'location-spot__tag';
        tag.textContent = `★${spot.starCost.toString()}`;
        button.appendChild(tag);
      }

      button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (spot.state === 'done') return;
        selected = selected === spot.taskId ? null : spot.taskId;
        render();
      });
      spots.appendChild(button);
    }

    const open = model.spots.find(
      (s) => s.taskId === selected && s.state !== 'done',
    );
    if (open) {
      showPopover(open);
    } else {
      selected = null;
      popover.hidden = true;
    }

    previous = new Map(model.spots.map((s) => [s.taskId, s.state]));
  }

  // A tap on the scene outside a spot closes the popover.
  scene.addEventListener('click', () => {
    if (selected !== null) {
      selected = null;
      render();
    }
  });
  popover.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  store.subscribe(render);
  render();
}
