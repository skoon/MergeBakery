/**
 * Tests for the Recipe Book view model (T5.6).
 */

import { describe, it, expect } from 'vitest';
import { recipeBookPages } from './recipeBookModel';
import { stateWith, testData } from '../core/testing';

describe('recipeBookPages', () => {
  it('gives the ingredient pages, then the baked ones, in data order', () => {
    const pages = recipeBookPages(testData, stateWith({}));

    expect(pages.map((p) => p.chainId)).toEqual([
      'flour',
      'dairy',
      'egg',
      'sugar',
      'fruit',
      'cookie',
      'croissant',
      'cupcake',
    ]);
  });

  it('lists each page’s items in tier order', () => {
    const flour = recipeBookPages(testData, stateWith({}))[0];

    expect(flour?.items.map((i) => i.tier)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(flour?.items[0]?.itemId).toBe('wheat-stalk');
  });

  it('hides names and notes until an item is discovered', () => {
    const state = stateWith({}, { discovered: ['croissant'] });
    const page = recipeBookPages(testData, state).find(
      (p) => p.chainId === 'croissant',
    );

    expect(page?.items[0]).toMatchObject({
      itemId: 'croissant',
      discovered: true,
      name: 'Croissant',
      note: null, // no note written yet
    });
    expect(page?.items[1]).toMatchObject({
      itemId: 'pain-au-chocolat',
      discovered: false,
      name: null,
      note: null,
      spriteKey: 'pain-au-chocolat',
    });
  });

  it('counts discoveries and reports the reward', () => {
    const state = stateWith(
      {},
      {
        discovered: ['croissant', 'pain-au-chocolat', 'pastry-platter', 'egg'],
        rewardedChains: ['croissant'],
      },
    );
    const pages = recipeBookPages(testData, state);
    const croissant = pages.find((p) => p.chainId === 'croissant');
    const egg = pages.find((p) => p.chainId === 'egg');

    expect(croissant).toMatchObject({
      discoveredCount: 3,
      rewarded: true,
      completionGems: 3,
    });
    expect(egg).toMatchObject({ discoveredCount: 1, rewarded: false });
  });
});
