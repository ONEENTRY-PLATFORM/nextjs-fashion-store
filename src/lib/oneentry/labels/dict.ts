/**
 * Whole-dictionary overlay: map a local label object onto a OneEntry
 * system-text set in one call.
 *
 * The per-key `use*T('marker', FALLBACK.key)` form is fine for a handful of
 * strings, but a screen with 20–30 labels turns into 30 lines of boilerplate
 * that nobody keeps in sync. `mergeDict` does the same job for the whole
 * object: every **string** entry is looked up as `prefix + snake_case(key)`
 * and replaced when the admin panel has a non-empty value. Non-string entries
 * (option arrays, tuples) pass through untouched — they are structure, not copy.
 *
 * Convention, so the OE marker is derivable from the code without a lookup
 * table: `writeReviewLabel` in the set `checkout_delivery` with prefix
 * `checkout_delivery_` becomes `checkout_delivery_write_review_label`.
 *
 * Pre-existing keys that predate this convention keep using the explicit
 * `use*T(key, fallback)` call — the two styles coexist per file.
 */

/** `camelCase` / `PascalCase` → `snake_case`; digits stay attached to the word. */
export function snakeKey(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Overlay `dict` (an OE set flattened to `{key: value}`) onto `fallbacks`.
 *
 * @param dict      The set's values, or `undefined` when the set is missing.
 * @param prefix    Marker prefix, usually `${setMarker}_`.
 * @param fallbacks The local dictionary — also the shape of the result.
 */
export function mergeDict<T extends Record<string, unknown>>(
  dict: Record<string, string> | undefined,
  prefix: string,
  fallbacks: T,
): T {
  if (!dict) return fallbacks;
  let changed = false;
  const out: Record<string, unknown> = { ...fallbacks };
  for (const [key, fallback] of Object.entries(fallbacks)) {
    if (typeof fallback !== 'string') continue;
    const value = dict[prefix + snakeKey(key)];
    if (typeof value === 'string' && value.length > 0 && value !== fallback) {
      out[key] = value;
      changed = true;
    }
  }
  // Returning the original object when nothing differs keeps the identity
  // stable, so a `useMemo`/dependency array downstream doesn't churn.
  return changed ? (out as T) : fallbacks;
}

/**
 * Every marker this dictionary would read, in OE form. Used by the admin-fill
 * tooling to create the attributes, and by tests to assert the convention.
 */
export function dictMarkers(prefix: string, fallbacks: Record<string, unknown>): string[] {
  return Object.entries(fallbacks)
    .filter(([, v]) => typeof v === 'string')
    .map(([k]) => prefix + snakeKey(k));
}
