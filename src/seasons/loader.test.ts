/**
 * Tests for loading season packs at runtime (T14.6), with the autumn fixture
 * served by a fake fetch.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import type { SeasonRules } from '../core/seasonApi';
import { testData } from '../core/testing';
import fixture from './fixtures/autumn.json';
import {
  checkForSeasons,
  loadSeasons,
  newSeasons,
  packUrl,
  type FetchFn,
  type LoadOptions,
  type SeasonIndexEntry,
} from './loader';
import { parseSeasonPack, withSeasons } from './pack';

const BASE = '/game/';
const INDEX = '/game/seasons/index.json';
const NOW = Date.UTC(2026, 10, 20);
const utc = (): number => 0;

/** The fixture with every "autumn" replaced: a second, valid pack. */
function renamed(id: string): Record<string, unknown> {
  return JSON.parse(JSON.stringify(fixture).replaceAll('autumn', id)) as Record<
    string,
    unknown
  >;
}

function entry(
  change: Partial<SeasonIndexEntry> = {},
): SeasonIndexEntry & Record<string, unknown> {
  return {
    id: 'autumn',
    name: 'Autumn',
    version: '1.0.0',
    window: { start: '11-12', end: '11-30' },
    apiVersion: 1,
    rules: false,
    pngKeys: [],
    ...change,
  };
}

const dir = (id: string, version = '1.0.0'): string =>
  `/game/seasons/${id}/${version}/`;

/** URL → JSON body; an Error rejects the fetch; a number is an HTTP status; anything absent is a 404. */
type Files = Record<string, unknown>;

function fakeFetch(files: Files, calls: [string, unknown][] = []): FetchFn {
  return (url, init) => {
    calls.push([url, init]);
    const body = files[url];
    if (body instanceof Error) return Promise.reject(body);
    const status = url in files ? (typeof body === 'number' ? body : 200) : 404;
    return Promise.resolve({
      ok: status === 200,
      status,
      json: () => Promise.resolve(body),
    });
  };
}

function options(
  files: Files,
  modules: Record<string, unknown> = {},
  change: Partial<LoadOptions> = {},
): LoadOptions {
  return {
    baseUrl: BASE,
    fetch: fakeFetch(files),
    importModule: (url) =>
      url in modules
        ? modules[url] instanceof Error
          ? Promise.reject(modules[url])
          : Promise.resolve(modules[url])
        : Promise.reject(new Error(`no module at ${url}`)),
    now: NOW,
    offsetAt: utc,
    savedSeasonId: null,
    timeoutMs: 5000,
    ...change,
  };
}

/** Index and season.json for autumn and winter. */
function twoPacks(change: Files = {}): Files {
  return {
    [INDEX]: { seasons: [entry(), entry({ id: 'winter', name: 'Winter' })] },
    [`${dir('autumn')}season.json`]: fixture,
    [`${dir('winter')}season.json`]: renamed('winter'),
    ...change,
  };
}

const rules: SeasonRules = {
  apiVersion: 1,
  onTick: (_ctx, state) => ({ ok: true, state, events: [] }),
};

let error: MockInstance<typeof console.error>;
let warn: MockInstance<typeof console.warn>;
beforeEach(() => {
  error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('loadSeasons', () => {
  it('loads an open season with its rules', async () => {
    const calls: [string, unknown][] = [];
    const imported: string[] = [];
    const loaded = await loadSeasons(testData, {
      ...options({}),
      fetch: fakeFetch(
        {
          [INDEX]: { seasons: [entry({ rules: true })] },
          [`${dir('autumn')}season.json`]: fixture,
        },
        calls,
      ),
      importModule: (url) => {
        imported.push(url);
        return Promise.resolve({ default: rules });
      },
    });
    const autumn = loaded.data.seasons.get('autumn');
    expect(autumn?.rules).toBe(rules);
    expect(autumn?.startsAt).toBe(Date.UTC(2026, 10, 12));
    expect(autumn?.endsAt).toBe(Date.UTC(2026, 11, 1));
    expect(loaded.data.items.has('autumn-seed')).toBe(true);
    expect(loaded.index).toEqual([entry({ rules: true })]);
    expect(loaded.failed).toEqual([]);
    expect(calls).toEqual([
      [INDEX, { cache: 'no-cache' }],
      [`${dir('autumn')}season.json`, undefined],
    ]);
    expect(imported).toEqual([`${dir('autumn')}rules.js`]);
    expect(error).not.toHaveBeenCalled();
  });

  it('adds the slash a base URL is missing', async () => {
    const calls: [string, unknown][] = [];
    await loadSeasons(testData, {
      ...options({}),
      baseUrl: '/game',
      fetch: fakeFetch({}, calls),
    });
    expect(calls[0]?.[0]).toBe(INDEX);
  });

  it('leaves a closed season alone', async () => {
    const calls: [string, unknown][] = [];
    const loaded = await loadSeasons(testData, {
      ...options({}),
      now: Date.UTC(2026, 9, 1),
      fetch: fakeFetch(twoPacks(), calls),
    });
    expect(loaded.data).toBe(testData);
    expect(loaded.index).toHaveLength(2);
    expect(calls.map(([url]) => url)).toEqual([INDEX]);
  });

  it('loads the save’s season after its window has closed', async () => {
    const loaded = await loadSeasons(
      testData,
      options(
        twoPacks(),
        {},
        {
          now: Date.UTC(2026, 11, 5),
          savedSeasonId: 'autumn',
        },
      ),
    );
    expect([...loaded.data.seasons.keys()]).toEqual(['autumn']);
    // Resolved to the next occurrence; the save keeps this year's end.
    expect(loaded.data.seasons.get('autumn')?.startsAt).toBe(
      Date.UTC(2027, 10, 12),
    );
  });

  it('merges several packs in index order', async () => {
    const loaded = await loadSeasons(testData, options(twoPacks()));
    expect([...loaded.data.seasons.keys()]).toEqual(['autumn', 'winter']);
  });

  it('returns the theme of each pack that loaded (T14.8)', async () => {
    const themed = {
      ...fixture,
      theme: { invitation: 'Join us?', tokens: { '--color-crust': '#b5652b' } },
    };
    const loaded = await loadSeasons(
      testData,
      options(
        twoPacks({
          [`${dir('autumn')}season.json`]: themed,
          [`${dir('winter')}season.json`]: 404,
        }),
      ),
    );
    expect([...loaded.themes.keys()]).toEqual(['autumn']);
    expect(loaded.themes.get('autumn')).toEqual({
      invitation: 'Join us?',
      tokens: { '--color-crust': '#b5652b' },
      music: null,
      intro: null,
    });
  });

  it('opens a forced season from now until its own end (dev tools)', async () => {
    const now = Date.UTC(2026, 10, 9);
    const loaded = await loadSeasons(
      testData,
      options(twoPacks(), {}, { now, forceOpen: 'winter' }),
    );
    // Autumn opens on the 12th; only the forced winter loads.
    expect([...loaded.data.seasons.keys()]).toEqual(['winter']);
    const winter = loaded.data.seasons.get('winter');
    expect(winter?.startsAt).toBe(now);
    expect(winter?.endsAt).toBe(Date.UTC(2026, 11, 1));
  });

  it('leaves an open forced season’s window as it is', async () => {
    const loaded = await loadSeasons(
      testData,
      options(twoPacks(), {}, { forceOpen: 'autumn' }),
    );
    expect(loaded.data.seasons.get('autumn')?.startsAt).toBe(
      Date.UTC(2026, 10, 12),
    );
  });

  it('warns and goes on without seasons when there is no index', async () => {
    const loaded = await loadSeasons(testData, options({}));
    expect(loaded).toEqual({
      data: testData,
      index: [],
      failed: [],
      themes: new Map(),
    });
    expect(warn).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
  });

  it.each<[string, unknown]>([
    ['a server error', 500],
    ['a network failure', new Error('offline')],
    ['an index that is not { seasons: [...] }', { seasons: 'autumn' }],
    ['an index that is not an object', ['autumn']],
  ])('logs an error and goes on without seasons on %s', async (_name, body) => {
    const loaded = await loadSeasons(testData, options({ [INDEX]: body }));
    expect(loaded).toEqual({
      data: testData,
      index: [],
      failed: [],
      themes: new Map(),
    });
    expect(error).toHaveBeenCalledOnce();
  });

  it('skips each bad index entry and loads the rest', async () => {
    const files = twoPacks({
      [INDEX]: {
        seasons: [
          entry(),
          entry({ name: 'Again' }),
          entry({ id: 'spring', version: '..' }),
          entry({ id: 'Summer' }),
          entry({ id: 'fall', apiVersion: 2 }),
          entry({ id: 'yule', window: { start: '13-01', end: '01-05' } }),
          entry({ id: 'easter', pngKeys: ['autumn-seed'] }),
          { id: 'lent' },
          { ...entry({ id: 'winter', name: 'Winter' }), newField: true },
        ],
      },
    });
    const loaded = await loadSeasons(testData, options(files));
    expect(loaded.index.map((e) => e.id)).toEqual(['autumn', 'winter']);
    expect([...loaded.data.seasons.keys()]).toEqual(['autumn', 'winter']);
    expect(error).toHaveBeenCalledTimes(7);
  });

  const broken = new Error('broken');
  it.each<[string, Files, Record<string, unknown>]>([
    ['season.json is missing', { [`${dir('autumn')}season.json`]: 404 }, {}],
    [
      'season.json fails to fetch',
      { [`${dir('autumn')}season.json`]: broken },
      {},
    ],
    [
      'season.json is invalid',
      { [`${dir('autumn')}season.json`]: { ...fixture, pointsPerItem: -1 } },
      {},
    ],
    [
      'season.json is another version',
      { [`${dir('autumn')}season.json`]: { ...fixture, version: '0.9.0' } },
      {},
    ],
    ['rules.js fails to import', {}, { [`${dir('autumn')}rules.js`]: broken }],
    [
      'rules.js has no default export',
      {},
      { [`${dir('autumn')}rules.js`]: {} },
    ],
    [
      'rules.js exports a non-object',
      {},
      { [`${dir('autumn')}rules.js`]: { default: 1 } },
    ],
    [
      'rules.js has an unknown hook',
      {},
      {
        [`${dir('autumn')}rules.js`]: {
          default: { ...rules, onMerge: () => 0 },
        },
      },
    ],
    [
      'a rules.js hook is not a function',
      {},
      { [`${dir('autumn')}rules.js`]: { default: { ...rules, onTick: 1 } } },
    ],
    [
      'rules.js is for another apiVersion',
      {},
      {
        [`${dir('autumn')}rules.js`]: { default: { ...rules, apiVersion: 2 } },
      },
    ],
  ])('skips a pack when %s', async (_name, change, modules) => {
    const files = twoPacks({
      [INDEX]: {
        seasons: [entry({ rules: true }), entry({ id: 'winter', name: 'W' })],
      },
      ...change,
    });
    const loaded = await loadSeasons(
      testData,
      options(files, {
        [`${dir('autumn')}rules.js`]: { default: rules },
        ...modules,
      }),
    );
    expect([...loaded.data.seasons.keys()]).toEqual(['winter']);
    expect(loaded.index).toHaveLength(2);
    expect(loaded.failed).toEqual(['autumn@1.0.0']);
    expect(error).toHaveBeenCalledOnce();
    expect(String(error.mock.calls[0]?.[0])).toContain('Season "autumn" 1.0.0');
  });

  it('skips a pack that conflicts with one already merged', async () => {
    const files = {
      [INDEX]: { seasons: [entry(), entry({ id: 'autumn-late' })] },
      [`${dir('autumn')}season.json`]: fixture,
      [`${dir('autumn-late')}season.json`]: renamed('autumn-late'),
    };
    const loaded = await loadSeasons(testData, options(files));
    expect([...loaded.data.seasons.keys()]).toEqual(['autumn']);
    expect(loaded.failed).toEqual(['autumn-late@1.0.0']);
  });
});

describe('the load timeout', () => {
  const hanging: FetchFn = () => new Promise(() => undefined);

  it('gives up after timeoutMs when no season is joined', async () => {
    vi.useFakeTimers();
    const loading = loadSeasons(testData, { ...options({}), fetch: hanging });
    await vi.advanceTimersByTimeAsync(5000);
    expect(await loading).toEqual({
      data: testData,
      index: [],
      failed: [],
      themes: new Map(),
    });
    expect(warn).toHaveBeenCalledOnce();
  });

  it('keeps waiting when the save has joined a season', async () => {
    vi.useFakeTimers();
    let settled = false;
    void loadSeasons(testData, {
      ...options({}, {}, { savedSeasonId: 'autumn' }),
      fetch: hanging,
    }).then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(settled).toBe(false);
  });

  it('doesn’t warn when loading finishes in time', async () => {
    vi.useFakeTimers();
    const loaded = await loadSeasons(testData, options(twoPacks()));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(loaded.data.seasons.size).toBe(2);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('packUrl', () => {
  it('builds the folder under seasons/', () => {
    expect(packUrl('/', { id: 'autumn', version: '1.0.0' })).toBe(
      '/seasons/autumn/1.0.0/',
    );
  });

  it.each([
    { id: '..', version: '1.0.0' },
    { id: 'autumn', version: '..' },
    { id: 'autumn', version: '1/../../x' },
    { id: 'a/b', version: '1' },
  ])('refuses %o', (bad) => {
    expect(() => packUrl('/', bad)).toThrow('packUrl: bad season');
  });
});

describe('newSeasons', () => {
  const loaded = withSeasons(testData, [
    {
      pack: parseSeasonPack(testData, fixture),
      startsAt: Date.UTC(2026, 10, 12),
      endsAt: Date.UTC(2026, 11, 1),
      rules: null,
    },
  ]);

  it('offers new and updated open seasons only', () => {
    const offers = newSeasons(
      [
        entry(),
        entry({ id: 'winter', name: 'Winter' }),
        entry({ id: 'spring', window: { start: '03-01', end: '03-31' } }),
        entry({ id: 'yule', version: '2.0.0' }),
      ],
      loaded,
      ['yule@2.0.0'],
      NOW,
      utc,
    );
    expect(offers.map((o) => [o.entry.id, o.kind])).toEqual([
      ['winter', 'new'],
    ]);
  });

  it('offers a different version of a loaded season as an update', () => {
    const offers = newSeasons(
      [entry({ version: '1.0.1' })],
      loaded,
      [],
      NOW,
      utc,
    );
    expect(offers).toEqual([
      { entry: entry({ version: '1.0.1' }), kind: 'update' },
    ]);
  });

  it('offers a new version of a pack that failed', () => {
    const offers = newSeasons(
      [entry({ id: 'winter', version: '1.0.1' })],
      testData,
      ['winter@1.0.0'],
      NOW,
      utc,
    );
    expect(offers.map((o) => o.kind)).toEqual(['new']);
  });
});

describe('checkForSeasons', () => {
  it('offers what newSeasons finds in a fresh index', async () => {
    const offers = await checkForSeasons(
      options(twoPacks()),
      testData,
      [],
      NOW,
      utc,
    );
    expect(offers.map((o) => [o.entry.id, o.kind])).toEqual([
      ['autumn', 'new'],
      ['winter', 'new'],
    ]);
  });

  it('warns and offers nothing when the index can’t be fetched', async () => {
    const offers = await checkForSeasons(
      options({ [INDEX]: new Error('offline') }),
      testData,
      [],
      NOW,
      utc,
    );
    expect(offers).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
  });
});
