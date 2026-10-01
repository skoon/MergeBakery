/**
 * Tests for the generator charge badge (T6.4).
 */

import { describe, it, expect } from 'vitest';
import { chargesToShow } from './charges';

describe('chargesToShow', () => {
  it('shows the charges left', () => {
    expect(chargesToShow({ charges: 36, cooldownEndsAt: null }, 36, 0)).toBe(
      36,
    );
    expect(chargesToShow({ charges: 1, cooldownEndsAt: null }, 36, 0)).toBe(1);
  });

  it('shows nothing while cooling down', () => {
    expect(
      chargesToShow({ charges: 0, cooldownEndsAt: 5000 }, 36, 4999),
    ).toBeNull();
  });

  it('shows the full count once the cooldown has ended, before the lazy refill', () => {
    expect(chargesToShow({ charges: 0, cooldownEndsAt: 5000 }, 36, 5000)).toBe(
      36,
    );
  });
});
