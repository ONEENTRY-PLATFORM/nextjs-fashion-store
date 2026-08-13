/** Tiny dev-scoped logger for swallowed OneEntry loader errors. */
const explicitlyEnabled = process.env.OE_LOG_CAUGHT === '1' || process.env.OE_PROFILE === '1';
const enabled = explicitlyEnabled || process.env.NODE_ENV !== 'production';

export function logCaught(scope: string, err: unknown): void {
  if (!enabled) return;
  console.warn(`[oe] ${scope} swallowed:`, err);
}
