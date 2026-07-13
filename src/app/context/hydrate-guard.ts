/**
 * Pure decision helper used by CartContext and WishlistContext to decide
 * whether a per-user sessionStorage hydration flag is still valid.
 *
 * Extracted so the branching logic can be unit-tested without wiring up
 * Redux, Auth, or async server actions.
 *
 * @param userIdentifier - the OE identifier for the currently signed-in user
 *   (from `state.user.data.userIdentifier`). `null` / empty means "no user".
 * @param storedFlag - the value currently in sessionStorage for the relevant
 *   key (`oe_cart_merged` or `oe_wishlist_merged`). `null` when the key is
 *   absent.
 * @returns `true` when a fresh hydration merge should run; `false` to skip.
 */
export function shouldHydrateForUser(
  userIdentifier: string | null | undefined,
  storedFlag: string | null,
): boolean {
  if (!userIdentifier) return false;
  return storedFlag !== userIdentifier;
}

/**
 * Diff local cart state against the OE server cart during hydration and return
 * two action lists:
 *
 * - `qtyMismatches` — items that exist in both local and OE but whose quantity
 *   has drifted (e.g. updated on mobile).  Caller should dispatch removeItem +
 *   addItem({ ...local, quantity: newQty }) to realign without losing enriched
 *   cosmetic data (name, image, brand, etc.).
 *
 * - `toAdd` — OE items that are completely absent from the local Redux store
 *   and must be synthesized as placeholders before the async enrichment fetch.
 *
 * Items that are in local but NOT in OE are intentionally excluded from both
 * arrays — pruning is handled separately by `pickLocalIdsToPrune` and is
 * already covered by its own tests.
 *
 * @param local - items currently in the Redux cart (id + quantity only needed).
 * @param oe    - the server cart from `/me/cart` (productId + qty).
 * @param playgroundIdFor - converts a CMS numeric id to a playground string id,
 *   or `null` when no mapping exists.  Mirrors `getPlaygroundProductId` from
 *   the production code so the comparison uses the same id that Redux holds.
 */
export function diffCartForHydrate(
  local: { id: string; quantity: number }[],
  oe: { productId: number; qty: number }[],
  playgroundIdFor: (cmsId: number) => string | null,
): {
  qtyMismatches: { id: string; newQty: number }[];
  toAdd: { productId: number; qty: number }[];
} {
  const localById = new Map(local.map((i) => [i.id, i]));
  const qtyMismatches: { id: string; newQty: number }[] = [];
  const toAdd: { productId: number; qty: number }[] = [];

  for (const srv of oe) {
    const id = playgroundIdFor(srv.productId) ?? String(srv.productId);
    const localItem = localById.get(id);
    if (localItem) {
      if (localItem.quantity !== srv.qty) {
        qtyMismatches.push({ id, newQty: srv.qty });
      }
      // else quantities match — nothing to do
    } else {
      toAdd.push({ productId: srv.productId, qty: srv.qty });
    }
  }

  return { qtyMismatches, toAdd };
}

/**
 * Determine which local item ids should be pruned during hydration because OE
 * is authoritative and no longer has the corresponding product.
 *
 * OE is the source of truth: if a local cart/wishlist entry has a numeric CMS
 * id that is not present in the OE server list, it was removed on another
 * device and should be dropped locally too.
 *
 * Non-numeric local ids (e.g. playground stubs, legacy `wc-*` ids) are
 * intentionally skipped — OE never saw them and they live only in local Redux.
 *
 * @param localItems  - items currently in local Redux (cart or wishlist).
 * @param oeProductIds - the `productId` values returned by `/me/cart` or
 *   `/me/wishlist`. May be numbers or numeric strings.
 * @param toCms - converts a local item id to its numeric CMS id, or `null`
 *   when the id is non-numeric / not known to OE.
 * @returns the local item ids whose CMS product id is absent from the OE list.
 */
export function pickLocalIdsToPrune(
  localItems: { id: string }[],
  oeProductIds: (number | string)[],
  toCms: (id: string) => number | null,
): string[] {
  const oeSet = new Set(oeProductIds.map((p) => String(p)));
  const toPrune: string[] = [];
  for (const item of localItems) {
    const cmsId = toCms(item.id);
    if (cmsId === null) continue; // non-numeric → local-only, skip
    if (!oeSet.has(String(cmsId))) toPrune.push(item.id);
  }
  return toPrune;
}
