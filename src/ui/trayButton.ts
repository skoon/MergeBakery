/**
 * The tray's buttons (Pantry, Oven, Sell) share one look: a pixel-art plate with an icon above a
 * text label (T-R5). The label stays real text, so it scales with the text size.
 */

import './trayButton.css';
import { setImageArt } from '../render/assets';

/** Styles `button` as a tray button with `spriteKey`'s art above `text`. Returns the label to update. */
export function styleTrayButton(
  button: HTMLButtonElement,
  spriteKey: string,
  text: string,
): { label: HTMLElement } {
  button.classList.add('tray-btn');
  const icon = document.createElement('img');
  icon.className = 'tray-btn__icon';
  icon.alt = '';
  setImageArt(icon, spriteKey);
  const label = document.createElement('span');
  label.className = 'tray-btn__label';
  label.textContent = text;
  button.append(icon, label);
  return { label };
}
