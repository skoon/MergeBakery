/**
 * Plays merge and sell animations in response to store events: a
 * squash-and-pop with sparkles for merges, a crumb burst for sales, and
 * calmer fades when the player prefers reduced motion (T2.9).
 */

import { Graphics, type Application, type Sprite } from 'pixi.js';
import type { CellIndex } from '../core/types';
import type { GameStore } from '../ui/store';
import { reducedMotion, type SettingsStore } from '../ui/settings';
import type { BoardView } from './boardView';
import { easeOutBack, easeOutCubic, tween } from './tween';

// Colors from the palette in src/ui/tokens.css.
const COLOR_BUTTER = 0xf7d774;
const COLOR_CRUST = 0x9c5b2e;

const MERGE_POP_MS = 280;
const MERGE_SPARKLE_MS = 300;
const MERGE_REDUCED_MS = 150;
const SELL_CRUMB_MS = 400;
const SELL_REDUCED_MS = 200;

const MERGE_START_SCALE = 0.6;
const MERGE_SQUASH_X = 1.3;
const MERGE_SQUASH_Y = 0.7;

const SPARKLE_COUNT = 6;
const SPARKLE_RADIUS = 2.5;
const SPARKLE_DISTANCE = 20;

const CRUMB_COUNT = 10;
const CRUMB_RADIUS = 2;
const CRUMB_SPEED = 60;
const CRUMB_UPWARD_BIAS = 50;
const CRUMB_GRAVITY = 260;

/** Subscribes to the store and plays effects for its events. Returns an unsubscribe function. */
export function createEffects(
  app: Application,
  board: BoardView,
  store: GameStore,
  settings: SettingsStore,
): () => void {
  function prefersReducedMotion(): boolean {
    return reducedMotion(
      settings.get(),
      matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  }

  function fadeSpriteIn(sprite: Sprite): void {
    sprite.alpha = 0;

    const cancel = tween(app.ticker, {
      durationMs: MERGE_REDUCED_MS,
      ease: easeOutCubic,
      onUpdate: (t) => {
        if (sprite.destroyed) {
          cancel();
          return;
        }
        sprite.alpha = t;
      },
    });
  }

  function squashAndPop(sprite: Sprite): void {
    const targetX = sprite.scale.x;
    const targetY = sprite.scale.y;
    const startX = targetX * MERGE_START_SCALE * MERGE_SQUASH_X;
    const startY = targetY * MERGE_START_SCALE * MERGE_SQUASH_Y;
    sprite.scale.set(startX, startY);

    const cancel = tween(app.ticker, {
      durationMs: MERGE_POP_MS,
      ease: easeOutBack,
      onUpdate: (t) => {
        if (sprite.destroyed) {
          cancel();
          return;
        }
        // easeOutBack overshoots past 1 before settling at 1, so lerping
        // start -> target with it carries the scale past target on the way
        // up and back to exactly target (t = 1) at the end.
        sprite.scale.set(
          startX + (targetX - startX) * t,
          startY + (targetY - startY) * t,
        );
      },
    });
  }

  function burstSparkles(center: { x: number; y: number }): void {
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const angle = (i / SPARKLE_COUNT) * Math.PI * 2;
      const targetX = center.x + Math.cos(angle) * SPARKLE_DISTANCE;
      const targetY = center.y + Math.sin(angle) * SPARKLE_DISTANCE;

      const particle = new Graphics()
        .circle(0, 0, SPARKLE_RADIUS)
        .fill(COLOR_BUTTER);
      particle.position.set(center.x, center.y);
      board.effectsLayer.addChild(particle);

      const cancel = tween(app.ticker, {
        durationMs: MERGE_SPARKLE_MS,
        ease: easeOutCubic,
        onUpdate: (t) => {
          if (particle.destroyed) {
            cancel();
            return;
          }
          particle.position.set(
            center.x + (targetX - center.x) * t,
            center.y + (targetY - center.y) * t,
          );
          particle.alpha = 1 - t;
        },
        onComplete: () => particle.destroy(),
      });
    }
  }

  function burstCrumbs(center: { x: number; y: number }): void {
    for (let i = 0; i < CRUMB_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = CRUMB_SPEED * (0.6 + Math.random() * 0.8);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - CRUMB_UPWARD_BIAS;

      const particle = new Graphics()
        .circle(0, 0, CRUMB_RADIUS)
        .fill(COLOR_CRUST);
      particle.position.set(center.x, center.y);
      board.effectsLayer.addChild(particle);

      const cancel = tween(app.ticker, {
        durationMs: SELL_CRUMB_MS,
        onUpdate: (t) => {
          if (particle.destroyed) {
            cancel();
            return;
          }
          const seconds = (t * SELL_CRUMB_MS) / 1000;
          particle.position.set(
            center.x + vx * seconds,
            center.y + vy * seconds + 0.5 * CRUMB_GRAVITY * seconds * seconds,
          );
          particle.alpha = 1 - t;
        },
        onComplete: () => particle.destroy(),
      });
    }
  }

  function fadeCrumbInPlace(center: { x: number; y: number }): void {
    const particle = new Graphics()
      .circle(0, 0, CRUMB_RADIUS + 1)
      .fill(COLOR_CRUST);
    particle.position.set(center.x, center.y);
    board.effectsLayer.addChild(particle);

    const cancel = tween(app.ticker, {
      durationMs: SELL_REDUCED_MS,
      ease: easeOutCubic,
      onUpdate: (t) => {
        if (particle.destroyed) {
          cancel();
          return;
        }
        particle.alpha = 1 - t;
      },
      onComplete: () => particle.destroy(),
    });
  }

  function playMerged(cells: readonly CellIndex[]): void {
    const reduced = prefersReducedMotion();
    for (const cell of cells) {
      const sprite = board.spriteAt(cell);
      if (!sprite) continue;

      if (reduced) {
        fadeSpriteIn(sprite);
      } else {
        squashAndPop(sprite);
        burstSparkles(board.cellCenter(cell));
      }
    }
  }

  function playSold(cell: CellIndex): void {
    const center = board.cellCenter(cell);
    if (prefersReducedMotion()) {
      fadeCrumbInPlace(center);
    } else {
      burstCrumbs(center);
    }
  }

  return store.subscribe((state, events) => {
    for (const event of events) {
      if (event.type === 'merged') {
        playMerged(event.cells);
      } else if (event.type === 'sold' && state.lastSale) {
        playSold(state.lastSale.cell);
      }
    }
  });
}
