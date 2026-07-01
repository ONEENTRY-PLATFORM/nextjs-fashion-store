import type { MetadataRoute } from 'next';
import { SITE_NAME, SITE_DESCRIPTION, PWA_MANIFEST_COPY } from '../src/app/data/seoData';

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
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: PWA_MANIFEST_COPY.categories,
  };
}
