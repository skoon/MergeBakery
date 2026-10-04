/**
 * The picture that follows the pointer during a drag, drawn as a plain image
 * on top of everything. A board item is otherwise drawn inside the PixiJS
 * canvas, which sits under the pantry drawer and the tray, so the item would
 * vanish behind them exactly where the player is dragging it to.
 *
 * Styled inline, so it doesn't depend on any one screen's stylesheet.
 */

import { setImageArt } from './assets';

export interface DragPreview {
  /** Centres the picture on a client position. */
  move(clientX: number, clientY: number): void;
  remove(): void;
}

export function createDragPreview(
  spriteKey: string,
  sizePx: number,
  at?: { x: number; y: number },
): DragPreview {
  const img = document.createElement('img');
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.style.cssText = [
    'position: fixed',
    'left: 0',
    'top: 0',
    `width: ${sizePx.toString()}px`,
    `height: ${sizePx.toString()}px`,
    'pointer-events: none',
    'transform: translate(-50%, -50%)',
    'z-index: 2147483647',
    'image-rendering: pixelated',
    'filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.35))',
  ].join(';');
  setImageArt(img, spriteKey);
  document.body.appendChild(img);

  const preview: DragPreview = {
    move(clientX, clientY) {
      img.style.left = `${clientX.toString()}px`;
      img.style.top = `${clientY.toString()}px`;
    },
    remove() {
      img.remove();
    },
  };
  if (at) preview.move(at.x, at.y);
  return preview;
}
