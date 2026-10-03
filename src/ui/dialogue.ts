/**
 * Story scenes: their data shape, validation, and what the box shows for a
 * line (T5.4). Pure, no DOM; dialoguePlayer.ts draws them.
 *
 * Dialogue types live here rather than in src/core/types.ts: the core only
 * refers to scenes by SceneId, and that contract stays frozen.
 */

import { z } from 'zod';
import type { CustomerId, GameData, SceneId } from '../core/types';

export type Expression = 'neutral' | 'happy' | 'impatient';
/** A customer or staff id, or one of the speakers who aren't either. */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type Speaker = CustomerId | 'grandma' | 'narrator';

export interface DialogueLine {
  speaker: Speaker;
  /** Defaults to 'neutral'. Ignored for the narrator. */
  expression?: Expression;
  text: string;
}

export interface Scene {
  id: SceneId;
  lines: DialogueLine[];
}

const lineSchema = z.strictObject({
  speaker: z.string(),
  expression: z.enum(['neutral', 'happy', 'impatient']).optional(),
  text: z.string(),
});

const scenesFileSchema = z.strictObject({
  scenes: z.array(
    z.strictObject({
      id: z.string(),
      lines: z.array(lineSchema),
    }),
  ),
});

const SPECIAL_SPEAKERS: ReadonlySet<string> = new Set(['grandma', 'narrator']);

/**
 * Validates `{ "scenes": Scene[] }` and returns the scenes by id. Throws one
 * Error listing every problem: a bad shape, a duplicate id, an empty scene,
 * empty text, or a speaker that is neither a customer nor 'grandma' or
 * 'narrator'.
 */
export function parseScenes(
  data: GameData,
  raw: unknown,
): ReadonlyMap<SceneId, Scene> {
  const result = scenesFileSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      return `${path}: ${issue.message}`;
    });
    throw new Error(`parseScenes:\n${problems.join('\n')}`);
  }

  const problems: string[] = [];
  const scenes = new Map<SceneId, Scene>();

  for (const scene of result.data.scenes) {
    if (scenes.has(scene.id)) {
      problems.push(`scene "${scene.id}": duplicate id`);
    }
    if (scene.lines.length === 0) {
      problems.push(`scene "${scene.id}": has no lines`);
    }
    scene.lines.forEach((line, i) => {
      if (line.text.trim() === '') {
        problems.push(`scene "${scene.id}" line ${i.toString()}: empty text`);
      }
      if (
        !SPECIAL_SPEAKERS.has(line.speaker) &&
        !data.customers.has(line.speaker) &&
        !data.staff.has(line.speaker)
      ) {
        problems.push(
          `scene "${scene.id}" line ${i.toString()}: unknown speaker "${line.speaker}"`,
        );
      }
    });
    scenes.set(scene.id, scene);
  }

  if (problems.length > 0) {
    throw new Error(`parseScenes:\n${problems.join('\n')}`);
  }
  return scenes;
}

/** Scene ids a chapter refers to (introSceneId and task sceneIds) that aren't in `scenes`. */
export function missingSceneIds(
  data: GameData,
  scenes: ReadonlyMap<SceneId, Scene>,
): SceneId[] {
  const missing: SceneId[] = [];
  for (const chapter of data.chapters.values()) {
    const refs = [chapter.introSceneId, ...chapter.tasks.map((t) => t.sceneId)];
    for (const id of refs) {
      if (id !== null && !scenes.has(id) && !missing.includes(id)) {
        missing.push(id);
      }
    }
  }
  return missing;
}

/**
 * What the box shows for a line. Customers and staff: their name and
 * `${portraitKey}-${expression}`. 'grandma': "Grandma" and
 * `portrait-grandma-${expression}`. 'narrator': no name, no portrait.
 */
export function speakerView(
  data: GameData,
  line: DialogueLine,
): { name: string | null; portraitKey: string | null } {
  const expression = line.expression ?? 'neutral';
  if (line.speaker === 'narrator') {
    return { name: null, portraitKey: null };
  }
  if (line.speaker === 'grandma') {
    return { name: 'Grandma', portraitKey: `portrait-grandma-${expression}` };
  }
  // Staff (T10.8) speak like customers: their own name and portrait.
  const customer =
    data.customers.get(line.speaker) ?? data.staff.get(line.speaker);
  if (!customer) {
    throw new Error(`speakerView: unknown speaker "${line.speaker}"`);
  }
  return {
    name: customer.name,
    portraitKey: `${customer.portraitKey}-${expression}`,
  };
}
