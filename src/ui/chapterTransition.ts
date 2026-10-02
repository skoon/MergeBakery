/**
 * Moving on to the next chapter (T7.5): when `chapterStarted` arrives, a
 * "Chapter complete" card celebrates the one just finished, then the new
 * chapter's intro scene plays. The Bakery screen follows `state.chapterId`
 * on its own.
 *
 * The finished chapter's last task usually has a scene of its own, which the
 * dialogue player is showing when the event arrives, so the card waits for it.
 */

import './chapterTransition.css';
import type { ChapterId } from '../core/types';
import type { DialoguePlayer } from './dialoguePlayer';
import type { GameStore } from './store';

export interface ChapterTransition {
  /** Shows the card for a chapter the save moved on to while loading. */
  announce(chapterId: ChapterId): void;
}

export function mountChapterTransition(
  overlayRoot: HTMLElement,
  store: GameStore,
  dialogue: DialoguePlayer,
): ChapterTransition {
  const backdrop = document.createElement('div');
  backdrop.className = 'chapter-card';
  backdrop.hidden = true;

  const card = document.createElement('div');
  card.className = 'chapter-card__card';
  card.setAttribute('role', 'dialog');

  const kicker = document.createElement('p');
  kicker.className = 'chapter-card__kicker';
  kicker.textContent = 'Chapter complete!';
  const finished = document.createElement('h2');
  finished.className = 'chapter-card__finished';
  const next = document.createElement('p');
  next.className = 'chapter-card__next';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chapter-card__button';
  button.textContent = 'On to the next chapter';

  card.append(kicker, finished, next, button);
  backdrop.appendChild(card);
  overlayRoot.appendChild(backdrop);

  let showing: ChapterId | null = null;

  function show(chapterId: ChapterId): void {
    const ids = Array.from(store.data.chapters.keys());
    const previous = store.data.chapters.get(
      ids[ids.indexOf(chapterId) - 1] ?? '',
    );
    const upcoming = store.data.chapters.get(chapterId);
    finished.textContent = previous ? `${previous.name} is done` : 'Well done';
    next.textContent = upcoming ? `Next: ${upcoming.name}` : '';
    card.setAttribute(
      'aria-label',
      `Chapter complete. Next: ${upcoming?.name ?? ''}`,
    );
    showing = chapterId;
    backdrop.hidden = false;
    button.focus();
  }

  /** Waits until no scene is playing, then shows the card. */
  function showWhenQuiet(chapterId: ChapterId): void {
    if (dialogue.isPlaying()) {
      window.setTimeout(() => {
        showWhenQuiet(chapterId);
      }, 250);
      return;
    }
    show(chapterId);
  }

  button.addEventListener('click', () => {
    backdrop.hidden = true;
    const intro = showing
      ? store.data.chapters.get(showing)?.introSceneId
      : null;
    showing = null;
    if (intro) void dialogue.play(intro);
  });

  store.subscribe((_state, events) => {
    for (const event of events) {
      if (event.type === 'chapterStarted') showWhenQuiet(event.chapterId);
    }
  });

  return { announce: showWhenQuiet };
}
