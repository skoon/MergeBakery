/**
 * Measures the HUD, counter strip, tray and nav bar. They size to their content, so they
 * grow with the text size (T-R1). The heights go to CSS custom properties on `root` for
 * the sheets anchored to them, and the board reads the insets to fit itself in the rest.
 */

import type { Insets } from './layout';

export interface ChromeElements {
  readonly stage: HTMLElement;
  readonly hud: HTMLElement;
  readonly counter: HTMLElement;
  readonly tray: HTMLElement;
  readonly nav: HTMLElement;
  /** Wraps the HUD and counter. */
  readonly top: HTMLElement;
  /** Wraps the tray and nav. */
  readonly bottom: HTMLElement;
}

export interface ChromeMetrics {
  getInsets(): Insets;
  stop(): void;
}

/** Calls `onChange` after the heights change. */
export function mountChromeMetrics(
  root: HTMLElement,
  els: ChromeElements,
  onChange: () => void,
): ChromeMetrics {
  const vars: [string, HTMLElement][] = [
    ['--hud-height', els.hud],
    ['--counter-height', els.counter],
    ['--tray-height', els.tray],
    ['--nav-height', els.nav],
  ];

  function publish(): void {
    for (const [name, el] of vars) {
      root.style.setProperty(name, `${el.getBoundingClientRect().height}px`);
    }
  }

  const observer = new ResizeObserver(() => {
    publish();
    onChange();
  });
  for (const el of [els.stage, ...vars.map(([, el]) => el)])
    observer.observe(el);
  publish();

  return {
    getInsets(): Insets {
      const stage = els.stage.getBoundingClientRect();
      return {
        top: els.top.getBoundingClientRect().bottom - stage.top,
        bottom: els.bottom.getBoundingClientRect().top - stage.top,
      };
    },
    stop: () => observer.disconnect(),
  };
}
