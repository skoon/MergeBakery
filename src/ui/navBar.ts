/**
 * Bottom nav bar and the full-height screens it opens (T5.8).
 *
 * Each screen is built the first time it opens and kept afterwards, so a
 * screen's own state (a scroll position, an open tab) survives switching away.
 */

import './navBar.css';
import type { Router, ScreenId } from './router';

export interface ScreenDef {
  id: Exclude<ScreenId, 'board'>;
  label: string;
  /** Builds the screen's contents into `container`. Called once, the first time the screen opens. */
  mount(container: HTMLElement): void;
}

export function mountNavBar(
  nav: HTMLElement,
  screensRoot: HTMLElement,
  router: Router,
  screens: readonly ScreenDef[],
): void {
  const tabs: { id: ScreenId; label: string }[] = [
    { id: 'board', label: 'Board' },
    ...screens.map(({ id, label }) => ({ id, label })),
  ];

  const buttons = tabs.map(({ id, label }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-tab';
    button.dataset['screen'] = id;
    button.textContent = label;
    button.addEventListener('click', () => {
      router.show(id);
    });
    nav.appendChild(button);
    return button;
  });

  const panels = new Map<ScreenId, HTMLElement>();
  const mounted = new Set<ScreenId>();

  for (const screen of screens) {
    const panel = document.createElement('section');
    panel.className = 'screen';
    panel.hidden = true;
    panel.setAttribute('aria-label', screen.label);

    const header = document.createElement('header');
    header.className = 'screen__header';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'screen__back';
    back.textContent = '‹ Back';
    back.addEventListener('click', () => {
      router.back();
    });
    const title = document.createElement('h2');
    title.className = 'screen__title';
    title.textContent = screen.label;
    header.append(back, title);

    const body = document.createElement('div');
    body.className = 'screen__body';
    panel.append(header, body);
    screensRoot.appendChild(panel);
    panels.set(screen.id, panel);

    // Mount lazily: a screen nobody opens costs nothing.
    router.subscribe((id) => {
      if (id === screen.id && !mounted.has(id)) {
        mounted.add(id);
        screen.mount(body);
      }
    });
  }

  function render(current: ScreenId): void {
    for (const button of buttons) {
      if (button.dataset['screen'] === current) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    }
    for (const [id, panel] of panels) {
      panel.hidden = id !== current;
    }
    screensRoot.hidden = current === 'board';
  }

  router.subscribe(render);
  render(router.current());

  document.addEventListener('keydown', (event) => {
    // An open <dialog> handles its own Escape; don't also leave the screen.
    if (
      event.key === 'Escape' &&
      router.current() !== 'board' &&
      !document.querySelector('dialog[open]')
    ) {
      router.back();
    }
  });
}
