// OneEntry marks anonymous traffic by the `x-guest-id` header. We mint one
// per browser and persist it in localStorage so cart/order/activity events
// from the same visitor all aggregate under the same guest record.

const KEY = 'oe_guest_id';

export function getOrCreateGuestId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const fresh = `guest-${crypto.randomUUID()}`;
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return undefined;
  }
}

export function readGuestId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return localStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
