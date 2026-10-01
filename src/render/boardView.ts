/**
 * Draws the board from game state and handles drag/tap input with mouse or
 * touch, via PixiJS pointer events (T2.8).
 */

import {
  Container,
  Graphics,
  Sprite,
  Text,
  type Application,
  type FederatedPointerEvent,
  type Texture,
} from 'pixi.js';
import type { CellIndex, ItemId, LockKind } from '../core/types';
import { getCell } from '../core/board';
import { canMerge } from '../core/merge';
import { computeBoardLayout, type BoardLayout } from '../ui/layout';
import { dropZoneAt, setDragActive } from '../ui/dropZones';
import type { GameStore } from '../ui/store';
import type { SettingsStore } from '../ui/settings';
import { loadTexture } from './assets';
import { chargesToShow } from './charges';

// Colors from the palette in src/ui/tokens.css.
const COLOR_CREAM = 0xfff6e6;
const COLOR_CRUST = 0x9c5b2e;
const COLOR_INK = 0x4a2c17;
const COLOR_BUTTER = 0xf7d774;

/** Item sprites are drawn at this fraction of the cell size. */
const ITEM_SCALE = 0.86;
/** The dragged item's sprite is drawn at this multiple of ITEM_SCALE. */
const DRAG_SCALE = 1.15;
/** Pointer movement, in canvas px, before a press becomes a drag. */
const DRAG_THRESHOLD = 6;
/** How often the generator cooldown countdowns are redrawn. */
const COOLDOWN_TICK_MS = 1000;

/** Remaining cooldown as m:ss, rounded up so it never shows 0:00 while still cooling. */
function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString()}:${seconds.toString().padStart(2, '0')}`;
}

export interface BoardView {
  cellAt(clientX: number, clientY: number): CellIndex | null;
  /** Center of a cell in canvas coordinates. */
  cellCenter(cell: CellIndex): { x: number; y: number };
  /** The item sprite drawn in a cell, or null. Redraws replace sprites, so don't hold on to one. */
  spriteAt(cell: CellIndex): Sprite | null;
  cellSize(): number;
  /** A container drawn above the items, for effects (T2.9). */
  readonly effectsLayer: Container;
  /** Called when the player taps a generator that is cooling down (T6.5). */
  onCoolingTap(listener: (cell: CellIndex) => void): void;
}

/** Tracks a press that may turn into a drag, from pointerdown to pointerup. */
interface PointerTracking {
  readonly cell: CellIndex;
  readonly itemId: ItemId;
  readonly cobwebbed: boolean;
  readonly startX: number;
  readonly startY: number;
  dragging: boolean;
  preview: Sprite | null;
}

export async function createBoardView(
  app: Application,
  store: GameStore,
  settings: SettingsStore,
): Promise<BoardView> {
  const textures = new Map<ItemId, Texture>();
  await Promise.all(
    Array.from(store.data.items.values(), async (item) => {
      textures.set(item.id, await loadTexture(item.spriteKey));
    }),
  );

  const boardLayer = new Container();
  const cooldownLayer = new Container();
  const highlightLayer = new Container();
  const dragLayer = new Container();
  const effectsLayer = new Container();
  app.stage.addChild(
    boardLayer,
    cooldownLayer,
    highlightLayer,
    dragLayer,
    effectsLayer,
  );

  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  app.canvas.style.touchAction = 'none';

  let layout: BoardLayout = computeBoardLayout(
    app.screen.width,
    app.screen.height,
    store.getState().board.cols,
    store.getState().board.rows,
  );
  let sprites = new Map<CellIndex, Sprite>();
  let tracking: PointerTracking | null = null;

  function textureFor(itemId: ItemId): Texture {
    const texture = textures.get(itemId);
    if (!texture) {
      throw new Error(
        `createBoardView: no preloaded texture for item "${itemId}"`,
      );
    }
    return texture;
  }

  function cellTopLeft(index: number, cols: number): { x: number; y: number } {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      x: layout.x + col * layout.cellSize,
      y: layout.y + row * layout.cellSize,
    };
  }

  function cellFromPoint(
    x: number,
    y: number,
    cols: number,
    rows: number,
  ): CellIndex | null {
    const col = Math.floor((x - layout.x) / layout.cellSize);
    const row = Math.floor((y - layout.y) / layout.cellSize);
    if (col < 0 || col >= cols || row < 0 || row >= rows) {
      return null;
    }
    return row * cols + col;
  }

  function drawTile(x: number, y: number, size: number): Graphics {
    return new Graphics()
      .rect(x, y, size, size)
      .fill(COLOR_CREAM)
      .stroke({ width: 1, color: COLOR_CRUST });
  }

  function drawLock(
    kind: LockKind,
    x: number,
    y: number,
    size: number,
  ): Graphics {
    const inset = size * 0.12;
    if (kind === 'crate') {
      return new Graphics()
        .rect(x + inset, y + inset, size - inset * 2, size - inset * 2)
        .fill(COLOR_CRUST)
        .moveTo(x + inset, y + inset)
        .lineTo(x + size - inset, y + size - inset)
        .moveTo(x + size - inset, y + inset)
        .lineTo(x + inset, y + size - inset)
        .stroke({ width: Math.max(2, size * 0.04), color: COLOR_INK });
    }
    // flourSack: a beige rounded sack tied at the neck, so it can't be mistaken for an empty tile.
    const sackInset = size * 0.14;
    const tieY = y + size * 0.34;
    return new Graphics()
      .roundRect(
        x + sackInset,
        y + sackInset,
        size - sackInset * 2,
        size - sackInset * 2,
        size * 0.22,
      )
      .fill({ color: COLOR_BUTTER, alpha: 0.6 })
      .stroke({ width: 2, color: COLOR_CRUST })
      .moveTo(x + sackInset * 1.6, tieY)
      .lineTo(x + size - sackInset * 1.6, tieY)
      .stroke({ width: Math.max(2, size * 0.04), color: COLOR_CRUST });
  }

  function drawWebOverlay(x: number, y: number, size: number): Graphics {
    const pad = size * 0.15;
    return new Graphics()
      .moveTo(x + pad, y + pad)
      .lineTo(x + size - pad, y + size - pad)
      .moveTo(x + size - pad, y + pad)
      .lineTo(x + pad, y + size - pad)
      .moveTo(x + size / 2, y + pad)
      .lineTo(x + size / 2, y + size - pad)
      .stroke({ width: 1.5, color: 0xffffff, alpha: 0.85 });
  }

  function drawItemSprite(
    itemId: ItemId,
    cobwebbed: boolean,
    cx: number,
    cy: number,
    size: number,
  ): Sprite {
    const sprite = new Sprite(textureFor(itemId));
    sprite.anchor.set(0.5);
    sprite.position.set(cx, cy);
    const itemSize = size * ITEM_SCALE;
    sprite.width = itemSize;
    sprite.height = itemSize;
    sprite.alpha = cobwebbed ? 0.6 : 1;
    return sprite;
  }

  /**
   * Shows each generator's taps left, or, when it has run out, dims it and
   * counts down to its refill. Charges refill lazily, inside the next tap, so a cell whose
   * cooldownEndsAt has passed is already usable and gets no overlay.
   */
  function drawCooldowns(): void {
    cooldownLayer.removeChildren();

    const { board } = store.getState();
    const now = Date.now();

    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (cell?.kind !== 'item') continue;

      const charge = cell.item.generator;
      if (!charge) continue;

      const { x, y } = cellTopLeft(i, board.cols);
      const size = layout.cellSize;

      // Taps left (T6.4); null while cooling down, when the countdown shows instead.
      const full = store.data.generators.get(cell.item.itemId)?.charges ?? 0;
      const shown = chargesToShow(charge, full, now);
      if (shown !== null) {
        cooldownLayer.addChild(drawChargeBadge(shown, x, y, size));
        continue;
      }
      if (charge.cooldownEndsAt === null) continue;
      const remaining = charge.cooldownEndsAt - now;
      const inset = size * 0.08;

      cooldownLayer.addChild(
        new Graphics()
          .roundRect(
            x + inset,
            y + inset,
            size - inset * 2,
            size - inset * 2,
            size * 0.15,
          )
          .fill({ color: COLOR_INK, alpha: 0.55 }),
      );

      const label = new Text({
        text: formatRemaining(remaining),
        style: {
          fontFamily: 'ui-rounded, system-ui, sans-serif',
          fontSize: Math.max(10, size * 0.26),
          fontWeight: '700',
          fill: COLOR_CREAM,
        },
      });
      label.anchor.set(0.5);
      label.position.set(x + size / 2, y + size / 2);
      cooldownLayer.addChild(label);
    }
  }

  /** Taps left, ink on butter, in the cell's top-left corner (T6.4). */
  function drawChargeBadge(
    count: number,
    x: number,
    y: number,
    size: number,
  ): Container {
    const height = Math.max(12, size * 0.28);
    const width = height * (count >= 10 ? 1.5 : 1);
    const left = x + size * 0.04;
    const top = y + size * 0.04;
    const badge = new Container();
    badge.addChild(
      new Graphics()
        .roundRect(left, top, width, height, height * 0.4)
        .fill(COLOR_BUTTER)
        .stroke({ width: 1, color: COLOR_INK }),
    );
    const label = new Text({
      text: count.toString(),
      style: {
        fontFamily: 'ui-rounded, system-ui, sans-serif',
        fontSize: height * 0.72,
        fontWeight: '700',
        fill: COLOR_INK,
      },
    });
    label.anchor.set(0.5);
    label.position.set(left + width / 2, top + height / 2);
    badge.addChild(label);
    return badge;
  }

  /** A small ink-on-cream tier number in the cell's bottom-right corner (T5.9). */
  function drawTierBadge(
    tier: number,
    x: number,
    y: number,
    size: number,
  ): Container {
    const badgeSize = Math.max(12, size * 0.3);
    const left = x + size - badgeSize - size * 0.04;
    const top = y + size - badgeSize - size * 0.04;
    const badge = new Container();
    badge.addChild(
      new Graphics()
        .roundRect(left, top, badgeSize, badgeSize, badgeSize * 0.3)
        .fill(COLOR_CREAM)
        .stroke({ width: 1, color: COLOR_INK }),
    );
    const label = new Text({
      text: tier.toString(),
      style: {
        fontFamily: 'ui-rounded, system-ui, sans-serif',
        fontSize: badgeSize * 0.75,
        fontWeight: '700',
        fill: COLOR_INK,
      },
    });
    label.anchor.set(0.5);
    label.position.set(left + badgeSize / 2, top + badgeSize / 2);
    badge.addChild(label);
    return badge;
  }

  function redraw(): void {
    const { board } = store.getState();
    layout = computeBoardLayout(
      app.screen.width,
      app.screen.height,
      board.cols,
      board.rows,
    );

    boardLayer.removeChildren();
    highlightLayer.removeChildren();
    dragLayer.removeChildren();
    sprites = new Map();

    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (!cell) continue;

      const { x, y } = cellTopLeft(i, board.cols);
      boardLayer.addChild(drawTile(x, y, layout.cellSize));

      if (cell.kind === 'locked') {
        boardLayer.addChild(drawLock(cell.lock, x, y, layout.cellSize));
      } else if (cell.kind === 'item') {
        const cx = x + layout.cellSize / 2;
        const cy = y + layout.cellSize / 2;
        const sprite = drawItemSprite(
          cell.item.itemId,
          cell.item.cobwebbed,
          cx,
          cy,
          layout.cellSize,
        );
        boardLayer.addChild(sprite);
        if (cell.item.cobwebbed) {
          boardLayer.addChild(drawWebOverlay(x, y, layout.cellSize));
        }
        if (settings.get().tierNumbers) {
          const tier = store.data.items.get(cell.item.itemId)?.tier;
          if (tier !== undefined) {
            boardLayer.addChild(drawTierBadge(tier, x, y, layout.cellSize));
          }
        }
        sprites.set(i, sprite);
      }
    }

    drawCooldowns();
  }

  function showMergeHighlights(draggedItemId: ItemId): void {
    const { board } = store.getState();
    const highlight = new Graphics();
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (
        cell?.kind === 'item' &&
        canMerge(store.data, draggedItemId, cell.item.itemId)
      ) {
        const { x, y } = cellTopLeft(i, board.cols);
        const inset = layout.cellSize * 0.08;
        highlight
          .roundRect(
            x + inset,
            y + inset,
            layout.cellSize - inset * 2,
            layout.cellSize - inset * 2,
            layout.cellSize * 0.15,
          )
          .stroke({
            width: Math.max(2, layout.cellSize * 0.05),
            color: COLOR_BUTTER,
          });
      }
    }
    highlightLayer.addChild(highlight);
  }

  function beginDrag(state: PointerTracking, e: FederatedPointerEvent): void {
    state.dragging = true;

    const original = sprites.get(state.cell);
    if (original) {
      original.visible = false;
    }

    const preview = new Sprite(textureFor(state.itemId));
    preview.anchor.set(0.5);
    const size = layout.cellSize * ITEM_SCALE * DRAG_SCALE;
    preview.width = size;
    preview.height = size;
    preview.position.set(e.global.x, e.global.y);
    dragLayer.addChild(preview);
    state.preview = preview;

    showMergeHighlights(state.itemId);
    setDragActive(true);
  }

  function endDrag(state: PointerTracking, e: FederatedPointerEvent): void {
    setDragActive(false);
    highlightLayer.removeChildren();

    const zoneHandler = dropZoneAt(e.client.x, e.client.y);
    if (zoneHandler) {
      zoneHandler(state.cell);
    } else {
      const { board } = store.getState();
      const target = cellFromPoint(
        e.global.x,
        e.global.y,
        board.cols,
        board.rows,
      );
      if (target !== null) {
        store.dispatch({ type: 'drop', from: state.cell, to: target });
      }
    }

    // Redraw unconditionally: on success this just repeats what the store's
    // own notification already did; on a rejection or no target, it puts the
    // dragged item's sprite back in its cell.
    redraw();
  }

  const coolingTapListeners: ((cell: CellIndex) => void)[] = [];

  function handleTap(state: PointerTracking): void {
    if (store.data.generators.has(state.itemId)) {
      const result = store.dispatch({ type: 'tapGenerator', cell: state.cell });
      if (!result.ok && result.reason === 'coolingDown') {
        for (const listener of coolingTapListeners) listener(state.cell);
      }
    } else if (store.data.items.get(state.itemId)?.collectReward) {
      store.dispatch({ type: 'collectBonus', cell: state.cell });
    }
  }

  function onPointerDown(e: FederatedPointerEvent): void {
    if (tracking) return;

    const { board } = store.getState();
    const cell = cellFromPoint(e.global.x, e.global.y, board.cols, board.rows);
    if (cell === null) return;

    const boardCell = getCell(board, cell);
    if (boardCell.kind !== 'item') return;

    tracking = {
      cell,
      itemId: boardCell.item.itemId,
      cobwebbed: boardCell.item.cobwebbed,
      startX: e.global.x,
      startY: e.global.y,
      dragging: false,
      preview: null,
    };
  }

  function onGlobalPointerMove(e: FederatedPointerEvent): void {
    if (!tracking) return;

    if (!tracking.dragging) {
      if (tracking.cobwebbed) return;
      const dx = e.global.x - tracking.startX;
      const dy = e.global.y - tracking.startY;
      if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) return;
      beginDrag(tracking, e);
      return;
    }

    tracking.preview?.position.set(e.global.x, e.global.y);
  }

  function onPointerUp(e: FederatedPointerEvent): void {
    if (!tracking) return;
    const current = tracking;
    tracking = null;

    if (current.dragging) {
      endDrag(current, e);
    } else {
      handleTap(current);
    }
  }

  app.stage.on('pointerdown', onPointerDown);
  app.stage.on('globalpointermove', onGlobalPointerMove);
  app.stage.on('pointerup', onPointerUp);
  app.stage.on('pointerupoutside', onPointerUp);

  store.subscribe(() => redraw());
  settings.subscribe(() => redraw());
  app.renderer.on('resize', () => redraw());
  // The countdown has to tick between state changes; a tick action that changes
  // nothing does not notify the store.
  window.setInterval(drawCooldowns, COOLDOWN_TICK_MS);

  redraw();

  return {
    cellAt(clientX: number, clientY: number): CellIndex | null {
      const rect = app.canvas.getBoundingClientRect();
      const { board } = store.getState();
      return cellFromPoint(
        clientX - rect.left,
        clientY - rect.top,
        board.cols,
        board.rows,
      );
    },

    cellCenter(cell: CellIndex): { x: number; y: number } {
      const { board } = store.getState();
      const { x, y } = cellTopLeft(cell, board.cols);
      return { x: x + layout.cellSize / 2, y: y + layout.cellSize / 2 };
    },

    spriteAt(cell: CellIndex): Sprite | null {
      return sprites.get(cell) ?? null;
    },

    cellSize(): number {
      return layout.cellSize;
    },

    effectsLayer,

    onCoolingTap(listener) {
      coolingTapListeners.push(listener);
    },
  };
}
