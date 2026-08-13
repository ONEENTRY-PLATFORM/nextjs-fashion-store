'use client';
import { trackActivityAction, type TrackActivityInput } from '@/lib/oneentry/activity/actions';

import { getOrCreateGuestId } from './guest-id';

// Fire-and-forget telemetry.
export function trackActivity(input: TrackActivityInput): void {
  const guestId = getOrCreateGuestId();
  void trackActivityAction(input, guestId).catch(() => {
    /* swallow */
  });
}
