/**
 * Tests for the season pack build steps (T14.7), with the autumn fixture as a
 * pack source.
 */

import { describe, expect, it } from 'vitest';
import { testData } from '../core/testing';
import fixture from './fixtures/autumn.json';
import {
  KEEPSAKE_COLOR,
  buildPack,
  buildPacks,
  checkKeepsakeRecord,
  cssTokenNames,
  placeholderSvg,
  seasonIndex,
  type BuiltPack,
  type PackSource,
} from './build';

type Json = Record<string, unknown>;

const TOKENS: ReadonlySet<string> = new Set(['--color-crust']);
const build = (source: PackSource): BuiltPack =>
  buildPack(testData, source, TOKENS);
const buildAll = (sources: PackSource[]): BuiltPack[] =>
  buildPacks(testData, sources, TOKENS);

/** The fixture with every "autumn" replaced by `id`. */
function season(id = 'autumn'): Json {
  return JSON.parse(JSON.stringify(fixture).replaceAll('autumn', id)) as Json;
}

function spriteKeys(id = 'autumn'): string[] {
  return [
    ...fixture.items.map((i) => i.spriteKey),
    ...fixture.keepsakes.map((k) => k.spriteKey),
  ].map((key) => key.replace('autumn', id));
}

function source(overrides: Partial<PackSource> = {}): PackSource {
  const id = overrides.folder ?? 'autumn';
  return {
    folder: id,
    season: season(id),
    placeholders: Object.fromEntries(spriteKeys(id).map((k) => [k, '🎃'])),
    pngKeys: [],
    hasRules: false,
    ...overrides,
  };
}

function problemOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('expected a throw');
}

describe('placeholderSvg', () => {
  it('draws the tile in the colour with a darker outline, the emoji and the tier', () => {
    const svg = placeholderSvg('#e08a3c', '🎃', 3);
    expect(svg).toContain('fill="#e08a3c"');
    expect(svg).toContain('stroke="#a44e00"');
    expect(svg).toContain('>🎃</text>');
    expect(svg).toMatch(/>3<\/text>/);
    expect(svg).toContain('width="128" height="128"');
  });

  it('leaves out the tier when there is none', () => {
    const svg = placeholderSvg(KEEPSAKE_COLOR, '🏆', null);
    expect(svg.match(/<text/g)).toHaveLength(1);
  });

  it('uses dark tier text on a light tile and white on a dark one', () => {
    expect(placeholderSvg('#fff6e6', 'x', 1)).toContain('fill="#1a1a1a"');
    expect(placeholderSvg('#3a2010', 'x', 1)).toContain('fill="#ffffff"');
  });

  it('escapes the emoji text', () => {
    expect(placeholderSvg('#e08a3c', '<&">', 1)).toContain(
      '>&lt;&amp;&quot;&gt;</text>',
    );
  });

  it('throws on a colour that is not #rrggbb', () => {
    expect(() => placeholderSvg('orange', '🎃', 1)).toThrow(
      /not a #rrggbb colour/,
    );
  });
});

describe('buildPack', () => {
  it('makes the index entry from season.json', () => {
    const built = build(source({ hasRules: true }));
    expect(built.entry).toEqual({
      id: 'autumn',
      name: fixture.name,
      version: fixture.version,
      window: fixture.window,
      apiVersion: fixture.apiVersion,
      rules: true,
      pngKeys: [],
    });
    expect(built.keepsakeKeys).toEqual(['autumn-wreath']);
  });

  it('generates an SVG for every sprite key without a .png', () => {
    const built = build(source({ pngKeys: ['autumn-pie', 'autumn-gourd'] }));
    expect(built.entry.pngKeys).toEqual(['autumn-gourd', 'autumn-pie']);
    const expected = spriteKeys().filter(
      (k) => k !== 'autumn-pie' && k !== 'autumn-gourd',
    );
    expect([...built.svgs.keys()].sort()).toEqual(
      [...new Set(expected)].sort(),
    );
  });

  it('colours an item by its chain with its tier, and a keepsake gold with none', () => {
    const built = build(source());
    const gourd = fixture.chains.find((c) => c.id === 'autumn-gourd');
    expect(built.svgs.get('autumn-big-gourd')).toBe(
      placeholderSvg(gourd?.color ?? '', '🎃', 3),
    );
    expect(built.svgs.get('autumn-wreath')).toBe(
      placeholderSvg(KEEPSAKE_COLOR, '🎃', null),
    );
  });

  it('needs a .png or an emoji for every sprite key', () => {
    const placeholders = Object.fromEntries(
      spriteKeys()
        .filter((k) => k !== 'autumn-seed')
        .map((k) => [k, '🎃']),
    );
    expect(problemOf(() => build(source({ placeholders })))).toContain(
      'sprite key "autumn-seed" has no art/autumn-seed.png and no emoji in placeholders.json',
    );
    // The .png covers it.
    expect(() =>
      build(source({ placeholders, pngKeys: ['autumn-seed'] })),
    ).not.toThrow();
  });

  it('refuses an emoji or a .png for a key the pack does not have', () => {
    const base = source();
    const message = problemOf(() =>
      build({
        ...base,
        placeholders: {
          ...(base.placeholders as Json),
          'autumn-typo': '🎃',
        },
        pngKeys: ['autumn-gone'],
      }),
    );
    expect(message).toContain(
      'placeholders.json has "autumn-typo", which isn\'t one of the pack\'s sprite keys',
    );
    expect(message).toContain(
      "art/autumn-gone.png isn't one of the pack's sprite keys",
    );
  });

  it('refuses a placeholders.json that is not a map of strings', () => {
    expect(problemOf(() => build(source({ placeholders: ['🎃'] })))).toContain(
      'placeholders.json must map sprite keys to emoji strings',
    );
    expect(
      problemOf(() => build(source({ placeholders: { 'autumn-seed': '' } }))),
    ).toContain('placeholders.json must map');
  });

  it('refuses a folder not named after the season id', () => {
    expect(problemOf(() => build({ ...source(), folder: 'fall' }))).toContain(
      'seasons/fall:\n- the folder must be named after the season id "autumn"',
    );
  });

  it("refuses a sprite key that isn't a safe file name", () => {
    const raw = season();
    const items = raw.items as Json[];
    const first = items[0];
    if (first === undefined) throw new Error('fixture has no items');
    items[0] = { ...first, spriteKey: 'autumn-patch 1' };
    const placeholders = Object.fromEntries(
      [...spriteKeys(), 'autumn-patch 1'].map((k) => [k, '🎃']),
    );
    expect(
      problemOf(() => build(source({ season: raw, placeholders }))),
    ).toContain('sprite key "autumn-patch 1" isn\'t a safe file name');
  });

  it("passes on the game's own pack problems, naming the folder", () => {
    const raw = season();
    const generators = raw.generators as Json[];
    generators[0] = {
      ...generators[0],
      spawnTable: [{ itemId: 'nope', weight: 1 }],
    };
    const message = problemOf(() => build(source({ season: raw })));
    expect(message).toMatch(/^seasons\/autumn\/season\.json:\n/);
    expect(message).toContain('references unknown item "nope"');
  });

  it('accepts theme tokens tokens.css declares, and refuses others (T14.8)', () => {
    const themed = (tokens: Record<string, string>): PackSource =>
      source({ season: { ...season(), theme: { tokens } } });
    expect(() => build(themed({ '--color-crust': '#b5652b' }))).not.toThrow();
    expect(
      problemOf(() => build(themed({ '--color-pumpkin': '#f80' }))),
    ).toContain(
      'theme token "--color-pumpkin" isn\'t declared in src/ui/tokens.css',
    );
  });

  it('refuses the scale tokens the game sets at runtime', () => {
    const scaled = source({
      season: { ...season(), theme: { tokens: { '--text-scale': '2' } } },
    });
    expect(
      problemOf(() => buildPack(testData, scaled, new Set(['--text-scale']))),
    ).toContain('theme token "--text-scale" is set by the game');
  });
});

describe('cssTokenNames', () => {
  it('finds every custom property a stylesheet declares, not ones it uses', () => {
    const css =
      ':root {\n  --color-crust: #9c5b2e;\n  --font-size-sm: calc(1rem * var(--text-scale));\n}\n#app { --hud-height: 56px; color: var(--color-ink); }';
    expect(cssTokenNames(css)).toEqual(
      new Set(['--color-crust', '--font-size-sm', '--hud-height']),
    );
  });
});

describe('buildPacks', () => {
  it('builds every pack', () => {
    const built = buildAll([source(), source({ folder: 'winter' })]);
    expect(built.map((b) => b.entry.id)).toEqual(['autumn', 'winter']);
  });

  it("lists every pack's problems in one error", () => {
    const message = problemOf(() =>
      buildAll([
        { ...source(), folder: 'fall' },
        { ...source({ folder: 'winter' }), placeholders: {} },
      ]),
    );
    expect(message).toContain('seasons/fall:');
    expect(message).toContain('seasons/winter:');
  });

  it("refuses two seasons where one id starts the other's ids", () => {
    expect(
      problemOf(() => buildAll([source(), source({ folder: 'autumn-late' })])),
    ).toContain('seasons "autumn" and "autumn-late" can\'t both exist');
  });
});

describe('seasonIndex', () => {
  it('lists the entries sorted by id', () => {
    const [autumn, winter] = buildAll([
      source(),
      source({ folder: 'winter' }),
    ]) as [BuiltPack, BuiltPack];
    expect(seasonIndex([winter, autumn])).toEqual({
      seasons: [autumn.entry, winter.entry],
    });
  });

  it('is an empty list with no packs', () => {
    expect(seasonIndex([])).toEqual({ seasons: [] });
  });
});

describe('checkKeepsakeRecord', () => {
  const packs = buildAll([source(), source({ folder: 'winter' })]);

  it('records new seasons and keepsakes, sorted by id', () => {
    expect(checkKeepsakeRecord({}, packs, false)).toEqual({
      record: { autumn: ['autumn-wreath'], winter: ['winter-wreath'] },
      added: [
        'season "autumn"',
        'keepsake "autumn-wreath"',
        'season "winter"',
        'keepsake "winter-wreath"',
      ],
    });
  });

  it('adds nothing when the record is up to date', () => {
    const record = { autumn: ['autumn-wreath'], winter: ['winter-wreath'] };
    expect(checkKeepsakeRecord(record, packs, true)).toEqual({
      record,
      added: [],
    });
  });

  it('keeps a recorded key that is still a keepsake, ahead of new ones', () => {
    const raw = season();
    raw.keepsakes = [
      { id: 'autumn-cup', name: 'Cup', spriteKey: 'autumn-cup' },
      ...(raw.keepsakes as Json[]),
    ];
    raw.milestones = [
      ...(raw.milestones as Json[]),
      { points: 500, reward: { coins: 0, gems: 0, keepsakeId: 'autumn-cup' } },
    ];
    const [autumn] = buildAll([
      source({
        season: raw,
        placeholders: Object.fromEntries(
          [...spriteKeys(), 'autumn-cup'].map((k) => [k, '🏆']),
        ),
      }),
    ]) as [BuiltPack];
    expect(
      checkKeepsakeRecord({ autumn: ['autumn-wreath'] }, [autumn], false),
    ).toEqual({
      record: { autumn: ['autumn-wreath', 'autumn-cup'] },
      added: ['keepsake "autumn-cup"'],
    });
  });

  it('refuses a pack that dropped a recorded keepsake sprite key', () => {
    expect(
      problemOf(() =>
        checkKeepsakeRecord(
          { autumn: ['autumn-wreath', 'autumn-old'], winter: [] },
          packs,
          false,
        ),
      ),
    ).toContain(
      'season "autumn" no longer has the keepsake sprite key "autumn-old"',
    );
  });

  it('refuses a recorded season whose folder is gone', () => {
    expect(
      problemOf(() => checkKeepsakeRecord({ spring: [] }, packs, false)),
    ).toContain(
      'season "spring" is in seasons/keepsakes.json but seasons/spring/ is gone',
    );
  });

  it('on CI, refuses anything new instead of recording it', () => {
    expect(
      problemOf(() =>
        checkKeepsakeRecord({ autumn: ['autumn-wreath'] }, packs, true),
      ),
    ).toBe(
      'seasons/keepsakes.json is missing season "winter", keepsake "winter-wreath"; run "npm run build:seasons" and commit seasons/keepsakes.json',
    );
  });

  it('refuses a record that is not a map of key lists', () => {
    expect(() => checkKeepsakeRecord({ autumn: 'x' }, packs, false)).toThrow(
      'seasons/keepsakes.json must map season ids to arrays of sprite keys',
    );
  });
});
