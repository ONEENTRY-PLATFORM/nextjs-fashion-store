/** Visitor activity tracking (`UserActivity.trackUserActivity`). */
import { getApiSafe, hasStoredSession, isError } from '@/lib/oneentry/index';
import { se } from '@/lib/oneentry/server-errors';

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

/** Record one activity event for the current visitor. */
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
      return { ok: false, error: result.message ?? (await se('trackFailed')) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : await se('network') };
  }
}
