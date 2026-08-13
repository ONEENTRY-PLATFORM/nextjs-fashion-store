/** Gender scoping for the `/new` and `/sale` feeds. */

/** OE gender taxonomy value as carried by the adapted UI product. */
export type GenderTag = 'W' | 'M' | 'U' | '' | undefined;

/** Translate the `?gender=` query value into the OE taxonomy tag. */
export function genderFilterFromQuery(raw: string | null | undefined): 'W' | 'M' | null {
  if (raw === 'men') return 'M';
  if (raw === 'women') return 'W';
  return null;
}

/** Whether a product belongs in the currently scoped feed. */
export function matchesGender(productGender: GenderTag, filter: 'W' | 'M' | null): boolean {
  if (!filter) return true;
  if (productGender === 'U') return true;
  return productGender === filter;
}
