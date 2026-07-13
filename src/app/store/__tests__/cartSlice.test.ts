import { describe, it, expect, beforeEach } from 'vitest';
import cartReducer, { cartActions } from '../cartSlice';
import type { CartItem } from '../../context/CartContext';

const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: 'item-1',
  name: 'Test Dress',
  brand: 'Brand',
  color: 'Black',
  sku: 'SKU-001',
  size: 'M',
  quantity: 1,
  price: 99,
  image: '/img.jpg',
  ...overrides,
});

describe('cartSlice', () => {
  let emptyState: ReturnType<typeof cartReducer>;

  beforeEach(() => {
    emptyState = cartReducer(undefined, { type: '@@INIT' });
  });

  it('starts with empty cart', () => {
    expect(emptyState.items).toHaveLength(0);
    expect(emptyState.miniCartOpen).toBe(false);
  });

  describe('addItem', () => {
    it('adds a new item', () => {
      const state = cartReducer(emptyState, cartActions.addItem(makeItem()));
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe('item-1');
    });

    it('increments quantity when same id+size already exists', () => {
      let state = cartReducer(emptyState, cartActions.addItem(makeItem({ quantity: 2 })));
      state = cartReducer(state, cartActions.addItem(makeItem({ quantity: 3 })));
      expect(state.items).toHaveLength(1);
      expect(state.items[0].quantity).toBe(5);
    });

    it('treats same id with different size as separate item', () => {
      let state = cartReducer(emptyState, cartActions.addItem(makeItem({ size: 'S' })));
      state = cartReducer(state, cartActions.addItem(makeItem({ size: 'L' })));
      expect(state.items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('removes item by id', () => {
      let state = cartReducer(emptyState, cartActions.addItem(makeItem()));
      state = cartReducer(state, cartActions.removeItem('item-1'));
      expect(state.items).toHaveLength(0);
    });

    it('is a no-op for non-existent id', () => {
      let state = cartReducer(emptyState, cartActions.addItem(makeItem()));
      state = cartReducer(state, cartActions.removeItem('no-such-id'));
      expect(state.items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('increases quantity by delta', () => {
      let state = cartReducer(emptyState, cartActions.addItem(makeItem({ quantity: 2 })));
      state = cartReducer(state, cartActions.updateQuantity({ id: 'item-1', delta: 3 }));
      expect(state.items[0].quantity).toBe(5);
    });

    it('decreases quantity by delta', () => {
      let state = cartReducer(emptyState, cartActions.addItem(makeItem({ quantity: 5 })));
      state = cartReducer(state, cartActions.updateQuantity({ id: 'item-1', delta: -2 }));
      expect(state.items[0].quantity).toBe(3);
    });

    it('does not go below 1', () => {
      let state = cartReducer(emptyState, cartActions.addItem(makeItem({ quantity: 1 })));
      state = cartReducer(state, cartActions.updateQuantity({ id: 'item-1', delta: -10 }));
      expect(state.items[0].quantity).toBe(1);
    });
  });

  describe('addBundle', () => {
    it('adds multiple items sharing the same bundleId', () => {
      const items = [
        makeItem({ id: 'b1', size: 'S' }),
        makeItem({ id: 'b2', size: 'M' }),
      ];
      const state = cartReducer(emptyState, cartActions.addBundle(items));
      expect(state.items).toHaveLength(2);
      expect(state.items[0].bundleId).toBeDefined();
      expect(state.items[0].bundleId).toBe(state.items[1].bundleId);
    });

    it('different addBundle calls produce different bundleIds', () => {
      const item = makeItem({ id: 'x1' });
      const s1 = cartReducer(emptyState, cartActions.addBundle([item]));
      const s2 = cartReducer(s1, cartActions.addBundle([makeItem({ id: 'x2' })]));
      expect(s2.items[0].bundleId).not.toBe(s2.items[1].bundleId);
    });
  });

  describe('updateQuantity for bundles', () => {
    it('updates all items in a bundle together', () => {
      const items = [makeItem({ id: 'b1', quantity: 1 }), makeItem({ id: 'b2', quantity: 1 })];
      let state = cartReducer(emptyState, cartActions.addBundle(items));
      state = cartReducer(state, cartActions.updateQuantity({ id: 'b1', delta: 2 }));
      expect(state.items[0].quantity).toBe(3);
      expect(state.items[1].quantity).toBe(3);
    });
  });

  describe('removeBundle', () => {
    it('removes all items sharing a bundleId', () => {
      const items = [makeItem({ id: 'b1' }), makeItem({ id: 'b2' })];
      let state = cartReducer(emptyState, cartActions.addBundle(items));
      const bundleId = state.items[0].bundleId!;
      state = cartReducer(state, cartActions.removeBundle(bundleId));
      expect(state.items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('empties the cart', () => {
      let state = cartReducer(emptyState, cartActions.addItem(makeItem()));
      state = cartReducer(state, cartActions.addItem(makeItem({ id: 'item-2' })));
      state = cartReducer(state, cartActions.clearCart());
      expect(state.items).toHaveLength(0);
    });
  });

  describe('miniCart', () => {
    it('opens and closes miniCart', () => {
      let state = cartReducer(emptyState, cartActions.openMiniCart());
      expect(state.miniCartOpen).toBe(true);
      state = cartReducer(state, cartActions.closeMiniCart());
      expect(state.miniCartOpen).toBe(false);
    });
  });

  // ── stockLimit / per-variant quantity cap ───────────────────────────────────
  describe('stockLimit cap — addItem', () => {
    it('clamps initial quantity to stockLimit on first add', () => {
      const state = cartReducer(
        emptyState,
        cartActions.addItem(makeItem({ quantity: 10, stockLimit: 5 })),
      );
      expect(state.items[0].quantity).toBe(5);
    });

    it('clamps accumulated quantity to stockLimit when adding to existing item', () => {
      let state = cartReducer(
        emptyState,
        cartActions.addItem(makeItem({ quantity: 3, stockLimit: 5 })),
      );
      state = cartReducer(
        state,
        cartActions.addItem(makeItem({ quantity: 3, stockLimit: 5 })),
      );
      expect(state.items[0].quantity).toBe(5);
    });

    it('refreshes stockLimit and re-clamps existing quantity when incoming payload carries a new limit', () => {
      // Existing item: stockLimit=10, quantity=5 (fits)
      let state = cartReducer(
        emptyState,
        cartActions.addItem(makeItem({ quantity: 5, stockLimit: 10 })),
      );
      // Incoming add: stockLimit=3 — inventory shrank; quantity must be clamped to 3
      state = cartReducer(
        state,
        cartActions.addItem(makeItem({ quantity: 0, stockLimit: 3 })),
      );
      expect(state.items[0].stockLimit).toBe(3);
      expect(state.items[0].quantity).toBe(3);
    });

    it('preserves existing stockLimit when incoming payload has stockLimit === undefined', () => {
      let state = cartReducer(
        emptyState,
        cartActions.addItem(makeItem({ quantity: 2, stockLimit: 7 })),
      );
      // addItem without stockLimit — should NOT wipe the existing cap
      state = cartReducer(
        state,
        cartActions.addItem(makeItem({ quantity: 1, stockLimit: undefined })),
      );
      expect(state.items[0].stockLimit).toBe(7);
      // quantity is 2 + 1 = 3, well within cap — no clamping needed
      expect(state.items[0].quantity).toBe(3);
    });
  });

  describe('stockLimit cap — updateQuantity', () => {
    it('does not exceed stockLimit when delta pushes quantity over the cap', () => {
      let state = cartReducer(
        emptyState,
        cartActions.addItem(makeItem({ quantity: 5, stockLimit: 5 })),
      );
      state = cartReducer(state, cartActions.updateQuantity({ id: 'item-1', delta: +1 }));
      expect(state.items[0].quantity).toBe(5);
    });

    it('decrements normally even when already at the stockLimit', () => {
      let state = cartReducer(
        emptyState,
        cartActions.addItem(makeItem({ quantity: 5, stockLimit: 5 })),
      );
      state = cartReducer(state, cartActions.updateQuantity({ id: 'item-1', delta: -1 }));
      expect(state.items[0].quantity).toBe(4);
    });
  });

  describe('stockLimit cap — addBundle', () => {
    it('clamps each bundle item to its own stockLimit', () => {
      const items = [
        makeItem({ id: 'b1', size: 'S', quantity: 10, stockLimit: 2 }),
        makeItem({ id: 'b2', size: 'M', quantity: 3, stockLimit: 5 }),
      ];
      const state = cartReducer(emptyState, cartActions.addBundle(items));
      const b1 = state.items.find(i => i.id === 'b1')!;
      const b2 = state.items.find(i => i.id === 'b2')!;
      expect(b1.quantity).toBe(2);
      expect(b2.quantity).toBe(3); // 3 < 5 — not clamped
    });
  });

  describe('stockLimit cap — legacy / uncapped items', () => {
    it('does not cap quantity when stockLimit is undefined (legacy items remain uncapped)', () => {
      let state = cartReducer(
        emptyState,
        cartActions.addItem(makeItem({ quantity: 99, stockLimit: undefined })),
      );
      state = cartReducer(state, cartActions.updateQuantity({ id: 'item-1', delta: +50 }));
      expect(state.items[0].quantity).toBe(149);
    });
  });

  // ── unavailableRemoved ─────────────────────────────────────────────────────
  describe('setUnavailableRemoved', () => {
    it('starts as an empty array', () => {
      expect(emptyState.unavailableRemoved).toEqual([]);
    });

    it('stores the supplied CartItem array', () => {
      const removed = [makeItem({ id: 'gone-1' }), makeItem({ id: 'gone-2' })];
      const state = cartReducer(emptyState, cartActions.setUnavailableRemoved(removed));
      expect(state.unavailableRemoved).toHaveLength(2);
      expect(state.unavailableRemoved[0].id).toBe('gone-1');
      expect(state.unavailableRemoved[1].id).toBe('gone-2');
    });

    it('replaces a previous unavailableRemoved value', () => {
      const first = [makeItem({ id: 'a' })];
      const second = [makeItem({ id: 'b' }), makeItem({ id: 'c' })];
      let state = cartReducer(emptyState, cartActions.setUnavailableRemoved(first));
      state = cartReducer(state, cartActions.setUnavailableRemoved(second));
      expect(state.unavailableRemoved).toHaveLength(2);
      expect(state.unavailableRemoved[0].id).toBe('b');
    });

    it('accepts an empty array (explicit clear)', () => {
      let state = cartReducer(emptyState, cartActions.setUnavailableRemoved([makeItem()]));
      state = cartReducer(state, cartActions.setUnavailableRemoved([]));
      expect(state.unavailableRemoved).toHaveLength(0);
    });
  });

  describe('dismissUnavailableRemoved', () => {
    it('resets unavailableRemoved to an empty array', () => {
      let state = cartReducer(
        emptyState,
        cartActions.setUnavailableRemoved([makeItem({ id: 'gone' })]),
      );
      expect(state.unavailableRemoved).toHaveLength(1);
      state = cartReducer(state, cartActions.dismissUnavailableRemoved());
      expect(state.unavailableRemoved).toHaveLength(0);
    });

    it('is a no-op when unavailableRemoved is already empty', () => {
      const state = cartReducer(emptyState, cartActions.dismissUnavailableRemoved());
      expect(state.unavailableRemoved).toEqual([]);
    });
  });
});
