# PWA (Progressive Web App)

## 1. Overview

`new-shop-nextjs` ships a **minimal but real PWA**: a Web App Manifest, a custom-written Service Worker (no framework), and a working **offline fallback**. It is installable (the browser will offer "Add to Home Screen" once the icons issue below is fixed) and offline-capable for previously-visited pages and Next.js static chunks.

What is **NOT** implemented:

- No `next-pwa`, `serwist`, or `workbox` dependency — everything is hand-rolled. `package.json` and `next.config.*` contain no PWA build tooling.
- No **push notifications**. No FCM token registration. The OneEntry endpoint `/api/content/users/me/fcm-token/{token}` (preseeded permission id=49) is **not called** from anywhere in the codebase.
- No **`beforeinstallprompt` handler** / custom install UI. The app relies entirely on the browser's native install affordance.
- No runtime cache strategies for product images, fonts, or API calls beyond the two strategies described in §4.

Bottom line: this is a PWA in the sense Chrome Lighthouse would award an installability badge — manifest + service worker + start_url + icons + HTTPS — but the user-facing PWA feature surface (push, install nudge, background sync) is intentionally empty.

## 2. Manifest

Source: `/Users/Alexygen/Projects/HCMS/apps/new-shop-nextjs/app/manifest.ts` (Next.js dynamic manifest — served at `/manifest.webmanifest`).

```ts
{
  name: 'ONEENTRY Fashion',
  short_name: 'ONEENTRY',
  description: 'Premium fashion for men and women. ...',
  start_url: '/',
  display: 'standalone',          // launches without browser chrome
  background_color: '#ffffff',
  theme_color: '#111111',         // matches viewport.themeColor in app/layout.tsx:12
  orientation: 'portrait',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  ],
  categories: ['shopping', 'fashion', 'lifestyle'],
}
```

`viewport.themeColor: '#111111'` is also exported from `app/layout.tsx:9-13` so the browser address bar matches the manifest's `theme_color`.

## 3. Icons

⚠ **Critical inconsistency.** The manifest declares two PNG icons and `app/layout.tsx:52-61` declares three more (`/icons/icon-32.png`, `/icons/icon-192.png`, `/icons/apple-touch-icon.png`), but **none of these PNG files exist** under `public/icons/`. `public/icons/` only contains UI / payment / auth / social SVG sprites — no app icons at all.

What does exist:

- `app/icon.svg` — Next.js convention; auto-served as `/icon.svg` and used as favicon. A black 32×32 square with a white shopping-bag silhouette.
- `app/favicon.ico` — legacy favicon binary.
- `app/opengraph-image.tsx` — edge-runtime generated 1200×630 PNG for social previews (Twitter / OG). Unrelated to PWA install icons, but uses the same brand palette.

Fix needed: generate `icon-32.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` from `app/icon.svg` and drop them in `public/icons/`. Until then, install prompts on Android/Chrome will silently fail the icon check.

## 4. Service worker

Source: `/Users/Alexygen/Projects/HCMS/apps/new-shop-nextjs/public/sw.js` (61 lines, vanilla JS, no build step).

**Registration** — `src/app/components/ServiceWorkerRegistrar.tsx` (12 lines):

```tsx
'use client'
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
}, [])
```

Mounted globally by `src/app/components/Providers.tsx:46`, so registration runs on every page after hydration. Errors are swallowed (no toast, no logging).

**Lifecycle**:

| Event | Behaviour | Source |
|---|---|---|
| `install` | Opens `oe-store-v1` cache, pre-caches `/offline.html`, calls `self.skipWaiting()` | `sw.js:6-12` |
| `activate` | Deletes any cache whose name is not `oe-store-v1` or `oe-static-v1`, calls `self.clients.claim()` | `sw.js:15-23` |
| `fetch` | Two strategies (see below) | `sw.js:26-61` |

**Cache strategies**:

1. **Cache-first** for `/_next/static/*` (production only, dev hostnames `localhost` / `127.0.0.1` are skipped because Turbopack chunks change content without changing filename). Cache: `oe-static-v1`. — `sw.js:30-45`
2. **Network-first with offline fallback** for HTML navigation requests (`request.mode === 'navigate'`). On success, response is cloned into `oe-store-v1`. On failure, returns the cached `/offline.html`. — `sw.js:48-60`

All other requests (API, images, fonts, third-party) pass through without any SW involvement — no opinionated runtime cache.

**Update flow**: `skipWaiting()` + `clients.claim()` means a new worker takes control immediately on next page load. No update prompt is shown to the user. Cache version bump = manual edit of the two `*-v1` constants in `sw.js:1-2`.

## 5. Offline experience

Two offline pages exist — one for the SW, one for App Router:

| Path | Purpose |
|---|---|
| `public/offline.html` | **Static HTML page** pre-cached by the SW on install (`sw.js:9`). Inline CSS + inline `<script>`. Self-contained — no external assets. Shown when network is unreachable for HTML navigations. |
| `app/offline/page.tsx` | **App Router route** at `/offline`. React mirror of the static page, uses labels from `src/app/data/offlinePageLabels.ts`. Reachable while online (useful for design/QA). |

Both pages have identical behaviour:

- A 10-second countdown that auto-pings `/favicon.ico` (HEAD, `cache: 'no-store'`, 5 s abort). On success → `window.location.reload()`.
- A "Try Now" button that triggers the same check on demand.
- Listens for the `online` window event for an instant retry.
- Animated dots while checking; progress bar bar driven by the countdown.

**What is offline-capable**: previously-visited HTML pages (anything that hit the network-first branch), Next.js static chunks (`/_next/static/*` post-install). **What is not**: API responses, product images, OneEntry CMS calls, dynamic OG images — all bypass the SW entirely. The cart and favorites work offline only insofar as their state lives in Redux + Local Storage (see `./REDUX.md`).

See also `./pages/offline.md` for the page-spec describing visible labels.

## 6. Install prompt

**Not handled.** No `beforeinstallprompt` listener, no `deferredPrompt` state, no "Install app" CTA anywhere in the codebase (verified via grep across `src/` and `app/`). Users see only whatever the browser exposes natively (Chrome address-bar install icon on desktop, three-dot menu on Android).

## 7. Push notifications

**Not wired.** OneEntry exposes `POST /api/content/users/me/fcm-token/{token}` (preseeded permission id=49 — see `.claude/rules/generated/preseeded-entities.md`) for storing a Firebase Cloud Messaging token against the authenticated user. This codebase does not import `firebase/messaging`, does not call `Notification.requestPermission()`, and does not have a Firebase config. Push delivery is a manual opt-in feature that would need to be added.

## 8. Performance angle

The SW currently buys two narrow wins:

- **Repeat-visit static chunks** served from `oe-static-v1` cache, eliminating the network round-trip for `/_next/static/chunks/*.js`. Saves on cold-after-warm navigations.
- **Offline navigation fallback** so a flaky-mobile-network user sees a branded offline page instead of the browser's default "Site can't be reached".

It does **not**:

- Pre-cache fonts (Inter is loaded via `next/font` — already optimised).
- Pre-cache product images (would require knowing the URL pattern and a stale-while-revalidate strategy).
- Run any background sync, periodic sync, or push delivery.

If image / API caching is desired, the recommended approach is to switch to `serwist` (the maintained successor to `next-pwa`) rather than extending `sw.js` by hand.

## 9. Caveats

1. **Missing icon PNGs** (see §3) — the manifest will fail the installability audit until they're added.
2. **App Router + custom SW pitfall**: Next.js App Router does not ship a service worker. The hand-rolled `public/sw.js` works because Next.js serves everything in `public/` verbatim, but you lose the framework's build-time route precomputation. Any future addition that needs to know the route table (precaching `/cart`, `/account`, etc.) must duplicate the list in `sw.js`.
3. **`skipWaiting` + `clients.claim` without a refresh prompt** means an in-flight session can pick up a new worker mid-navigation. Acceptable for a small static asset cache; risky if you later add API caching with stale schemas.
4. **Dev hostname check** (`url.hostname === 'localhost' || '127.0.0.1'`) covers most dev cases but misses LAN IPs (`192.168.x.x`) and tunnels (`*.ngrok.io`). On those, you'll cache Turbopack chunks that mutate — clear `oe-static-v1` after stale-content symptoms.
5. **Cache versioning is manual**. Changing one CSS file requires bumping `oe-store-v1` / `oe-static-v1` strings in `sw.js`, otherwise the SW will keep serving stale shells.
6. The offline page checks `/favicon.ico` to detect connectivity. If the favicon ever lives behind auth or a CDN with caching headers that bypass the network check, the auto-reload will misfire.

## 10. File map

| File | Lines | Role |
|---|---|---|
| `/Users/Alexygen/Projects/HCMS/apps/new-shop-nextjs/app/manifest.ts` | 1-29 | Dynamic Web App Manifest |
| `/Users/Alexygen/Projects/HCMS/apps/new-shop-nextjs/app/layout.tsx` | 9-13, 52-61 | `viewport.themeColor`, icon metadata |
| `/Users/Alexygen/Projects/HCMS/apps/new-shop-nextjs/app/icon.svg` | 1-30 | Brand favicon SVG (Next.js convention) |
| `/Users/Alexygen/Projects/HCMS/apps/new-shop-nextjs/app/opengraph-image.tsx` | 1-30+ | Edge-rendered OG image (social previews, not PWA install) |
| `/Users/Alexygen/Projects/HCMS/apps/new-shop-nextjs/public/sw.js` | 1-61 | Service worker: install / activate / fetch |
| `/Users/Alexygen/Projects/HCMS/apps/new-shop-nextjs/public/offline.html` | 1-206 | Pre-cached offline fallback (SW-served) |
| `/Users/Alexygen/Projects/HCMS/apps/new-shop-nextjs/app/offline/page.tsx` | 1-end | App Router offline page (React mirror) |
| `/Users/Alexygen/Projects/HCMS/apps/new-shop-nextjs/src/app/components/ServiceWorkerRegistrar.tsx` | 1-12 | Client component that registers `/sw.js` |
| `/Users/Alexygen/Projects/HCMS/apps/new-shop-nextjs/src/app/components/Providers.tsx` | 11, 46 | Mounts `ServiceWorkerRegistrar` globally |
| `/Users/Alexygen/Projects/HCMS/apps/new-shop-nextjs/src/app/data/offlinePageLabels.ts` | — | Strings used by `app/offline/page.tsx` |
| `/Users/Alexygen/Projects/HCMS/apps/new-shop-nextjs/docs/pages/offline.md` | — | Page spec for `/offline` (visual / copy contract) |

## 11. Cross-references

- `./pages/offline.md` — visible-copy spec for the offline page (countdown UX, brand mark).
- `./ARCHITECTURE.md` — overall app architecture; the SW sits below the Next.js App Router.
- `./REDUX.md` — Local-Storage hydration (`loadCatalogFromStorage` in `Providers.tsx:38`) is the *de facto* offline data layer for cart/favorites/catalog state, complementing the SW's HTML-shell caching.
- OneEntry FCM endpoint (`/api/content/users/me/fcm-token/{token}`, preseeded permission 49) — referenced for completeness; not currently wired.
