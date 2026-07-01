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
    Bronze:   ['5% off every order', 'Free standard returns', 'Early access to sales'],
    Silver:   ['Discount on every order', 'Free returns & exchanges', 'Priority customer support'],
    Gold:     ['Discount on every order', 'Free express delivery', 'Dedicated personal stylist'],
    Platinum: ['Discount on every order', 'Same-day delivery', 'Exclusive VIP events & previews'],
  } as Record<string, readonly string[]>,
  tierOrder: ['Bronze', 'Silver', 'Gold', 'Platinum'] as const,
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
} as const;

// ─── Bonuses section ────────────────────────────────────────────────────────
export const BONUSES_LABELS = {
  title: 'My Bonuses',
  availableBonuses: 'Available Bonuses',
  discountLevel: 'Discount Level',
  transactionHistory: 'Bonus Transaction History',
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
  howSteps: [
    { step: '01', title: 'Submit Request', body: 'Tell us what your item needs — alteration, repair, cleaning or restoration.' },
    { step: '02', title: 'Drop Off', body: 'Bring your item to any ONEENTRY store with your confirmation reference.' },
    { step: '03', title: 'We Get to Work', body: 'Our specialist technicians assess and complete your service request.' },
    { step: '04', title: 'Collect', body: "You'll be notified when ready. Collect in-store or request delivery." },
  ] as const,
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
  categories: ['Product Quality', 'Delivery', 'Customer Service', 'Website Experience', 'Returns & Refunds', 'Other'] as const,
  labelCategory: 'Feedback Category',
  labelOrder: 'Related Order',
  optionalSuffix: '(optional)',
  placeholderOrder: 'Select an order…',
  labelMessage: 'Your Message',
  messageHint: 'Please describe your experience in detail. Minimum 20 characters.',
  placeholderMessage: 'Tell us what you loved or what we can improve…',
  charsNeededTpl: 'more characters needed',
  charsCounterTpl: '/ 500',
  howSteps: [
    { step: '01', title: 'Rate Your Experience', desc: 'Give a star rating that reflects your overall satisfaction.' },
    { step: '02', title: 'Choose a Category', desc: 'Help us route your feedback to the right team.' },
    { step: '03', title: 'We Take Action', desc: 'Our team reviews every submission and improves accordingly.' },
  ] as const,
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
  bannerBodyPrefix: 'Invite a friend to ONEENTRY FASHION. When they place their first order, you both receive a ',
  bannerBodyCreditPrefix: CURRENCY.symbol,
  bannerBodyCreditSuffix: ' store credit',
  bannerBodySuffix: '.',
  perReferral: 'per referral',
  // Stats
  statFriendsInvited: 'Friends Invited',
  statOrdersPlaced: 'Orders Placed',
  statCreditsEarned: 'Credits Earned',
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
  howSteps: (amount: number) => [
    { step: '01', title: 'Share Your Link', desc: 'Send your unique referral link or code to friends and family.' },
    { step: '02', title: 'Friend Signs Up', desc: 'Your friend creates an account and places their first order.' },
    { step: '03', title: `Both Get ${CURRENCY.formatInteger(amount)}`, desc: `You receive ${CURRENCY.formatInteger(amount)} store credit. Your friend gets ${CURRENCY.formatInteger(amount)} off their order.` },
  ],
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
    { step: '01', title: 'Save Your Size', desc: 'Add sold-out items to your waiting list with your preferred size and colour.' },
    { step: '02', title: 'Get Notified', desc: 'Toggle the bell icon to receive alerts the moment stock is replenished.' },
    { step: '03', title: 'Shop First', desc: 'Waiting list members get early access before items go back on general sale.' },
  ] as const,
} as const;

// ─── Subscriptions section ──────────────────────────────────────────────────
export const SUBSCRIPTIONS_LABELS = {
  title: 'Subscription Management',
  emailNewsletter: { label: 'Email Newsletter', desc: 'Trends, events, exclusive offers & new arrivals' },
  smsNotifications: { label: 'SMS Notifications', desc: 'Order updates, flash sales & special events' },
  pushNotifications: { label: 'Push Notifications', desc: 'Browser notifications for new arrivals & sales' },
  orderUpdates: { label: 'Order Updates', desc: 'Shipping status, delivery confirmations & returns' },
  newArrivals: { label: 'New Arrivals', desc: 'Be first to know when new collections drop' },
  saleAlerts: { label: 'Sale Alerts', desc: 'Exclusive early access to sales & promotions' },
  loyaltyUpdates: { label: 'Loyalty Updates', desc: 'Bonus points, tier upgrades & member rewards' },
} as const;
