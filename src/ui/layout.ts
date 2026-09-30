/**
 * Board layout math: fits the board's cells into the space between the
 * counter strip and the tray (T2.8), with the nav bar below the tray (T5.8).
 *
 * The pixel constants here must match the CSS custom properties in app.css
 * (`--hud-height`, `--counter-height`, `--tray-height`, `--nav-height`).
 */

export const HUD_HEIGHT = 56;
export const COUNTER_HEIGHT = 104;
export const TRAY_HEIGHT = 80;
export const NAV_HEIGHT = 56;
export const BOARD_PADDING = 12;

/** Canvas px: board top-left, square cell size. */
export interface BoardLayout {
  readonly x: number;
  readonly y: number;
  readonly cellSize: number;
}

/**
 * The largest square cells that fit `cols` x `rows` in the space between the
 * counter strip and the tray, inset by BOARD_PADDING on every side.
 * The board is centered horizontally and top-aligned within that space.
 */
export function computeBoardLayout(
  width: number,
  height: number,
  cols: number,
  rows: number,
): BoardLayout {
  const top = HUD_HEIGHT + COUNTER_HEIGHT;
  const bottom = height - TRAY_HEIGHT - NAV_HEIGHT;

  const availableWidth = width - BOARD_PADDING * 2;
  const availableHeight = bottom - top - BOARD_PADDING * 2;

  const cellSize = Math.min(availableWidth / cols, availableHeight / rows);

  const boardWidth = cellSize * cols;
  const x = (width - boardWidth) / 2;
  const y = top + BOARD_PADDING;

  return { x, y, cellSize };
}
