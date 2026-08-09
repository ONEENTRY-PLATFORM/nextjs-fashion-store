import type { MetadataRoute } from 'next';

import { getSiteSettings } from '@/lib/oneentry/dictionary';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';

/**
 * Web app manifest.
 *
 * Async because the installed-app name and categories are editor-owned (OE
 * `site_settings`). The route sits outside `app/[locale]`, so it cannot read
 * root params and the locale is passed explicitly — an install banner is a
 * single per-origin artefact, so the default locale is the right one.
 *
 * @returns The manifest served at `/manifest.webmanifest`.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { brand, pwa } = await getSiteSettings(DEFAULT_LOCALE);
  return {
    name: brand.siteName,
    short_name: pwa.shortName,
    description: brand.siteDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#111111',
    orientation: 'portrait',
    // `/icons/icon-192.png` and `/icons/icon-512.png` are not in `public/`, and
    // a missing static file resolves to the not-found *page* — a 145 KB HTML
    // document served with a 200, which an install prompt cannot decode. The
    // committed SVG is scalable, so one entry covers every size.
    // TODO: ship the raster set (192/512, maskable) if the PWA install banner
    // is ever a priority — Android prefers PNG for the launcher icon.
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    categories: pwa.categories,
  };
}
