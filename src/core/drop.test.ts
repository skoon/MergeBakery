/**
 * Tests for drop resolution: merge, swap, or move (T2.3).
 */

import { describe, it, expect } from 'vitest';
import { applyDrop } from './drop';
import { stateWith, testData } from './testing';
import { getCell, setCell } from './board';

describe('applyDrop: rejections', () => {
  it('rejects dropping a cell on itself', () => {
    const state = stateWith({ 0: 'wheat-stalk' });
    const result = applyDrop(testData, state, 0, 0, 1000);
    expect(result).toEqual({ ok: false, reason: 'sameCell' });
  });

  it('rejects when the source cell is locked', () => {
    const state = stateWith({ 0: 'crate', 1: 'wheat-stalk' });
    const result = applyDrop(testData, state, 0, 1, 1000);
    expect(result).toEqual({ ok: false, reason: 'locked' });
  });

  it('rejects when the source cell is empty', () => {
    const state = stateWith({ 1: 'wheat-stalk' });
    const result = applyDrop(testData, state, 0, 1, 1000);
    expect(result).toEqual({ ok: false, reason: 'emptyCell' });
  });

  it('rejects when the source item is cobwebbed', () => {
    const state = stateWith({
      0: { itemId: 'wheat-stalk', cobwebbed: true },
      1: 'wheat-bundle',
    });
    const result = applyDrop(testData, state, 0, 1, 1000);
    expect(result).toEqual({ ok: false, reason: 'cobwebbed' });
  });

  it('rejects when the destination cell is locked', () => {
    const state = stateWith({ 0: 'wheat-stalk', 1: 'crate' });
    const result = applyDrop(testData, state, 0, 1, 1000);
    expect(result).toEqual({ ok: false, reason: 'locked' });
  });

  it('rejects a non-matching drop onto a cobwebbed item', () => {
    const state = stateWith({
      0: 'wheat-stalk',
      1: { itemId: 'milk-splash', cobwebbed: true },
    });
    const result = applyDrop(testData, state, 0, 1, 1000);
    expect(result).toEqual({ ok: false, reason: 'cobwebbed' });
  });

  it('checks sameCell before locked or cobwebbed state', () => {
    const state = stateWith({ 0: 'crate' });
    const result = applyDrop(testData, state, 0, 0, 1000);
    expect(result).toEqual({ ok: false, reason: 'sameCell' });
  });
});

describe('applyDrop: move', () => {
  it('moves the item into an empty destination and empties the source', () => {
    const state = stateWith({ 0: 'wheat-stalk' });
    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getCell(result.state.board, 0)).toEqual({ kind: 'empty' });
    expect(getCell(result.state.board, 1)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-stalk', cobwebbed: false, generator: null },
    });
    expect(result.events).toEqual([]);
  });

  it('does not mutate the input state on a move', () => {
    const state = stateWith({ 0: 'wheat-stalk' });
    const originalCell0 = getCell(state.board, 0);

    applyDrop(testData, state, 0, 1, 1000);

    expect(getCell(state.board, 0)).toBe(originalCell0);
    expect(getCell(state.board, 1)).toEqual({ kind: 'empty' });
  });
});

describe('applyDrop: swap', () => {
  it('swaps two different, non-mergeable items', () => {
    const state = stateWith({ 0: 'wheat-stalk', 1: 'milk-splash' });
    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getCell(result.state.board, 0)).toEqual({
      kind: 'item',
      item: { itemId: 'milk-splash', cobwebbed: false, generator: null },
    });
    expect(getCell(result.state.board, 1)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-stalk', cobwebbed: false, generator: null },
    });
    expect(result.events).toEqual([]);
  });

  it('swaps top-tier matching items instead of merging them', () => {
    // flour-mill-3 has no next tier, so canMerge is false for a matching pair.
    let state = stateWith({ 0: 'flour-mill-3', 1: 'flour-mill-3' });
    // Give the two instances distinguishable generator state so the swap is verifiable.
    state = {
      ...state,
      board: setCell(state.board, 0, {
        kind: 'item',
        item: {
          itemId: 'flour-mill-3',
          cobwebbed: false,
          generator: { charges: 3, cooldownEndsAt: 500 },
        },
      }),
    };
    const beforeCell1 = getCell(state.board, 1);

    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getCell(result.state.board, 1)).toEqual({
      kind: 'item',
      item: {
        itemId: 'flour-mill-3',
        cobwebbed: false,
        generator: { charges: 3, cooldownEndsAt: 500 },
      },
    });
    expect(getCell(result.state.board, 0)).toEqual(beforeCell1);
    expect(result.events).toEqual([]);
  });
});

describe('applyDrop: merge', () => {
  it('merges two matching items into the next tier, emptying the source', () => {
    // milk-bottle is already discovered by the default new-game state, so this
    // merge produces no discovered event, keeping the case focused on the
    // basic merge mechanics.
    const state = stateWith({ 0: 'milk-splash', 1: 'milk-splash' });
    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getCell(result.state.board, 0)).toEqual({ kind: 'empty' });
    expect(getCell(result.state.board, 1)).toEqual({
      kind: 'item',
      item: { itemId: 'milk-bottle', cobwebbed: false, generator: null },
    });
    expect(result.events).toEqual([
      { type: 'merged', itemId: 'milk-bottle', cells: [1] },
    ]);
  });

  it('frees a cobwebbed target when the merge matches', () => {
    const state = stateWith({
      0: 'wheat-stalk',
      1: { itemId: 'wheat-stalk', cobwebbed: true },
    });
    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getCell(result.state.board, 1)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-bundle', cobwebbed: false, generator: null },
    });
  });

  it('merges two generators into the next tier with full charges', () => {
    const state = stateWith({ 0: 'flour-mill-1', 1: 'flour-mill-1' });
    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const nextDef = testData.generators.get('flour-mill-2');
    expect(nextDef).toBeDefined();
    expect(getCell(result.state.board, 1)).toEqual({
      kind: 'item',
      item: {
        itemId: 'flour-mill-2',
        cobwebbed: false,
        generator: { charges: nextDef!.charges, cooldownEndsAt: null },
      },
    });
  });

  it('opens an adjacent crate and reports cellsUnlocked', () => {
    // Board is 7 cols x 9 rows. Cell 1 is (1, 0); its right neighbor is cell 2.
    const state = stateWith({ 0: 'wheat-stalk', 1: 'wheat-stalk', 2: 'crate' });
    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getCell(result.state.board, 2)).toEqual({ kind: 'empty' });
    expect(result.events).toEqual([
      { type: 'merged', itemId: 'wheat-bundle', cells: [1] },
      { type: 'cellsUnlocked', cells: [2] },
    ]);
  });

  it('awards XP and triggers a level-up when the threshold is crossed', () => {
    const state = stateWith(
      { 0: 'wheat-stalk', 1: 'wheat-stalk' },
      { xp: 19, level: 1, gems: 0 },
    );
    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // wheat-stalk is tier 1; xpPerMergeTier is 1, so this merge adds 1 xp,
    // reaching the level 2 threshold of 20.
    expect(result.state.xp).toBe(20);
    expect(result.state.level).toBe(2);
    expect(result.state.gems).toBe(5);
    expect(result.events).toEqual([
      { type: 'merged', itemId: 'wheat-bundle', cells: [1] },
      { type: 'levelUp', level: 2, gems: 5 },
    ]);
  });

  it('discovers a first-time item made by a merge', () => {
    // flour-scoop is not part of the default new-game board, so it starts undiscovered.
    const state = stateWith({ 0: 'wheat-bundle', 1: 'wheat-bundle' });
    expect(state.discovered).not.toContain('flour-scoop');

    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.discovered).toContain('flour-scoop');
    expect(result.events).toEqual([
      { type: 'merged', itemId: 'flour-scoop', cells: [1] },
      { type: 'discovered', itemId: 'flour-scoop' },
    ]);
  });

  it('does not mutate the input state on a merge', () => {
    const state = stateWith({ 0: 'milk-splash', 1: 'milk-splash' });
    const originalCell0 = getCell(state.board, 0);
    const originalCell1 = getCell(state.board, 1);
    const originalDiscovered = state.discovered;

    applyDrop(testData, state, 0, 1, 1000);

    expect(getCell(state.board, 0)).toBe(originalCell0);
    expect(getCell(state.board, 1)).toBe(originalCell1);
    expect(state.discovered).toBe(originalDiscovered);
  });
});

describe('applyDrop: five-item merge bonus', () => {
  // Board is 7 cols x 9 rows. Cell 16 is (2, 2); its orthogonal neighbors are
  // 9 (up), 17 (right), 23 (down), 15 (left).

  it('gives two next-tier items for 5 items: 4 on the board plus the dragged one', () => {
    // to=16 plus its 3 other neighbors (15, 17, 23) form a group of 4; the
    // dragged item comes from 9. All 3 others tie at distance 1 from `to`,
    // so the closest by lowest index is 15.
    const state = stateWith({
      9: 'wheat-stalk',
      16: 'wheat-stalk',
      17: 'wheat-stalk',
      23: 'wheat-stalk',
      15: 'wheat-stalk',
    });
    const result = applyDrop(testData, state, 9, 16, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getCell(result.state.board, 9)).toEqual({ kind: 'empty' });
    expect(getCell(result.state.board, 16)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-bundle', cobwebbed: false, generator: null },
    });
    expect(getCell(result.state.board, 15)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-bundle', cobwebbed: false, generator: null },
    });
    expect(getCell(result.state.board, 17)).toEqual({ kind: 'empty' });
    expect(getCell(result.state.board, 23)).toEqual({ kind: 'empty' });
    expect(result.events).toEqual([
      { type: 'merged', itemId: 'wheat-bundle', cells: [16, 15] },
    ]);
    expect(result.state.xp).toBe(2);
  });

  it('gives the normal result for 4 items: a group of only 3 cells', () => {
    // to=16 plus 2 other neighbors (15, 17) form a group of only 3 cells,
    // which is at or below the normal-merge threshold.
    const state = stateWith({
      9: 'wheat-stalk',
      16: 'wheat-stalk',
      17: 'wheat-stalk',
      15: 'wheat-stalk',
    });
    const result = applyDrop(testData, state, 9, 16, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getCell(result.state.board, 9)).toEqual({ kind: 'empty' });
    expect(getCell(result.state.board, 16)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-bundle', cobwebbed: false, generator: null },
    });
    // The other group cells are untouched by a normal merge.
    expect(getCell(result.state.board, 17)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-stalk', cobwebbed: false, generator: null },
    });
    expect(getCell(result.state.board, 15)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-stalk', cobwebbed: false, generator: null },
    });
    expect(result.events).toEqual([
      { type: 'merged', itemId: 'wheat-bundle', cells: [16] },
    ]);
    expect(result.state.xp).toBe(1);
  });

  it('leaves one behind for 6 items: a group of 5 cells', () => {
    // to=16 connects directly to 15, 17, 23, and via 17 to 18 (two hops from
    // `to`), for a group of 5. 18 is farthest from `to` (distance 2), so the
    // 3 closest (15, 17, 23, all distance 1, ordered by index) are consumed
    // and 18 is left behind.
    const state = stateWith({
      9: 'wheat-stalk',
      16: 'wheat-stalk',
      17: 'wheat-stalk',
      23: 'wheat-stalk',
      15: 'wheat-stalk',
      18: 'wheat-stalk',
    });
    const result = applyDrop(testData, state, 9, 16, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getCell(result.state.board, 9)).toEqual({ kind: 'empty' });
    expect(getCell(result.state.board, 16)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-bundle', cobwebbed: false, generator: null },
    });
    expect(getCell(result.state.board, 15)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-bundle', cobwebbed: false, generator: null },
    });
    expect(getCell(result.state.board, 17)).toEqual({ kind: 'empty' });
    expect(getCell(result.state.board, 23)).toEqual({ kind: 'empty' });
    // Left behind: still an ordinary wheat-stalk, untouched.
    expect(getCell(result.state.board, 18)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-stalk', cobwebbed: false, generator: null },
    });
    expect(result.events).toEqual([
      { type: 'merged', itemId: 'wheat-bundle', cells: [16, 15] },
    ]);
  });

  it("doesn't let a diagonal item join the group", () => {
    // 24 is diagonal to `to`=16 (down-right) with no orthogonal path to it
    // (17 and 23, the cells between them, are empty), so it stays out of the
    // group and is untouched by the merge.
    const state = stateWith({
      9: 'wheat-stalk',
      16: 'wheat-stalk',
      24: 'wheat-stalk',
    });
    const result = applyDrop(testData, state, 9, 16, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getCell(result.state.board, 16)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-bundle', cobwebbed: false, generator: null },
    });
    expect(getCell(result.state.board, 24)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-stalk', cobwebbed: false, generator: null },
    });
    expect(result.events).toEqual([
      { type: 'merged', itemId: 'wheat-bundle', cells: [16] },
    ]);
  });

  it('breaks the chain at a cobwebbed item', () => {
    // 17, 18, 19 form a line extending right from `to`=16, but 17 is
    // cobwebbed, so it doesn't count toward the group and blocks 18 and 19
    // from connecting to `to` through it. The group is just {16}.
    const state = stateWith({
      9: 'wheat-stalk',
      16: 'wheat-stalk',
      17: { itemId: 'wheat-stalk', cobwebbed: true },
      18: 'wheat-stalk',
      19: 'wheat-stalk',
    });
    const result = applyDrop(testData, state, 9, 16, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getCell(result.state.board, 16)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-bundle', cobwebbed: false, generator: null },
    });
    // Untouched: still cobwebbed, and still wheat-stalk beyond it.
    expect(getCell(result.state.board, 17)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-stalk', cobwebbed: true, generator: null },
    });
    expect(getCell(result.state.board, 18)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-stalk', cobwebbed: false, generator: null },
    });
    expect(getCell(result.state.board, 19)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-stalk', cobwebbed: false, generator: null },
    });
    expect(result.events).toEqual([
      { type: 'merged', itemId: 'wheat-bundle', cells: [16] },
    ]);
    expect(result.state.xp).toBe(1);
  });

  it('opens locks adjacent to both result cells', () => {
    // Group is {16, 17, 23, 18}: to=16 connects directly to 17 and 23, and
    // via 17 to 18. 15 (a free neighbor of `to`) and 24 (a free neighbor of
    // 17) each hold a crate. 17 and 23 tie at distance 1 from `to`; by
    // lowest index 17 is the closer one and becomes the second result cell.
    const state = stateWith({
      9: 'wheat-stalk',
      16: 'wheat-stalk',
      17: 'wheat-stalk',
      23: 'wheat-stalk',
      18: 'wheat-stalk',
      15: 'crate',
      24: 'crate',
    });
    const result = applyDrop(testData, state, 9, 16, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getCell(result.state.board, 16)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-bundle', cobwebbed: false, generator: null },
    });
    expect(getCell(result.state.board, 17)).toEqual({
      kind: 'item',
      item: { itemId: 'wheat-bundle', cobwebbed: false, generator: null },
    });
    expect(getCell(result.state.board, 15)).toEqual({ kind: 'empty' });
    expect(getCell(result.state.board, 24)).toEqual({ kind: 'empty' });
    expect(result.events).toEqual([
      { type: 'merged', itemId: 'wheat-bundle', cells: [16, 17] },
      { type: 'cellsUnlocked', cells: [15, 24] },
    ]);
  });

  it('doubles XP for the bonus merge', () => {
    // Same group shape as the basic 5-item case, but with a tier 3 item so
    // the doubled amount (6) is distinguishable from a coincidental value.
    const state = stateWith({
      9: 'flour-scoop',
      16: 'flour-scoop',
      17: 'flour-scoop',
      23: 'flour-scoop',
      15: 'flour-scoop',
    });
    const result = applyDrop(testData, state, 9, 16, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // flour-scoop is tier 3; xpPerMergeTier is 1; a normal merge would add 3,
    // the bonus doubles it to 6.
    expect(result.state.xp).toBe(6);
    expect(getCell(result.state.board, 16)).toEqual({
      kind: 'item',
      item: { itemId: 'flour-bag', cobwebbed: false, generator: null },
    });
  });
});

describe('applyDrop: Golden Whisk', () => {
  it('copies a tier 5 item when the whisk is dragged onto it', () => {
    const state = stateWith({ 0: 'golden-whisk', 1: 'flour-sack' });
    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The whisk's cell becomes a copy of the item
    expect(getCell(result.state.board, 0)).toEqual({
      kind: 'item',
      item: { itemId: 'flour-sack', cobwebbed: false, generator: null },
    });
    // The original item stays where it is
    expect(getCell(result.state.board, 1)).toEqual({
      kind: 'item',
      item: { itemId: 'flour-sack', cobwebbed: false, generator: null },
    });
    // Events should show the merged copy
    expect(result.events).toEqual([
      { type: 'merged', itemId: 'flour-sack', cells: [0] },
    ]);
    // No XP awarded
    expect(result.state.xp).toBe(0);
  });

  it('copies a tier 5 item when it is dragged onto the whisk', () => {
    const state = stateWith({ 0: 'flour-sack', 1: 'golden-whisk' });
    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The whisk's cell becomes a copy of the item
    expect(getCell(result.state.board, 1)).toEqual({
      kind: 'item',
      item: { itemId: 'flour-sack', cobwebbed: false, generator: null },
    });
    // The original item stays where it is
    expect(getCell(result.state.board, 0)).toEqual({
      kind: 'item',
      item: { itemId: 'flour-sack', cobwebbed: false, generator: null },
    });
    // Events should show the merged copy
    expect(result.events).toEqual([
      { type: 'merged', itemId: 'flour-sack', cells: [1] },
    ]);
    // No XP awarded
    expect(result.state.xp).toBe(0);
  });

  it('rejects copying a tier 6 item', () => {
    const state = stateWith({ 0: 'golden-whisk', 1: 'dough-ball' });
    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result).toEqual({ ok: false, reason: 'notMergeable' });
  });

  it('rejects copying a generator item', () => {
    const state = stateWith({ 0: 'golden-whisk', 1: 'flour-mill-1' });
    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result).toEqual({ ok: false, reason: 'notMergeable' });
  });

  it('rejects copying a bonus item', () => {
    const state = stateWith({ 0: 'golden-whisk', 1: 'energy-jar' });
    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result).toEqual({ ok: false, reason: 'notMergeable' });
  });

  it('rejects copying a cobwebbed item', () => {
    const state = stateWith({
      0: 'golden-whisk',
      1: { itemId: 'flour-sack', cobwebbed: true },
    });
    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result).toEqual({ ok: false, reason: 'notMergeable' });
  });

  it('swaps two whisks instead of merging them', () => {
    const state = stateWith({ 0: 'golden-whisk', 1: 'golden-whisk' });
    const result = applyDrop(testData, state, 0, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getCell(result.state.board, 0)).toEqual({
      kind: 'item',
      item: { itemId: 'golden-whisk', cobwebbed: false, generator: null },
    });
    expect(getCell(result.state.board, 1)).toEqual({
      kind: 'item',
      item: { itemId: 'golden-whisk', cobwebbed: false, generator: null },
    });
    expect(result.events).toEqual([]);
  });
});
