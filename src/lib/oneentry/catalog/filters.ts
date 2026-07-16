/**
 * Catalog filter parsing / building.
 *
 * Lives between the URL (source of truth for filter state) and the
 * OneEntry `Products.getProducts(filter, ...)` API. The catalog page
 * component reads `searchParams`, runs it through `parseCatalogSearchParams`,
 * then passes the result to `buildOEFilterBody` to query OE.
 *
 * Real attribute markers (snapshot from /inspect-api products on the
 * `e-commerce.oneentry.cloud` tenant):
 *   - price          (float)
 *   - colors         (list, hex values)
 *   - sizes          (list)
 *   - brand          (string-ish; list of {value})
 *   - brand_country  (list)
 *   - material       (list)
 *   - style          (list)
 *   - season         (string-ish)
 *   - fit            (list)
 *   - lining_material(list)
 *   - label          (list)
 *
 * UI groups present on the storefront but absent in OE — `productDetails`,
 * `careInstructions`, `insulation` — get silently dropped here.
 */

export interface CatalogFilters {
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  colors?: string[];
  sizes?: string[];
  brands?: string[];
  styles?: string[];
  materials?: string[];
  seasons?: string[];
  fits?: string[];
  liningMaterials?: string[];
  brandCountries?: string[];
  labels?: string[];
  productDetails?: string[];
  careInstructions?: string[];
  insulations?: string[];
  /** Shoe filters shipped by OE's `women_shoes` / `men_shoes` filter defs. */
  soleMaterials?: string[];
  insoleMaterials?: string[];
  /** Discount toggle — surfaces the OE filter group of the same name. Truthy
   *  when the shopper has picked any value in the group. */
  discountOnly?: boolean;
  sort?: string;
  page?: number;
  chip?: string;
  /** OE category `pageUrl` — a specific leaf inside the current section
   *  (e.g. `dresses_skirts`). When present, only products whose category
   *  path ends with this segment are shown. */
  category?: string;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** URL param key → CatalogFilters list field. Multi-value entries are
 *  comma-separated in the URL (e.g. `?color=Black,White`). */
const LIST_KEYS: Record<string, keyof CatalogFilters> = {
  color: 'colors',
  size: 'sizes',
  brand: 'brands',
  style: 'styles',
  material: 'materials',
  season: 'seasons',
  fit: 'fits',
  liningMaterial: 'liningMaterials',
  brandCountry: 'brandCountries',
  label: 'labels',
  details: 'productDetails',
  careInstructions: 'careInstructions',
  insulation: 'insulations',
  soleMaterial: 'soleMaterials',
  insoleMaterial: 'insoleMaterials',
};

/** Inverse of LIST_KEYS — used by serializeCatalogSearchParams to flip a
 *  CatalogFilters object back into URL params. */
const LIST_FIELD_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(LIST_KEYS).map(([urlKey, field]) => [field as string, urlKey]),
);

const firstString = (v: string | string[] | undefined): string | undefined => {
  if (Array.isArray(v)) return v[0];
  return v;
};

const splitCsv = (v: string | string[] | undefined): string[] | undefined => {
  if (!v) return undefined;
  const flat = Array.isArray(v) ? v.join(',') : v;
  const parts = flat.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  return parts.length > 0 ? parts : undefined;
};

const toFiniteNumber = (v: string | undefined): number | undefined => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Parse Next.js `searchParams` into a typed `CatalogFilters` object.
 *  Skips unknown keys silently so non-filter query params (`utm_source`, etc.)
 *  don't interfere. */
export function parseCatalogSearchParams(sp: RawSearchParams): CatalogFilters {
  const out: CatalogFilters = {};
  const minPrice = toFiniteNumber(firstString(sp.minPrice));
  const maxPrice = toFiniteNumber(firstString(sp.maxPrice));
  if (minPrice !== undefined) out.minPrice = minPrice;
  if (maxPrice !== undefined) out.maxPrice = maxPrice;

  if (firstString(sp.inStock) === 'true') out.inStockOnly = true;

  for (const [urlKey, field] of Object.entries(LIST_KEYS)) {
    const vals = splitCsv(sp[urlKey]);
    if (vals) (out as Record<string, unknown>)[field as string] = vals;
  }

  const sort = firstString(sp.sort);
  if (sort) out.sort = sort;

  const page = toFiniteNumber(firstString(sp.page));
  if (page !== undefined && page > 0) out.page = Math.floor(page);

  const chip = firstString(sp.chip);
  if (chip) out.chip = chip;

  const category = firstString(sp.category);
  if (category) out.category = category;

  return out;
}

/** Serialize a `CatalogFilters` back into a URL query string suitable for
 *  `router.replace`. Empty / undefined fields are stripped so they don't bloat
 *  the URL with `?color=&size=&minPrice=`. */
export function serializeCatalogSearchParams(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.inStockOnly) params.set('inStock', 'true');

  for (const [field, urlKey] of Object.entries(LIST_FIELD_TO_KEY)) {
    const vals = (filters as Record<string, unknown>)[field] as string[] | undefined;
    if (vals && vals.length > 0) params.set(urlKey, vals.join(','));
  }

  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page !== undefined && filters.page > 1) params.set('page', String(filters.page));
  if (filters.chip) params.set('chip', filters.chip);
  if (filters.category) params.set('category', filters.category);

  return params.toString();
}

/* Removed: `OEFilterRecord`, `STATUS_IN_STOCK`, `LIST_FIELD_TO_OE_MARKER`,
 * `PRICE_MARKER`, `buildOEFilterBody`.
 *
 * These were scaffolding for a server-side filter path against OE
 * `Products.getProducts(filter, ...)` that never landed — the storefront
 * filters `loadFullCatalog` locally in `products.ts` via
 * `matchesCatalogFilters`. Nothing imported the exports, and the OE marker
 * table risked drifting from the actually-used values. Keeping the file
 * lean makes it clear which path is live. Restore from git history if we
 * ever revive the server-side filter route.
 */

/**
 * Mapping from the storefront `CatalogTemplate` filter group `key` (used by
 * UI components when the user toggles a checkbox) onto the corresponding
 * URL parameter name. Used by the catalog page client to compute the new
 * search-string when a filter is toggled.
 *
 * Keys whose OE attribute markers don't exist (`productDetails`,
 * `careInstructions`, `insulation`, mock-only shoe attributes) get a
 * default empty mapping — `toggleFilterInSearchParams` then becomes a no-op.
 */
const FE_GROUP_TO_FILTER_FIELD: Record<string, keyof CatalogFilters> = {
  color: 'colors',
  size: 'sizes',
  brand: 'brands',
  style: 'styles',
  material: 'materials',
  season: 'seasons',
  fit: 'fits',
  liningMaterial: 'liningMaterials',
  brandCountry: 'brandCountries',
  label: 'labels',
  productDetails: 'productDetails',
  careInstructions: 'careInstructions',
  insulation: 'insulations',
  soleMaterial: 'soleMaterials',
  insoleMaterial: 'insoleMaterials',
};

/** Returns true if the filter group key has a backing OE marker we know about
 *  (i.e. flipping it actually filters the products). UI uses this to grey
 *  out unsupported groups instead of letting the user toggle a no-op. */
export function isFilterGroupSupported(groupKey: string): boolean {
  return groupKey in FE_GROUP_TO_FILTER_FIELD
    || groupKey === 'price'
    || groupKey === 'storeAvailability';
}

/** Toggle a single filter option (e.g. checkbox click on the Color filter)
 *  inside a `CatalogFilters` object. Returns a new object; doesn't mutate. */
export function toggleFilterOption(
  filters: CatalogFilters,
  groupKey: string,
  optionValue: string,
): CatalogFilters {
  const field = FE_GROUP_TO_FILTER_FIELD[groupKey];
  if (!field) return filters;
  const current = ((filters as Record<string, unknown>)[field] as string[] | undefined) ?? [];
  const next = current.includes(optionValue)
    ? current.filter((v) => v !== optionValue)
    : [...current, optionValue];
  const out: CatalogFilters = { ...filters };
  if (next.length > 0) (out as Record<string, unknown>)[field] = next;
  else delete (out as Record<string, unknown>)[field];
  // Resetting page to 1 — selection change usually invalidates pagination.
  delete out.page;
  return out;
}

/** Selected values for a filter group, used by the UI to render check marks. */
export function getSelectedOptionsForGroup(
  filters: CatalogFilters,
  groupKey: string,
): string[] {
  const field = FE_GROUP_TO_FILTER_FIELD[groupKey];
  if (!field) return [];
  return ((filters as Record<string, unknown>)[field] as string[] | undefined) ?? [];
}

/** Total number of selected filter values across all supported groups —
 *  drives the "FILTERS (n)" badge in the catalog header. Counts the
 *  price range as 1 if any bound is set, inStock as 1 when active. */
export function countActiveFilters(filters: CatalogFilters): number {
  let n = 0;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) n += 1;
  if (filters.inStockOnly) n += 1;
  for (const field of Object.values(FE_GROUP_TO_FILTER_FIELD)) {
    const vals = (filters as Record<string, unknown>)[field] as string[] | undefined;
    if (vals && vals.length > 0) n += vals.length;
  }
  return n;
}
