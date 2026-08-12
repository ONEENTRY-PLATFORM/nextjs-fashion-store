/**
 * Copy shared by this feature's components, overlaid by the OneEntry
 * dictionary at render time — see `src/lib/oneentry/labels/dict.ts`.
 */

/**
 * All checkout-flow UI copy (delivery + payment + summary + stepper).
 * Editable by content team; eventually will come from CMS.
 */

/** Badge rendered on every delivery-method card. */
export const DELIVERY_METHOD_SHARED_LABELS = {
  freeBadge: 'FREE',
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
