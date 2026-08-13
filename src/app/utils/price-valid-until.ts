/** `priceValidUntil` for schema.org `Offer` JSON-LD. */
export function priceValidUntil(days = 30): string {
  const ms = Date.now() + days * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().split('T')[0];
}
