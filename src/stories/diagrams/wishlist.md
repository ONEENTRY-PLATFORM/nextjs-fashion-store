# Wishlist — feature schema

This document has been superseded by [`01-Wishlist.mdx`](./01-Wishlist.mdx) — the up-to-date wishlist flow diagrams live there and are rendered in Storybook under **Diagrams / Wishlist**.

It also references two related documents:

- [`../redux/05-Contexts.mdx`](../redux/05-Contexts.mdx) — `WishlistContext` interface and login-time merge behaviour.
- [`../redux/06-ServerActions.mdx`](../redux/06-ServerActions.mdx) — `syncWishlistAction` / `getWishlistAction` and the 400 ms debounce.

The older `USER_DATASET.wishlist` / `validateCredentials` flow described here was retired when the storefront migrated to full OneEntry SDK integration — see `docs/CART_WISHLIST.md` in the repo root for the current sync semantics.
