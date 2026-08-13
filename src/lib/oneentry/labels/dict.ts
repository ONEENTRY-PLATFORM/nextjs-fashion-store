/** Whole-dictionary overlay: map a local label object onto a OneEntry system-text set in one call. */

/** `camelCase` / `PascalCase` → `snake_case`; digits stay attached to the word. */
export function snakeKey(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/** Overlay `dict` (an OE set flattened to `{key: value}`) onto `fallbacks`. */
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
  // Returning the original object when nothing differs keeps the identity stable, so a `useMemo`/dependency array downstream doesn't churn.
  return changed ? (out as T) : fallbacks;
}

/** Every marker this dictionary would read, in OE form. */
export function dictMarkers(prefix: string, fallbacks: Record<string, unknown>): string[] {
  return Object.entries(fallbacks)
    .filter(([, v]) => typeof v === 'string')
    .map(([k]) => prefix + snakeKey(k));
}
