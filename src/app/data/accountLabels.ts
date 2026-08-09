/**
 * Account area UI copy: section titles, banners, form labels, status configs.
 * Editable by content team.
 */
import { CURRENCY } from './currencyConfig';

// ─── Shared account section widgets ─────────────────────────────────────────
export const ACCOUNT_SHARED_LABELS = {
  edit: 'Edit',
  emptyValueDash: '—',
} as const;

// ─── Loyalty card widget ────────────────────────────────────────────────────
export const LOYALTY_CARD_LABELS = {
  loyaltyStatus: 'Loyalty Status',
  discount: 'Discount',
  bonuses: 'Bonuses',
  perkDiscountTpl: (pct: number) => `${pct}% off every order`,
  perkPlaceholder: 'Discount on every order',
  purchasesPrefix: 'Purchases:',
  nextLevelPrefix: 'Next level at',
  moreToTierTpl: (left: string, tier: string) => `${left} more to ${tier} status`,
  highestTier: 'You have reached the highest tier',
  perks: {
    // Entry-level for shoppers who haven't yet unlocked a paid tier.
    // Intentionally soft — no discount, just the account basics.
    Member: ['Save items to your wishlist', 'Order history at your fingertips', 'Personalised recommendations'],
    // First bullet on paid tiers is `perkPlaceholder` on purpose — the
    // LoyaltyCard swaps it for `${pct}% off every order` at render time,
    // reading the real percentage from OE (`Discounts.marker.<tier>`).
    // Hardcoding "5% off" here made every Bronze member look 5% regardless
    // of what the merchant actually configured.
    Bronze: ['Discount on every order', 'Free standard returns', 'Early access to sales'],
    Silver: ['Discount on every order', 'Free returns & exchanges', 'Priority customer support'],
    Gold: ['Discount on every order', 'Free express delivery', 'Dedicated personal stylist'],
    Platinum: ['Discount on every order', 'Same-day delivery', 'Exclusive VIP events & previews'],
  } as Record<string, readonly string[]>,
  tierOrder: ['Member', 'Bronze', 'Silver', 'Gold', 'Platinum'] as const,
} as const;

export const ACCOUNT_PAGE_LABELS = {
  pageTitle: 'My Account',
  signInPrompt: 'Please sign in to view your account',
  signInCta: 'Sign In',
  welcomeBack: 'Welcome back',
  signOut: 'Sign Out',
} as const;

// ─── Sidebar / section names ────────────────────────────────────────────────
export const ACCOUNT_SECTION_TITLES = {
  myData: 'My Data',
  myOrders: 'My Orders',
  bonuses: 'My Bonuses',
  wishlist: 'My Wishlist',
  waitingList: 'Waiting List',
  history: 'Purchase History',
  service: 'Service Maintenance',
  refer: 'Refer a Friend',
  feedback: 'Feedback',
  subscriptions: 'Subscription Management',
} as const;

// ─── My Data → Personal Info section ────────────────────────────────────────
export const PERSONAL_INFO_LABELS = {
  title: 'Personal Information',
  labelFirstName: 'First Name',
  labelEmail: 'Email',
  labelPhone: 'Phone',
  labelDob: 'Date of Birth',
  labelShoeSize: 'Shoe Size',
  labelClothingSize: 'Clothing Size',
  labelGender: 'Gender',
  placeholderFirstName: 'Jane',
  placeholderEmail: 'you@example.com',
  placeholderPhone: '+44 20 0000 0000',
  placeholderShoeSize: '38',
  placeholderClothingSize: 'S',
  saveChanges: 'Save Changes',
  cancel: 'Cancel',
  fieldName: 'Name',
  fieldEmail: 'Email',
  fieldPhone: 'Phone',
  fieldDob: 'Date of Birth',
  fieldGender: 'Gender',
  fieldShoeSize: 'Shoe Size',
  fieldClothingSize: 'Clothing Size',
  fieldGenderFemale: 'Female',
  fieldGenderMale: 'Male',
  fieldEmpty: '—',
} as const;

// ─── My Data → Password section ─────────────────────────────────────────────
export const PASSWORD_LABELS = {
  title: 'Password',
  currentPassword: 'Current Password',
  newPassword: 'New Password',
  confirmNewPassword: 'Confirm New Password',
  newPlaceholder: 'Min. 8 characters',
  confirmPlaceholder: 'Repeat password',
  currentPlaceholder: '••••••••',
  maskedDisplay: '••••••••••••',
  errorMismatch: 'Passwords do not match.',
  errorTooShort: 'Password must be at least 8 characters.',
  successMessage: 'Password updated successfully!',
  save: 'Save',
  cancel: 'Cancel',
} as const;

// ─── My Data → Addresses section ────────────────────────────────────────────
export const ADDRESSES_LABELS = {
  title: 'My Addresses',
  addAddress: 'Add Address',
  newAddressHeading: 'New Address',
  editAddressHeading: 'Edit Address',
  save: 'Save',
  add: 'Add',
  cancel: 'Cancel',
  errorRequired: 'Required',
  errorInvalidPhone: 'Enter a valid phone number',
  labelLabel: 'Label (e.g. Home, Office)',
  labelFullName: 'Full Name',
  labelPhone: 'Phone',
  labelAddressLine1: 'Address Line 1',
  labelCity: 'City',
  labelPostalCode: 'Postal Code',
  labelInstructions: 'Special Instructions (optional)',
  placeholderLabel: 'Home',
  placeholderFullName: 'Jane Smith',
  placeholderPhone: '+44 20 0000 0000',
  placeholderAddressLine1: 'Street name and number',
  placeholderCity: 'London',
  placeholderPostalCode: 'SW1A 1AA',
  placeholderInstructions: 'Gate code, floor, etc.',
} as const;

// ─── My Data → Social Networks section ──────────────────────────────────────
export const SOCIAL_NETWORKS_LABELS = {
  title: 'Connected Social Accounts',
  connectedBadge: 'Connected',
  connect: 'Connect',
  disconnect: 'Disconnect',
  errorConnect: 'Failed to connect Google',
  loading: 'Loading…',
  emptyProviders: 'No social sign-in providers configured.',
  comingSoon: 'Coming soon',
} as const;

// ─── My Data → Consent section ──────────────────────────────────────────────
export const CONSENT_LABELS = {
  title: 'Personal Data Consent',
  consentDataProcessing: 'Consent for personal data processing',
  consentCrossBorder: 'Consent for cross-border data transfer',
  revokeWarning:
    'If you revoke consent for personal data processing, your account will be scheduled for deletion within 30 days. ' +
    'This action cannot be undone.',
} as const;

// ─── My Data → Account Deletion section ─────────────────────────────────────
export const ACCOUNT_DELETION_LABELS = {
  title: 'Account Deletion',
  warningTitle: 'Warning: This action is permanent',
  warningPoints: [
    'Your loyalty card will be permanently blocked',
    'All discounts and bonuses will be reset to zero',
    'Service maintenance access will be revoked',
    'Your card cannot be restored after deletion',
  ] as readonly string[],
  supportLabel: 'For assistance, call us at',
  supportPhone: '+44 20 7946 0958',
  ctaDelete: 'Delete Account',
  confirmHeading: 'Are you absolutely sure?',
  ctaConfirmDelete: 'Yes, Delete My Account',
  ctaCancel: 'Cancel',
} as const;

// ─── My Orders section ──────────────────────────────────────────────────────
export const MY_ORDERS_LABELS = {
  title: 'My Orders',
  emptyText: 'You have no orders yet.',
  emptyCta: 'Start Shopping',
  emptyCtaHref: '/women/clothing',
  orderId: 'Order ID',
  datePlaced: 'Date Placed',
  status: 'Status',
  tracking: 'Tracking',
  estDelivery: 'Est. Delivery',
  itemSize: 'Size',
  itemColour: 'Colour',
  itemQty: 'Qty',
  orderTotal: 'Order Total',
  fullHistory: 'Full History →',
  reorder: 'Reorder',
  viewOrderDetails: 'View Order Details',
  hideDetails: 'Hide Details',
  itemSingular: 'item',
  itemPlural: 'items',
  statusDelivered: 'Delivered',
  statusProcessing: 'Processing',
  statusCancelled: 'Cancelled',
  cancelDialogTitle: 'Cancel order',
  cancelDialogQuestionPrefix: 'Do you want to cancel order',
  cancelDialogQuestionSuffix: '?',
  cancelDialogNo: 'No',
  cancelDialogConfirm: 'Confirm',
} as const;

// ─── Bonuses section ────────────────────────────────────────────────────────
export const BONUSES_LABELS = {
  title: 'My Bonuses',
  availableBonuses: 'Available Bonuses',
  discountLevel: 'Discount Level',
  transactionHistory: 'Bonus Transaction History',
  emptyHistory: 'No bonus transactions yet.',
  /** OE bonus-transaction type → shopper-facing wording. */
  typeAccrual: 'Earned',
  typeReversalUsage: 'Refunded',
  typeUsage: 'Spent on order',
  typeReduce: 'Adjustment',
  typeReversalAccrual: 'Accrual reversed',
  typeExpiration: 'Expired',
} as const;

// ─── History section ────────────────────────────────────────────────────────
export const HISTORY_LABELS = {
  title: 'Purchase History',
  eyebrow: 'Transaction Record',
  bannerHeading: 'Your Orders',
  totalOrders: 'Total Orders',
  delivered: 'Delivered',
  totalSpent: 'Total Spent',
  filterAll: 'All',
  emptyText: 'No orders match this filter.',
  rowOrder: 'Order',
  rowDate: 'Date',
  rowItems: 'Items',
  rowTotal: 'Total',
  itemSingular: 'item',
  itemPlural: 'items',
  trackPrefix: 'Order',
  trackHeading: 'Track Your Parcel',
  trackCarrierLabel: 'Carrier',
  trackCarrierName: 'Royal Mail Tracked',
  trackingNumber: 'Tracking Number',
  copy: 'Copy',
  trackInstructions:
    'To track your parcel, visit the Royal Mail website and enter your tracking number, ' +
    'or click the button below to open the tracking page directly.',
  trackCta: 'Track on Royal Mail',
  reorder: 'Reorder',
  reorderDone: 'Done',
  orderTotal: 'Order Total',
  itemSize: 'Size',
  itemColourPrefix: 'Colour:',
  itemQtyPrefix: 'Qty:',
  trackingPrefix: 'Tracking:',
  viewBtn: 'View',
  trackTitleTpl: (trackingNo: string) => `Track: ${trackingNo}`,
  statuses: {
    delivered: 'Delivered',
    shipped: 'Shipped',
    processing: 'Processing',
    cancelled: 'Cancelled',
    returned: 'Returned',
  } as const,
} as const;

// ─── Service Maintenance section ────────────────────────────────────────────
export const SERVICE_LABELS = {
  title: 'Service Maintenance',
  eyebrow: 'Care & Repair',
  bannerHeading: 'Your Requests',
  statActive: 'Active',
  statCompleted: 'Completed',
  statTotalSpent: 'Total Spent',
  newRequest: 'New Request',
  cancel: 'Cancel',
  filterAll: 'All',
  emptyFiltered: 'No requests match this filter.',
  formHeading: 'Submit a Service Request',
  successMessage: "Request submitted! We'll be in touch shortly.",
  labelItem: 'Item Name *',
  placeholderItem: 'e.g. Tailored Trench Coat',
  labelServiceType: 'Service Type *',
  labelDate: 'Preferred Drop-off Date',
  labelDescription: 'Description *',
  placeholderDescription: 'Describe the issue or alteration needed…',
  submitButton: 'Submit Request',
  progressLabel: 'Progress',
  fieldDroppedOff: 'Dropped Off',
  fieldEstReady: 'Est. Ready',
  fieldServiceType: 'Service Type',
  fieldCost: 'Cost',
  fieldRef: 'Ref',
  fieldType: 'Type',
  fieldItem: 'Item',
  costTbc: 'TBC',
  requestDetails: 'Request Details',
  howItWorks: 'How It Works',
  // Flat, not an array of objects: `mergeDict` overlays strings only, so a
  // nested step would stay frozen in code. The `NN` is the rendered badge and
  // stays here — it is a number, not copy.
  howStep1Title: 'Submit Request',
  howStep1Body: 'Tell us what your item needs — alteration, repair, cleaning or restoration.',
  howStep2Title: 'Drop Off',
  howStep2Body: 'Bring your item to any Kekimoro store with your confirmation reference.',
  howStep3Title: 'We Get to Work',
  howStep3Body: 'Our specialist technicians assess and complete your service request.',
  howStep4Title: 'Collect',
  howStep4Body: "You'll be notified when ready. Collect in-store or request delivery.",
  statuses: {
    open: 'Open',
    'in-progress': 'In Progress',
    ready: 'Ready',
    completed: 'Completed',
    cancelled: 'Cancelled',
  } as const,
  categoryLabels: {
    alteration: 'Alteration',
    repair: 'Repair',
    cleaning: 'Cleaning',
    restoration: 'Restoration',
    other: 'Other',
  } as const,
  loadingAria: 'Loading service requests',
} as const;

// ─── Feedback section ───────────────────────────────────────────────────────
export const FEEDBACK_LABELS = {
  title: 'Feedback',
  eyebrow: 'Your Voice Matters',
  bannerHeading: 'Share Your Experience',
  bannerHint: 'Help us improve by telling us what went well and what we can do better.',
  ratingLabel: 'Overall Rating',
  requiredMark: '*',
  starAriaPrefix: 'Rate',
  starAriaSuffix: 'stars',
  rating: {
    1: 'Very Dissatisfied',
    2: 'Dissatisfied',
    3: 'Neutral',
    4: 'Satisfied',
    5: 'Very Satisfied',
  } as Record<number, string>,
  categories: [
    'Product Quality',
    'Delivery',
    'Customer Service',
    'Website Experience',
    'Returns & Refunds',
    'Other',
  ] as const,
  labelCategory: 'Feedback Category',
  labelOrder: 'Related Order',
  optionalSuffix: '(optional)',
  placeholderOrder: 'Select an order…',
  labelMessage: 'Your Message',
  messageHint: 'Please describe your experience in detail. Minimum 20 characters.',
  placeholderMessage: 'Tell us what you loved or what we can improve…',
  charsNeededTpl: 'more characters needed',
  charsCounterTpl: '/ 500',
  howStep1Title: 'Rate Your Experience',
  howStep1Desc: 'Give a star rating that reflects your overall satisfaction.',
  howStep2Title: 'Choose a Category',
  howStep2Desc: 'Help us route your feedback to the right team.',
  howStep3Title: 'We Take Action',
  howStep3Desc: 'Our team reviews every submission and improves accordingly.',
  submit: 'Submit Feedback',
  requiredNote: 'Required fields',
  thankTitle: 'Thank You!',
  thankBody: 'Your feedback has been submitted. We truly appreciate you taking the time to share your experience.',
  submitAnother: 'Submit Another',
} as const;

// ─── Refer a Friend section ─────────────────────────────────────────────────
export const REFER_LABELS = {
  title: 'Refer a Friend',
  eyebrow: 'Exclusive Offer',
  bannerHeadingTpl: (amount: string) => `Give ${amount}, Get ${amount}`,
  bannerBodyPrefix: 'Invite a friend to KEKIMORO. When they place their first order, you both receive a ',
  // The currency symbol is not copy — it is rendered from the configured
  // currency at the call site, so a shop that switches to € does not have to
  // remember to reword this label too.
  bannerBodyCreditSuffix: ' store credit',
  bannerBodySuffix: '.',
  perReferral: 'per referral',
  // The `statFriendsInvited` / `statOrdersPlaced` / `statCreditsEarned` labels
  // were dropped with the stats row they titled: nothing on this tenant counts
  // referrals, so the row could only render fixed zeros.
  // Link
  linkLabel: 'Your Referral Link',
  copyLink: 'Copy Link',
  copied: 'Copied!',
  // Code
  codeLabel: 'Your Referral Code',
  copyCode: 'Copy Code',
  // Email
  orInviteEmail: 'or invite by email',
  emailLabel: 'Invite via Email',
  emailHint: 'Enter one or more email addresses, separated by commas.',
  emailPlaceholder: 'friend@example.com, another@example.com',
  emailCta: 'Send Invitations',
  emailSent: 'Invitations Sent!',
  // How it works
  howItWorks: 'How It Works',
  // Flat strings so the dictionary can reach them. The third step needs the
  // credit amount, which an admin-authored value cannot interpolate — hence a
  // `%amount%` placeholder filled by `fillTokens` at render time.
  howStep1Title: 'Share Your Link',
  howStep1Desc: 'Send your unique referral link or code to friends and family.',
  howStep2Title: 'Friend Signs Up',
  howStep2Desc: 'Your friend creates an account and places their first order.',
  howStep3Title: 'Both Get %amount%',
  howStep3Desc: 'You receive %amount% store credit. Your friend gets %amount% off their order.',
  // Terms
  termsTpl: (minPurchase: number, months: number) =>
    `* Store credit is applied after the referred friend completes their first purchase of ${CURRENCY.formatInteger(minPurchase)} or more. ` +
    `Credits expire ${months} months after being issued. Cannot be combined with other promotional offers.`,
} as const;

// ─── Wishlist section ───────────────────────────────────────────────────────
export const WISHLIST_LABELS = {
  title: 'Wishlist',
  emptyText: 'Your wishlist is empty',
  emptyCta: 'Browse Collection',
  emptyCtaHref: '/women/clothing',
  saleBadge: 'SALE',
} as const;

// ─── Waiting List section ───────────────────────────────────────────────────
export const WAITING_LIST_LABELS = {
  title: 'Waiting List',
  bannerEyebrow: 'Never Miss Out',
  bannerHeading: 'Your Saved Items',
  bannerHint: "We'll notify you when these items are back in stock or drop in price.",
  filterBackInStock: 'Back in stock',
  filterPriceDrop: 'Price drop',
  filterArrivingSoon: 'Arriving soon',
  statuses: {
    back_in_stock: 'Back in Stock',
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
  },
  emptyText: "Your waiting list is empty. Browse our store and save items to be notified when they're back in stock.",
  viewProductPrefix: 'View product:',
  sizeLabel: 'Size:',
  colourLabel: 'Colour:',
  addedPrefix: 'Added',
  notifyEnableAria: 'Enable notifications for',
  notifyDisableAria: 'Disable notifications for',
  removeAriaPrefix: 'Remove',
  removeAriaSuffix: 'from waiting list',
  ctaAdded: 'Added',
  ctaUnavailable: 'Unavailable',
  ctaAddToCart: 'Add to Cart',
  howSteps: [
    {
      step: '01',
      title: 'Save Your Size',
      desc: 'Add sold-out items to your waiting list with your preferred size and colour.',
    },
    {
      step: '02',
      title: 'Get Notified',
      desc: 'Toggle the bell icon to receive alerts the moment stock is replenished.',
    },
    {
      step: '03',
      title: 'Shop First',
      desc: 'Waiting list members get early access before items go back on general sale.',
    },
  ] as const,
  loadingAria: 'Loading waiting list',
} as const;

// ─── Subscriptions section ──────────────────────────────────────────────────
/**
 * Flat on purpose. `mergeDict` overlays **string** entries only — a nested
 * `{label, desc}` pair is structure to it and would stay frozen in code, which
 * is exactly how these seven rows ended up un-editable. Flattening them to
 * `<key>Label` / `<key>Desc` puts every string back under the convention:
 * `subscription_management_email_newsletter_label`, and so on.
 */
export const SUBSCRIPTIONS_LABELS = {
  title: 'Subscription Management',
  emailNewsletterLabel: 'Email Newsletter',
  emailNewsletterDesc: 'Trends, events, exclusive offers & new arrivals',
  smsNotificationsLabel: 'SMS Notifications',
  smsNotificationsDesc: 'Order updates, flash sales & special events',
  pushNotificationsLabel: 'Push Notifications',
  pushNotificationsDesc: 'Browser notifications for new arrivals & sales',
  orderUpdatesLabel: 'Order Updates',
  orderUpdatesDesc: 'Shipping status, delivery confirmations & returns',
  newArrivalsLabel: 'New Arrivals',
  newArrivalsDesc: 'Be first to know when new collections drop',
  saleAlertsLabel: 'Sale Alerts',
  saleAlertsDesc: 'Exclusive early access to sales & promotions',
  loyaltyUpdatesLabel: 'Loyalty Updates',
  loyaltyUpdatesDesc: 'Bonus points, tier upgrades & member rewards',
} as const;
