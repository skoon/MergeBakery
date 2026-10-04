/**
 * Tests for computeBoardLayout (T2.8, T-R1).
 */

import { describe, expect, it } from 'vitest';
import { BOARD_PADDING, computeBoardLayout } from './layout';

const COLS = 7;
const ROWS = 9;
/** HUD + counter on top (160), tray + nav below (136): what the chrome measures at 100% text. */
const insets = (height: number) => ({ top: 160, bottom: height - 136 });

describe('computeBoardLayout', () => {
  it('is width-limited on a phone screen (375 x 812)', () => {
    const layout = computeBoardLayout(375, COLS, ROWS, insets(812));

    // available width = 375 - 24 = 351; 351 / 7 = 50.14
    // available height = (812 - 136) - 160 - 24 = 492; 492 / 9 = 54.67
    expect(layout.cellSize).toBeCloseTo(351 / 7, 5);
    expect(layout.x).toBeCloseTo(12, 5);
    expect(layout.y).toBeCloseTo(172, 5);
  });

  it('is height-limited on a desktop column (480 x 800)', () => {
    const layout = computeBoardLayout(480, COLS, ROWS, insets(800));

    // available height = (800 - 136) - 160 - 24 = 480; 480 / 9 = 53.33
    expect(layout.cellSize).toBeCloseTo(480 / 9, 5);
    expect(layout.x).toBeCloseTo((480 - (480 / 9) * COLS) / 2, 5);
    expect(layout.y).toBeCloseTo(172, 5);
  });

  it('starts below the top chrome and ends above the bottom chrome, inset by BOARD_PADDING', () => {
    for (const [width, height] of [
      [375, 812],
      [480, 800],
      [480, 500],
    ] as const) {
      const { top, bottom } = insets(height);
      const layout = computeBoardLayout(width, COLS, ROWS, {
        top,
        bottom,
      });
      expect(layout.y).toBeCloseTo(top + BOARD_PADDING, 5);
      expect(layout.y + layout.cellSize * ROWS).toBeLessThanOrEqual(
        bottom - BOARD_PADDING + 1e-9,
      );
    }
  });

  it('shrinks the board when the chrome grows (larger text)', () => {
    const normal = computeBoardLayout(480, COLS, ROWS, insets(800));
    const tall = computeBoardLayout(480, COLS, ROWS, {
      top: 260,
      bottom: 800 - 200,
    });

    expect(tall.cellSize).toBeLessThan(normal.cellSize);
    expect(tall.y).toBeCloseTo(260 + BOARD_PADDING, 5);
  });

  it('never gives a negative cell size when the chrome fills the screen', () => {
    const layout = computeBoardLayout(320, COLS, ROWS, {
      top: 200,
      bottom: 150,
    });

    expect(layout.cellSize).toBe(0);
  });

  it('centers the board horizontally', () => {
    const layout = computeBoardLayout(480, COLS, ROWS, insets(800));
    const boardWidth = layout.cellSize * COLS;
    expect(480 - (layout.x + boardWidth)).toBeCloseTo(layout.x, 5);
  });
});
