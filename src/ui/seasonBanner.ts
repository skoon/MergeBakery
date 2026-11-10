/**
 * The new-season banner and the season sweep notice (T14.6).
 *
 * The banner: every `intervalMs`, and when the tab becomes visible again, the
 * game asks what seasons it could load now; when there are any and the
 * tutorial is done, a banner offers to reload. The notice: a one-time card at
 * startup when loading the save swept season content out.
 */

import './awayCard.css';
import './seasonBanner.css';
import type { SeasonOffer } from '../seasons/loader';
import { bannerText } from './seasonBannerModel';
import type { GameStore } from './store';

export interface SeasonBannerOptions {
  /** What could be loaded now; never rejects (checkForSeasons). */
  readonly findOffers: () => Promise<readonly SeasonOffer[]>;
  /** Saves and reloads the page. */
  readonly reload: () => void;
  readonly intervalMs: number;
}

export function mountSeasonBanner(
  overlayRoot: HTMLElement,
  store: GameStore,
  options: SeasonBannerOptions,
): void {
  let offers: readonly SeasonOffer[] = [];
  let banner: HTMLButtonElement | null = null;
  let checking = false;

  const render = (): void => {
    const text =
      store.getState().tutorialStep === 'done' ? bannerText(offers) : null;
    if (text === null) {
      banner?.remove();
      banner = null;
      return;
    }
    if (!banner) {
      banner = document.createElement('button');
      banner.type = 'button';
      banner.className = 'season-banner';
      banner.addEventListener('click', options.reload);
      overlayRoot.appendChild(banner);
    }
    banner.textContent = text;
  };

  const check = async (): Promise<void> => {
    if (checking) return;
    checking = true;
    try {
      offers = await options.findOffers();
      render();
    } finally {
      checking = false;
    }
  };

  setInterval(() => {
    void check();
  }, options.intervalMs);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check();
  });
  // The tutorial finishing can reveal a banner already found.
  store.subscribe(() => {
    if (offers.length > 0) render();
  });
}

/** A one-time card, in the away card's style, saying what loading swept out. */
export function showSeasonSweepNotice(
  overlayRoot: HTMLElement,
  notice: { readonly title: string; readonly text: string },
): void {
  const backdrop = document.createElement('div');
  backdrop.className = 'away-card__backdrop';

  const card = document.createElement('div');
  card.className = 'away-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', notice.title);

  const title = document.createElement('h2');
  title.className = 'away-card__title';
  title.textContent = notice.title;
  card.appendChild(title);

  const line = document.createElement('p');
  line.className = 'away-card__line';
  line.textContent = notice.text;
  card.appendChild(line);

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
