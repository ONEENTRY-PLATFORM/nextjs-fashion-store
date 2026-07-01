/**
 * Stores page + StoreCard UI copy.
 */
export const STORE_LOCATIONS_LABELS = {
  // Hero
  heroEyebrow: 'Visit Us In Store',
  heroTitle: 'Our Stores',
  heroSubtitleSuffix: 'locations across the UK — discover ONEENTRY FASHION in person.',
  heroImageAlt: 'ONEENTRY Fashion Store',
  // Breadcrumb
  breadcrumbHome: 'Home',
  breadcrumbCurrent: 'Store Locations',
  // Controls
  searchPlaceholder: 'Search by city or postcode…',
  cityAll: 'All',
  storesFoundSingular: 'store found',
  storesFoundPlural: 'stores found',
  // Empty state
  emptyHeading: 'No stores found',
  emptyHint: 'Try a different city or postcode.',
  clearFilters: 'Clear Filters',
  // Services strip
  allStoresOffer: 'All Stores Offer',
  services: [
    { icon: '👗', label: 'Try Before You Buy' },
    { icon: '📦', label: 'Click & Collect' },
    { icon: '↩️', label: 'Easy In-Store Returns' },
    { icon: '🎁', label: 'Gift Wrapping' },
  ] as const,
  // Flagship callout
  flagshipEyebrow: 'Flagship Experience',
  flagshipName: 'Oxford Street',
  flagshipImageAlt: 'Oxford Street Flagship',
  flagshipBody:
    'Our largest store across 3 floors. Book a free personal styling session with one of our expert stylists ' +
    "and discover the full ONEENTRY FASHION collection — women's, men's, and exclusive in-store edits.",
  flagshipDirections: 'Get Directions',
  flagshipBookStyling: 'Book Styling',
  // Bottom CTA
  shopOnlineCopy: "Can't make it in? Shop everything online with free UK delivery over £80.",
  shopOnlineCta: 'Shop Online',
  shopOnlineHref: '/women/clothing',
} as const;

export const STORE_CARD_LABELS = {
  flagshipBadge: 'FLAGSHIP',
  monSatSuffix: '(Mon–Sat)',
  directions: 'Directions',
  moreInfo: 'More Info',
  // Modal
  modalCloseLabel: 'Close',
  sectionLocation: 'Location',
  sectionHours: 'Opening Hours',
  sectionServices: 'In-Store Services',
  ctaGetDirections: 'Get Directions',
  ctaClose: 'Close',
} as const;
