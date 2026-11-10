/**
 * Building season packs (T14.7): the pure steps behind scripts/build-seasons.js.
 *
 * The script reads `seasons/<id>/` and writes `public/seasons/`. What it writes,
 * and every check, is decided here, so it runs in tests and validates packs
 * with the game's own `parseSeasonPack`. Each function throws one Error
 * listing every problem it found.
 */

import { z } from 'zod';
import type { GameData } from '../core/types';
import { SPRITE_KEY, type SeasonIndexEntry } from './loader';
import { parseSeasonPack } from './pack';

/** One pack's source folder, read by the script. */
export interface PackSource {
  /** The folder's name under `seasons/`. */
  readonly folder: string;
  /** season.json, parsed. */
  readonly season: unknown;
  /** placeholders.json, parsed: sprite key → emoji. */
  readonly placeholders: unknown;
  /** The file names in `art/` that end in .png, without the extension. */
  readonly pngKeys: readonly string[];
  /** Whether the folder has a rules.ts. */
  readonly hasRules: boolean;
}

/** What the script writes for one pack, besides copying its files. */
export interface BuiltPack {
  readonly entry: SeasonIndexEntry;
  /** Generated art: sprite key → SVG text, for every key without a .png. */
  readonly svgs: ReadonlyMap<string, string>;
  /** The sprite keys of the pack's keepsakes. */
  readonly keepsakeKeys: readonly string[];
}

/** seasons/keepsakes.json: each season built → every keepsake sprite key it has had. */
export type KeepsakeRecordFile = Readonly<Record<string, readonly string[]>>;

/** Keepsakes belong to no chain; their placeholders share one colour. */
export const KEEPSAKE_COLOR = '#d9a441';

/** Tokens main.ts and chromeMetrics.ts set on the page root; a theme must leave them alone. */
const RUNTIME_TOKENS: ReadonlySet<string> = new Set([
  '--text-scale',
  '--ui-scale',
]);

const placeholdersSchema = z.record(z.string(), z.string().min(1));
const recordSchema = z.record(z.string(), z.array(z.string()));

// ─── Placeholder art ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match)
    throw new Error(`placeholderSvg: "${hex}" is not a #rrggbb colour`);
  return [1, 2, 3].map((i) => parseInt(match[i] ?? '', 16)) as [
    number,
    number,
    number,
  ];
}

function darken(hex: string, amount: number): string {
  return `#${hexToRgb(hex)
    .map((c) =>
      Math.max(0, c - amount)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** As in scripts/gen-placeholder-art.js: dark text on light tiles. */
function textColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5 ? '#1a1a1a' : '#ffffff';
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * A 128×128 tile like the base game's placeholders: `color` with a darker
 * outline, the emoji in the middle, and the tier (if any) in the top-left corner.
 */
export function placeholderSvg(
  color: string,
  emoji: string,
  tier: number | null,
): string {
  const tierText =
    tier === null
      ? ''
      : `\n  <text x="22" y="31" font-family="sans-serif" font-size="22" font-weight="bold" fill="${textColor(color)}" text-anchor="middle">${String(tier)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect x="2" y="2" width="124" height="124" rx="24" ry="24" fill="${color}" stroke="${darken(color, 60)}" stroke-width="4"/>
  <text x="64" y="70" font-family="'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif" font-size="64" text-anchor="middle" dominant-baseline="central">${escapeXml(emoji)}</text>${tierText}
</svg>
`;
}

// ─── One pack ────────────────────────────────────────────────────────────────

/** The custom properties a stylesheet declares, e.g. tokens.css's `--color-crust`. */
export function cssTokenNames(css: string): Set<string> {
  return new Set(
    [...css.matchAll(/(?:^|[\s;{])(--[a-z0-9-]+)\s*:/g)].map((m) => m[1] ?? ''),
  );
}

/**
 * Validates one pack's source against `base`, and works out its index entry
 * and generated art. `tokenNames` are the names tokens.css declares; a theme
 * may override only those.
 */
export function buildPack(
  base: GameData,
  source: PackSource,
  tokenNames: ReadonlySet<string>,
): BuiltPack {
  const where = `seasons/${source.folder}`;
  let pack;
  try {
    pack = parseSeasonPack(base, source.season);
  } catch (error) {
    throw new Error(`${where}/season.json:\n${(error as Error).message}`, {
      cause: error,
    });
  }
  const { def } = pack;
  const problems: string[] = [];

  if (source.folder !== def.id) {
    problems.push(`the folder must be named after the season id "${def.id}"`);
  }
  for (const name of Object.keys(pack.theme.tokens)) {
    if (!tokenNames.has(name)) {
      problems.push(
        `theme token "${name}" isn't declared in src/ui/tokens.css; a season may only override existing tokens`,
      );
    } else if (RUNTIME_TOKENS.has(name)) {
      problems.push(
        `theme token "${name}" is set by the game's settings and layout; a season can't override it`,
      );
    }
  }

  // Every sprite key, with how its placeholder looks.
  const chainColor = new Map(pack.chains.map((c) => [c.id, c.color]));
  const looks = new Map<string, { color: string; tier: number | null }>();
  for (const item of pack.items) {
    if (looks.has(item.spriteKey)) continue;
    const color = chainColor.get(item.chainId);
    if (color === undefined) {
      throw new Error(`${where}: item "${item.id}" has no chain after parsing`);
    }
    looks.set(item.spriteKey, { color, tier: item.tier });
  }
  for (const keepsake of def.keepsakes) {
    if (!looks.has(keepsake.spriteKey)) {
      looks.set(keepsake.spriteKey, { color: KEEPSAKE_COLOR, tier: null });
    }
  }
  for (const key of looks.keys()) {
    if (!SPRITE_KEY.test(key)) {
      problems.push(
        `sprite key "${key}" isn't a safe file name (letters, digits, - and _)`,
      );
    }
  }

  const placeholders = placeholdersSchema.safeParse(source.placeholders);
  const emojis = new Map<string, string>(
    placeholders.success ? Object.entries(placeholders.data) : [],
  );
  if (!placeholders.success) {
    problems.push('placeholders.json must map sprite keys to emoji strings');
  }
  for (const key of emojis.keys()) {
    if (!looks.has(key)) {
      problems.push(
        `placeholders.json has "${key}", which isn't one of the pack's sprite keys`,
      );
    }
  }
  const pngKeys = new Set(source.pngKeys);
  for (const key of pngKeys) {
    if (!looks.has(key)) {
      problems.push(`art/${key}.png isn't one of the pack's sprite keys`);
    }
  }

  const svgs = new Map<string, string>();
  for (const [key, look] of looks) {
    if (pngKeys.has(key)) continue;
    const emoji = emojis.get(key);
    if (emoji === undefined) {
      if (placeholders.success) {
        problems.push(
          `sprite key "${key}" has no art/${key}.png and no emoji in placeholders.json`,
        );
      }
      continue;
    }
    svgs.set(key, placeholderSvg(look.color, emoji, look.tier));
  }

  if (problems.length > 0) {
    throw new Error(`${where}:\n${problems.map((p) => `- ${p}`).join('\n')}`);
  }
  return {
    entry: {
      id: def.id,
      name: def.name,
      version: def.version,
      window: def.window,
      apiVersion: def.apiVersion,
      rules: source.hasRules,
      pngKeys: [...pngKeys].sort(),
    },
    svgs,
    keepsakeKeys: def.keepsakes.map((k) => k.spriteKey),
  };
}

// ─── Every pack ──────────────────────────────────────────────────────────────

/**
 * Builds every pack, then checks they load together: no season id may start
 * another's ids (the loader would refuse the second). Throws one Error with
 * every pack's problems.
 */
export function buildPacks(
  base: GameData,
  sources: readonly PackSource[],
  tokenNames: ReadonlySet<string>,
): BuiltPack[] {
  const built: BuiltPack[] = [];
  const problems: string[] = [];
  for (const source of sources) {
    try {
      built.push(buildPack(base, source, tokenNames));
    } catch (error) {
      problems.push((error as Error).message);
    }
  }
  for (const a of built) {
    for (const b of built) {
      if (a !== b && b.entry.id.startsWith(`${a.entry.id}-`)) {
        problems.push(
          `seasons "${a.entry.id}" and "${b.entry.id}" can't both exist: "${a.entry.id}-" starts the other's ids`,
        );
      }
    }
  }
  if (problems.length > 0) throw new Error(problems.join('\n\n'));
  return built;
}

/** index.json: every pack's entry, sorted by id. */
export function seasonIndex(packs: readonly BuiltPack[]): {
  seasons: SeasonIndexEntry[];
} {
  return {
    seasons: packs
      .map((p) => p.entry)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
}

/**
 * Checks the packs against seasons/keepsakes.json (`record`, parsed; `{}` when
 * the file doesn't exist yet). A season in the record must still exist, and
 * still have every keepsake sprite key recorded for it: players keep their
 * keepsakes, and the art is served from the season's current version. Returns
 * the record with new seasons and keys added, and what was added. With `ci`,
 * anything new throws instead, so the record can't stay uncommitted.
 */
export function checkKeepsakeRecord(
  record: unknown,
  packs: readonly BuiltPack[],
  ci: boolean,
): { record: KeepsakeRecordFile; added: string[] } {
  const parsed = recordSchema.safeParse(record);
  if (!parsed.success) {
    throw new Error(
      'seasons/keepsakes.json must map season ids to arrays of sprite keys',
    );
  }
  const byId = new Map(packs.map((p) => [p.entry.id, p]));
  const problems: string[] = [];
  for (const [id, keys] of Object.entries(parsed.data)) {
    const pack = byId.get(id);
    if (pack === undefined) {
      problems.push(
        `season "${id}" is in seasons/keepsakes.json but seasons/${id}/ is gone; a built season stays, so the keepsakes players own keep their art`,
      );
      continue;
    }
    for (const key of keys) {
      if (!pack.keepsakeKeys.includes(key)) {
        problems.push(
          `season "${id}" no longer has the keepsake sprite key "${key}", which players may own; keep the keepsake in season.json`,
        );
      }
    }
  }
  if (problems.length > 0) throw new Error(problems.join('\n'));

  const next: Record<string, string[]> = {};
  const added: string[] = [];
  for (const pack of [...packs].sort((a, b) =>
    a.entry.id < b.entry.id ? -1 : 1,
  )) {
    const id = pack.entry.id;
    const recorded = parsed.data[id];
    if (recorded === undefined) added.push(`season "${id}"`);
    const keys = [...(recorded ?? [])];
    for (const key of pack.keepsakeKeys) {
      if (!keys.includes(key)) {
        keys.push(key);
        added.push(`keepsake "${key}"`);
      }
    }
    next[id] = keys;
  }
  if (ci && added.length > 0) {
    throw new Error(
      `seasons/keepsakes.json is missing ${added.join(', ')}; run "npm run build:seasons" and commit seasons/keepsakes.json`,
    );
  }
  return { record: next, added };
}
