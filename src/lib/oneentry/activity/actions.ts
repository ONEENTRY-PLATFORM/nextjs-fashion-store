/**
 * Visitor activity tracking (`UserActivity.trackUserActivity`).
 *
 * `UserActivity` is a session-scoped module: signed-in shoppers authenticate
 * with their bearer token, guests with `x-guest-id`. Per the MCP
 * `server-actions` rule both belong in the browser — the SDK singleton there
 * already carries whichever context applies, and a Server Action would have to
 * smuggle the session across the wire on every page view.
 */
import { getApiSafe, hasStoredSession, isError } from '../index';
import { se } from '../server-errors';

export type TUserActivityType =
  | 'product_view'
  | 'page_view'
  | 'category_view'
  | 'search'
  | 'product_add_to_cart'
  | 'product_remove_from_cart'
  | 'product_add_to_wishlist'
  | 'product_remove_from_wishlist'
  | 'product_purchase'
  | 'product_rating';

export interface TrackActivityInput {
  type: TUserActivityType;
  productId?: number;
  pageId?: number;
  categoryId?: number;
  query?: string;
  meta?: Record<string, unknown>;
}

/**
 * Record one activity event for the current visitor. Fire-and-forget on the
 * caller side: it reports `ok`/`error` but never throws.
 *
 * When the shopper is signed in the SDK sends the bearer token and OE drops
 * `x-guest-id` entirely; otherwise the anonymous id is installed on the
 * instance so the guest trail keeps aggregating under one record.
 * @param {TrackActivityInput} input     - Event type and its subject.
 * @param {string}             [guestId] - Anonymous visitor id for guests.
 * @returns {Promise<{ ok: true } | { ok: false; error: string }>} Outcome.
 */
export async function trackActivityAction(
  input: TrackActivityInput,
  guestId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const api = getApiSafe();
  if (!api) return { ok: false, error: await se('oneEntryEnvNotConfigured') };

  const signedIn = hasStoredSession();
  if (!signedIn) {
    if (!guestId) return { ok: false, error: await se('noAuthOrGuestId') };
    api.UserActivity.setGuestId(guestId);
  }

  try {
    const result = await api.UserActivity.trackUserActivity(input);
    if (isError(result)) {
      return { ok: false, error: result.message ?? await se('trackFailed') };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : await se('network') };
  }
}
