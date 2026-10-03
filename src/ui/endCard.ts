/**
 * "The End" card (T11.5): when the last chapter's final task completes, the
 * finale scene plays, and then a card closes the story. The player can keep
 * baking afterwards.
 */

import './chapterTransition.css';
import { gameFinished } from '../core/renovation';
import type { DialoguePlayer } from './dialoguePlayer';
import type { GameStore } from './store';

export function mountEndCard(
  overlayRoot: HTMLElement,
  store: GameStore,
  dialogue: DialoguePlayer,
): void {
  const backdrop = document.createElement('div');
  backdrop.className = 'chapter-card';
  backdrop.hidden = true;

  const card = document.createElement('div');
  card.className = 'chapter-card__card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'The End');

  const kicker = document.createElement('p');
  kicker.className = 'chapter-card__kicker';
  kicker.textContent = 'The End';
  const title = document.createElement('h2');
  title.className = 'chapter-card__finished';
  title.textContent = 'The book is whole';
  const next = document.createElement('p');
  next.className = 'chapter-card__next';
  next.textContent =
    "The ovens are warm, the town is fed, and Grandma's recipe book is complete. Thank you for baking with us.";
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chapter-card__button';
  button.textContent = 'Keep baking';

  card.append(kicker, title, next, button);
  backdrop.appendChild(card);
  overlayRoot.appendChild(backdrop);

  button.addEventListener('click', () => {
    backdrop.hidden = true;
  });

  /** Waits until no scene is playing, then shows the card. */
  function showWhenQuiet(): void {
    if (dialogue.isPlaying()) {
      window.setTimeout(showWhenQuiet, 250);
      return;
    }
    backdrop.hidden = false;
    button.focus();
  }

  store.subscribe((state, events) => {
    // Only the moment the last task completes, not every load of a finished save.
    if (
      events.some((e) => e.type === 'taskCompleted') &&
      gameFinished(store.data, state)
    ) {
      showWhenQuiet();
    }
  });
}
