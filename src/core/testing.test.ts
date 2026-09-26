/**
 * Tests for testing helpers (T2.1).
 */

import { describe, it, expect } from 'vitest';
import { stateWith, testData } from './testing';

describe('testing', () => {
  describe('stateWith', () => {
    it('creates a state with items placed', () => {
      const state = stateWith({
        0: 'flour-sack-1',
        4: 'flour-sack-2',
      });

      expect(state.board.cells[0]?.kind).toBe('item');
      const cell0 = state.board.cells[0];
      if (cell0?.kind === 'item') {
        expect(cell0.item.itemId).toBe('flour-sack-1');
      }

      expect(state.board.cells[4]?.kind).toBe('item');
      const cell4 = state.board.cells[4];
      if (cell4?.kind === 'item') {
        expect(cell4.item.itemId).toBe('flour-sack-2');
      }
    });

    it('places cobwebbed items', () => {
      const state = stateWith({
        0: { itemId: 'flour-sack-1', cobwebbed: true },
      });

      expect(state.board.cells[0]?.kind).toBe('item');
      const cell0 = state.board.cells[0];
      if (cell0?.kind === 'item') {
        expect(cell0.item.cobwebbed).toBe(true);
      }
    });

    it('places non-cobwebbed items explicitly', () => {
      const state = stateWith({
        0: { itemId: 'flour-sack-1', cobwebbed: false },
      });

      expect(state.board.cells[0]?.kind).toBe('item');
      const cell0 = state.board.cells[0];
      if (cell0?.kind === 'item') {
        expect(cell0.item.cobwebbed).toBe(false);
      }
    });

    it('places locks', () => {
      const state = stateWith({
        0: 'crate',
        1: 'flourSack',
      });

      expect(state.board.cells[0]?.kind).toBe('locked');
      const cell0 = state.board.cells[0];
      if (cell0?.kind === 'locked') {
        expect(cell0.lock).toBe('crate');
      }

      expect(state.board.cells[1]?.kind).toBe('locked');
      const cell1 = state.board.cells[1];
      if (cell1?.kind === 'locked') {
        expect(cell1.lock).toBe('flourSack');
      }
    });

    it('initializes generators with full charges', () => {
      const state = stateWith({
        0: 'flour-mill-1',
      });

      expect(state.board.cells[0]?.kind).toBe('item');
      const cell0 = state.board.cells[0];
      if (cell0?.kind === 'item') {
        const generatorDef = testData.generators.get('flour-mill-1');
        expect(generatorDef).toBeDefined();
        expect(cell0.item.generator).toBeDefined();
        if (cell0.item.generator) {
          expect(cell0.item.generator.charges).toBe(generatorDef?.charges);
          expect(cell0.item.generator.cooldownEndsAt).toBeNull();
        }
      }
    });

    it('initializes non-generators with null generator', () => {
      const state = stateWith({
        0: 'flour-sack-1',
      });

      expect(state.board.cells[0]?.kind).toBe('item');
      const cell0 = state.board.cells[0];
      if (cell0?.kind === 'item') {
        expect(cell0.item.generator).toBeNull();
      }
    });

    it('empties all other cells', () => {
      const state = stateWith({
        0: 'flour-sack-1',
      });

      // All cells except 0 should be empty
      for (let i = 1; i < state.board.cells.length; i++) {
        expect(state.board.cells[i]?.kind).toBe('empty');
      }
    });

    it('applies overrides to top-level GameState fields', () => {
      const state = stateWith(
        {
          0: 'flour-sack-1',
        },
        {
          coins: 1000,
          gems: 50,
          stars: 10,
        },
      );

      expect(state.coins).toBe(1000);
      expect(state.gems).toBe(50);
      expect(state.stars).toBe(10);
      expect(state.board.cells[0]?.kind).toBe('item');
      const cell0 = state.board.cells[0];
      if (cell0?.kind === 'item') {
        expect(cell0.item.itemId).toBe('flour-sack-1');
      }
    });

    it('mixes items, locks, and generators', () => {
      const state = stateWith({
        0: 'flour-sack-1',
        1: 'crate',
        2: 'flour-mill-1',
        3: { itemId: 'flour-sack-2', cobwebbed: true },
      });

      expect(state.board.cells[0]?.kind).toBe('item');
      const cell0 = state.board.cells[0];
      if (cell0?.kind === 'item') {
        expect(cell0.item.itemId).toBe('flour-sack-1');
      }

      expect(state.board.cells[1]?.kind).toBe('locked');
      const cell1 = state.board.cells[1];
      if (cell1?.kind === 'locked') {
        expect(cell1.lock).toBe('crate');
      }

      expect(state.board.cells[2]?.kind).toBe('item');
      const cell2 = state.board.cells[2];
      if (cell2?.kind === 'item') {
        expect(cell2.item.itemId).toBe('flour-mill-1');
        expect(cell2.item.generator).toBeDefined();
      }

      expect(state.board.cells[3]?.kind).toBe('item');
      const cell3 = state.board.cells[3];
      if (cell3?.kind === 'item') {
        expect(cell3.item.itemId).toBe('flour-sack-2');
        expect(cell3.item.cobwebbed).toBe(true);
      }
    });
  });
});
