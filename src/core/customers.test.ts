/**
 * Tests for customers.json (T3.5).
 */

import { describe, it, expect } from 'vitest';
import { loadGameData } from './data';

describe('customers.json', () => {
  it('loadGameData succeeds and there are 11 regulars and 6 walk-ins', () => {
    const data = loadGameData();

    const customers = Array.from(data.customers.values());
    const regulars = customers.filter((c) => c.kind === 'regular');
    const walkIns = customers.filter((c) => c.kind === 'walkIn');

    expect(regulars).toHaveLength(11);
    expect(walkIns).toHaveLength(6);

    // Check regulars have the expected ids
    const regularIds = new Set(regulars.map((c) => c.id));
    // Chapter 1's four, Chapter 2's three (T7.3), Wren the MegaBun spy, and Chapter 3's three (T9.4).
    expect(regularIds).toEqual(
      new Set([
        'gus',
        'edith',
        'dex',
        'mina',
        'priya',
        'bramble',
        'theo',
        'wren',
        'marisol',
        'pell',
        'juno',
      ]),
    );

    // Check walk-ins have the expected ids
    const walkInIds = new Set(walkIns.map((c) => c.id));
    expect(walkInIds).toEqual(
      new Set([
        'walkin-hiker',
        'walkin-tourist',
        'walkin-student',
        'walkin-jogger',
        'walkin-neighbor',
        'walkin-painter',
      ]),
    );

    // Check portraitKey format for each customer
    customers.forEach((c) => {
      expect(c.portraitKey).toBe(`portrait-${c.id}`);
    });

    // Check each regular has favoriteItems
    regulars.forEach((c) => {
      expect(c.favoriteItems.length).toBeGreaterThan(0);
    });

    // Check each walk-in has no favoriteItems
    walkIns.forEach((c) => {
      expect(c.favoriteItems).toHaveLength(0);
    });
  });
});
