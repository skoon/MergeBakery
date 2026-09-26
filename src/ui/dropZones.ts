/**
 * HTML drop zones (Sell bin, Pantry, ...) that board items can be dragged
 * onto (T2.8).
 */

import type { CellIndex } from '../core/types';

export type DropZoneHandler = (cell: CellIndex) => void;

interface RegisteredZone {
  readonly element: HTMLElement;
  readonly onDrop: DropZoneHandler;
}

const zones: RegisteredZone[] = [];

/**
 * Registers an HTML element (sell bin, Pantry) that board items can be
 * dropped on. Returns an unregister function.
 */
export function registerDropZone(
  element: HTMLElement,
  onDrop: DropZoneHandler,
): () => void {
  const zone: RegisteredZone = { element, onDrop };
  zones.push(zone);

  return () => {
    const index = zones.indexOf(zone);
    if (index !== -1) {
      zones.splice(index, 1);
    }
  };
}

/**
 * The handler of the registered zone whose bounding rect contains the point,
 * or null.
 */
export function dropZoneAt(
  clientX: number,
  clientY: number,
): DropZoneHandler | null {
  for (const zone of zones) {
    const rect = zone.element.getBoundingClientRect();
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return zone.onDrop;
    }
  }
  return null;
}

/**
 * Sets or removes a `data-dragging` attribute on every registered zone, so
 * zones can highlight during a drag.
 */
export function setDragActive(active: boolean): void {
  for (const zone of zones) {
    if (active) {
      zone.element.setAttribute('data-dragging', '');
    } else {
      zone.element.removeAttribute('data-dragging');
    }
  }
}
