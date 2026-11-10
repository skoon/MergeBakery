/**
 * The running season's colours (T14.8): its token overrides go on the page
 * root while it runs and come off when it ends. Only names tokens.css declares
 * get here; the pack build checks that.
 */

import { seasonTokens, type SeasonThemes } from './seasonModel';
import type { GameStore } from './store';

export function startSeasonTheme(
  store: GameStore,
  themes: SeasonThemes,
  root: HTMLElement = document.documentElement,
): void {
  let applied: Readonly<Record<string, string>> = {};
  function apply(): void {
    const tokens = seasonTokens(store.data, store.getState(), themes);
    if (JSON.stringify(tokens) === JSON.stringify(applied)) return;
    for (const name of Object.keys(applied)) root.style.removeProperty(name);
    for (const [name, value] of Object.entries(tokens)) {
      root.style.setProperty(name, value);
    }
    applied = tokens;
  }
  store.subscribe(apply);
  apply();
}
