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
});
