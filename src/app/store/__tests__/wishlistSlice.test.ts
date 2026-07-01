import { describe, it, expect, beforeEach } from 'vitest';
import wishlistReducer, { wishlistActions } from '../wishlistSlice';
import type { WishlistItem } from '../../context/WishlistContext';
import type { WishlistItem as DataWishlistItem, WaitingItem } from '../../data/userData';

const makeItem = (overrides: Partial<WishlistItem> = {}): WishlistItem => ({
  id: 'item-1',
  name: 'Test Coat',
  brand: 'Brand',
  price: '$199.00',
  image: '/img.jpg',
  colors: ['#000', '#fff'],
  sizes: ['S', 'M', 'L'],
  inStock: true,
  ...overrides,
});

const makeDataItem = (overrides: Partial<DataWishlistItem> = {}): DataWishlistItem => ({
  id: 'data-1',
  name: 'Server Item',
  brand: 'Brand',
  price: 150,
  image: '/img.jpg',
  colors: [],
  sizes: ['M'],
  ...overrides,
});

const makeWaitingItem = (overrides: Partial<WaitingItem> = {}): WaitingItem => ({
  id: 'wait-1',
  name: 'Waiting Item',
  brand: 'Brand',
  price: 80,
  img: '/img.jpg',
  color: '#ff0000',
  size: 'S',
  ...overrides,
});

describe('wishlistSlice', () => {
  let emptyState: ReturnType<typeof wishlistReducer>;

  beforeEach(() => {
    emptyState = wishlistReducer(undefined, { type: '@@INIT' });
  });

  it('starts empty', () => {
    expect(emptyState.items).toHaveLength(0);
  });

  describe('addItem', () => {
    it('adds an item', () => {
      const state = wishlistReducer(emptyState, wishlistActions.addItem(makeItem()));
      expect(state.items).toHaveLength(1);
    });

    it('does not add duplicate (same id)', () => {
      let state = wishlistReducer(emptyState, wishlistActions.addItem(makeItem()));
      state = wishlistReducer(state, wishlistActions.addItem(makeItem()));
      expect(state.items).toHaveLength(1);
    });
  });

  describe('removeItem', () => {
    it('removes item by id', () => {
      let state = wishlistReducer(emptyState, wishlistActions.addItem(makeItem()));
      state = wishlistReducer(state, wishlistActions.removeItem('item-1'));
      expect(state.items).toHaveLength(0);
    });

    it('is a no-op for non-existent id', () => {
      let state = wishlistReducer(emptyState, wishlistActions.addItem(makeItem()));
      state = wishlistReducer(state, wishlistActions.removeItem('no-such'));
      expect(state.items).toHaveLength(1);
    });
  });

  describe('toggleItem', () => {
    it('adds item when not present', () => {
      const state = wishlistReducer(emptyState, wishlistActions.toggleItem(makeItem()));
      expect(state.items).toHaveLength(1);
    });

    it('removes item when already present', () => {
      let state = wishlistReducer(emptyState, wishlistActions.addItem(makeItem()));
      state = wishlistReducer(state, wishlistActions.toggleItem(makeItem()));
      expect(state.items).toHaveLength(0);
    });
  });

  describe('updateSelection', () => {
    it('updates selectedColor', () => {
      let state = wishlistReducer(emptyState, wishlistActions.addItem(makeItem()));
      state = wishlistReducer(state, wishlistActions.updateSelection({ id: 'item-1', selectedColor: '#ff0000' }));
      expect(state.items[0].selectedColor).toBe('#ff0000');
    });

    it('updates selectedSize', () => {
      let state = wishlistReducer(emptyState, wishlistActions.addItem(makeItem()));
      state = wishlistReducer(state, wishlistActions.updateSelection({ id: 'item-1', selectedSize: 'L' }));
      expect(state.items[0].selectedSize).toBe('L');
    });

    it('is a no-op for non-existent id', () => {
      const state = wishlistReducer(emptyState, wishlistActions.updateSelection({ id: 'no-such', selectedSize: 'XL' }));
      expect(state.items).toHaveLength(0);
    });
  });

  describe('clearAll', () => {
    it('empties wishlist', () => {
      let state = wishlistReducer(emptyState, wishlistActions.addItem(makeItem()));
      state = wishlistReducer(state, wishlistActions.addItem(makeItem({ id: 'item-2' })));
      state = wishlistReducer(state, wishlistActions.clearAll());
      expect(state.items).toHaveLength(0);
    });
  });

  describe('mergeUserWishlist', () => {
    it('replaces empty state with server items', () => {
      const state = wishlistReducer(
        emptyState,
        wishlistActions.mergeUserWishlist({ wishlist: [makeDataItem()], waitingList: [] }),
      );
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe('data-1');
    });

    it('includes waitingList items as out-of-stock', () => {
      const state = wishlistReducer(
        emptyState,
        wishlistActions.mergeUserWishlist({ wishlist: [], waitingList: [makeWaitingItem()] }),
      );
      expect(state.items).toHaveLength(1);
      expect(state.items[0].inStock).toBe(false);
    });

    it('deduplicates: server items take precedence over guest items with same id', () => {
      const guestItem = makeItem({ id: 'data-1', name: 'Guest Version' });
      let state = wishlistReducer(emptyState, wishlistActions.addItem(guestItem));
      state = wishlistReducer(
        state,
        wishlistActions.mergeUserWishlist({ wishlist: [makeDataItem({ id: 'data-1', name: 'Server Version' })], waitingList: [] }),
      );
      expect(state.items).toHaveLength(1);
      expect(state.items[0].name).toBe('Server Version');
    });

    it('appends guest-only items not present on server', () => {
      const guestOnly = makeItem({ id: 'guest-exclusive' });
      let state = wishlistReducer(emptyState, wishlistActions.addItem(guestOnly));
      state = wishlistReducer(
        state,
        wishlistActions.mergeUserWishlist({ wishlist: [makeDataItem()], waitingList: [] }),
      );
      expect(state.items).toHaveLength(2);
      expect(state.items.find(i => i.id === 'guest-exclusive')).toBeDefined();
    });

    it('maps originalPrice correctly: item.originalPrice becomes the crossed-out price', () => {
      const serverItem = makeDataItem({ id: 'sale-item', price: 80, originalPrice: 150 });
      const state = wishlistReducer(
        emptyState,
        wishlistActions.mergeUserWishlist({ wishlist: [serverItem], waitingList: [] }),
      );
      expect(state.items[0].price).toBe('$150.00');
      expect(state.items[0].salePrice).toBe('$80.00');
    });
  });
});
