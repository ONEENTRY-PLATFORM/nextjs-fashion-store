/**
 * uiSlice — global UI state
 *
 * Replaces QuickViewContext (local useState) and consolidates other transient UI flags
 * that benefit from being in the global store (e.g. mobile menu open state).
 *
 * Note: QuickViewContext in context/QuickViewContext.tsx will remain as a thin wrapper
 * around these actions so existing components don't need to change their imports.
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../components/ProductCard';

interface UIState {
  quickView: {
    isOpen: boolean;
    product: Product | null;
    initialColorIndex: number | null;
  };
  mobileMenuOpen: boolean;
}

const initialState: UIState = {
  quickView: {
    isOpen: false,
    product: null,
    initialColorIndex: null,
  },
  mobileMenuOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openQuickView(state, action: PayloadAction<{ product: Product; initialColorIndex: number | null }>) {
      state.quickView.product = action.payload.product;
      state.quickView.initialColorIndex = action.payload.initialColorIndex;
      state.quickView.isOpen = true;
    },
    closeQuickView(state) {
      state.quickView.isOpen = false;
      // product is cleared by a follow-up action after the close animation
    },
    clearQuickViewProduct(state) {
      state.quickView.product = null;
      state.quickView.initialColorIndex = null;
    },
    openMobileMenu(state) {
      state.mobileMenuOpen = true;
    },
    closeMobileMenu(state) {
      state.mobileMenuOpen = false;
    },
    toggleMobileMenu(state) {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
  },
});

export const {
  openQuickView,
  closeQuickView,
  clearQuickViewProduct,
  openMobileMenu,
  closeMobileMenu,
  toggleMobileMenu,
} = uiSlice.actions;

export default uiSlice.reducer;
