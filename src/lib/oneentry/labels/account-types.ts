export const ACCOUNT_SET_MARKERS = [
  'user_account',
  'user_account_silver_status',
  'user_account_wishlist',
  'user_account_feedback',
  'user_account_personal_data_consent',
  'subscription_management',
  'users_edit_password',
  'user_addresses_system',
  'my_orders',
  'my_bonuses',
  'service_maintenance',
  'purchase_history',
  'waiting_list',
] as const;

export type AccountSetMarker = (typeof ACCOUNT_SET_MARKERS)[number];

export type AccountSystemTexts = Record<AccountSetMarker, Record<string, string>>;
