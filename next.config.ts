import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: '/images/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
  images: {
    // OE CDN already serves reasonably-sized preview JPEGs, and the
    // `/_next/image` optimization proxy on this deployment was aborting a
    // significant fraction of concurrent requests (client-side
    // ERR_ABORTED). Serving the CDN URLs directly is faster in practice
    // and removes an entire failure surface. `remotePatterns` stays for
    // completeness in case any component opts back into optimization via
    // `unoptimized={false}`.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.oneentry.cloud',
      },
    ],
  },
}

export default nextConfig
