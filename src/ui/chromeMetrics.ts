/**
 * Measures the HUD, counter strip, tray and nav bar. They size to their content, so they
 * grow with the text size (T-R1). The heights go to CSS custom properties on `root` for
 * the sheets anchored to them, and the board reads the insets to fit itself in the rest.
 */

import type { Insets } from './layout';

/** Graphics and text grow on bigger screens and shrink a little on the smallest. 1 at 360 x 700. */
export function uiScale(width: number, height: number): number {
  const scale = Math.min(width / 360, height / 700);
  return Math.round(Math.min(1.5, Math.max(0.9, scale)) * 100) / 100;
}

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
    const { width, height } = root.getBoundingClientRect();
    // On the document element, with --text-scale: the font-size tokens are resolved there.
    document.documentElement.style.setProperty(
      '--ui-scale',
      uiScale(width, height).toString(),
    );
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
