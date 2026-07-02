import { ImageResponse } from 'next/og';
import { OG_IMAGE, OG_IMAGE_COPY } from '../src/app/data/seoData';

export const alt = OG_IMAGE.alt;
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
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
          {OG_IMAGE_COPY.brand}
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
          {OG_IMAGE_COPY.subLabel}
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
          {OG_IMAGE_COPY.tagline}
        </div>
      </div>
    ),
    { ...size }
  );
}
