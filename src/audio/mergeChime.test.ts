/**
 * Tests for the merge chime (T5.10).
 */

import { describe, it, expect, vi } from 'vitest';
import { mergeChimeTones, mergeNoteHz, startMergeChime } from './mergeChime';
import type { AudioManager } from './audioManager';
import { testData } from '../core/testing';
import type { GameEvent, GameState } from '../core/types';
import type { GameStore, StoreListener } from '../ui/store';

describe('mergeNoteHz', () => {
  it('climbs the C major scale from C5', () => {
    expect(mergeNoteHz(1)).toBeCloseTo(523.25, 2);
    expect(mergeNoteHz(3)).toBeCloseTo(659.26, 2);
    expect(mergeNoteHz(8)).toBeCloseTo(1046.5, 2);
    expect(mergeNoteHz(9)).toBeCloseTo(1174.66, 2);
  });

  it('rises with every tier from 1 to 8', () => {
    for (let tier = 2; tier <= 8; tier++) {
      expect(mergeNoteHz(tier)).toBeGreaterThan(mergeNoteHz(tier - 1));
    }
  });

  it('throws below tier 1', () => {
    expect(() => mergeNoteHz(0)).toThrow(RangeError);
  });
});

describe('startMergeChime', () => {
  function setup() {
    let listener: StoreListener | null = null;
    const store = {
      data: testData,
      subscribe: (l: StoreListener) => {
        listener = l;
        return () => {
          listener = null;
        };
      },
    } as unknown as GameStore;
    const play = vi.fn();
    const audio: AudioManager = {
      unlock: vi.fn(),
      setVolumes: vi.fn(),
      play,
    };
    const emit = (events: GameEvent[]) => listener?.({} as GameState, events);
    return { store, audio, play, emit };
  }

  it("plays the merged item's tier", () => {
    const { store, audio, play, emit } = setup();
    startMergeChime(store, audio);

    // flour-scoop is tier 3 of the flour chain.
    emit([{ type: 'merged', itemId: 'flour-scoop', cells: [0, 1] }]);

    expect(play).toHaveBeenCalledOnce();
    expect(play).toHaveBeenCalledWith(mergeChimeTones(3));
  });

  it('ignores other events', () => {
    const { store, audio, play, emit } = setup();
    startMergeChime(store, audio);

    emit([
      { type: 'sold', itemId: 'egg', coins: 1 },
      { type: 'taskCompleted', taskId: 'sweep-cobwebs' },
    ]);

    expect(play).not.toHaveBeenCalled();
  });
});
