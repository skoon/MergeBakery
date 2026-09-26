/**
 * Tests for merge logic (T2.2).
 */

import { describe, it, expect } from 'vitest';
import { loadGameData } from './data';
import { canMerge, nextTier } from './merge';

describe('nextTier with real data', () => {
  const data = loadGameData();

  it('walks a whole chain up', () => {
    // Flour chain: wheat-stalk (1) -> wheat-bundle (2) -> flour-scoop (3) -> ... -> sourdough-boule (8)
    const tier1 = nextTier(data, 'wheat-stalk');
    expect(tier1?.id).toBe('wheat-bundle');

    const tier2 = nextTier(data, 'wheat-bundle');
    expect(tier2?.id).toBe('flour-scoop');

    const tier3 = nextTier(data, 'flour-scoop');
    expect(tier3?.id).toBe('flour-bag');

    const tier8 = nextTier(data, 'bread-loaf');
    expect(tier8?.id).toBe('sourdough-boule');

    const tier9 = nextTier(data, 'sourdough-boule');
    expect(tier9).toBeNull();
  });

  it('returns null for top-tier items (sourdough-boule)', () => {
    const result = nextTier(data, 'sourdough-boule');
    expect(result).toBeNull();
  });

  it('returns null for single-tier items (energy-jar)', () => {
    const result = nextTier(data, 'energy-jar');
    expect(result).toBeNull();
  });

  it('returns null for single-tier items (golden-whisk)', () => {
    const result = nextTier(data, 'golden-whisk');
    expect(result).toBeNull();
  });

  it('throws on an unknown item id', () => {
    expect(() => nextTier(data, 'unknown-item')).toThrow(
      'unknown item id "unknown-item"',
    );
  });
});

describe('canMerge with real data', () => {
  const data = loadGameData();

  it('returns true when two identical items have a next tier', () => {
    expect(canMerge(data, 'wheat-stalk', 'wheat-stalk')).toBe(true);
    expect(canMerge(data, 'wheat-bundle', 'wheat-bundle')).toBe(true);
    expect(canMerge(data, 'flour-sack', 'flour-sack')).toBe(true);
  });

  it('returns false when items are different', () => {
    expect(canMerge(data, 'wheat-stalk', 'wheat-bundle')).toBe(false);
    expect(canMerge(data, 'wheat-bundle', 'flour-scoop')).toBe(false);
  });

  it('returns false for top-tier items (sourdough-boule)', () => {
    expect(canMerge(data, 'sourdough-boule', 'sourdough-boule')).toBe(false);
  });

  it('returns false for top-tier items (flour-mill-3)', () => {
    expect(canMerge(data, 'flour-mill-3', 'flour-mill-3')).toBe(false);
  });

  it('returns false for single-tier items (energy-jar)', () => {
    expect(canMerge(data, 'energy-jar', 'energy-jar')).toBe(false);
  });

  it('returns false for single-tier items (golden-whisk)', () => {
    expect(canMerge(data, 'golden-whisk', 'golden-whisk')).toBe(false);
  });
});
