import { ImageResponse } from 'next/og';

import { OG_IMAGE } from '@/app/data/seoData';
import { getSiteSettings } from '@/lib/oneentry/dictionary';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';

// `alt` and `size` are route metadata Next reads statically — they cannot be
// awaited. The alt text an editor sets is applied where it is actually
// consumed, on the `openGraph.images` entry in the root layout; this one is the
// shipped default for the rare crawler that reads the file convention's own.
export const alt = OG_IMAGE.alt;
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height };
export const contentType = 'image/png';

/**
 * The site-wide share banner, rendered at request time from editor-owned copy
 * (OE `site_settings` → `Share image — …`). The route sits outside
 * `app/[locale]` and cannot read root params, so the default locale is used —
 * one banner per origin.
 *
 * @returns A 1200×630 PNG response.
 */
export default async function OgImage() {
  const { og } = await getSiteSettings(DEFAULT_LOCALE);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #111111 0%, #2d2d2d 50%, #111111 100%)',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}
    >
      {/* Decorative lines */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #c9a96e, #f0d08a, #c9a96e)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #c9a96e, #f0d08a, #c9a96e)',
        }}
      />

      {/* Logo / Brand name */}
      <div
        style={{
          fontSize: 80,
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-2px',
          marginBottom: 16,
        }}
      >
        {og.brand}
      </div>

      {/* Sub-label */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 300,
          color: '#c9a96e',
          letterSpacing: '12px',
          textTransform: 'uppercase',
          marginBottom: 40,
        }}
      >
        {og.subLabel}
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 20,
          color: '#aaaaaa',
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }}
      >
        {og.tagline}
      </div>
    </div>,
    { ...size },
  );
}
