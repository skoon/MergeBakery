/**
 * A tiny tween helper driven by a PixiJS Ticker, with two easing curves (T2.9).
 * No timers of its own: progress advances from the ticker's delta, so tests
 * can drive it deterministically with a fake ticker.
 */

import type { Ticker } from 'pixi.js';

/** Overshoots past 1 before settling back at 1. */
export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = t - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
}

export function easeOutCubic(t: number): number {
  const x = 1 - t;
  return 1 - x * x * x;
}

/**
 * Calls onUpdate with eased progress from 0 to 1 over durationMs on the ticker, then
 * onComplete, and removes itself. The returned function cancels it early.
 */
export function tween(
  ticker: Ticker,
  options: {
    durationMs: number;
    ease?: (t: number) => number;
    onUpdate: (t: number) => void;
    onComplete?: () => void;
  },
): () => void {
  const { durationMs, ease = (t: number) => t, onUpdate, onComplete } = options;
  let elapsedMs = 0;

  function cancel(): void {
    ticker.remove(onTick);
  }

  function onTick(tickerInstance: Ticker): void {
    elapsedMs += tickerInstance.deltaMS;
    const progress = durationMs <= 0 ? 1 : Math.min(elapsedMs / durationMs, 1);
    onUpdate(ease(progress));

    if (progress >= 1) {
      cancel();
      onComplete?.();
    }
  }

  ticker.add(onTick);

  return cancel;
}
