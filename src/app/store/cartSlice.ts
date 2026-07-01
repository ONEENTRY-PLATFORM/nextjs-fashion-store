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
}

const initialState: CartState = {
  items: [],
  miniCartOpen: false,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      const item = action.payload;
      const existing = state.items.find(
        i => i.id === item.id && i.size === item.size
      );
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        state.items.push(item);
      }
    },
    addBundle(state, action: PayloadAction<Omit<CartItem, 'bundleId'>[]>) {
      const bundleId = `bundle-${generateId()}`;
      action.payload.forEach(item => {
        state.items.push({ ...item, bundleId });
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
            i.quantity = Math.max(1, i.quantity + delta);
          }
        });
      } else {
        const item = state.items.find(i => i.id === id);
        if (item) item.quantity = Math.max(1, item.quantity + delta);
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
  },
});

export const cartActions = cartSlice.actions;
export default cartSlice.reducer;
