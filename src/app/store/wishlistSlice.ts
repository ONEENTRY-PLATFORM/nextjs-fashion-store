import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { WishlistItem } from '../context/WishlistContext';
import type { WishlistItem as DataWishlistItem, WaitingItem } from '../data/userData';
import { CURRENCY } from '../data/currencyConfig';

/** Convert userData.WishlistItem → WishlistContext.WishlistItem */
function fromDataWishlist(item: DataWishlistItem): WishlistItem {
  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    // originalPrice is the crossed-out price; item.price is the current (sale) price
    price: item.originalPrice ? CURRENCY.format(item.originalPrice) : CURRENCY.format(item.price),
    salePrice: item.originalPrice ? CURRENCY.format(item.price) : undefined,
    image: item.image,
    colors: item.colors,
    sizes: item.sizes,
    inStock: true,
  };
}

/** Convert userData.WaitingItem → WishlistContext.WishlistItem */
function fromWaitingItem(item: WaitingItem): WishlistItem {
  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    price: CURRENCY.format(item.price),
    image: item.img,
    colors: [],
    sizes: [item.size],
    inStock: false,
    selectedColor: item.color,
    selectedSize: item.size,
  };
}

interface WishlistState {
  items: WishlistItem[];
}

const initialState: WishlistState = {
  items: [],
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<WishlistItem>) {
      const idx = state.items.findIndex(i => i.id === action.payload.id);
      if (idx === -1) {
        state.items.push(action.payload);
      } else {
        // Upsert: when the new payload carries richer data than the existing
        // (e.g. placeholder→enriched product on wishlist hydration), merge so
        // the card finally renders image/price/brand. User-set fields like
        // selectedColor/selectedSize are preserved.
        const existing = state.items[idx];
        state.items[idx] = {
          ...action.payload,
          selectedColor: existing.selectedColor ?? action.payload.selectedColor,
          selectedSize: existing.selectedSize ?? action.payload.selectedSize,
        };
      }
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    toggleItem(state, action: PayloadAction<WishlistItem>) {
      const exists = state.items.some(i => i.id === action.payload.id);
      if (exists) {
        state.items = state.items.filter(i => i.id !== action.payload.id);
      } else {
        state.items.push(action.payload);
      }
    },
    updateSelection(state, action: PayloadAction<{ id: string; selectedColor?: string; selectedSize?: string }>) {
      const item = state.items.find(i => i.id === action.payload.id);
      if (item) {
        if (action.payload.selectedColor !== undefined) item.selectedColor = action.payload.selectedColor;
        if (action.payload.selectedSize !== undefined) item.selectedSize = action.payload.selectedSize;
      }
    },
    clearAll(state) {
      state.items = [];
    },
    /**
     * Called on login: merges server wishlist + waitingList with guest items.
     * Server items take precedence (dedup by id); guest-only items are appended.
     */
    mergeUserWishlist(
      state,
      action: PayloadAction<{ wishlist: DataWishlistItem[]; waitingList: WaitingItem[] }>,
    ) {
      const serverItems: WishlistItem[] = [
        ...action.payload.wishlist.map(fromDataWishlist),
        ...action.payload.waitingList.map(fromWaitingItem),
      ];
      const serverIds = new Set(serverItems.map(i => i.id));
      // Guest items not present on server (added before login)
      const guestOnly = state.items.filter(i => !serverIds.has(i.id));
      state.items = [...serverItems, ...guestOnly];
    },
  },
});

export const wishlistActions = wishlistSlice.actions;
export { fromDataWishlist, fromWaitingItem };
export default wishlistSlice.reducer;
