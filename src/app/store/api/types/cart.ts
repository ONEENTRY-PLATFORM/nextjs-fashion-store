/**
 * Wire types for the Platform cart REST API (`/api/content/users/me/cart`).
 * Mirrors `CartItemDto` / `CartResponseDto` from
 * `cms/src/modules/user-activity/dto/cart.dto.ts`.
 */

/** Single cart row as returned by the Platform (qty is absolute, not delta). */
export interface CartApiItem {
  productId: number;
  qty: number;
  addedAt?: string;
}

/** Response envelope shared by all cart endpoints. */
export interface CartApiResponse {
  items: CartApiItem[];
  total: number;
}

/** Argument for POST /users/me/cart/items (qty is absolute). */
export interface CartAddItemArgs {
  productId: number;
  qty: number;
}

/** Argument for DELETE /users/me/cart/items/:productId. */
export interface CartRemoveItemArgs {
  productId: number;
}

/** Argument for PUT /users/me/cart (full replace). */
export interface CartSetArgs {
  items: CartApiItem[];
}
