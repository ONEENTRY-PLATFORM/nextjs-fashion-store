/**
 * cms-product-id-map.ts
 * -----------------------------------------------------------------------
 * Manual mapping between playground product `id` (string, e.g. `"wc-1"`)
 * and the corresponding Platform `products.id` (integer) in the local seed.
 *
 * Why "manual": the playground catalogue is a fashion mock (clothing,
 * bags, shoes, accessories), while the Platform demo seed covers a completely
 * different inventory (electronics, beauty, sports, food). The categories
 * don't overlap, so the mapping is artificial and only exists to give QA
 * something visible to test against — once a real catalogue is loaded
 * from the Platform this file goes away together with the playground mocks.
 *
 * The 25 entries below cover every `seed-demo-prod-*` row in the local
 * `test_db_dataset_clean` database. The product IDs were obtained via:
 *
 *   docker exec cms-sb-db psql -U postgres -d test_db_dataset_clean \
 *     -c "SELECT id, identifier FROM products
 *          WHERE identifier LIKE 'seed-demo-prod-%'
 *          ORDER BY identifier;"
 *
 * Re-run the query and update the constants if the seed changes.
 *
 * Playground IDs were chosen across all fashion categories (clothing,
 * bags, shoes, accessories — both men and women) to ensure the QA flow
 * can exercise wishlist/cart syncing from every catalogue page.
 */

/**
 * Forward map: playground product id → Platform `products.id`.
 * Only products listed here will sync with the server. Anything else
 * falls back to local-only (Redux + localStorage) behaviour.
 */
export const CMS_PRODUCT_ID_MAP: Readonly<Record<string, number>> = {
  // electronics ⇄ women / men clothing & bags
  'wc-1': 1, // → seed-demo-prod-electronics-phone
  'wc-3': 2, // → seed-demo-prod-electronics-laptop
  'wc-7': 3, // → seed-demo-prod-electronics-earbuds
  'wc-8': 4, // → seed-demo-prod-electronics-smartwatch
  'wc-12': 5, // → seed-demo-prod-electronics-headphones
  'mc-1': 6, // → seed-demo-prod-electronics-tablet
  'mc-2': 7, // → seed-demo-prod-electronics-charger
  'mc-3': 8, // → seed-demo-prod-electronics-usb-hub

  // beauty ⇄ women bags
  'wb-1': 9, // → seed-demo-prod-beauty-face-serum
  'wb-2': 10, // → seed-demo-prod-beauty-moisturizer
  'wb-3': 11, // → seed-demo-prod-beauty-body-lotion
  'wb-4': 12, // → seed-demo-prod-beauty-perfume
  'wb-5': 13, // → seed-demo-prod-beauty-lipstick
  'wb-6': 14, // → seed-demo-prod-beauty-mascara

  // sports ⇄ men bags + shoes
  'mb-1': 15, // → seed-demo-prod-sports-yoga-mat
  'mb-2': 16, // → seed-demo-prod-sports-dumbbells
  'mb-3': 17, // → seed-demo-prod-sports-fitness-tracker
  'mb-4': 18, // → seed-demo-prod-sports-protein-bar
  'mb-5': 19, // → seed-demo-prod-sports-whey-protein
  'ms-2': 20, // → seed-demo-prod-sports-running-shoes

  // food ⇄ accessories
  'ms-6': 21, // → seed-demo-prod-food-coffee-beans
  'ms-9': 22, // → seed-demo-prod-food-tea
  'wb-7': 23, // → seed-demo-prod-food-honey
  'wb-8': 24, // → seed-demo-prod-food-olive-oil
  'wb-9': 25, // → seed-demo-prod-food-granola
} as const;

/**
 * Reverse map (Platform `products.id` → playground product id) used after a
 * successful GET wishlist/cart to enrich server payloads with the local
 * product metadata (image, name, price etc.).
 */
export const REVERSE_CMS_PRODUCT_ID_MAP: Readonly<Record<number, string>> =
  Object.freeze(
    Object.entries(CMS_PRODUCT_ID_MAP).reduce<Record<number, string>>(
      (acc, [playgroundId, cmsId]) => {
        acc[cmsId] = playgroundId;
        return acc;
      },
      {},
    ),
  );

/**
 * Resolve the Platform product id for a given playground id. Returns `null`
 * when the product is not mapped — callers should treat that as
 * "local-only, do not call the API" and emit a UI warning.
 */
export function getCmsProductId(playgroundId: string): number | null {
  // Numeric ids (`"4962"`) come straight from the OneEntry-backed catalog —
  // no static mapping needed. Fall through to the legacy mock mapping for
  // remaining `wc-*` / `mc-*` ids.
  if (/^\d+$/.test(playgroundId)) return Number(playgroundId);
  return CMS_PRODUCT_ID_MAP[playgroundId] ?? null;
}

/**
 * Resolve the playground id for a given Platform product id, or `null` when
 * the Platform product does not correspond to anything the playground knows
 * about (e.g. a product added in the admin panel after the static
 * mapping was last refreshed).
 */
export function getPlaygroundProductId(cmsId: number): string | null {
  return REVERSE_CMS_PRODUCT_ID_MAP[cmsId] ?? null;
}
