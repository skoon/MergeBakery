/**
 * Save migrations (T4.6).
 *
 * A save carries the format version it was written with. When the format
 * changes, `SAVE_VERSION` in save.ts goes up by one and a migration from the
 * old version to the new one is added to `MIGRATIONS`. Loading then walks an
 * old save forward one version at a time before it is validated, so a player
 * who has been away for three releases still lands on a current save.
 *
 * Pure: no storage access, no clock.
 */

/** A save as parsed from JSON, before it has been validated against the schema. */
export type SaveObject = Record<string, unknown>;

/** Upgrades a save from version n to n + 1. Keyed by n. */
export type Migration = (save: SaveObject) => SaveObject;

/**
 * The game's migrations. v1 → v2 adds the MegaBun event fields (T8.1): no
 * event running, none scheduled yet, no result to show, no trophies.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: (save) => ({
    ...save,
    state: {
      ...(save['state'] as Record<string, unknown>),
      event: null,
      nextEventAt: null,
      eventResult: null,
      trophies: [],
    },
  }),
};

/**
 * Applies `migrations[v]` for each v from `save.version` up to
 * `targetVersion − 1`, setting `version` to v + 1 after each. Returns the input
 * unchanged when it is already at `targetVersion`.
 *
 * Throws when `save.version` isn't a whole number, is newer than
 * `targetVersion`, or a migration the chain needs is missing.
 */
export function migrate(
  save: SaveObject,
  targetVersion: number,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
): SaveObject {
  const version = save['version'];

  if (typeof version !== 'number' || !Number.isInteger(version)) {
    throw new Error(
      `migrate: save version must be a whole number, got ${JSON.stringify(version)}`,
    );
  }

  if (version > targetVersion) {
    throw new Error(
      `migrate: save version ${version.toString()} is newer than the target version ${targetVersion.toString()}`,
    );
  }

  let current = save;
  for (let v = version; v < targetVersion; v++) {
    const step = migrations[v];
    if (!step) {
      throw new Error(
        `migrate: no migration from version ${v.toString()} to ${(v + 1).toString()}`,
      );
    }
    current = { ...step(current), version: v + 1 };
  }

  return current;
}
