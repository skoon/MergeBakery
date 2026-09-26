/**
 * Tests for the ticker-driven tween helper (T2.9).
 */

import { describe, it, expect, vi } from 'vitest';
import type { Ticker } from 'pixi.js';
import { easeOutBack, easeOutCubic, tween } from './tween';

type TickListener = (ticker: Ticker) => void;

/** A minimal stand-in for a PixiJS Ticker: add/remove one listener, and a
 * manual `tick` to fire it with a chosen deltaMS. */
function createFakeTicker(): {
  ticker: Ticker;
  tick: (deltaMS: number) => void;
  hasListener: () => boolean;
} {
  let listener: TickListener | null = null;

  const ticker = {
    add(fn: TickListener) {
      listener = fn;
    },
    remove(fn: TickListener) {
      if (listener === fn) {
        listener = null;
      }
    },
  } as unknown as Ticker;

  return {
    ticker,
    tick(deltaMS: number) {
      listener?.({ deltaMS } as Ticker);
    },
    hasListener() {
      return listener !== null;
    },
  };
}

describe('easeOutBack', () => {
  it('returns 0 at t=0', () => {
    expect(easeOutBack(0)).toBeCloseTo(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeOutBack(1)).toBeCloseTo(1);
  });
});

describe('easeOutCubic', () => {
  it('returns 0 at t=0', () => {
    expect(easeOutCubic(0)).toBeCloseTo(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeOutCubic(1)).toBeCloseTo(1);
  });
});

describe('tween', () => {
  it('progresses onUpdate to 1, calls onComplete once, and removes itself', () => {
    const fake = createFakeTicker();
    const onUpdate = vi.fn();
    const onComplete = vi.fn();

    tween(fake.ticker, { durationMs: 100, onUpdate, onComplete });

    fake.tick(40);
    fake.tick(40);
    fake.tick(40); // overshoots past durationMs

    expect(onUpdate).toHaveBeenLastCalledWith(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(fake.hasListener()).toBe(false);
  });

  it('applies the ease function to progress', () => {
    const fake = createFakeTicker();
    const onUpdate = vi.fn();

    tween(fake.ticker, { durationMs: 100, ease: () => 0.5, onUpdate });
    fake.tick(50);

    expect(onUpdate).toHaveBeenCalledWith(0.5);
  });

  it('defaults to linear progress when no ease is given', () => {
    const fake = createFakeTicker();
    const onUpdate = vi.fn();

    tween(fake.ticker, { durationMs: 100, onUpdate });
    fake.tick(25);

    expect(onUpdate).toHaveBeenCalledWith(0.25);
  });

  it('cancel stops it early and never calls onComplete', () => {
    const fake = createFakeTicker();
    const onUpdate = vi.fn();
    const onComplete = vi.fn();

    const cancel = tween(fake.ticker, {
      durationMs: 100,
      onUpdate,
      onComplete,
    });

    fake.tick(40);
    cancel();
    fake.tick(40);
    fake.tick(40);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
    expect(fake.hasListener()).toBe(false);
  });
});
