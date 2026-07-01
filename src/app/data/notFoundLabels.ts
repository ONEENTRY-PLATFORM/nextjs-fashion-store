/**
 * 404 page UI copy.
 */
export const NOT_FOUND_LABELS = {
  largeNumberAria: '404',
  eyebrow: 'Error 404',
  heading: 'Page Not Found',
  body: "The page you're looking for doesn't exist or has been moved. Explore our collections instead.",
  ctaHome: 'Back to Home',
  ctaHomeHref: '/',
  ctaWomen: 'Women',
  ctaWomenHref: '/women/clothing',
  ctaMen: 'Men',
  ctaMenHref: '/men/clothing',
  trendingHeading: 'Trending Now',
  trendingLinks: [
    { label: 'New Arrivals', href: '/new' },
    { label: 'Sale', href: '/sale' },
    { label: 'Bags', href: '/women/bags' },
    { label: 'Shoes', href: '/women/shoes' },
    { label: 'Accessories', href: '/women/accessories' },
  ] as const,
} as const;
