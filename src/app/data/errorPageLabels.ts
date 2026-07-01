/**
 * Global Error page UI copy (app/error.tsx).
 */
export const ERROR_PAGE_LABELS = {
  heading: 'Something went wrong',
  body: "We couldn't load this page. Please try again or return to the homepage.",
  tryAgain: 'Try Again',
  goHome: 'Go Home',
  homeHref: '/',
  errorIdPrefix: 'Error ID:',
  supportPrefix: 'If this keeps happening, please',
  supportCtaText: 'contact support',
  supportEmail: 'support@oneentry.cloud',
} as const;

export const CHECKOUT_ERROR_LABELS = {
  heading: 'Checkout unavailable',
  body: 'There was a problem loading the checkout. Your cart has not been charged.',
  supportPrefix: 'Please try again or',
  supportCtaText: 'contact support',
  supportSuffix: 'if the issue persists.',
  supportEmail: 'support@oneentry.cloud',
  tryAgain: 'Try Again',
  backToCart: 'Back to Cart',
  cartHref: '/cart',
} as const;
