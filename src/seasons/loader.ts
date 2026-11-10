/**
 * Loading season packs at runtime (T14.6).
 *
 * The catalog is `BASE_URL/seasons/index.json` (written by the pack build,
 * T14.7). A pack's files are at `BASE_URL/seasons/<id>/<version>/`:
 * `season.json`, `rules.js` when the entry says it has rules, and `art/`.
 * The URL is built from the entry's checked id and version, so no index can
 * load a file from outside `seasons/`.
 *
 * Network, the clock and module loading arrive as options, so this runs in
 * tests with fakes. A pack that fails to load is skipped with console.error;
 * the game starts without it.
 */

import { z } from 'zod';
import { SEASON_API_VERSION, type SeasonRules } from '../core/seasonApi';
import type {
  GameData,
  SeasonId,
  SeasonWindow,
  Timestamp,
} from '../core/types';
import { isMonthDay, resolveWindow, type OffsetAt } from './calendar';
import {
  PACK_VERSION,
  SEASON_ID,
  parseSeasonPack,
  withSeasons,
  type ResolvedPack,
} from './pack';

/** One season in index.json. */
export interface SeasonIndexEntry {
  readonly id: SeasonId;
  readonly name: string;
  readonly version: string;
  readonly window: SeasonWindow;
  readonly apiVersion: number;
  /** Whether the pack has a rules.js to import. */
  readonly rules: boolean;
  /** Sprite keys with drawn art (.png); every other key is a generated .svg. */
  readonly pngKeys: readonly string[];
}

/** The part of a fetch Response the loader uses. */
export interface FetchResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type FetchFn = (
  url: string,
  init?: { readonly cache: 'no-cache' },
) => Promise<FetchResponse>;

/** Where packs come from. */
export interface SeasonSource {
  /** The site's base URL, e.g. "/" or "/MergeBakery/". */
  readonly baseUrl: string;
  readonly fetch: FetchFn;
  readonly importModule: (url: string) => Promise<unknown>;
}

export interface LoadOptions extends SeasonSource {
  readonly now: Timestamp;
  readonly offsetAt: OffsetAt;
  /** The season the save has joined, loaded even when its window has closed. */
  readonly savedSeasonId: SeasonId | null;
  /** Gives up after this long, only when `savedSeasonId` is null. */
  readonly timeoutMs: number;
}

export interface LoadedSeasons {
  /** The base data plus every pack that loaded. */
  readonly data: GameData;
  /** Every valid index entry, loaded or not. */
  readonly index: readonly SeasonIndexEntry[];
  /** `packKey` of each pack that failed to load. */
  readonly failed: readonly string[];
}

export type IndexResult =
  | {
      readonly ok: true;
      readonly entries: readonly SeasonIndexEntry[];
      /** Why each skipped entry was skipped. */
      readonly problems: readonly string[];
    }
  | { readonly ok: false; readonly missing: boolean; readonly error: string };

const SPRITE_KEY = /^[a-zA-Z0-9_-]+$/;
const HOOKS: ReadonlySet<string> = new Set([
  'onTick',
  'afterAction',
  'extraSpawns',
  'cooldownMultiplier',
  'orderReward',
]);

// Not strict: a newer build may add fields that older cached games must ignore.
const indexSchema = z.object({ seasons: z.array(z.unknown()) });
const entrySchema = z.object({
  id: z.string().regex(SEASON_ID),
  name: z.string().min(1),
  version: z.string().regex(PACK_VERSION),
  window: z.object({
    start: z.string().refine(isMonthDay, 'not a month-day like "11-26"'),
    end: z.string().refine(isMonthDay, 'not a month-day like "11-26"'),
  }),
  apiVersion: z.number().int(),
  rules: z.boolean(),
  pngKeys: z.array(z.string().regex(SPRITE_KEY)),
});

/** "<id>@<version>", naming one version of a pack. */
export function packKey(entry: {
  readonly id: string;
  readonly version: string;
}): string {
  return `${entry.id}@${entry.version}`;
}

function seasonsUrl(baseUrl: string): string {
  return `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}seasons/`;
}

export function seasonIndexUrl(baseUrl: string): string {
  return `${seasonsUrl(baseUrl)}index.json`;
}

/** The folder holding one pack's files. Throws on an id or version that isn't a safe path segment. */
export function packUrl(
  baseUrl: string,
  entry: { readonly id: string; readonly version: string },
): string {
  if (!SEASON_ID.test(entry.id) || !PACK_VERSION.test(entry.version)) {
    throw new Error(`packUrl: bad season "${entry.id}" ${entry.version}`);
  }
  return `${seasonsUrl(baseUrl)}${entry.id}/${entry.version}/`;
}

function issues(error: z.ZodError): string {
  return error.issues
    .map(
      (i) => `${i.path.length > 0 ? i.path.join('.') : '(root)'}: ${i.message}`,
    )
    .join('; ');
}

function entryProblem(entry: SeasonIndexEntry): string | null {
  if (entry.apiVersion !== SEASON_API_VERSION) {
    return `apiVersion ${String(entry.apiVersion)} is not the game's ${String(SEASON_API_VERSION)}`;
  }
  const stray = entry.pngKeys.find((key) => !key.startsWith(`${entry.id}-`));
  return stray === undefined
    ? null
    : `pngKeys "${stray}" doesn't start with "${entry.id}-"`;
}

/** Fetches and checks index.json. Each bad entry is left out, with a problem saying why. */
export async function fetchSeasonIndex(
  source: SeasonSource,
): Promise<IndexResult> {
  const url = seasonIndexUrl(source.baseUrl);
  let raw: unknown;
  try {
    const response = await source.fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      return {
        ok: false,
        missing: response.status === 404,
        error: `${url}: HTTP ${String(response.status)}`,
      };
    }
    raw = await response.json();
  } catch (error) {
    return { ok: false, missing: false, error: `${url}: ${String(error)}` };
  }

  const index = indexSchema.safeParse(raw);
  if (!index.success) {
    return {
      ok: false,
      missing: false,
      error: `${url}: ${issues(index.error)}`,
    };
  }

  const entries: SeasonIndexEntry[] = [];
  const problems: string[] = [];
  index.data.seasons.forEach((rawEntry, i) => {
    const parsed = entrySchema.safeParse(rawEntry);
    if (!parsed.success) {
      problems.push(`index.json season ${String(i)}: ${issues(parsed.error)}`);
      return;
    }
    const entry = parsed.data;
    const problem = entries.some((e) => e.id === entry.id)
      ? 'listed twice'
      : entryProblem(entry);
    if (problem !== null) {
      problems.push(`index.json season "${entry.id}": ${problem}`);
      return;
    }
    entries.push(entry);
  });
  return { ok: true, entries, problems };
}

function isOpen(
  window: SeasonWindow,
  now: Timestamp,
  offsetAt: OffsetAt,
): boolean {
  const { startsAt, endsAt } = resolveWindow(window, now, offsetAt);
  return startsAt <= now && now < endsAt;
}

/** A rules.js module's default export, checked against the hook API. */
function checkRules(module: unknown): SeasonRules {
  if (typeof module !== 'object' || module === null || !('default' in module)) {
    throw new Error('rules.js has no default export');
  }
  const rules: unknown = module.default;
  if (typeof rules !== 'object' || rules === null) {
    throw new Error('rules.js default export is not an object');
  }
  for (const [key, value] of Object.entries(rules)) {
    if (key === 'apiVersion') continue;
    if (!HOOKS.has(key)) {
      throw new Error(`rules.js has an unknown hook "${key}"`);
    }
    if (typeof value !== 'function') {
      throw new Error(`rules.js hook "${key}" is not a function`);
    }
  }
  const apiVersion = (rules as { apiVersion?: unknown }).apiVersion;
  if (apiVersion !== SEASON_API_VERSION) {
    throw new Error(
      `rules.js apiVersion ${String(apiVersion)} is not the game's ${String(SEASON_API_VERSION)}`,
    );
  }
  return rules as SeasonRules;
}

async function loadPack(
  base: GameData,
  entry: SeasonIndexEntry,
  options: LoadOptions,
): Promise<ResolvedPack> {
  const dir = packUrl(options.baseUrl, entry);
  const response = await options.fetch(`${dir}season.json`);
  if (!response.ok) {
    throw new Error(`season.json: HTTP ${String(response.status)}`);
  }
  const pack = parseSeasonPack(base, await response.json());
  if (pack.def.id !== entry.id || pack.def.version !== entry.version) {
    throw new Error(
      `season.json is "${pack.def.id}" ${pack.def.version}, the index says "${entry.id}" ${entry.version}`,
    );
  }
  const rules = entry.rules
    ? checkRules(await options.importModule(`${dir}rules.js`))
    : null;
  const { startsAt, endsAt } = resolveWindow(
    pack.def.window,
    options.now,
    options.offsetAt,
  );
  return { pack, startsAt, endsAt, rules };
}

async function loadAll(
  base: GameData,
  options: LoadOptions,
): Promise<LoadedSeasons> {
  const index = await fetchSeasonIndex(options);
  if (!index.ok) {
    if (index.missing) {
      console.warn(`No seasons: ${index.error}`);
    } else {
      console.error(`Seasons not loaded: ${index.error}`);
    }
    return { data: base, index: [], failed: [] };
  }
  for (const problem of index.problems) console.error(problem);

  const wanted = index.entries.filter(
    (entry) =>
      entry.id === options.savedSeasonId ||
      isOpen(entry.window, options.now, options.offsetAt),
  );
  const packs = await Promise.allSettled(
    wanted.map((entry) => loadPack(base, entry, options)),
  );

  let data = base;
  const failed: string[] = [];
  wanted.forEach((entry, i) => {
    const skip = (error: unknown): void => {
      console.error(`Season "${entry.id}" ${entry.version} not loaded:`, error);
      failed.push(packKey(entry));
    };
    const result = packs[i];
    if (result?.status !== 'fulfilled') {
      skip(result?.reason);
      return;
    }
    try {
      data = withSeasons(data, [result.value]);
    } catch (error) {
      skip(error);
    }
  });
  return { data, index: index.entries, failed };
}

/**
 * Fetches the index and loads every pack whose window is open now, plus the
 * save's season, then merges them into `base`. Never throws for a bad pack.
 * Without a joined season, gives up after `timeoutMs` and returns `base`.
 */
export async function loadSeasons(
  base: GameData,
  options: LoadOptions,
): Promise<LoadedSeasons> {
  const loading = loadAll(base, options);
  if (options.savedSeasonId !== null) return loading;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      resolve(null);
    }, options.timeoutMs);
  });
  const loaded = await Promise.race([loading, timedOut]);
  clearTimeout(timer);
  if (loaded === null) {
    console.warn(
      `Seasons not loaded: gave up after ${String(options.timeoutMs)} ms`,
    );
    return { data: base, index: [], failed: [] };
  }
  return loaded;
}

/** An open season the running game hasn't loaded: new to it, or a different version of one it has. */
export interface SeasonOffer {
  readonly entry: SeasonIndexEntry;
  readonly kind: 'new' | 'update';
}

/**
 * Refetches the index during play and returns what `newSeasons` offers. A
 * failed fetch is logged with console.warn and offers nothing.
 */
export async function checkForSeasons(
  source: SeasonSource,
  data: GameData,
  failed: readonly string[],
  now: Timestamp,
  offsetAt: OffsetAt,
): Promise<SeasonOffer[]> {
  const index = await fetchSeasonIndex(source);
  if (!index.ok) {
    console.warn(`Season check failed: ${index.error}`);
    return [];
  }
  return newSeasons(index.entries, data, failed, now, offsetAt);
}

/** Index entries open now whose version isn't loaded and didn't fail this session. */
export function newSeasons(
  entries: readonly SeasonIndexEntry[],
  data: GameData,
  failed: readonly string[],
  now: Timestamp,
  offsetAt: OffsetAt,
): SeasonOffer[] {
  return entries.flatMap((entry): SeasonOffer[] => {
    if (!isOpen(entry.window, now, offsetAt)) return [];
    if (failed.includes(packKey(entry))) return [];
    const loaded = data.seasons.get(entry.id);
    if (loaded?.def.version === entry.version) return [];
    return [{ entry, kind: loaded ? 'update' : 'new' }];
  });
}
