/**
 * Tiny dev-scoped logger for swallowed OneEntry loader errors.
 *
 * The loaders under `lib/oneentry` deliberately return `null` / `[]` on the
 * `catch` path so callers get a graceful empty state instead of a crash. That
 * defensive posture is right for production UX but leaves debuggers guessing
 * why an OE endpoint went quiet — the error object never reaches surface code.
 *
 * `logCaught` gives every catch a lightweight breadcrumb. It's a no-op in
 * production so we don't spam CloudWatch, and opt-in via `OE_LOG_CAUGHT=1`
 * (or `OE_PROFILE=1` — profiling already implies noisy logs). Development
 * mode logs by default so a broken loader shows up in the terminal.
 */
const explicitlyEnabled =
  process.env.OE_LOG_CAUGHT === '1' || process.env.OE_PROFILE === '1';
const enabled = explicitlyEnabled || process.env.NODE_ENV !== 'production';

export function logCaught(scope: string, err: unknown): void {
  if (!enabled) return;
  console.warn(`[oe] ${scope} swallowed:`, err);
}
