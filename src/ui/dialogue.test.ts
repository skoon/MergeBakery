/**
 * Tests for story scene data (T5.4).
 */

import { describe, it, expect } from 'vitest';
import { loadGameData } from '../core/data';
import type { GameData } from '../core/types';
import sample from '../data/dialogue/sample.json';
import chapter1Scenes from '../data/dialogue/chapter1.json';
import chapter2Scenes from '../data/dialogue/chapter2.json';
import chapter3Scenes from '../data/dialogue/chapter3.json';
import chapter4Scenes from '../data/dialogue/chapter4.json';
import eventScenes from '../data/dialogue/events.json';
import {
  missingSceneIds,
  parseScenes,
  speakerView,
  type Scene,
} from './dialogue';

const data = loadGameData();

/** Real data where chapter1 refers only to these scenes: its intro and its first task. */
function dataReferring(
  introSceneId: string | null,
  taskSceneId: string | null,
): GameData {
  const chapter = data.chapters.get('chapter1');
  if (!chapter) throw new Error('chapter1 is missing');
  const chapters = new Map(data.chapters);
  chapters.delete('chapter2');
  chapters.delete('chapter3');
  chapters.delete('chapter4');
  chapters.set('chapter1', {
    ...chapter,
    introSceneId,
    // Only the first task refers to a scene, whatever the real chapter says.
    tasks: chapter.tasks.map((task, i) => ({
      ...task,
      sceneId: i === 0 ? taskSceneId : null,
    })),
  });
  return { ...data, chapters };
}

function scenesOf(...ids: string[]): ReadonlyMap<string, Scene> {
  return new Map(
    ids.map((id) => [id, { id, lines: [{ speaker: 'narrator', text: 'Hi' }] }]),
  );
}

describe('parseScenes', () => {
  it('parses sample.json', () => {
    const scenes = parseScenes(data, sample);

    expect([...scenes.keys()]).toEqual(['sample']);
    expect(scenes.get('sample')?.lines).toHaveLength(4);
  });

  it('rejects a bad shape', () => {
    expect(() => parseScenes(data, { scenes: [{ id: 'x' }] })).toThrow(/lines/);
    expect(() =>
      parseScenes(data, {
        scenes: [
          {
            id: 'x',
            lines: [{ speaker: 'gus', expression: 'angry', text: 'Hi' }],
          },
        ],
      }),
    ).toThrow(/expression/);
  });

  it('lists every problem in one error', () => {
    const raw = {
      scenes: [
        { id: 'a', lines: [{ speaker: 'narrator', text: 'Hi' }] },
        { id: 'a', lines: [{ speaker: 'narrator', text: 'Again' }] },
        { id: 'empty', lines: [] },
        {
          id: 'bad-lines',
          lines: [
            { speaker: 'narrator', text: '   ' },
            { speaker: 'chad', text: 'Synergy.' },
          ],
        },
      ],
    };

    let message = '';
    try {
      parseScenes(data, raw);
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toMatch(/"a": duplicate id/);
    expect(message).toMatch(/"empty": has no lines/);
    expect(message).toMatch(/"bad-lines" line 0: empty text/);
    expect(message).toMatch(/"bad-lines" line 1: unknown speaker "chad"/);
  });
});

describe('missingSceneIds', () => {
  it('finds a missing intro and a missing task scene', () => {
    const d = dataReferring('ch1-intro', 'ch1-first');

    expect(missingSceneIds(d, scenesOf())).toEqual(['ch1-intro', 'ch1-first']);
    expect(missingSceneIds(d, scenesOf('ch1-intro'))).toEqual(['ch1-first']);
  });

  it('is empty when every referenced scene exists', () => {
    const d = dataReferring('ch1-intro', 'ch1-first');

    expect(missingSceneIds(d, scenesOf('ch1-intro', 'ch1-first'))).toEqual([]);
    expect(missingSceneIds(dataReferring(null, null), scenesOf())).toEqual([]);
  });
});

describe('speakerView', () => {
  it('shows a customer with their expression', () => {
    expect(
      speakerView(data, { speaker: 'gus', expression: 'happy', text: 'Hi' }),
    ).toEqual({ name: 'Gus the Fisherman', portraitKey: 'portrait-gus-happy' });
  });

  it('lets staff speak, with their own name and portrait', () => {
    const scenes = parseScenes(data, {
      scenes: [{ id: 's', lines: [{ speaker: 'trevor', text: 'Hi' }] }],
    });
    expect(scenes.has('s')).toBe(true);
    expect(
      speakerView(data, { speaker: 'trevor', expression: 'happy', text: 'Hi' }),
    ).toEqual({ name: 'Trevor', portraitKey: 'portrait-trevor-happy' });
  });

  it('shows Grandma', () => {
    expect(
      speakerView(data, {
        speaker: 'grandma',
        expression: 'happy',
        text: 'Hi',
      }),
    ).toEqual({ name: 'Grandma', portraitKey: 'portrait-grandma-happy' });
  });

  it('shows the narrator with no name or portrait', () => {
    expect(speakerView(data, { speaker: 'narrator', text: 'Hi' })).toEqual({
      name: null,
      portraitKey: null,
    });
  });

  it('defaults to the neutral expression', () => {
    expect(
      speakerView(data, { speaker: 'edith', text: 'Hi' }).portraitKey,
    ).toBe('portrait-edith-neutral');
  });
});

describe('Event scenes (T8.7)', () => {
  const scenes = parseScenes(data, eventScenes);

  it('has a start, win and lose scene for every event', () => {
    for (const id of data.events.keys()) {
      for (const suffix of ['start', 'win', 'lose']) {
        expect(scenes.has(`event-${id}-${suffix}`), `${id} ${suffix}`).toBe(
          true,
        );
      }
    }
  });

  it('keeps each scene to 3–6 lines of at most 140 characters', () => {
    for (const scene of scenes.values()) {
      expect(scene.lines.length, scene.id).toBeGreaterThanOrEqual(3);
      expect(scene.lines.length, scene.id).toBeLessThanOrEqual(6);
      for (const line of scene.lines) {
        expect(
          line.text.length,
          `${scene.id}: ${line.text}`,
        ).toBeLessThanOrEqual(140);
      }
    }
  });
});

describe('Chapters 1 to 4 scenes (T5.5, T7.6, T9.6, T10.8)', () => {
  const scenes = parseScenes(data, {
    scenes: [
      ...chapter1Scenes.scenes,
      ...chapter2Scenes.scenes,
      ...chapter3Scenes.scenes,
      ...chapter4Scenes.scenes,
    ],
  });

  it('parses and covers every scene the chapter refers to', () => {
    expect(missingSceneIds(data, scenes)).toEqual([]);
    expect(data.chapters.get('chapter1')?.introSceneId).toBe('ch1-intro');
  });

  it('keeps each scene to 4–10 lines of at most 140 characters', () => {
    for (const scene of scenes.values()) {
      expect(scene.lines.length, scene.id).toBeGreaterThanOrEqual(4);
      expect(scene.lines.length, scene.id).toBeLessThanOrEqual(10);
      for (const line of scene.lines) {
        expect(
          line.text.length,
          `${scene.id}: ${line.text}`,
        ).toBeLessThanOrEqual(140);
      }
    }
  });
});
