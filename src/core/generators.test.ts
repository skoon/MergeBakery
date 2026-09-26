/**
 * Tests for tapping generators and collecting bonus items (T3.2).
 */

import { describe, it, expect } from 'vitest';
import { stateWith, testData } from './testing';
import { createRng } from './rng';
import { getCell, nearestEmpty, setCell } from './board';
import { tapGenerator, collectBonus } from './generators';
import type { BoardItem, GameState } from './types';
import type { CellSpec } from './testing';

const data = testData;
const flourMill1 = data.generators.get('flour-mill-1');
if (!flourMill1) {
  throw new Error('test setup: flour-mill-1 generator def not found');
}

/** Replace the item at `cell` with one carrying a specific charge state. */
function withCharge(
  state: GameState,
  cell: number,
  itemId: string,
  charges: number,
  cooldownEndsAt: number | null,
): GameState {
  const item: BoardItem = {
    itemId,
    cobwebbed: false,
    generator: { charges, cooldownEndsAt },
  };
  return {
    ...state,
    board: setCell(state.board, cell, { kind: 'item', item }),
  };
}

describe('tapGenerator', () => {
  it('a normal tap spends energy, uses a charge, spawns an item, and emits spawned', () => {
    const state = stateWith(
      { 0: 'flour-mill-1' },
      { energy: { value: 50, updatedAt: 1000 } },
    );
    const rng = createRng(1);
    const expectedCell = nearestEmpty(state.board, 0);
    expect(expectedCell).not.toBeNull();

    const result = tapGenerator(data, state, 0, rng, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.energy.value).toBe(49);

    const tappedCell = getCell(result.state.board, 0);
    expect(tappedCell.kind).toBe('item');
    if (tappedCell.kind === 'item') {
      expect(tappedCell.item.generator?.charges).toBe(flourMill1.charges - 1);
    }

    const spawnedCell = getCell(result.state.board, expectedCell as number);
    expect(spawnedCell.kind).toBe('item');

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      type: 'spawned',
      cell: expectedCell,
    });
    if (spawnedCell.kind === 'item') {
      expect(result.events[0]).toMatchObject({
        itemId: spawnedCell.item.itemId,
      });
    }
  });

  it('rejects a locked cell', () => {
    const state = stateWith({ 0: 'crate' });
    const result = tapGenerator(data, state, 0, createRng(1), 1000);
    expect(result).toEqual({ ok: false, reason: 'locked' });
  });

  it('rejects an empty cell', () => {
    const state = stateWith({});
    const result = tapGenerator(data, state, 0, createRng(1), 1000);
    expect(result).toEqual({ ok: false, reason: 'emptyCell' });
  });

  it('rejects an item that has no GeneratorDef', () => {
    const state = stateWith({ 0: 'wheat-stalk' });
    const result = tapGenerator(data, state, 0, createRng(1), 1000);
    expect(result).toEqual({ ok: false, reason: 'notAGenerator' });
  });

  it('rejects a cobwebbed generator', () => {
    const state = stateWith({
      0: { itemId: 'flour-mill-1', cobwebbed: true },
    });
    const result = tapGenerator(data, state, 0, createRng(1), 1000);
    expect(result).toEqual({ ok: false, reason: 'cobwebbed' });
  });

  it('rejects a generator that is cooling down', () => {
    let state = stateWith({ 0: 'flour-mill-1' });
    state = withCharge(state, 0, 'flour-mill-1', 0, 5000);
    const result = tapGenerator(data, state, 0, createRng(1), 4000);
    expect(result).toEqual({ ok: false, reason: 'coolingDown' });
  });

  it('rejects when the board is full', () => {
    const totalCells = data.newGame.cols * data.newGame.rows;
    const cells: Record<number, CellSpec> = {};
    for (let i = 0; i < totalCells; i++) {
      cells[i] = 'wheat-stalk';
    }
    cells[0] = 'flour-mill-1';
    const state = stateWith(cells);
    const result = tapGenerator(data, state, 0, createRng(1), 1000);
    expect(result).toEqual({ ok: false, reason: 'boardFull' });
  });

  it('rejects when there is not enough energy', () => {
    const state = stateWith(
      { 0: 'flour-mill-1' },
      { energy: { value: 0, updatedAt: 1000 } },
    );
    const result = tapGenerator(data, state, 0, createRng(1), 1000);
    expect(result).toEqual({ ok: false, reason: 'noEnergy' });
  });

  it('running out of charges starts a cooldown', () => {
    let state = stateWith({ 0: 'flour-mill-1' });
    state = withCharge(state, 0, 'flour-mill-1', 1, null);
    const now = 10000;
    const result = tapGenerator(data, state, 0, createRng(1), now);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tappedCell = getCell(result.state.board, 0);
    expect(tappedCell.kind).toBe('item');
    if (tappedCell.kind === 'item') {
      expect(tappedCell.item.generator?.charges).toBe(0);
      expect(tappedCell.item.generator?.cooldownEndsAt).toBe(
        now + flourMill1.cooldownSec * 1000,
      );
    }
  });

  it('a tap after the cooldown ends refills charges', () => {
    let state = stateWith({ 0: 'flour-mill-1' });
    state = withCharge(state, 0, 'flour-mill-1', 0, 5000);
    const now = 5000;
    const result = tapGenerator(data, state, 0, createRng(1), now);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tappedCell = getCell(result.state.board, 0);
    expect(tappedCell.kind).toBe('item');
    if (tappedCell.kind === 'item') {
      // Refilled to full charges, then one spent by this tap.
      expect(tappedCell.item.generator?.charges).toBe(flourMill1.charges - 1);
      expect(tappedCell.item.generator?.cooldownEndsAt).toBeNull();
    }
  });

  it('a seeded roll produces a rare drop', () => {
    // Seed 7's first next() is ~0.0117, under the 3% rareDrops chance; its
    // second next() (~0.062 * 100 = 6.2) lands in energy-jar's 0-45 range.
    const state = stateWith({ 0: 'flour-mill-1' });
    const result = tapGenerator(data, state, 0, createRng(7), 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.events[0]).toMatchObject({
      type: 'spawned',
      rare: true,
      itemId: 'energy-jar',
    });
  });

  it('the same seed gives the same spawn', () => {
    const stateA = stateWith({ 0: 'flour-mill-1' });
    const stateB = stateWith({ 0: 'flour-mill-1' });

    const resultA = tapGenerator(data, stateA, 0, createRng(42), 1000);
    const resultB = tapGenerator(data, stateB, 0, createRng(42), 1000);

    expect(resultA.ok).toBe(true);
    expect(resultB.ok).toBe(true);
    if (!resultA.ok || !resultB.ok) return;

    expect(resultA.events).toEqual(resultB.events);
  });
});

describe('collectBonus', () => {
  it('collects an energy jar, adding energy even past cap', () => {
    const state = stateWith(
      { 0: 'energy-jar' },
      { energy: { value: data.economy.energy.cap, updatedAt: 1000 } },
    );
    const result = collectBonus(data, state, 0, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.energy.value).toBe(data.economy.energy.cap + 20);
    expect(getCell(result.state.board, 0)).toEqual({ kind: 'empty' });
    expect(result.events).toEqual([
      {
        type: 'collected',
        itemId: 'energy-jar',
        reward: { energy: 20, coins: 0 },
      },
    ]);
  });

  it('collects a coin pouch, adding coins and emptying the cell', () => {
    const state = stateWith({ 0: 'coin-pouch' }, { coins: 10 });
    const result = collectBonus(data, state, 0, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.coins).toBe(35);
    expect(getCell(result.state.board, 0)).toEqual({ kind: 'empty' });
    expect(result.events).toEqual([
      {
        type: 'collected',
        itemId: 'coin-pouch',
        reward: { energy: 0, coins: 25 },
      },
    ]);
  });

  it('rejects a locked cell', () => {
    const state = stateWith({ 0: 'crate' });
    const result = collectBonus(data, state, 0, 1000);
    expect(result).toEqual({ ok: false, reason: 'locked' });
  });

  it('rejects an empty cell', () => {
    const state = stateWith({});
    const result = collectBonus(data, state, 0, 1000);
    expect(result).toEqual({ ok: false, reason: 'emptyCell' });
  });

  it('rejects an item with no collectReward', () => {
    const state = stateWith({ 0: 'wheat-stalk' });
    const result = collectBonus(data, state, 0, 1000);
    expect(result).toEqual({ ok: false, reason: 'notCollectible' });
  });

  it('rejects a cobwebbed bonus item', () => {
    const state = stateWith({
      0: { itemId: 'energy-jar', cobwebbed: true },
    });
    const result = collectBonus(data, state, 0, 1000);
    expect(result).toEqual({ ok: false, reason: 'cobwebbed' });
  });
});
