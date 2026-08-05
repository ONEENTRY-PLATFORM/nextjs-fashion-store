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
} as const;

// `PAYMENT_METHODS_COPY` was removed: `PaymentMethodsList` renders each
// account's own `title` / `description` from OE (`getPaymentAccountsAction`),
// so the local per-identifier copy had no reader and only invited drift
// between the storefront and the accounts configured in the admin panel.

export const WALLET_BUTTON_LABELS = {
  applePay: 'Pay with Apple Pay',
  googlePay: 'Pay with Google Pay',
} as const;
