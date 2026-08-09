import type { MetadataRoute } from 'next';

import { PWA_MANIFEST_COPY, SITE_DESCRIPTION, SITE_NAME } from '@/app/data/seoData';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: PWA_MANIFEST_COPY.shortName,
    description: SITE_DESCRIPTION,
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
    categories: PWA_MANIFEST_COPY.categories,
  };
}
