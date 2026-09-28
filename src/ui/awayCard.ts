/**
 * "While you were away" card (T4.8).
 *
 * Shown once on load, when resolveOffline found something worth reporting.
 */

import './awayCard.css';
import type { AwaySummary } from '../core/offline';
import type { GameData } from '../core/types';

/** "45 min", "3 h 12 min", "2 d 4 h". Rounded down; the smaller unit is dropped when it is 0. */
export function formatAway(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const restHours = hours % 24;
    return restHours > 0
      ? `${days.toString()} d ${restHours.toString()} h`
      : `${days.toString()} d`;
  }
  if (hours > 0) {
    const restMinutes = minutes % 60;
    return restMinutes > 0
      ? `${hours.toString()} h ${restMinutes.toString()} min`
      : `${hours.toString()} h`;
  }
  return `${minutes.toString()} min`;
}

/** The card's lines, in order. Only lines with something to say. */
export function awayCardLines(
  data: GameData,
  summary: AwaySummary,
): readonly string[] {
  const lines = [`You were away ${formatAway(summary.awayMs)}.`];

  if (summary.energyGained > 0) {
    lines.push(`+${summary.energyGained.toString()} energy`);
  }

  for (const recipeId of summary.bakesFinished) {
    const recipe = data.recipes.get(recipeId);
    lines.push(`${recipe ? recipe.name : recipeId} is ready`);
  }

  if (summary.generatorsRecharged > 0) {
    const count = summary.generatorsRecharged;
    lines.push(
      count === 1
        ? '1 generator recharged'
        : `${count.toString()} generators recharged`,
    );
  }

  return lines;
}

export function showAwayCard(
  overlayRoot: HTMLElement,
  data: GameData,
  summary: AwaySummary,
): void {
  const backdrop = document.createElement('div');
  backdrop.className = 'away-card__backdrop';

  const card = document.createElement('div');
  card.className = 'away-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'While you were away');

  const title = document.createElement('h2');
  title.className = 'away-card__title';
  title.textContent = 'While you were away';
  card.appendChild(title);

  for (const line of awayCardLines(data, summary)) {
    const row = document.createElement('p');
    row.className = 'away-card__line';
    row.textContent = line;
    card.appendChild(row);
  }

  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'away-card__ok';
  ok.textContent = 'OK';
  ok.addEventListener('click', () => {
    backdrop.remove();
  });
  card.appendChild(ok);

  backdrop.appendChild(card);
  overlayRoot.appendChild(backdrop);
  ok.focus();
}
