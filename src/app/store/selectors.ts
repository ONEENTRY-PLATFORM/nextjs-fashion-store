import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';

// ─── Cart ──────────────────────────────────────────────────────────────────

export const selectCartItems = (state: RootState) => state.cart.items;
export const selectMiniCartOpen = (state: RootState) => state.cart.miniCartOpen;

export const selectCartTotalItems = createSelector(
  selectCartItems,
  items => items.reduce((sum, i) => sum + i.quantity, 0),
);

export const selectCartSubtotal = createSelector(
  selectCartItems,
  items => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
);

export const selectCartOriginalSubtotal = createSelector(
  selectCartItems,
  items => items.reduce((sum, i) => sum + (i.originalPrice ?? i.price) * i.quantity, 0),
);

export const selectCartDiscount = createSelector(
  selectCartSubtotal,
  selectCartOriginalSubtotal,
  (subtotal, original) => original - subtotal,
);

// ─── Wishlist ──────────────────────────────────────────────────────────────

export const selectWishlistItems = (state: RootState) => state.wishlist.items;

export const selectWishlistCount = createSelector(
  selectWishlistItems,
  items => items.length,
);

export const selectIsWishlisted = createSelector(
  selectWishlistItems,
  (_: RootState, id: string) => id,
  (items, id) => items.some(i => i.id === id),
);

// ─── Recently Viewed ────────────────────────────────────────────────────────

export const selectRecentlyViewed = (state: RootState) => state.recentlyViewed.items;

// ─── User ──────────────────────────────────────────────────────────────────

export const selectUserData = (state: RootState) => state.user.data;
export const selectUserStatus = (state: RootState) => state.user.status;
export const selectUserAddresses = (state: RootState) => state.user.data.addresses;
export const selectUserProfile = (state: RootState) => state.user.data.profile;
export const selectUserLoyalty = (state: RootState) => state.user.data.loyalty;

// ─── UI ────────────────────────────────────────────────────────────────────

export const selectQuickViewProduct = (state: RootState) => state.ui.quickView.product;
