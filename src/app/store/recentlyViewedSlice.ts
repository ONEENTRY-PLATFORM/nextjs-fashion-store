import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../components/ProductCard';
import { LIMITS } from '../constants/timings';

/** Items older than this are evicted on next hydration (30 days in ms) */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface RecentlyViewedItem extends Product {
  viewedAt: number; // unix ms
}

interface RecentlyViewedState {
  /**
   * Circular buffer of viewed products.
   * Index 0 = most recently viewed.
   * When full (100 items), the oldest entry (index LIMITS.RECENTLY_VIEWED_MAX-1) is evicted first.
   */
  items: RecentlyViewedItem[];
}

const initialState: RecentlyViewedState = {
  items: [],
};

const recentlyViewedSlice = createSlice({
  name: 'recentlyViewed',
  initialState,
  reducers: {
    addProduct(state, action: PayloadAction<Product>) {
      const product = action.payload;
      const now = Date.now();

      // Evict stale items first
      state.items = state.items.filter(p => now - p.viewedAt < TTL_MS);

      // If already in the list — remove it so we can re-insert at front
      const existingIndex = state.items.findIndex(p => p.id === product.id);
      if (existingIndex !== -1) {
        state.items.splice(existingIndex, 1);
      }

      // Add to the front (most recent) with timestamp
      state.items.unshift({ ...product, viewedAt: now });

      // Circular eviction: if over limit, remove the oldest (last) item
      if (state.items.length > LIMITS.RECENTLY_VIEWED_MAX) {
        state.items.splice(LIMITS.RECENTLY_VIEWED_MAX, state.items.length - LIMITS.RECENTLY_VIEWED_MAX);
      }
    },
    /** Replace the trail with whatever came from the server. Used after the
     *  AuthContext bootstraps and enriches the server's `{productId, viewedAt}`
     *  pairs with full Product details from the catalog. */
    hydrate(state, action: PayloadAction<RecentlyViewedItem[]>) {
      state.items = action.payload.slice(0, LIMITS.RECENTLY_VIEWED_MAX);
    },
  },
});

export const recentlyViewedActions = recentlyViewedSlice.actions;
export default recentlyViewedSlice.reducer;
