import { describe, expect, it } from 'vitest';
import musicData from '../data/music.json';
import { testData } from '../core/testing';
import { barMs, barTones, parseMusic, startMusic, themeFor } from './music';
import type { AudioManager, ToneSpec } from './audioManager';
import type { GameStore } from '../ui/store';
import { vi } from 'vitest';

const themes = parseMusic(musicData, [...testData.chapters.keys()]);
const theme = themes['chapter1']!;

describe('parseMusic', () => {
  it('accepts the real music.json, with a theme for every chapter', () => {
    for (const id of testData.chapters.keys()) expect(themes[id]).toBeDefined();
  });

  it('names every problem: a missing chapter, a pattern step past the chord', () => {
    const bad = {
      themes: {
        chapter1: { ...theme, pattern: [0, 1, 2, 3, 0, 1, 2, 3] },
      },
    };
    expect(() => parseMusic(bad, ['chapter1', 'chapter9'])).toThrow(
      /chapter9: missing[\s\S]*pattern step/,
    );
  });

  it('rejects a bad shape', () => {
    expect(() => parseMusic({ themes: { chapter1: { bpm: 1 } } }, [])).toThrow(
      /parseMusic/,
    );
  });
});

describe('barTones', () => {
  it('is a pad plus eight arpeggio notes, inside the bar', () => {
    const tones = barTones(theme, 0);
    expect(tones).toHaveLength(9);
    const [pad, ...arp] = tones;
    expect(pad?.durationMs).toBeCloseTo(barMs(theme));
    expect(arp.map((t) => t.delayMs ?? 0)).toEqual(
      arp.map((_, i) => (i * barMs(theme)) / 8),
    );
    for (const t of arp) {
      expect((t.delayMs ?? 0) + t.durationMs).toBeLessThanOrEqual(barMs(theme));
    }
  });

  it('walks the chord progression and then wraps round', () => {
    const first = barTones(theme, 0)[1]?.freq;
    expect(barTones(theme, 1)[1]?.freq).not.toBe(first);
    expect(barTones(theme, theme.progression.length)).toEqual(
      barTones(theme, 0),
    );
  });

  it('is deterministic', () => {
    expect(barTones(theme, 2)).toEqual(barTones(theme, 2));
  });
});

describe('themeFor', () => {
  it("uses the chapter's theme, and the first theme for an unknown chapter", () => {
    expect(themeFor(themes, 'chapter3')).toBe(themes['chapter3']);
    expect(themeFor(themes, 'nowhere')).toBe(Object.values(themes)[0]);
  });
});

describe('startMusic', () => {
  function setup(chapterId: string, hidden = false) {
    vi.useFakeTimers();
    const played: {
      tones: readonly ToneSpec[];
      channel: string | undefined;
    }[] = [];
    const audio: AudioManager = {
      unlock: () => undefined,
      setVolumes: () => undefined,
      play: (tones, channel) => {
        played.push({ tones, channel });
      },
    };
    const store = { getState: () => ({ chapterId }) } as unknown as GameStore;
    const stop = startMusic(store, audio, themes, () => hidden);
    return { played, stop };
  }

  it('plays a bar on the music channel at once and one more every bar', () => {
    const { played, stop } = setup('chapter1');
    expect(played).toHaveLength(1);
    expect(played[0]?.channel).toBe('music');
    vi.advanceTimersByTime(barMs(theme) * 2 + 1);
    expect(played).toHaveLength(3);
    stop();
    vi.advanceTimersByTime(barMs(theme) * 5);
    expect(played).toHaveLength(3);
    vi.useRealTimers();
  });

  it("uses the chapter's tempo", () => {
    const { played, stop } = setup('chapter5');
    const theme5 = themes['chapter5']!;
    vi.advanceTimersByTime(barMs(theme5) + 1);
    expect(played).toHaveLength(2);
    stop();
    vi.useRealTimers();
  });

  it('plays nothing while the tab is hidden', () => {
    const { played, stop } = setup('chapter1', true);
    vi.advanceTimersByTime(barMs(theme) * 3);
    expect(played).toHaveLength(0);
    stop();
    vi.useRealTimers();
  });
});
