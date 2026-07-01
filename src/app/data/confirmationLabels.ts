/**
 * Post-purchase Confirmation page copy. Includes the three "what happens next"
 * info cards — those are pure content and are exactly what marketing edits.
 */

interface ConfirmationInfoCard {
  iconKey: 'mail' | 'package' | 'check';
  title: string;
  desc: string;
}

export const CONFIRMATION_LABELS = {
  heading: 'Order Confirmed!',
  subheading: "Thank you for your purchase. We're preparing your order now.",
  orderIdLabel: 'Order ID',
  itemsHeader: 'Your Items',
  totalPaid: 'Total Paid',

  // Loyalty
  loyaltyPrefix: 'You earned',
  loyaltyAmountSuffix: 'bonus points',
  loyaltySuffix: 'with this order!',

  // CTAs
  ctaPrimary: 'Continue Shopping',
  ctaPrimaryHref: '/',
  ctaSecondary: 'New Arrivals',
  ctaSecondaryHref: '/women/clothing',
} as const;

export const CONFIRMATION_INFO_CARDS: ConfirmationInfoCard[] = [
  {
    iconKey: 'mail',
    title: 'Confirmation Sent',
    desc: 'A receipt has been sent to your email address.',
  },
  {
    iconKey: 'package',
    title: 'Processing',
    desc: 'Your order is being picked and packed right now.',
  },
  {
    iconKey: 'check',
    title: 'Estimated Delivery',
    desc: '2–5 business days to your chosen address.',
  },
];
