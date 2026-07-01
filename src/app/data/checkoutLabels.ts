/**
 * All checkout-flow UI copy (delivery + payment + summary + stepper).
 * Editable by content team; eventually will come from CMS.
 */

export const DELIVERY_METHOD_HOME_LABELS = {
  title: 'Home / Office Delivery',
  subtitle: '2–5 business days · Standard shipping',
  useDifferentAddress: 'Use a different address',
  useDifferentAddressHint: 'Enter a new delivery address',
  saveToProfile: 'Save this address to my profile',
  confirmAddress: 'Confirm Address',
  editAddress: 'Edit',
  newAddressHeading: 'New Address',
  deliveryDate: 'Delivery Date',
  deliveryTime: 'Delivery Time',
  // Address form
  labelFullName: 'Full Name',
  labelPhone: 'Phone',
  labelAddressLine1: 'Address Line 1',
  labelCity: 'City',
  labelPostalCode: 'Postal Code',
  labelInstructions: 'Special Instructions (optional)',
  placeholderFullName: 'Jane Smith',
  placeholderPhone: '+44 20 0000 0000',
  placeholderAddressLine1: 'Street name and number',
  placeholderCity: 'London',
  placeholderPostalCode: 'SW1A 1AA',
  placeholderInstructions: 'Gate code, floor, etc.',
} as const;

export const DELIVERY_METHOD_STORE_LABELS = {
  title: 'Store Pickup',
  subtitle: 'Ready within 2 hours · Try in store',
  selectStore: 'Select Store',
} as const;

export const DELIVERY_METHOD_LOCKER_LABELS = {
  title: 'Parcel Locker / Pickup Point',
  subtitle: '3–5 business days · Collect at your convenience',
  selectPoint: 'Select Pickup Point',
  pinHint: "You'll receive a PIN code by SMS when your parcel arrives.",
} as const;

export const GUEST_CONTACT_LABELS = {
  heading: 'Your Contact Details',
  defaultHint: "We'll use these to notify you when your order is ready.",
  storePickupHint: "We'll text and email you when your order is ready for pickup.",
  lockerHint: 'We need your phone for the locker PIN and email for the delivery receipt.',
  labelFullName: 'Full Name',
  labelPhone: 'Phone',
  labelEmail: 'Email',
  placeholderFullName: 'Jane Smith',
  placeholderPhone: '+44 20 0000 0000',
  placeholderEmail: 'jane@example.com',
} as const;

export const DELIVERY_PAGE_LABELS = {
  pageTitle: 'Delivery Method',
  backToCart: '← Back to Cart',
  continueToPayment: 'Continue to Payment',
} as const;

export const DELIVERY_SUMMARY_LABELS = {
  heading: 'Order Summary',
  qtyPrefix: 'Qty',
  sizePrefix: 'Size',
  promoCodeLabel: 'Promo Code',
  promoPlaceholder: 'Enter promo code',
  promoApply: 'Apply',
  promoInvalid: 'Invalid or expired code',
  discount: 'Discount',
  promo: 'Promo',
  delivery: 'Delivery',
  deliveryFree: 'Free',
  total: 'Total',
} as const;

export const ORDER_SUMMARY_LABELS = {
  heading: 'Order Summary',
  qtyPrefix: 'Qty',
  sizePrefix: 'Size',
  discount: 'Discount',
  delivery: 'Delivery',
  deliveryFree: 'Free',
  total: 'Total',
} as const;

export const PAYMENT_PARTS_LABELS = {
  cardNumber: 'Card Number',
  cardholderName: 'Cardholder Name',
  expiry: 'Expiry',
  cvv: 'CVV',
  placeholderCardNumber: '1234 5678 9012 3456',
  placeholderCardholder: 'Jane Smith',
  placeholderExpiry: 'MM/YY',
  placeholderCvv: '•••',
  encryptionNote: 'Your card details are encrypted and secure (CloudPayments)',
  qrScanHint: 'Scan with your banking app via Faster Payment System (FPS)',
  qrSecureNote: 'Instant & secure transfer',
  installmentsCount: 'Number of Installments',
  installmentsTrust: '0% interest · No hidden fees',
  installmentsMonthlyPrefix: '~$',
  installmentsMonthlySuffix: '/ month for',
  installmentsMonthsSuffix: 'months',
  installmentsMonthShort: 'mo',
} as const;

export const CHECKOUT_STEPPER_LABELS = {
  cart: 'Cart',
  delivery: 'Delivery',
  payment: 'Payment',
  confirmation: 'Confirmation',
} as const;
