/**
 * Tests for uiScale (T-R3) and nextChromeFit (T-R2).
 */

import { describe, expect, it } from 'vitest';
import { nextChromeFit, uiScale } from './chromeMetrics';

describe('uiScale', () => {
  it('is 1 at the reference phone (360 x 700)', () => {
    expect(uiScale(360, 700)).toBe(1);
  });

  it('shrinks a little on the smallest phones, but not below 0.9', () => {
    expect(uiScale(320, 568)).toBe(0.9);
    expect(uiScale(200, 300)).toBe(0.9);
  });

  it('grows on larger screens, limited by the shorter side, up to 1.5', () => {
    expect(uiScale(720, 700)).toBe(1);
    expect(uiScale(720, 910)).toBe(1.3);
    expect(uiScale(1280, 2000)).toBe(1.5);
  });
});

describe('nextChromeFit', () => {
  it('leaves the bars alone while they fit', () => {
    expect(nextChromeFit(1, 280, 284)).toBe(1);
    expect(nextChromeFit(0.8, 284, 284)).toBe(0.8);
  });

  it('shrinks the bars by as much as they are too tall', () => {
    expect(nextChromeFit(1, 320, 288)).toBe(0.9);
    expect(nextChromeFit(0.9, 300, 285)).toBeCloseTo(0.855);
  });

  it('never shrinks the bars below 75%', () => {
    expect(nextChromeFit(1, 1000, 100)).toBe(0.75);
    expect(nextChromeFit(0.75, 400, 300)).toBe(0.75);
  });
});
