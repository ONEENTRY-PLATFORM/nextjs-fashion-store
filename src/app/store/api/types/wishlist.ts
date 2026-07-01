/**
 * Wire types for the Platform wishlist REST API (`/api/content/users/me/wishlist`).
 * Mirrors `WishlistItemDto` / `WishlistResponseDto` from
 * `cms/src/modules/user-activity/dto/wishlist.dto.ts`.
 */

/** Single wishlist row as returned by the Platform. */
export interface WishlistApiItem {
  productId: number;
  addedAt?: string;
}

/** Response envelope shared by all wishlist endpoints. */
export interface WishlistApiResponse {
  items: WishlistApiItem[];
  total: number;
}

/** Argument for POST /users/me/wishlist/items. */
export interface WishlistAddItemArgs {
  productId: number;
}

/** Argument for DELETE /users/me/wishlist/items/:productId. */
export interface WishlistRemoveItemArgs {
  productId: number;
}

/** Argument for PUT /users/me/wishlist (full replace). */
export interface WishlistSetArgs {
  items: WishlistApiItem[];
}
