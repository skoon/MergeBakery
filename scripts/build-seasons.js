/**
 * Builds the season packs (T14.7): seasons/<id>/ → public/seasons/.
 *
 * The checks and what gets written are in src/seasons/build.ts, loaded through
 * Vite's SSR loader so they run the game's own pack validation. This file only
 * reads and writes files, compiles each rules.ts with Vite's library mode, and
 * checks the compiled rules.js with the game's loader. Any problem fails the
 * build with exit code 1. Nothing is deleted: public/seasons/ is a build
 * output, and an old version folder from an earlier local build is unused.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, createServer } from 'vite';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCES = path.join(ROOT, 'seasons');
const OUT = path.join(ROOT, 'public', 'seasons');
const RECORD = path.join(SOURCES, 'keepsakes.json');
const CI = Boolean(process.env.CI);

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (error) {
    throw new Error(`${path.relative(ROOT, file)}: ${error.message}`, {
      cause: error,
    });
  }
}

/** Every folder under seasons/ that holds a season.json, read into a PackSource. */
function readSources() {
  if (!fs.existsSync(SOURCES)) return [];
  return fs
    .readdirSync(SOURCES, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .map((folder) => {
      const dir = path.join(SOURCES, folder);
      if (!fs.existsSync(path.join(dir, 'season.json'))) {
        throw new Error(`seasons/${folder}/ has no season.json`);
      }
      const artDir = path.join(dir, 'art');
      const artFiles = fs.existsSync(artDir) ? fs.readdirSync(artDir) : [];
      const pngKeys = artFiles
        .filter((f) => f.endsWith('.png'))
        .map((f) => f.slice(0, -'.png'.length));
      // Drawings are laid on the placeholder tile by build.ts, not copied.
      const drawings = Object.fromEntries(
        artFiles
          .filter((f) => f.endsWith('.svg'))
          .map((f) => [
            f.slice(0, -'.svg'.length),
            fs.readFileSync(path.join(artDir, f), 'utf-8'),
          ]),
      );
      return {
        folder,
        season: readJson(path.join(dir, 'season.json')),
        placeholders: readJson(path.join(dir, 'placeholders.json')),
        pngKeys,
        drawings,
        hasRules: fs.existsSync(path.join(dir, 'rules.ts')),
      };
    });
}

/** Loads the TypeScript build steps and the game's data through Vite. */
async function withGameCode(fn) {
  const server = await createServer({
    configFile: false,
    root: ROOT,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const steps = await server.ssrLoadModule('/src/seasons/build.ts');
    const { loadGameData } = await server.ssrLoadModule('/src/core/data.ts');
    const { checkRules } = await server.ssrLoadModule('/src/seasons/loader.ts');
    return await fn({ ...steps, checkRules, base: loadGameData() });
  } finally {
    await server.close();
  }
}

async function compileRules(folder, outDir, checkRules) {
  await build({
    configFile: false,
    root: ROOT,
    publicDir: false,
    logLevel: 'warn',
    build: {
      outDir,
      emptyOutDir: false,
      copyPublicDir: false,
      minify: false,
      lib: {
        entry: path.join(SOURCES, folder, 'rules.ts'),
        formats: ['es'],
        fileName: () => 'rules.js',
      },
    },
  });
  const compiled = path.join(outDir, 'rules.js');
  try {
    // A fresh query each run: Node caches modules by URL.
    checkRules(await import(`${pathToFileURL(compiled).href}?t=${Date.now()}`));
  } catch (error) {
    throw new Error(`seasons/${folder}/rules.ts: ${error.message}`, {
      cause: error,
    });
  }
}

async function main() {
  const sources = readSources();
  await withGameCode(
    async ({
      base,
      buildPacks,
      seasonIndex,
      checkKeepsakeRecord,
      checkRules,
      cssTokenNames,
    }) => {
      const tokenNames = cssTokenNames(
        fs.readFileSync(path.join(ROOT, 'src', 'ui', 'tokens.css'), 'utf-8'),
      );
      const packs = buildPacks(base, sources, tokenNames);
      const record = checkKeepsakeRecord(
        fs.existsSync(RECORD) ? readJson(RECORD) : {},
        packs,
        CI,
      );

      for (const pack of packs) {
        const { id, version, rules, pngKeys } = pack.entry;
        const from = path.join(SOURCES, id);
        const outDir = path.join(OUT, id, version);
        const artOut = path.join(outDir, 'art');
        fs.mkdirSync(artOut, { recursive: true });
        fs.copyFileSync(
          path.join(from, 'season.json'),
          path.join(outDir, 'season.json'),
        );
        for (const key of pngKeys) {
          fs.copyFileSync(
            path.join(from, 'art', `${key}.png`),
            path.join(artOut, `${key}.png`),
          );
        }
        for (const [key, svg] of pack.svgs) {
          fs.writeFileSync(path.join(artOut, `${key}.svg`), svg, 'utf-8');
        }
        if (rules) await compileRules(id, outDir, checkRules);
        console.log(
          `build:seasons: ${id} ${version} → public/seasons/${id}/${version}/`,
        );
      }

      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(
        path.join(OUT, 'index.json'),
        `${JSON.stringify(seasonIndex(packs), null, 2)}\n`,
        'utf-8',
      );
      if (record.added.length > 0) {
        fs.writeFileSync(
          RECORD,
          `${JSON.stringify(record.record, null, 2)}\n`,
          'utf-8',
        );
        console.log(
          `build:seasons: recorded ${record.added.join(', ')} in seasons/keepsakes.json; commit it`,
        );
      }
      console.log(
        `build:seasons: ${packs.length} season(s) in public/seasons/index.json`,
      );
    },
  );
}

main().catch((error) => {
  console.error(`build:seasons failed:\n${error.message}`);
  process.exit(1);
});
