/**
 * Pantry drop-zone button and drawer (T3.11).
 *
 * The button sits at the left end of the tray and toggles a drawer of one
 * tile per Pantry slot in `overlayRoot`. Both the button and the open drawer
 * accept dropped board items; a filled tile can also be dragged back onto
 * the board.
 */

import { styleTrayButton } from './trayButton';
import './pantryDrawer.css';
import type { CellIndex } from '../core/types';
import type { BoardView } from '../render/boardView';
import { setImageArt } from '../render/assets';
import { createDragPreview, type DragPreview } from '../render/dragPreview';
import { registerDropZone } from './dropZones';
import { pantryModel } from './pantryModel';
import type { GameStore } from './store';

/** Pointer movement, in screen px, before a tile press becomes a drag. */
const DRAG_THRESHOLD = 6;

interface TileDragState {
  readonly pointerId: number;
  readonly index: number;
  readonly spriteKey: string;
  readonly startX: number;
  readonly startY: number;
  dragging: boolean;
  preview: DragPreview | null;
  /** Where the press began, so the picture starts under the pointer. */
  start: { x: number; y: number };
}

export function mountPantryDrawer(
  tray: HTMLElement,
  overlayRoot: HTMLElement,
  store: GameStore,
  board: BoardView,
): void {
  let drawerOpen = false;
  let dragState: TileDragState | null = null;

  const pantryButton = document.createElement('button');
  pantryButton.type = 'button';
  pantryButton.className = 'pantry-toggle tray-btn--pantry';
  styleTrayButton(pantryButton, 'btn-pantry', 'Pantry');
  // Used and capacity, as a badge like the Oven's, so the label stays one line (T-R4).
  const pantryCount = document.createElement('span');
  pantryCount.className = 'tray-btn__badge';
  pantryButton.appendChild(pantryCount);
  tray.prepend(pantryButton);

  const drawer = document.createElement('div');
  drawer.className = 'pantry-drawer';
  drawer.hidden = true;

  const tiles = document.createElement('div');
  tiles.className = 'pantry-drawer__tiles';

  const buyButton = document.createElement('button');
  buyButton.type = 'button';
  buyButton.className = 'pantry-drawer__buy';

  drawer.append(tiles, buyButton);
  overlayRoot.appendChild(drawer);

  function handleStoreDrop(cell: CellIndex): void {
    store.dispatch({ type: 'storeInPantry', cell });
  }

  registerDropZone(pantryButton, handleStoreDrop);
  registerDropZone(drawer, handleStoreDrop);

  pantryButton.addEventListener('click', () => {
    drawerOpen = !drawerOpen;
    drawer.hidden = !drawerOpen;
  });

  buyButton.addEventListener('click', () => {
    store.dispatch({ type: 'buyPantrySlot' });
  });

  function beginTileDrag(state: TileDragState): void {
    state.dragging = true;
    state.preview = createDragPreview(state.spriteKey, 48, state.start);
  }

  function moveTileDrag(state: TileDragState, x: number, y: number): void {
    state.preview?.move(x, y);
  }

  function endTileDrag(state: TileDragState, x: number, y: number): void {
    state.preview?.remove();
    if (!state.dragging) return;

    const target = board.cellAt(x, y);
    if (target !== null) {
      store.dispatch({
        type: 'takeFromPantry',
        pantryIndex: state.index,
        to: target,
      });
    }
  }

  function attachTileDrag(
    tile: HTMLElement,
    index: number,
    spriteKey: string,
  ): void {
    // Without this, a mouse drag on the tile's <img> starts the browser's native image drag,
    // which fires pointercancel and silently drops our drag.
    tile.addEventListener('dragstart', (e: DragEvent) => {
      e.preventDefault();
    });

    // Move and release are tracked on window: render() rebuilds the tiles on every store
    // update, so a listener or pointer capture on the tile would be lost mid-drag.
    tile.addEventListener('pointerdown', (e: PointerEvent) => {
      if (dragState) return;
      const state: TileDragState = {
        pointerId: e.pointerId,
        index,
        spriteKey,
        startX: e.clientX,
        startY: e.clientY,
        dragging: false,
        preview: null,
        start: { x: e.clientX, y: e.clientY },
      };
      dragState = state;

      const onMove = (ev: PointerEvent): void => {
        if (ev.pointerId !== state.pointerId) return;
        if (!state.dragging) {
          const dx = ev.clientX - state.startX;
          const dy = ev.clientY - state.startY;
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          beginTileDrag(state);
        }
        moveTileDrag(state, ev.clientX, ev.clientY);
      };
      const finish = (ev: PointerEvent, drop: boolean): void => {
        if (ev.pointerId !== state.pointerId) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        dragState = null;
        if (drop) {
          endTileDrag(state, ev.clientX, ev.clientY);
        } else {
          state.preview?.remove();
        }
      };
      const onUp = (ev: PointerEvent): void => finish(ev, true);
      const onCancel = (ev: PointerEvent): void => finish(ev, false);

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    });
  }

  function render(): void {
    const model = pantryModel(store.data, store.getState());

    pantryCount.textContent = `${model.used}/${model.capacity}`;
    pantryButton.setAttribute(
      'aria-label',
      `Pantry, ${model.used} of ${model.capacity} used`,
    );

    tiles.innerHTML = '';
    model.slots.forEach((slot, index) => {
      const tile = document.createElement('div');
      tile.className = slot
        ? 'pantry-tile pantry-tile--filled'
        : 'pantry-tile pantry-tile--empty';

      if (slot) {
        const img = document.createElement('img');
        img.className = 'pantry-tile__art';
        img.draggable = false;
        img.alt = slot.name;
        setImageArt(img, slot.spriteKey);
        tile.appendChild(img);
        attachTileDrag(tile, index, slot.spriteKey);
      }

      tiles.appendChild(tile);
    });

    if (model.nextSlotCost === null) {
      buyButton.hidden = true;
    } else {
      buyButton.hidden = false;
      buyButton.textContent = `Buy slot — ${model.nextSlotCost} coins`;
      buyButton.disabled = !model.canAffordSlot;
    }
  }

  store.subscribe(() => render());
  render();
}
