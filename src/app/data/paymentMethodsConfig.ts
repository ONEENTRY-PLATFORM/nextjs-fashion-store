/**
 * Payment-page chrome strings — section headings, CTA, trust badges. Method
 * names and descriptions are not here: those belong to the OE payment
 * accounts and are rendered straight from `getPaymentAccountsAction`.
 *
 * Every entry below is read through `useT('checkout_payment', …)` with the
 * constant as the offline fallback.
 */
export const PAYMENT_PAGE_LABELS = {
  pageTitle: 'Payment Method',
  payOnDeliverySection: 'Pay on Delivery',
  onlinePrepaymentSection: 'Online Prepayment',
  orOnlinePrepayment: 'Or Online Prepayment',
  orderSummary: 'Order Summary',
  backToDelivery: '← Back to Delivery',
  /** "Place Order · $123.45" — total is appended at runtime. */
  placeOrderPrefix: 'Place Order',
  securityBadges: ['SSL Encrypted', 'PCI DSS Compliant', '3D Secure'] as const,
  /** Shown under a redirect-style method (Stripe) before the shopper leaves. */
  stripeRedirectHint: "You'll be redirected to the payment provider's secure checkout to complete the payment.",

  // Gift + summary rows and the bonus-spend control.
  freeGift: 'Free gift',
  giftFree: 'Free',
  loyaltyFallbackTier: 'Loyalty',
  discountSuffix: 'discount',
  promoPrefix: 'Promo',
  bonusesUsed: 'Bonuses used',
  useBonuses: 'Use bonuses',
  bonusAvailableSuffix: 'available',

  // Error banner copy.
  errorNoMethod: 'Please choose a payment method.',
  errorNoDelivery: 'Delivery details missing — please go back to delivery step.',
  errorRevalidate: 'Cart could not be re-validated. Please review your cart and try again.',
  errorStripeSession: 'Stripe session could not be created. Please try again or pick another payment method.',
  errorNoAccounts: 'Payment methods are unavailable right now. Please try again later.',
  // Appended when OE rejects a delivery-form value: the field it names was
  // filled in on the previous step, so that's where the fix has to happen.
  errorFieldHint: 'Please go back to the delivery step and correct that field.',
} as const;

// `PAYMENT_METHODS_COPY` was removed: `PaymentMethodsList` renders each
// account's own `title` / `description` from OE (`getPaymentAccountsAction`),
// so the local per-identifier copy had no reader and only invited drift
// between the storefront and the accounts configured in the admin panel.

export const WALLET_BUTTON_LABELS = {
  applePay: 'Pay with Apple Pay',
  googlePay: 'Pay with Google Pay',
} as const;
