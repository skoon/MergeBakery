/**
 * Season UI (T14.8): a pill in the top chrome while a season is open or
 * joined, a one-time invitation card, a sheet with Season Points and the
 * milestone track, and a result card when the season ends. Laid out like the
 * MegaBun event UI, whose sheet and card styles it shares.
 *
 * The sheet is rebuilt on store notifications; the once-a-second timer keeps
 * the time left current and shows the pill when a window opens.
 */

import './eventSheet.css';
import './seasonSheet.css';
import type { Timestamp } from '../core/types';
import {
  inviteKey,
  joinableSeason,
  invitationText,
  seasonButton,
  seasonResultView,
  seasonSheet,
  type InviteMemory,
  type SeasonButtonModel,
  type SeasonThemes,
} from './seasonModel';
import type { GameStore } from './store';

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

function button(className: string, text: string, onClick: () => void) {
  const b = el('button', className, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

export interface SeasonSheetOptions {
  readonly themes: SeasonThemes;
  readonly invites: InviteMemory;
  readonly clock: () => Timestamp;
}

export function mountSeasonSheet(
  topChrome: HTMLElement,
  overlayRoot: HTMLElement,
  store: GameStore,
  { themes, invites, clock }: SeasonSheetOptions,
): void {
  const pill = el('button', 'event-pill season-pill');
  pill.type = 'button';
  pill.hidden = true;
  pill.setAttribute('aria-expanded', 'false');
  const pillName = el('span', 'event-pill__name');
  const pillTime = el('span', 'event-pill__time');
  const pillBadge = el('span', 'event-pill__badge');
  pill.append(pillName, pillTime, pillBadge);

  const sheet = el('div', 'event-sheet season-sheet');
  sheet.hidden = true;
  topChrome.appendChild(pill);
  overlayRoot.appendChild(sheet);

  const join = (seasonId: string): void => {
    store.dispatch({ type: 'joinSeason', seasonId });
  };

  // ─── Pill and sheet ─────────────────────────────────────────────
  let open = false;
  function setOpen(next: boolean): void {
    open = next;
    sheet.hidden = !open;
    pill.setAttribute('aria-expanded', String(open));
    if (open) renderSheet();
  }
  pill.addEventListener('click', () => {
    setOpen(!open);
  });

  let shown: string | null = null;
  function updatePill(model: SeasonButtonModel | null): void {
    pill.hidden = !model;
    shown = model ? `${model.seasonId}:${model.kind}` : null;
    if (!model) return;
    pillName.textContent = model.name;
    pillTime.textContent =
      model.kind === 'offer' ? 'New season' : model.timeLeft;
    pillBadge.hidden = model.claimable === 0;
    pillBadge.textContent = model.claimable.toString();
    pill.setAttribute('aria-label', model.label);
  }

  function renderSheet(): void {
    const model = seasonSheet(store.data, store.getState(), clock(), themes);
    if (!model) {
      setOpen(false);
      return;
    }
    sheet.replaceChildren();
    sheet.setAttribute('aria-label', model.name);
    const head = el('div', 'event-sheet__head');
    head.append(
      el('h2', 'event-sheet__title', model.name),
      el('span', 'event-sheet__time', `${model.timeLeft} left`),
      button('event-sheet__close', 'Close', () => {
        setOpen(false);
      }),
    );
    sheet.append(head, el('p', 'event-sheet__howto', model.text));
    if (model.status === 'offer') {
      sheet.appendChild(
        button('season-sheet__join', `Join ${model.name}`, () => {
          join(model.seasonId);
        }),
      );
    } else {
      sheet.appendChild(
        el(
          'p',
          'season-sheet__points',
          `Season Points: ${model.points.toString()}`,
        ),
      );
    }

    const track = el('ul', 'event-track');
    for (const m of model.milestones) {
      const row = el('li', `event-milestone event-milestone--${m.status}`);
      row.append(
        el('span', 'event-milestone__points', `${m.points.toString()} pts`),
        el('span', 'event-milestone__reward', m.rewardText),
      );
      row.appendChild(
        m.status === 'ready'
          ? button('event-milestone__claim', 'Claim', () => {
              store.dispatch({ type: 'claimSeasonMilestone', index: m.index });
            })
          : el(
              'span',
              'event-milestone__state',
              m.status === 'claimed' ? 'Claimed' : 'Locked',
            ),
      );
      track.appendChild(row);
    }
    sheet.appendChild(track);
  }

  // ─── Invitation and result cards ────────────────────────────────
  const backdrop = el('div', 'event-result season-card');
  backdrop.hidden = true;
  const card = el('div', 'event-result__card');
  card.setAttribute('role', 'dialog');
  backdrop.appendChild(card);
  overlayRoot.appendChild(backdrop);

  /** The run whose invitation is showing, if any. */
  let inviting: string | null = null;

  function showCard(title: string, lines: string[], actions: HTMLElement[]) {
    card.replaceChildren(el('h2', 'event-result__title', title));
    card.setAttribute('aria-label', title);
    for (const line of lines) {
      card.appendChild(el('p', 'event-result__line', line));
    }
    card.append(...actions);
    backdrop.hidden = false;
    actions[0]?.focus();
  }

  function renderCards(): void {
    const result = seasonResultView(store.data, store.getState());
    if (result) {
      inviting = null;
      showCard(result.title, result.lines, [
        button('event-result__ok', 'OK', () => {
          store.dispatch({ type: 'dismissSeasonResult' });
        }),
      ]);
      return;
    }
    const season = joinableSeason(store.data, store.getState(), clock());
    const key = season && inviteKey(season);
    if (!season || !key || invites.seen(key)) {
      inviting = null;
      backdrop.hidden = true;
      return;
    }
    if (inviting === key) return;
    inviting = key;
    const answer = (joining: boolean): void => {
      invites.markSeen(key);
      inviting = null;
      backdrop.hidden = true;
      if (joining) join(season.def.id);
    };
    showCard(
      season.def.name,
      [invitationText(season.def, themes.get(season.def.id))],
      [
        button('event-result__ok', 'Join', () => {
          answer(true);
        }),
        button('season-card__later', 'Not now', () => {
          answer(false);
        }),
      ],
    );
  }

  function render(): void {
    updatePill(seasonButton(store.data, store.getState(), clock()));
    if (open) renderSheet();
    renderCards();
  }

  function tick(): void {
    const model = seasonButton(store.data, store.getState(), clock());
    const now = model ? `${model.seasonId}:${model.kind}` : null;
    // A window opening or closing changes what shows; otherwise only the time.
    if (now !== shown) {
      render();
      return;
    }
    updatePill(model);
    const time = sheet.querySelector('.event-sheet__time');
    if (open && time && model) time.textContent = `${model.timeLeft} left`;
  }

  store.subscribe(render);
  window.setInterval(tick, 1000);
  render();
}
