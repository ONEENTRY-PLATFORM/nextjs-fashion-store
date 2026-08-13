import type { MetadataRoute } from 'next';

import { getSiteSettings } from '@/lib/oneentry/dictionary';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';

/** Web app manifest. */
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
    // `/icons/icon-192.png` and `/icons/icon-512.png` are not in `public/`, and a missing static file resolves to the not-found *page*.
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
