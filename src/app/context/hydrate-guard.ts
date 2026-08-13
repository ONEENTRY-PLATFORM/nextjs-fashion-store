/** Pure decision helper used by CartContext and WishlistContext to decide whether a per-user sessionStorage hydration flag is still valid. */
export function shouldHydrateForUser(userIdentifier: string | null | undefined, storedFlag: string | null): boolean {
  if (!userIdentifier) return false;
  return storedFlag !== userIdentifier;
}

/** Diff local cart state against the OE server cart during hydration and return two action lists: - `qtyMismatches`. */
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

/** Determine which local item ids should be pruned during hydration because OE is authoritative and no longer has the corresponding product. */
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
