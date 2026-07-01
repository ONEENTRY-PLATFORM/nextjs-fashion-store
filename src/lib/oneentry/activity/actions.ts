'use server';
import { cookies } from 'next/headers';

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
// the `oe_access` cookie, guests pass an `x-guest-id` that we mint client-side.
// Fire-and-forget on the caller side: this returns ok/error but never throws.
export async function trackActivityAction(
  input: TrackActivityInput,
  guestId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = process.env.ONEENTRY_URL;
  const appToken = process.env.ONEENTRY_TOKEN;
  if (!url || !appToken) return { ok: false, error: 'OneEntry env not configured' };

  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value ?? null;

  const headers: Record<string, string> = {
    'x-app-token': appToken,
    'content-type': 'application/json',
    accept: 'application/json',
  };
  if (access) headers.Authorization = `Bearer ${access}`;
  else if (guestId) headers['x-guest-id'] = guestId;
  else return { ok: false, error: 'No auth or guest id' };

  try {
    const res = await fetch(`${url}/api/content/user-activity/track`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
      cache: 'no-store',
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `HTTP ${res.status}${txt ? `: ${txt.slice(0, 200)}` : ''}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
