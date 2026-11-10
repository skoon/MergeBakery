/**
 * Every season pack under seasons/ builds against the real base data and
 * tokens.css, and seasons/keepsakes.json is up to date (T14.7). The same
 * checks as `npm run build:seasons`, so `npm test` catches a broken pack.
 */

import { describe, expect, it } from 'vitest';
import { testData } from '../core/testing';
import tokensCss from '../ui/tokens.css?raw';
import {
  buildPacks,
  checkKeepsakeRecord,
  cssTokenNames,
  type PackSource,
} from './build';

const seasons = import.meta.glob<unknown>('/seasons/*/season.json', {
  eager: true,
  import: 'default',
});
const placeholders = import.meta.glob<unknown>('/seasons/*/placeholders.json', {
  eager: true,
  import: 'default',
});
const records = import.meta.glob<unknown>('/seasons/keepsakes.json', {
  eager: true,
  import: 'default',
});
// Only the file names are used; nothing is imported.
const pngs = Object.keys(import.meta.glob('/seasons/*/art/*.png'));
const rules = Object.keys(import.meta.glob('/seasons/*/rules.ts'));

function folderOf(file: string): string {
  const folder = file.split('/')[2];
  if (folder === undefined) throw new Error(`no folder in ${file}`);
  return folder;
}

const sources: PackSource[] = Object.entries(seasons).map(([file, season]) => {
  const folder = folderOf(file);
  return {
    folder,
    season,
    placeholders: placeholders[`/seasons/${folder}/placeholders.json`],
    pngKeys: pngs
      .filter((png) => folderOf(png) === folder)
      .map((png) => png.slice(png.lastIndexOf('/') + 1, -'.png'.length)),
    hasRules: rules.includes(`/seasons/${folder}/rules.ts`),
  };
});

describe('season pack sources', () => {
  it('every pack builds, and seasons/keepsakes.json records them all', () => {
    const packs = buildPacks(testData, sources, cssTokenNames(tokensCss));
    const record = records['/seasons/keepsakes.json'] ?? {};
    expect(checkKeepsakeRecord(record, packs, true).added).toEqual([]);
  });
});
