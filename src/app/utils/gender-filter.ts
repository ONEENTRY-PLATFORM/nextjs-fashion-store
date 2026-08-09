/**
 * Gender scoping for the `/new` and `/sale` feeds.
 *
 * The header's gender switch appends `?gender=women|men`. Filtering runs in
 * the browser rather than in the page so both routes stay statically
 * renderable (MCP `performance`: CMS pages are ISR, never `force-dynamic` —
 * OE content changes only when an admin edits it, so re-fetching per request
 * buys nothing and costs a full round-trip on every visit).
 */

/** OE gender taxonomy value as carried by the adapted UI product. */
export type GenderTag = 'W' | 'M' | 'U' | '' | undefined;

/**
 * Translate the `?gender=` query value into the OE taxonomy tag.
 *
 * @param raw - Raw query-string value.
 * @returns The tag to scope by, `null` for "show all".
 */
export function genderFilterFromQuery(raw: string | null | undefined): 'W' | 'M' | null {
  if (raw === 'men') return 'M';
  if (raw === 'women') return 'W';
  return null;
}

/**
 * Whether a product belongs in the currently scoped feed.
 *
 * Unisex (`'U'`) shows in both. Products OE left untagged are hidden while a
 * scope is active — the adapter already falls back to the category path
 * (`/women/…` vs `/men/…`) before giving up, so an empty tag really does mean
 * "no gender information anywhere".
 *
 * @param productGender - `gender` from the adapted product.
 * @param filter - Active scope, `null` for "show all".
 * @returns `true` when the product should be rendered.
 */
export function matchesGender(productGender: GenderTag, filter: 'W' | 'M' | null): boolean {
  if (!filter) return true;
  if (productGender === 'U') return true;
  return productGender === filter;
}
