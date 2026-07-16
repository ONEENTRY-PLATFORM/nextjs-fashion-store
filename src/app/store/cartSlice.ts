import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CartItem } from '../context/CartContext';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (Safari < 15.4)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface CartState {
  items: CartItem[];
  miniCartOpen: boolean;
  /** Items removed by the once-per-session availability check because their
   *  OneEntry product record is gone. Populated by CartContext's validation
   *  effect and rendered as a top-of-page notice — dismissed by the shopper. */
  unavailableRemoved: CartItem[];
}

const initialState: CartState = {
  items: [],
  miniCartOpen: false,
  unavailableRemoved: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      const item = action.payload;
      // Match on id + size + color so the shopper can hold two different
      // colours of the same size in the cart. Without color in the key,
      // adding a Red S after a Blue S silently merged them into a single
      // line whose color stayed Blue — the shopper then received Blue on
      // delivery even though they last picked Red on the PDP.
      const existing = state.items.find(
        i => i.id === item.id && i.size === item.size && i.color === item.color
      );
      if (existing) {
        // Refresh stockLimit from the newer add — the shopper may have opened
        // a fresh PDP and the inventory could have shifted since the previous
        // add. `undefined` in the incoming payload preserves the existing cap.
        if (item.stockLimit !== undefined) existing.stockLimit = item.stockLimit;
        const cap = existing.stockLimit ?? Infinity;
        existing.quantity = Math.min(existing.quantity + item.quantity, cap);
      } else {
        const cap = item.stockLimit ?? Infinity;
        state.items.push({ ...item, quantity: Math.min(item.quantity, cap) });
      }
    },
    addBundle(state, action: PayloadAction<Omit<CartItem, 'bundleId'>[]>) {
      const bundleId = `bundle-${generateId()}`;
      action.payload.forEach(item => {
        const cap = item.stockLimit ?? Infinity;
        state.items.push({ ...item, bundleId, quantity: Math.min(item.quantity, cap) });
      });
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    removeBundle(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.bundleId !== action.payload);
    },
    updateQuantity(state, action: PayloadAction<{ id: string; delta: number }>) {
      const { id, delta } = action.payload;
      const target = state.items.find(i => i.id === id);
      if (target?.bundleId) {
        const bundleId = target.bundleId;
        state.items.forEach(i => {
          if (i.bundleId === bundleId) {
            const cap = i.stockLimit ?? Infinity;
            i.quantity = Math.max(1, Math.min(i.quantity + delta, cap));
          }
        });
      } else {
        const item = state.items.find(i => i.id === id);
        if (item) {
          const cap = item.stockLimit ?? Infinity;
          item.quantity = Math.max(1, Math.min(item.quantity + delta, cap));
        }
      }
    },
    updateSize(state, action: PayloadAction<{ id: string; size: string }>) {
      const item = state.items.find(i => i.id === action.payload.id);
      if (item) item.size = action.payload.size;
    },
    clearCart(state) {
      state.items = [];
    },
    openMiniCart(state) {
      state.miniCartOpen = true;
    },
    closeMiniCart(state) {
      state.miniCartOpen = false;
    },
    setUnavailableRemoved(state, action: PayloadAction<CartItem[]>) {
      state.unavailableRemoved = action.payload;
    },
    dismissUnavailableRemoved(state) {
      state.unavailableRemoved = [];
    },
  },
});

export const cartActions = cartSlice.actions;
export default cartSlice.reducer;
