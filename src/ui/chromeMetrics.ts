/**
 * Measures the HUD, counter strip, tray and nav bar. They size to their content, so they
 * grow with the text size (T-R1). The heights go to CSS custom properties on `root` for
 * the sheets anchored to them, and the board reads the insets to fit itself in the rest.
 *
 * The bars may grow until the board is left with half the height; past that they get a
 * smaller `--ui-scale` of their own, so their text and graphics shrink together (T-R2).
 */

import type { Insets } from './layout';

/** Graphics and text grow on bigger screens and shrink a little on the smallest. 1 at 360 x 700. */
export function uiScale(width: number, height: number): number {
  const scale = Math.min(width / 360, height / 700);
  return Math.round(Math.min(1.5, Math.max(0.9, scale)) * 100) / 100;
}

/** The share of the height the bars may take before they shrink. */
const CHROME_SHARE = 0.5;
/** The bars never shrink below this fraction of their size: smaller text can't be read. */
const MIN_CHROME_FIT = 0.75;

/**
 * The next factor to try on the bars' scale, when they are `chrome` px tall at `fit` and
 * may take `allowed` px. Borders and gaps don't scale, so one step falls short: measure
 * and call again.
 */
export function nextChromeFit(
  fit: number,
  chrome: number,
  allowed: number,
): number {
  if (chrome <= allowed) return fit;
  return Math.max(MIN_CHROME_FIT, (fit * allowed) / chrome);
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
    const scale = uiScale(width, height);
    // On the document element, with --text-scale: the font-size tokens are resolved there.
    document.documentElement.style.setProperty('--ui-scale', scale.toString());

    // From full size each time, so the bars grow back when there is room again.
    let fit = 1;
    for (let step = 0; step < 5; step++) {
      for (const bar of [els.top, els.bottom]) {
        bar.style.setProperty('--ui-scale', (scale * fit).toFixed(3));
      }
      const chrome = els.top.offsetHeight + els.bottom.offsetHeight;
      const next = nextChromeFit(fit, chrome, height * CHROME_SHARE);
      if (next === fit) break;
      fit = next;
    }

    for (const [name, el] of vars) {
      root.style.setProperty(name, `${el.getBoundingClientRect().height}px`);
    }
  }

  // Next frame, not in the observer's callback: publishing resizes what it observes.
  let frame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      publish();
      onChange();
    });
  });
  for (const el of [
    els.stage,
    els.top,
    els.bottom,
    ...vars.map(([, el]) => el),
  ])
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
    stop: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    },
  };
}
