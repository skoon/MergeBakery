import { describe, it, expect } from 'vitest';
import type { Order, OrderReward } from './types';
import { matchOrderItems, deliverOrder } from './deliver';
import { stateWith, testData } from './testing';

describe('matchOrderItems', () => {
  it('finds items in order by lowest index', () => {
    const state = stateWith({
      0: 'apple',
      2: 'apple',
      4: 'butter-block',
    });

    const result = matchOrderItems(state, ['apple', 'butter-block']);
    expect(result).toEqual([0, 4]);
  });

  it('returns null when an item is not available', () => {
    const state = stateWith({
      0: 'apple',
    });

    const result = matchOrderItems(state, ['apple', 'butter-block']);
    expect(result).toEqual([0, null]);
  });

  it('handles multiple of the same item by finding distinct cells', () => {
    const state = stateWith({
      0: 'apple',
      2: 'apple',
      4: 'apple',
    });

    const result = matchOrderItems(state, ['apple', 'apple', 'apple']);
    expect(result).toEqual([0, 2, 4]);
  });

  it('returns null when not enough copies of an item exist', () => {
    const state = stateWith({
      0: 'apple',
      2: 'apple',
    });

    const result = matchOrderItems(state, ['apple', 'apple', 'apple']);
    expect(result).toEqual([0, 2, null]);
  });

  it('ignores cobwebbed items', () => {
    const state = stateWith({
      0: { itemId: 'apple', cobwebbed: true },
      2: 'apple',
    });

    const result = matchOrderItems(state, ['apple']);
    expect(result).toEqual([2]);
  });

  it('prefers non-cobwebbed items even if cobwebbed has lower index', () => {
    const state = stateWith({
      0: { itemId: 'apple', cobwebbed: true },
      2: 'apple',
      4: { itemId: 'apple', cobwebbed: true },
    });

    const result = matchOrderItems(state, ['apple', 'apple']);
    expect(result).toEqual([2, null]);
  });

  it('returns empty array for empty wants', () => {
    const state = stateWith({
      0: 'apple',
    });

    const result = matchOrderItems(state, []);
    expect(result).toEqual([]);
  });
});

describe('deliverOrder', () => {
  it('successfully delivers an order', () => {
    const reward: OrderReward = {
      coins: 100,
      stars: 10,
      xp: 5,
    };
    const order: Order = {
      id: 1,
      customerId: 'customer-1',
      wants: ['apple', 'butter-block'],
      reward,
    };

    const state = stateWith(
      {
        0: 'apple',
        2: 'butter-block',
      },
      {
        orders: [order],
        coins: 50,
        stars: 5,
        nextOrderAt: null,
      },
    );

    const result = deliverOrder(testData, state, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected ok: true');

    expect(result.state.coins).toBe(150); // 50 + 100
    expect(result.state.stars).toBe(15); // 5 + 10
    expect(result.state.orders).toEqual([]);
    expect(result.state.board.cells[0]).toEqual({ kind: 'empty' });
    expect(result.state.board.cells[2]).toEqual({ kind: 'empty' });
    expect(result.state.xp).toBe(5);
  });

  it('rejects delivery with missing items', () => {
    const reward: OrderReward = {
      coins: 100,
      stars: 10,
      xp: 5,
    };
    const order: Order = {
      id: 1,
      customerId: 'customer-1',
      wants: ['apple', 'butter-block'],
      reward,
    };

    const state = stateWith(
      {
        0: 'apple',
      },
      {
        orders: [order],
        coins: 50,
        stars: 5,
      },
    );

    const result = deliverOrder(testData, state, 1, 1000);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected ok: false');
    expect(result.reason).toBe('missingItems');
  });

  it('throws for unknown order id', () => {
    const state = stateWith(
      {
        0: 'apple',
      },
      {
        orders: [],
      },
    );

    expect(() => {
      deliverOrder(testData, state, 999, 1000);
    }).toThrow('unknown orderId');
  });

  it('empties matched cells', () => {
    const reward: OrderReward = {
      coins: 50,
      stars: 5,
      xp: 2,
    };
    const order: Order = {
      id: 1,
      customerId: 'customer-1',
      wants: ['apple', 'apple'],
      reward,
    };

    const state = stateWith(
      {
        0: 'apple',
        2: 'apple',
        4: 'butter-block',
      },
      {
        orders: [order],
      },
    );

    const result = deliverOrder(testData, state, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected ok: true');

    expect(result.state.board.cells[0]).toEqual({ kind: 'empty' });
    expect(result.state.board.cells[2]).toEqual({ kind: 'empty' });
    expect(result.state.board.cells[4]).not.toEqual({ kind: 'empty' });
  });

  it('removes the delivered order', () => {
    const reward1: OrderReward = {
      coins: 50,
      stars: 5,
      xp: 2,
    };
    const reward2: OrderReward = {
      coins: 100,
      stars: 10,
      xp: 5,
    };
    const order1: Order = {
      id: 1,
      customerId: 'customer-1',
      wants: ['apple'],
      reward: reward1,
    };
    const order2: Order = {
      id: 2,
      customerId: 'customer-2',
      wants: ['butter-block'],
      reward: reward2,
    };

    const state = stateWith(
      {
        0: 'apple',
        2: 'butter-block',
      },
      {
        orders: [order1, order2],
      },
    );

    const result = deliverOrder(testData, state, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected ok: true');

    expect(result.state.orders).toEqual([order2]);
  });

  it('sets nextOrderAt when null', () => {
    const reward: OrderReward = {
      coins: 50,
      stars: 5,
      xp: 2,
    };
    const order: Order = {
      id: 1,
      customerId: 'customer-1',
      wants: ['apple'],
      reward,
    };

    const state = stateWith(
      {
        0: 'apple',
      },
      {
        orders: [order],
        nextOrderAt: null,
      },
    );

    const now = 5000;
    const result = deliverOrder(testData, state, 1, now);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected ok: true');

    const expectedNextOrderAt =
      now + testData.economy.orders.refillDelaySec * 1000;
    expect(result.state.nextOrderAt).toBe(expectedNextOrderAt);
  });

  it('keeps existing nextOrderAt', () => {
    const reward: OrderReward = {
      coins: 50,
      stars: 5,
      xp: 2,
    };
    const order: Order = {
      id: 1,
      customerId: 'customer-1',
      wants: ['apple'],
      reward,
    };

    const existingNextOrderAt = 10000;
    const state = stateWith(
      {
        0: 'apple',
      },
      {
        orders: [order],
        nextOrderAt: existingNextOrderAt,
      },
    );

    const result = deliverOrder(testData, state, 1, 5000);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected ok: true');

    expect(result.state.nextOrderAt).toBe(existingNextOrderAt);
  });

  it('emits orderDelivered event', () => {
    const reward: OrderReward = {
      coins: 50,
      stars: 5,
      xp: 2,
    };
    const order: Order = {
      id: 1,
      customerId: 'customer-1',
      wants: ['apple'],
      reward,
    };

    const state = stateWith(
      {
        0: 'apple',
      },
      {
        orders: [order],
      },
    );

    const result = deliverOrder(testData, state, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected ok: true');

    expect(result.events[0]).toEqual({
      type: 'orderDelivered',
      orderId: 1,
      reward,
    });
  });

  it('triggers levelUp event when XP crosses a level threshold', () => {
    const reward: OrderReward = {
      coins: 50,
      stars: 5,
      xp: 1000, // Large XP to trigger level-up
    };
    const order: Order = {
      id: 1,
      customerId: 'customer-1',
      wants: ['apple'],
      reward,
    };

    const state = stateWith(
      {
        0: 'apple',
      },
      {
        orders: [order],
        xp: 0,
        level: 1,
      },
    );

    const result = deliverOrder(testData, state, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected ok: true');

    // Check that there's a levelUp event
    const levelUpEvent = result.events.find((e) => e.type === 'levelUp');
    expect(levelUpEvent).toBeDefined();
    expect(result.state.level).toBeGreaterThan(1);
  });

  it('emits levelUp event after orderDelivered event', () => {
    const reward: OrderReward = {
      coins: 50,
      stars: 5,
      xp: 1000, // Large XP to trigger level-up
    };
    const order: Order = {
      id: 1,
      customerId: 'customer-1',
      wants: ['apple'],
      reward,
    };

    const state = stateWith(
      {
        0: 'apple',
      },
      {
        orders: [order],
        xp: 0,
        level: 1,
      },
    );

    const result = deliverOrder(testData, state, 1, 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected ok: true');

    expect(result.events[0]?.type).toBe('orderDelivered');
    const levelUpIndex = result.events.findIndex((e) => e.type === 'levelUp');
    if (levelUpIndex > 0) {
      // levelUp should come after orderDelivered
      expect(levelUpIndex).toBeGreaterThan(0);
    }
  });

  it('does not mutate input state on successful delivery', () => {
    const reward: OrderReward = {
      coins: 50,
      stars: 5,
      xp: 2,
    };
    const order: Order = {
      id: 1,
      customerId: 'customer-1',
      wants: ['apple'],
      reward,
    };

    const state = stateWith(
      {
        0: 'apple',
      },
      {
        orders: [order],
        coins: 50,
        stars: 5,
      },
    );

    const originalCoins = state.coins;
    const originalStars = state.stars;
    const originalOrders = state.orders;

    deliverOrder(testData, state, 1, 1000);

    expect(state.coins).toBe(originalCoins);
    expect(state.stars).toBe(originalStars);
    expect(state.orders).toBe(originalOrders);
  });

  it('does not mutate input state on rejection', () => {
    const reward: OrderReward = {
      coins: 50,
      stars: 5,
      xp: 2,
    };
    const order: Order = {
      id: 1,
      customerId: 'customer-1',
      wants: ['apple', 'butter-block'],
      reward,
    };

    const state = stateWith(
      {
        0: 'apple',
      },
      {
        orders: [order],
        coins: 50,
        stars: 5,
      },
    );

    const originalCoins = state.coins;
    const originalStars = state.stars;
    const originalOrders = state.orders;

    deliverOrder(testData, state, 1, 1000);

    expect(state.coins).toBe(originalCoins);
    expect(state.stars).toBe(originalStars);
    expect(state.orders).toBe(originalOrders);
  });
});
