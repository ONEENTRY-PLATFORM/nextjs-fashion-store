'use server';
import { cookies } from 'next/headers';
import { getGuestApi, getUserApi, isError, isOneEntryEnabled } from '../index';

const ACCESS_COOKIE = 'oe_access';

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

// Records an event for the current visitor — signed-in users authenticate via
// the `oe_access` cookie, guests pass an `x-guest-id` that we mint client-side
// and thread through `getGuestApi(guestId)` (fresh SDK instance) so the
// header rides along on the SDK's own outgoing request.
// Fire-and-forget on the caller side: this returns ok/error but never throws.
export async function trackActivityAction(
  input: TrackActivityInput,
  guestId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isOneEntryEnabled) return { ok: false, error: 'OneEntry env not configured' };

  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value ?? null;

  try {
    if (access) {
      const api = getUserApi(access);
      if (!api) return { ok: false, error: 'OneEntry SDK not initialised' };
      const result = await api.UserActivity.trackUserActivity(input);
      if (isError(result)) {
        return { ok: false, error: result.message ?? 'Track failed' };
      }
      return { ok: true };
    }
    if (guestId) {
      const api = getGuestApi(guestId);
      if (!api) return { ok: false, error: 'OneEntry SDK not initialised' };
      const result = await api.UserActivity.trackUserActivity(input);
      if (isError(result)) {
        return { ok: false, error: result.message ?? 'Track failed' };
      }
      return { ok: true };
    }
    return { ok: false, error: 'No auth or guest id' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
