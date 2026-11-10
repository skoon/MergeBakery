/**
 * Text for the new-season banner and the season sweep notice (T14.6).
 */

import type { SeasonSweep } from '../core/seasons';
import type { SeasonIndexEntry, SeasonOffer } from '../seasons/loader';

/** The banner's text for what the season check offers; null to show none. */
export function bannerText(offers: readonly SeasonOffer[]): string | null {
  const [first] = offers;
  if (first === undefined) return null;
  if (offers.length === 1) {
    return first.kind === 'new'
      ? `${first.entry.name} has arrived — tap to see it`
      : `${first.entry.name} has been updated — tap to reload`;
  }
  return offers.some((o) => o.kind === 'new')
    ? 'New seasons have arrived — tap to see them'
    : 'Seasons have been updated — tap to reload';
}

/** A season's name from the index, or its id when the index doesn't list it. */
export function seasonName(
  index: readonly SeasonIndexEntry[],
  seasonId: string,
): string {
  return index.find((e) => e.id === seasonId)?.name ?? seasonId;
}

/** The card telling the player what loading swept out; null when there's nothing to say. */
export function sweepNotice(
  sweep: SeasonSweep,
  name: string,
): { readonly title: string; readonly text: string } | null {
  const coins = `${sweep.coins.toString()} ${sweep.coins === 1 ? 'coin' : 'coins'}`;
  if (sweep.ended) {
    return {
      title: 'Season ended',
      text: `${name} couldn't be loaded, so it has ended. Its items were sold for ${coins}.`,
    };
  }
  if (sweep.coins === 0) return null;
  return {
    title: 'Season updated',
    text: `${name} was updated, and items it no longer has were sold for ${coins}.`,
  };
}
