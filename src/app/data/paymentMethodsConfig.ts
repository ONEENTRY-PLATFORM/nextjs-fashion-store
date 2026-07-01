/**
 * Payment-page UI strings. Keep these in one place so marketing/content
 * can edit method names, subtitles, and badges without touching React code.
 */

interface PaymentMethodCopy {
  title: string;
  subtitle: string;
  badge?: string;
  /** Expandable description shown below the radio when the method is active. */
  description?: string;
}

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

export const PAYMENT_METHODS_COPY: Record<string, PaymentMethodCopy> = {
  cash: {
    title: 'Cash Payment',
    subtitle: 'Pay in cash upon delivery',
    badge: 'COD',
    description: 'Please prepare the exact amount. Our courier accepts cash only for this option.',
  },
  'card-delivery': {
    title: 'Bank Card on Delivery',
    subtitle: 'Swipe your card when the order arrives',
    badge: 'COD',
    description: 'Our courier carries a POS terminal. Visa, Mastercard & Amex accepted.',
  },
  qr: {
    title: 'QR Payment (Faster Payment System)',
    subtitle: 'Scan & pay instantly from your banking app',
  },
  'apple-pay': {
    title: 'Apple Pay',
    subtitle: 'Pay with Face ID or Touch ID',
  },
  'google-pay': {
    title: 'Google Pay',
    subtitle: 'Fast checkout with your Google account',
  },
  'card-online': {
    title: 'Bank Card',
    subtitle: 'Visa, Mastercard, Amex — powered by CloudPayments',
  },
  installment: {
    title: 'Installment Payment',
    subtitle: 'Split into 3, 6, or 12 monthly payments · 0% interest',
    badge: '0%',
  },
} as const;

export const WALLET_BUTTON_LABELS = {
  applePay: 'Pay with Apple Pay',
  googlePay: 'Pay with Google Pay',
} as const;
