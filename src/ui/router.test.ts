/**
 * Tests for the screen router (T5.8).
 */

import { describe, it, expect, vi } from 'vitest';
import { createRouter } from './router';

describe('createRouter', () => {
  it('starts on the board', () => {
    expect(createRouter().current()).toBe('board');
  });

  it('shows a screen and notifies', () => {
    const router = createRouter();
    const listener = vi.fn();
    router.subscribe(listener);

    router.show('recipeBook');

    expect(router.current()).toBe('recipeBook');
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith('recipeBook');
  });

  it('does not notify when showing the current screen', () => {
    const router = createRouter();
    const listener = vi.fn();
    router.show('settings');
    router.subscribe(listener);

    router.show('settings');

    expect(listener).not.toHaveBeenCalled();
  });

  it('goes back to the board', () => {
    const router = createRouter();
    const listener = vi.fn();
    router.show('bakery');
    router.subscribe(listener);

    router.back();

    expect(router.current()).toBe('board');
    expect(listener).toHaveBeenCalledWith('board');
  });

  it('stops notifying after unsubscribing', () => {
    const router = createRouter();
    const listener = vi.fn();
    const unsubscribe = router.subscribe(listener);

    unsubscribe();
    router.show('shop');

    expect(listener).not.toHaveBeenCalled();
  });
});
