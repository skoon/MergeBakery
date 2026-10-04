/**
 * Tests for uiScale (T-R3).
 */

import { describe, expect, it } from 'vitest';
import { uiScale } from './chromeMetrics';

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
