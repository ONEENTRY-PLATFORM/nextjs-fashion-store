# PWA (Progressive Web App)

## 1. Overview

`new-shop-nextjs` ships a **minimal but real PWA**: a Web App Manifest, a hand-written service worker (no framework), and a working **offline fallback**. It is installable and offline-capable for previously visited pages and Next.js static chunks.

What is intentionally **NOT** implemented:

- No `next-pwa`, `serwist`, `workbox` — everything is hand-rolled. `package.json` and `next.config.ts` contain no PWA build tooling.
- No **push notifications**. No FCM token registration. The OneEntry endpoint `POST /api/content/users/me/fcm-token/{token}` exists on the platform side (preseeded permission id=49) but is **not called** from any client code.
- No **`beforeinstallprompt` handler** / custom install UI — the app relies entirely on the browser's native install affordance.
- No runtime cache strategies for product images, fonts, or API calls beyond the two strategies described in §4.
- No **background sync** — offline cart edits are only visible until the browser is closed; they are pushed to OneEntry the next time the page comes online (via the debounced `syncCart` effect in `CartContext`).

Bottom line: this is a PWA in the sense Chrome Lighthouse awards an installability badge — manifest + service worker + start_url + icons + HTTPS — but the user-facing feature surface (push, install nudge, background sync) is deliberately empty.

## 2. Files

| File | Role |
|---|---|
| `app/manifest.ts` | Dynamic manifest emitted at `/manifest.webmanifest` |
| `public/sw.js` | Service worker source — precache list, install / activate / fetch handlers |
| `public/offline.html` | Static offline shell used by `sw.js` when a navigation fails |
| `public/icons/*.png` | Manifest icons (32, 192, 512, apple-touch-icon) |
| `app/icon.svg` / `app/favicon.ico` | Browser tab icons |
| `src/app/components/ServiceWorkerRegistrar.tsx` | Client-side SW registration (called from `<Providers>`) |
| `app/offline/page.tsx` | Client component rendering the offline UI shell |
| `src/app/data/offlinePageLabels.ts` | Copy for the offline page |

## 3. Manifest

`app/manifest.ts` returns a `MetadataRoute.Manifest`:

```ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kekimoro',
    short_name: 'Kekimoro',
    description: 'Kekimoro fashion storefront',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#111111',
    categories: ['shopping', 'fashion', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
    orientation: 'portrait',
  };
}
```

Served automatically by Next.js at `/manifest.webmanifest`. The `<link rel="manifest">` is emitted by the root `layout.tsx` metadata.

## 4. Service worker (`public/sw.js`)

61 lines, no framework, three strategies:

1. **On `install`** — precaches **only `/offline.html`** into `oe-store-v1` (`CACHE_NAME`); a second bucket `oe-static-v1` (`STATIC_CACHE`) is populated lazily on the fetch pass. Skip waiting.
2. **On `activate`** — clean up caches older than `oe-static-v1`. `clients.claim()`.
3. **On `fetch`**:
   - **Static assets (`/_next/static/*`)** — cache-first, unless the origin is `localhost` (dev builds should never cache stale chunks).
   - **Navigations** — network-first; on failure, respond with `/offline.html` from the precache.
   - **Everything else** — pass through to network (no cache).

The offline page ships as a static HTML shell so it works even when React fails to hydrate.

## 5. Registration

`src/app/components/ServiceWorkerRegistrar.tsx`:

```tsx
'use client';
import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.warn);
    }
  }, []);
  return null;
}
```

Mounted once inside `<Providers>` — see `src/app/components/Providers.tsx`.

## 6. Offline route

`app/offline/page.tsx` renders a client component with:

- Brand title.
- "You're offline" heading + explanation.
- Retry button that fires a `HEAD /favicon.ico` to test connectivity; on success reloads the requested route from history.
- Links to `/` and `/stores` for locally cached content.

Copy comes from `src/app/data/offlinePageLabels.ts` (fallback) or the CMS if a `pdp_offline_set` (or similar) attribute set is later added.

## 7. Cache versioning

Bump the cache name in `sw.js` (`oe-static-v1` → `v2`) when you change:

- The precache list.
- The offline-page HTML.
- Any strategy that could serve stale data.

The `activate` handler will delete old cache buckets on the next SW load.

## 8. Push notifications — future

To wire push:

1. Add `firebase` + `firebase/messaging` to `dependencies`.
2. Register FCM in `ServiceWorkerRegistrar` (or a new `PushRegistrar`).
3. On permission grant, POST the token to `/api/content/users/me/fcm-token/{token}` (behind the `oe_access` cookie).
4. Add a `sw.js` `push` handler that calls `self.registration.showNotification(...)`.

Not started.

## 9. Install prompt — future

The browser fires `beforeinstallprompt` when installability heuristics pass. To surface a custom "Install" button:

1. Listen for the event in a client component; call `preventDefault()` to hold onto it.
2. Show a CTA in the header / drawer.
3. On click, call `event.prompt()` and log the choice.

Not started.

## 10. Icon status

`public/icons/` contains `icon-32.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`. All are referenced by `manifest.ts`. Older doc revisions warned they were missing — they now exist.

## 11. Cross-references

- [ARCHITECTURE.md](./ARCHITECTURE.md) §6 — where PWA fits in the stack
- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) §12 — the un-wired FCM endpoint
- [pages/offline.md](./pages/offline.md) — offline page UI spec
