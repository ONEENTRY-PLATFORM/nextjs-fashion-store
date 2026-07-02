/**
 * Product detail page copy.
 * Delivery promises, common CTAs, accordion section titles.
 */

// Quick delivery snippets, the "Incl. VAT" note and other static rows are
// now driven by the `product-card` OE system-text set. Only the price-note
// fallback remains here for offline development.
export const PRODUCT_PRICE_NOTE = 'Incl. VAT · Free delivery from $100';

// Product detail accordion section titles. Per-item content (description body,
// delivery rows, care list) comes from OneEntry — the Specifications accordion
// is built dynamically from product attributes.
export const PRODUCT_ACCORDION_LABELS = {
  specificationsTitle: 'Product Specifications',
  descriptionTitle: 'Product Description',
  deliveryTitle: 'Delivery & Returns',
  careTitle: 'Care Instructions',
} as const;

export const PRODUCT_BREADCRUMB_LABELS = {
  // Visible breadcrumb segments — `Home` is the only static one; the rest are
  // derived from each product's OE category path at runtime.
  home: 'Home',
  back: 'Back',
  youMayAlsoLike: 'You May Also Like',
  viewAll: 'View All',
} as const;

export const PRODUCT_DEFAULTS = {
  fallbackName: 'Ribbed Cashmere Blend Knit Top',
  fallbackBrand: 'Kekimoro',
  fallbackPrice: 62.99,
  fallbackOriginalPrice: 89.99,
  fallbackColorName: 'Default',
  fallbackSize: 'One Size',
  saveToWishlist: 'Save to Wishlist',
  savedToWishlist: 'Saved to Wishlist',
} as const;


// Product detail action buttons
export const PRODUCT_ACTION_LABELS = {
  addToCart: 'Add to Cart',
  addedToCart: 'Added to Cart!',
  announceAddedToCart: (name: string) => `${name} added to cart`,
  outOfStock: 'Out of Stock',
  reserveInStore: 'Reserve in Store',
  inStock: 'In Stock',
  preOrder: 'Pre-order',
  preOrderButton: 'Pre-order',
  comingSoon: 'Coming soon',
  reviewsSuffix: 'reviews',
  skuLabel: 'SKU:',
  articleLabel: 'Article:',
  defaultSku: '2024-156-1',
  defaultArticle: 'OF-KW-156-BRG',
  bonusHeading: 'Earn 630 bonus points',
  bonusBody: 'Redeemable on your next order. Join Kekimoro Rewards for free.',
  colorLabel: 'Color:',
  outOfStockTitle: ' — Out of stock',
  sizeLabel: 'Size',
  sizeError: 'Please select a size',
  sizeGuide: 'Size Guide',
  storeAvailableIn: 'Available in store in',
  storeStockSuffix: '· S, M in stock today',
  defaultCities: ['London', 'Paris', 'Berlin', 'Madrid', 'Rome'] as const,
} as const;

// ─── ReserveInStoreModal ────────────────────────────────────────────────────
export const RESERVE_MODAL_LABELS = {
  title: 'Reserve in Store',
  closeLabel: 'Close',
  stockBadge: {
    in: 'In Stock',
    low: 'Low Stock',
    out: 'Out of Stock',
  } as const,
  stores: [
    { id: 1, name: 'Kekimoro – Oxford Street',  address: '312 Oxford St, London W1C 1JF',  stock: 'in'  as const },
    { id: 2, name: 'Kekimoro – Covent Garden',  address: '14 Long Acre, London WC2E 9LH',  stock: 'low' as const },
    { id: 3, name: 'Kekimoro – Westfield',      address: 'Ariel Way, London W12 7GF',      stock: 'in'  as const },
    { id: 4, name: 'Kekimoro – Canary Wharf',   address: 'Canada Square, London E14 5AH', stock: 'out' as const },
    { id: 5, name: "Kekimoro – King's Road",    address: "145 King's Rd, London SW3 5TX", stock: 'low' as const },
  ] as const,
  // Top blurb under header
  blurbPrefix: 'Reserve your item at a nearby store — free of charge. Your reservation is held for',
  blurbHoldDuration: '48 hours',
  blurbSuffix: '. Payment is made in store.',
  // Confirmation screen
  confirmedHeading: 'Reservation Confirmed',
  refPrefix: 'Ref:',
  receiptStore: 'Store',
  receiptAddress: 'Address',
  receiptSize: 'Size',
  receiptPickupBy: 'Pick-up by',
  receiptName: 'Name',
  confirmEmailedPrefix: 'A confirmation has been sent to',
  ctaDone: 'Done',
  // Form labels
  selectStore: 'Select a store',
  selectSize: 'Size',
  yourDetails: 'Your details',
  labelFirstName: 'First name',
  labelLastName: 'Last name',
  labelPhone: 'Phone number',
  labelEmail: 'Email address',
  labelPickup: 'Preferred pick-up date',
  placeholderFirstName: 'Jane',
  placeholderLastName: 'Doe',
  placeholderPhone: '+44 7700 900000',
  placeholderEmail: 'jane@email.com',
  termsPrefix: 'I understand my reservation will be held for',
  termsHold: '48 hours',
  termsSuffix: 'from confirmation. After this period the item may be released. Payment is made in store.',
  requiredFieldsNote: '* required fields',
  ctaReserve: 'Reserve',
  // Validation errors
  errorRequired: 'Required',
  errorInvalidPhone: 'Enter a valid phone number',
  errorInvalidEmail: 'Enter a valid email',
  errorMustAgree: 'You must agree to continue',
} as const;

// ─── WriteReviewModal ───────────────────────────────────────────────────────
export const WRITE_REVIEW_LABELS = {
  title: 'Share your thoughts',
  closeLabel: 'Close',
  emailBannerNote: 'TO EARN REWARDS POINTS, YOU MUST SUBMIT VIA THE AUTOMATIC REVIEW REQUEST EMAIL',
  submittedHeading: 'Review Submitted',
  submittedBody: 'Thank you! Your review is pending approval.',
  closeButton: 'Close',
  // Form
  rateLabel: 'Rate your experience',
  rateLabels: ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'] as const,
  writeReviewLabel: 'Write a review',
  writeReviewPlaceholder: 'Tell us what you like or dislike',
  headlineLabel: 'Add a headline',
  headlinePlaceholder: 'Summarize your experience',
  nameLabel: 'Your name',
  namePlaceholder: 'Jane D.',
  emailLabel: 'Your email',
  emailPlaceholder: 'jane@email.com',
  mediaLabel: 'Add media',
  mediaUpload: 'Upload photos or videos',
  mediaHint: 'Up to 10 images and 3 videos (max. file size 2 GB)',
  occasionLabel: 'What occasion did you buy this for?',
  occasionHint: 'Choose 1',
  requiredFieldsNote: '* required fields',
  ctaSend: 'Send',
  occasions: [
    'Going Out / Party Outfit',
    'Birthday Outfit',
    'Graduation Outfit',
    'Homecoming Outfit',
    'Prom Outfit',
    'Wedding / Engagement Outfit',
  ] as const,
} as const;

// ─── Product Reviews section ────────────────────────────────────────────────
export const PRODUCT_REVIEWS_LABELS = {
  heading: 'Customer Reviews',
  reviewsCountSuffix: 'reviews',
  writeReview: 'Write a Review',
  showAllPrefix: 'Show all',
  showAllSuffix: 'reviews',
  sizePrefix: 'Size:',
  helpfulPrefix: 'Helpful',
  helpfulMarkedAria: 'Marked as helpful',
  helpfulMarkAria: 'Mark as helpful',
} as const;

// ─── ProductGallery ─────────────────────────────────────────────────────────
export const PRODUCT_GALLERY_LABELS = {
  zoomHint: 'Click to zoom · Double-click for fullscreen',
} as const;

export const FULLSCREEN_VIEWER_LABELS = {
  closeAria: 'Close',
  photoPositionTpl: (current: number, total: number) => `${current + 1} / ${total}`,
  photoAltTpl: (name: string, current: number, total: number) =>
    `${name} – photo ${current + 1} of ${total}`,
} as const;

// ─── ProductSpecialOffers ───────────────────────────────────────────────────
export const SPECIAL_OFFERS_LABELS = {
  sectionTitle: 'Special Offers',
  limitedTime: 'Limited Time',
  bundleBadge: 'BUNDLE',
  bundlePrice: 'Bundle price',
  completeLook: 'Complete the Look',
} as const;

// ─── ProductShareDropdown ───────────────────────────────────────────────────
export const SHARE_DROPDOWN_LABELS = {
  triggerLabel: 'Share',
  copyLink: 'Copy link',
  linkCopied: 'Link copied!',
  facebook: 'Facebook',
  twitter: 'X (Twitter)',
  pinterest: 'Pinterest',
  whatsapp: 'WhatsApp',
  twitterShortName: 'X',
} as const;

// ─── RecentlyViewedSection ──────────────────────────────────────────────────
export const RECENTLY_VIEWED_LABELS = {
  eyebrow: 'Your History',
  heading: 'Recently Viewed',
} as const;

// ─── QuickViewSizeGuide ─────────────────────────────────────────────────────
export const SIZE_GUIDE_LABELS = {
  title: 'Size Guide',
  measurementsNote: 'All measurements are in centimeters (cm).',
  colHeaders: ['Size', 'Chest', 'Waist', 'Hips'] as const,
  tipNote: 'Tip: If you are between sizes, we recommend choosing the larger size.',
  rows: [
    { size: 'XS',  chest: '80–84',   waist: '60–64',  hips: '86–90'   },
    { size: 'S',   chest: '84–88',   waist: '64–68',  hips: '90–94'   },
    { size: 'M',   chest: '88–92',   waist: '68–72',  hips: '94–98'   },
    { size: 'L',   chest: '92–96',   waist: '72–76',  hips: '98–102'  },
    { size: 'XL',  chest: '96–100',  waist: '76–80',  hips: '102–106' },
    { size: 'XXL', chest: '100–104', waist: '80–84',  hips: '106–110' },
  ] as const,
} as const;

// ─── SizeGuideModal (product page) ──────────────────────────────────────────
export const SIZE_GUIDE_MODAL_LABELS = {
  title: 'Size Guide',
  measurementsNote: 'All measurements in inches. Model is 180cm and wearing size S.',
  colHeaders: ['Size', 'US', 'Bust', 'Waist', 'Hip'] as const,
  howToHeader: 'How to measure:',
  howToBody:
    'Bust — measure around the fullest part of your chest. ' +
    'Waist — measure around your natural waistline. ' +
    'Hip — measure around the fullest part of your hips.',
} as const;

/**
 * Quick View modal — fast preview from listing.
 */
export const QUICK_VIEW_LABELS = {
  closeLabel: 'Close',
  defaultBrand: 'Kekimoro',
  reviewsSuffix: 'reviews',
  badgeNewIn: 'NEW IN',
  badgeLowStock: 'LOW IN STOCK',
  colorLabel: 'Color:',
  colorSelected: 'Selected',
  colorNotSelected: 'Not selected',
  colorAriaPrefix: 'Color',
  colorOutOfStockAria: '(out of stock)',
  colorError: 'Please select a colour',
  sizeLabel: 'Select Size',
  sizeError: '— Please select a size',
  sizeGuideCta: 'Size Guide',
  viewFullDetails: 'View Full Details',
  buyNow: "Get It Before It's Gone",
  wishlistAdd: 'Add to wishlist',
  wishlistRemove: 'Remove from wishlist',
  thumbnailAltPrefix: 'View',
  sections: [
    {
      title: 'Description',
      content:
        'Elevate your wardrobe with this stunning piece. Crafted from premium materials with attention to detail, ' +
        'this item combines style and comfort for any occasion.',
    },
    {
      title: 'Size & Fit',
      content: "Model is 5'9\" and wears a size S. True to size fit. For a relaxed fit, we recommend sizing up.",
    },
    {
      title: 'Details',
      content: '100% Premium Cotton. Machine wash cold. Imported. Style #OE2024',
    },
    {
      title: 'Delivery & Returns',
      content: 'Free standard shipping on orders over $75. Express shipping available. Free returns within 30 days.',
    },
  ] as const,
} as const;
