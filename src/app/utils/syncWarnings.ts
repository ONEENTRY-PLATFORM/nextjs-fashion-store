/**
 * Minimal warning helpers for Platform ↔ playground sync issues.
 *
 * The playground has no toast system today, so warnings go through
 * `console.warn` (visible in DevTools) plus a `window.dispatchEvent`
 * with a CustomEvent that a future toast container could subscribe to.
 *
 * Three failure modes are surfaced:
 *  - `unmapped`     — the playground product has no `cmsProductId`,
 *                     mutation is local-only.
 *  - `mutation`     — POST/DELETE returned an error, optimistic state
 *                     has been rolled back.
 *  - `connectivity` — the fetch itself failed (network down, CORS
 *                     misconfigured), local state preserved.
 */

export type SyncWarningKind = 'unmapped' | 'mutation' | 'connectivity';

/** Payload dispatched on `window` whenever a warning fires. */
export interface SyncWarningEventDetail {
  kind: SyncWarningKind;
  message: string;
  context?: Record<string, unknown>;
}

/** Custom-event name used for the optional toast container. */
export const SYNC_WARNING_EVENT = 'oe:sync-warning';

/**
 * Emit a sync warning. Safe to call from React render paths — never
 * throws, never blocks. Returns the event detail so unit tests can
 * assert on payload contents.
 */
export function emitSyncWarning(
  kind: SyncWarningKind,
  message: string,
  context?: Record<string, unknown>,
): SyncWarningEventDetail {
  const detail: SyncWarningEventDetail = { kind, message, context };
  console.warn(`[sync:${kind}] ${message}`, context ?? '');
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent<SyncWarningEventDetail>(SYNC_WARNING_EVENT, { detail }));
    } catch {
      // Browsers without CustomEvent constructor — ignore, console warning is enough.
    }
  }
  return detail;
}
