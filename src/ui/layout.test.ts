/**
 * Tests for computeBoardLayout (T2.8).
 */

import { describe, expect, it } from 'vitest';
import {
  BOARD_PADDING,
  computeBoardLayout,
  COUNTER_HEIGHT,
  HUD_HEIGHT,
  TRAY_HEIGHT,
} from './layout';

const COLS = 7;
const ROWS = 9;

describe('layout constants', () => {
  it('match the CSS custom properties in app.css', () => {
    expect(HUD_HEIGHT).toBe(56);
    expect(COUNTER_HEIGHT).toBe(104);
    expect(TRAY_HEIGHT).toBe(80);
    expect(BOARD_PADDING).toBe(12);
  });
});

describe('computeBoardLayout', () => {
  it('is width-limited on a phone screen (375 x 812)', () => {
    const layout = computeBoardLayout(375, 812, COLS, ROWS);

    // available width = 375 - 24 = 351; 351 / 7 = 50.142857...
    // available height = (812 - 80) - (56 + 104) - 24 = 548; 548 / 9 = 60.888...
    // width is the tighter constraint.
    expect(layout.cellSize).toBeCloseTo(351 / 7, 5);
    expect(layout.x).toBeCloseTo(12, 5);
    expect(layout.y).toBeCloseTo(172, 5);
  });

  it('is height-limited on a desktop column (480 x 800)', () => {
    const layout = computeBoardLayout(480, 800, COLS, ROWS);

    // available width = 480 - 24 = 456; 456 / 7 = 65.142857...
    // available height = (800 - 80) - (56 + 104) - 24 = 536; 536 / 9 = 59.555...
    // height is the tighter constraint.
    const expectedCellSize = 536 / 9;
    expect(layout.cellSize).toBeCloseTo(expectedCellSize, 5);
    expect(layout.x).toBeCloseTo((480 - expectedCellSize * COLS) / 2, 5);
    expect(layout.y).toBeCloseTo(172, 5);
  });

  it('shrinks further on a short screen where height limits the cells (480 x 500)', () => {
    const layout = computeBoardLayout(480, 500, COLS, ROWS);

    // available width = 480 - 24 = 456; 456 / 7 = 65.142857...
    // available height = (500 - 80) - (56 + 104) - 24 = 236; 236 / 9 = 26.222...
    // height is the tighter constraint, and much smaller than the phone/desktop cases.
    const expectedCellSize = 236 / 9;
    expect(layout.cellSize).toBeCloseTo(expectedCellSize, 5);
    expect(layout.cellSize).toBeLessThan(30);
    expect(layout.x).toBeCloseTo((480 - expectedCellSize * COLS) / 2, 5);
    expect(layout.y).toBeCloseTo(172, 5);
  });

  it('always top-aligns below the HUD and counter strip, inset by BOARD_PADDING', () => {
    for (const [width, height] of [
      [375, 812],
      [480, 800],
      [480, 500],
    ] as const) {
      const layout = computeBoardLayout(width, height, COLS, ROWS);
      expect(layout.y).toBeCloseTo(
        HUD_HEIGHT + COUNTER_HEIGHT + BOARD_PADDING,
        5,
      );
    }
  });

  it('centers the board horizontally', () => {
    const layout = computeBoardLayout(480, 800, COLS, ROWS);
    const boardWidth = layout.cellSize * COLS;
    const rightGap = 480 - (layout.x + boardWidth);
    expect(rightGap).toBeCloseTo(layout.x, 5);
  });
});
