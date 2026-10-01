/**
 * How many taps a generator has left, for its badge on the board (T6.4).
 * No PixiJS here, so it can be tested in Node.
 */

import type { GeneratorCharge, Timestamp } from '../core/types';

/**
 * The count to show, or null while the generator is cooling down (its
 * countdown overlay shows then instead). Charges refill lazily, inside the
 * next tap, so a generator whose cooldown has ended still stores 0 but is
 * ready: it shows its full count.
 */
export function chargesToShow(
  charge: GeneratorCharge,
  fullCharges: number,
  now: Timestamp,
): number | null {
  if (charge.charges > 0) return charge.charges;
  if (charge.cooldownEndsAt !== null && charge.cooldownEndsAt <= now) {
    return fullCharges;
  }
  return null;
}
