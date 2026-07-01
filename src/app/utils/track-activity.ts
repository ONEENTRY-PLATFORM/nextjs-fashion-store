'use client';
import { trackActivityAction, type TrackActivityInput } from '../../lib/oneentry/activity/actions';
import { getOrCreateGuestId } from './guest-id';

// Fire-and-forget telemetry. Never throws — analytics must not break UX.
// Mints/reads `oe_guest_id` from localStorage so anonymous visitors get the
// same guest record across the whole session.
export function trackActivity(input: TrackActivityInput): void {
  const guestId = getOrCreateGuestId();
  void trackActivityAction(input, guestId).catch(() => { /* swallow */ });
}
