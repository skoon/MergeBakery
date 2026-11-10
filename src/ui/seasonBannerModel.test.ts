/**
 * Tests for the new-season banner and sweep notice text (T14.6).
 */

import { describe, expect, it } from 'vitest';
import type { SeasonIndexEntry, SeasonOffer } from '../seasons/loader';
import { bannerText, seasonName, sweepNotice } from './seasonBannerModel';

function offer(name: string, kind: SeasonOffer['kind']): SeasonOffer {
  const entry: SeasonIndexEntry = {
    id: name.toLowerCase(),
    name,
    version: '1.0.0',
    window: { start: '11-12', end: '11-30' },
    apiVersion: 1,
    rules: false,
    pngKeys: [],
  };
  return { entry, kind };
}

describe('bannerText', () => {
  it.each<[string, SeasonOffer[], string | null]>([
    ['nothing', [], null],
    [
      'one new season',
      [offer('Harvest', 'new')],
      'Harvest has arrived — tap to see it',
    ],
    [
      'one update',
      [offer('Harvest', 'update')],
      'Harvest has been updated — tap to reload',
    ],
    [
      'several, one of them new',
      [offer('Harvest', 'update'), offer('Yule', 'new')],
      'New seasons have arrived — tap to see them',
    ],
    [
      'several updates',
      [offer('Harvest', 'update'), offer('Yule', 'update')],
      'Seasons have been updated — tap to reload',
    ],
  ])('for %s', (_name, offers, text) => {
    expect(bannerText(offers)).toBe(text);
  });
});

describe('seasonName', () => {
  it('uses the index name, or the id when the index lacks it', () => {
    const index = [offer('Harvest', 'new').entry];
    expect(seasonName(index, 'harvest')).toBe('Harvest');
    expect(seasonName(index, 'yule')).toBe('yule');
  });
});

describe('sweepNotice', () => {
  it('says an unloadable season has ended', () => {
    expect(
      sweepNotice({ seasonId: 'harvest', coins: 35, ended: true }, 'Harvest'),
    ).toEqual({
      title: 'Season ended',
      text: "Harvest couldn't be loaded, so it has ended. Its items were sold for 35 coins.",
    });
  });

  it('says so even when nothing was sold', () => {
    expect(
      sweepNotice({ seasonId: 'harvest', coins: 0, ended: true }, 'Harvest')
        ?.text,
    ).toContain('sold for 0 coins');
  });

  it('says an update sold items it dropped, and counts one coin', () => {
    expect(
      sweepNotice({ seasonId: 'harvest', coins: 1, ended: false }, 'Harvest'),
    ).toEqual({
      title: 'Season updated',
      text: 'Harvest was updated, and items it no longer has were sold for 1 coin.',
    });
  });

  it('says nothing when an update sold nothing', () => {
    expect(
      sweepNotice({ seasonId: 'harvest', coins: 0, ended: false }, 'Harvest'),
    ).toBeNull();
  });
});
