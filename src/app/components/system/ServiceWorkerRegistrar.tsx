'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker — in production only.
 *
 * Without the environment check the worker also installs under `next dev`,
 * where it intercepts navigations, stores them in `oe-store-v1` and can answer
 * a perfectly healthy dev server with `offline.html`. Worse, it outlives the
 * change: once installed it keeps serving until manually unregistered, so a
 * developer sees stale pages long after the tab that installed it is gone.
 *
 * An already-installed worker from a previous dev session is unregistered here
 * for the same reason — turning the check on would otherwise not undo it.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) void registration.unregister();
        })
        .catch(() => {});
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
