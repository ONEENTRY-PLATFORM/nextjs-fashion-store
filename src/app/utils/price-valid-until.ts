/**
 * `priceValidUntil` for schema.org `Offer` JSON-LD.
 *
 * Google warns about `Offer` entries without it, but the storefront has no
 * per-product price expiry in OE — so we advertise a rolling window instead.
 * Kept in its own module because reading the clock is impure: calling
 * `Date.now()` straight inside a component body is what React's
 * `react-hooks/purity` rule flags, since render must be safe to re-run.
 *
 * @param [days] - Length of the validity window.
 * @returns `YYYY-MM-DD`, the format schema.org expects.
 */
export function priceValidUntil(days = 30): string {
  const ms = Date.now() + days * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().split('T')[0];
}
