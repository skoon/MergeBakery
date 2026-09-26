/**
 * Tests for placeholder item art (T2.7).
 * Verifies that every item has a corresponding SVG file.
 */

import { describe, it, expect } from 'vitest';
import { loadGameData } from '../core/data';

describe('Placeholder art', () => {
  it('every item has an SVG file', () => {
    // Get all SVG files in public/art/
    const artFiles = Object.keys(import.meta.glob('/public/art/*.svg'));
    const artFileSet = new Set(
      artFiles.map((path) => {
        const match = path.match(/\/([^/]+)\.svg$/);
        return match ? match[1] : null;
      }),
    );

    // Load game data and check every item has an SVG
    const data = loadGameData();
    const items = Array.from(data.items.values());

    expect(items.length).toBeGreaterThan(0);

    const missingFiles: string[] = [];
    items.forEach((item) => {
      if (!artFileSet.has(item.spriteKey)) {
        missingFiles.push(item.spriteKey);
      }
    });

    if (missingFiles.length > 0) {
      throw new Error(
        `Missing SVG files for items: ${missingFiles.join(', ')}`,
      );
    }
    expect(missingFiles).toEqual([]);
  });
});
