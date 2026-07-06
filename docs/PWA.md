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

`app/manifest.ts` returns a `MetadataRoute.Manifest`. All copy is sourced from `src/app/data/seoData.ts` — the file has zero hardcoded strings:

| Field | Value | Source |
|---|---|---|
| `name` | `'Kekimoro'` | `SITE_NAME` |
| `short_name` | `'Kekimoro'` | `PWA_MANIFEST_COPY.shortName` |
| `description` | `'Premium fashion for men and women…'` | `SITE_DESCRIPTION` |
| `start_url` | `'/'` | literal |
| `display` | `'standalone'` | literal |
| `background_color` | `'#ffffff'` | literal |
| `theme_color` | `'#111111'` | literal — matches the ink used in offline shell + `<meta name="theme-color">` |
| `orientation` | `'portrait'` | literal |
| `categories` | `['shopping', 'fashion', 'lifestyle']` | `PWA_MANIFEST_COPY.categories` |
| `icons[0]` | `/icons/icon-192.png`, `192x192`, `image/png`, **`purpose: 'maskable'`** | literal |
| `icons[1]` | `/icons/icon-512.png`, `512x512`, `image/png`, **`purpose: 'any'`** | literal |

Note the split `purpose` flags: the 192px icon is `maskable` (safe-zone padded, used by Android launchers), the 512px icon is `any` (raw art, used everywhere else). There is intentionally no monochrome (`maskable any`) blend, no separate `apple-touch-icon` entry (Apple picks up `/icons/apple-touch-icon.png` via `layout.tsx` metadata, not the manifest), and no shortcuts / share_target / screenshots.

Served automatically by Next.js at `/manifest.webmanifest`. The `<link rel="manifest">` is emitted by the root `layout.tsx` metadata.

## 4. Service worker (`public/sw.js`)

62 lines, no framework, three strategies. Two cache buckets are declared at the top of the file:

- `CACHE_NAME = 'oe-store-v1'` — precache for the offline shell + runtime cache for successful HTML navigations.
- `STATIC_CACHE = 'oe-static-v1'` — cache-first bucket for immutable `/_next/static/*` chunks (content-hashed by the compiler).

Handlers:

1. **On `install`** — opens `oe-store-v1`, calls `cache.add(new Request('/offline.html', { cache: 'reload' }))` to bypass any HTTP cache, then `self.skipWaiting()`. `oe-static-v1` is created lazily on the first static-asset request.
2. **On `activate`** — enumerates `caches.keys()` and deletes any bucket whose name is **not** `oe-store-v1` **and** not `oe-static-v1`, then `self.clients.claim()`. Any older `v1` bucket you rename via version bump is swept on the next activation.
3. **On `fetch`** — three branches, checked in order:
   - **Dev-mode skip.** `isDev = url.hostname === 'localhost' || url.hostname === '127.0.0.1'` — both loopback aliases are treated as dev. In dev the static-asset branch is bypassed entirely so Turbopack chunks (whose content changes without a filename change) don't get pinned.
   - **`/_next/static/*` (production only).** Cache-first against `oe-static-v1`: return the cached response if present; otherwise `fetch`, and if `response.ok`, `cache.put(request, response.clone())` before returning.
   - **HTML navigations (`request.mode === 'navigate'`).** Network-first: `fetch` → on `response.ok`, clone into `oe-store-v1`; on network error, fall back to `caches.match('/offline.html')` (guaranteed to hit because of the install-time precache).
   - **Everything else** (subresource images, API, fonts, third-party) — the fetch handler simply `return`s and lets the browser go to network. No SW-side caching.

`public/offline.html` ships as a standalone static HTML shell (self-contained CSS + inline JS) so it renders even when React never hydrates. A React twin lives at `app/offline/page.tsx` and is used only when the app navigates to `/offline` from an online context (label sourced from CMS via `useInterfaceControlsT`). The SW never opens the React route — it always returns the static `public/offline.html` from the precache.

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

There are **two** offline UIs. They render identically by design; the split exists because the SW needs a zero-dependency asset:

| File | Rendered by | Purpose |
|---|---|---|
| `public/offline.html` | Service worker `caches.match('/offline.html')` fallback | Zero-JS-framework HTML shell served when a navigation fails. Cached at `install`. |
| `app/offline/page.tsx` | Next.js client route (when app is online, e.g. explicit link) | React twin, sources copy from CMS via `useInterfaceControlsT(marker, fallback)`. |

Both variants implement the **same ping-based retry** pattern:

- Ping target: `HEAD /favicon.ico` with `cache: 'no-store'` and a `5000 ms` `AbortController` timeout.
- Countdown: `CHECK_INTERVAL = 10` seconds. On `0` the ping fires automatically.
- Manual `Try Now` button reuses the same handler and is disabled while a ping is in-flight.
- `window.addEventListener('online', ...)` triggers an immediate ping when the browser flips back online.
- On `res.ok`, `window.location.reload()` returns the user to the page they were trying to reach.

`/favicon.ico` was chosen because it's static, tiny, always-cached at the origin, and its `HEAD` is a reliable liveness probe without hitting any RSC/API surface.

CMS-driven labels (React variant only): `offline_title_store`, `offline_title`, `offline_text`, `offline_next_check`, `offline_cta`, `offline_text_below` — all read via `InterfaceControlsLabelsContext`. Static fallbacks live in `src/app/data/offlinePageLabels.ts`.

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
