/**
 * Board layout math: fits the board's cells into the space between the top
 * chrome (HUD and counter strip) and the bottom chrome (tray and nav bar).
 *
 * The chrome grows with the text size, so its size is measured from the DOM
 * (chromeMetrics.ts) and passed in rather than assumed here.
 */

export const BOARD_PADDING = 12;

/** Canvas px: the bottom edge of the top chrome and the top edge of the bottom chrome. */
export interface Insets {
  readonly top: number;
  readonly bottom: number;
}

/** Canvas px: board top-left, square cell size. */
export interface BoardLayout {
  readonly x: number;
  readonly y: number;
  readonly cellSize: number;
}

/**
 * The largest square cells that fit `cols` x `rows` between the insets, inset by BOARD_PADDING on every side.
 * The board is centered horizontally and top-aligned within that space.
 */
export function computeBoardLayout(
  width: number,
  cols: number,
  rows: number,
  insets: Insets,
): BoardLayout {
  const top = insets.top;
  const bottom = Math.max(top, insets.bottom);

  const availableWidth = width - BOARD_PADDING * 2;
  const availableHeight = bottom - top - BOARD_PADDING * 2;

  const cellSize = Math.max(
    0,
    Math.min(availableWidth / cols, availableHeight / rows),
  );

  const boardWidth = cellSize * cols;
  const x = (width - boardWidth) / 2;
  const y = top + BOARD_PADDING;

  return { x, y, cellSize };
}
