/**
 * MegaBun event UI (T8.5): a pill under the counter strip while an event runs,
 * a sheet with the race against MegaBun and the milestone track, and a result
 * card when an event ends.
 *
 * The sheet is rebuilt on every store notification; the once-a-second timer
 * only rewrites the time and bar widths in place, so a press is never lost to
 * a rebuild (the Kitchen sheet works the same way).
 */

import './eventSheet.css';
import type { Timestamp } from '../core/types';
import { eventModel, eventResultLines, type EventModel } from './eventModel';
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

const pct = (n: number): string => `${(n * 100).toString()}%`;

function bar(label: string, value: number, progress: number, mod: string) {
  const row = el('div', 'event-bar');
  const text = el('div', 'event-bar__label');
  text.append(
    el('span', '', label),
    el('span', 'event-bar__value', value.toString()),
  );
  const track = el('div', 'event-bar__track');
  const fill = el('div', `event-bar__fill event-bar__fill--${mod}`);
  fill.style.width = pct(progress);
  track.appendChild(fill);
  row.append(text, track);
  return row;
}

export function mountEventSheet(
  overlayRoot: HTMLElement,
  store: GameStore,
  clock: () => Timestamp,
): void {
  const pill = el('button', 'event-pill');
  pill.type = 'button';
  pill.hidden = true;
  pill.setAttribute('aria-expanded', 'false');
  const pillName = el('span', 'event-pill__name');
  const pillTime = el('span', 'event-pill__time');
  const pillBadge = el('span', 'event-pill__badge');
  pill.append(pillName, pillTime, pillBadge);

  const sheet = el('div', 'event-sheet');
  sheet.hidden = true;
  overlayRoot.append(pill, sheet);

  let open = false;
  function setOpen(next: boolean): void {
    open = next;
    sheet.hidden = !open;
    pill.setAttribute('aria-expanded', String(open));
    if (open) render();
  }
  pill.addEventListener('click', () => {
    setOpen(!open);
  });

  function updatePill(model: EventModel): void {
    pillName.textContent = model.name;
    pillTime.textContent = model.timeLeft;
    pillBadge.hidden = model.claimable === 0;
    pillBadge.textContent = model.claimable.toString();
    pill.setAttribute(
      'aria-label',
      `${model.name}, ${model.timeLeft} left` +
        (model.claimable > 0
          ? `, ${model.claimable.toString()} reward ready`
          : ''),
    );
  }

  function render(): void {
    const model = eventModel(store.data, store.getState(), clock());
    pill.hidden = !model;
    if (!model) {
      setOpen(false);
      return;
    }
    updatePill(model);
    if (!open) return;

    sheet.replaceChildren();
    sheet.setAttribute('aria-label', model.name);
    const head = el('div', 'event-sheet__head');
    head.append(
      el('h2', 'event-sheet__title', model.name),
      el('span', 'event-sheet__time', `${model.timeLeft} left`),
    );
    const close = el('button', 'event-sheet__close', 'Close');
    close.type = 'button';
    close.addEventListener('click', () => {
      setOpen(false);
    });
    head.appendChild(close);
    sheet.appendChild(head);

    sheet.appendChild(
      bar('Hometown Pride', model.points, model.playerProgress, 'you'),
    );
    sheet.appendChild(
      bar('MegaBun', model.megabun, model.megabunProgress, 'megabun'),
    );
    sheet.appendChild(
      el(
        'p',
        'event-sheet__hint',
        model.ahead
          ? `You're ahead. Finish with ${model.target.toString()} to win.`
          : `MegaBun leads. Finish with ${model.target.toString()} to win.`,
      ),
    );

    const track = el('ul', 'event-track');
    for (const m of model.milestones) {
      const row = el('li', `event-milestone event-milestone--${m.status}`);
      row.append(
        el('span', 'event-milestone__points', `${m.points.toString()} pts`),
        el('span', 'event-milestone__reward', m.rewardText),
      );
      if (m.status === 'ready') {
        const claim = el('button', 'event-milestone__claim', 'Claim');
        claim.type = 'button';
        claim.addEventListener('click', () => {
          store.dispatch({ type: 'claimMilestone', index: m.index });
        });
        row.appendChild(claim);
      } else {
        row.appendChild(
          el(
            'span',
            'event-milestone__state',
            m.status === 'claimed' ? 'Claimed' : 'Locked',
          ),
        );
      }
      track.appendChild(row);
    }
    sheet.appendChild(track);
  }

  // ─── Result card ────────────────────────────────────────────────
  const backdrop = el('div', 'event-result');
  backdrop.hidden = true;
  const card = el('div', 'event-result__card');
  card.setAttribute('role', 'dialog');
  backdrop.appendChild(card);
  overlayRoot.appendChild(backdrop);

  function renderResult(): void {
    const result = eventResultLines(store.data, store.getState());
    backdrop.hidden = !result;
    if (!result) return;
    card.replaceChildren(el('h2', 'event-result__title', result.title));
    card.setAttribute('aria-label', result.title);
    for (const line of result.lines)
      card.appendChild(el('p', 'event-result__line', line));
    const ok = el('button', 'event-result__ok', 'OK');
    ok.type = 'button';
    ok.addEventListener('click', () => {
      store.dispatch({ type: 'dismissEventResult' });
    });
    card.appendChild(ok);
    ok.focus();
  }

  function tick(): void {
    const model = eventModel(store.data, store.getState(), clock());
    if (!model) return;
    updatePill(model);
    if (!open) return;
    const time = sheet.querySelector('.event-sheet__time');
    if (time) time.textContent = `${model.timeLeft} left`;
    const values = sheet.querySelectorAll('.event-bar__value');
    const fills = sheet.querySelectorAll<HTMLElement>('.event-bar__fill');
    if (values[1]) values[1].textContent = model.megabun.toString();
    if (fills[1]) fills[1].style.width = pct(model.megabunProgress);
  }

  store.subscribe(() => {
    render();
    renderResult();
  });
  window.setInterval(tick, 1000);
  render();
  renderResult();
}
