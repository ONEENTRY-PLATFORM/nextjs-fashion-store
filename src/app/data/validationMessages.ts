/**
 * Form messages — every zod schema error string, plus the generic save-failure
 * feedback shared by the account forms.
 *
 * These are the **offline fallbacks**. The live copy comes from the OE
 * `form_messages` set: each key maps to `form_messages_<snake_case_key>`, which
 * is exactly the convention `useDict` implements, so `useFormMessages()`
 * overlays the whole object in one call.
 *
 * @see ../utils/useFormMessages — the hook
 * @see ../utils/schemas — `createSchemas`, which takes this shape
 */
export const VALIDATION_MESSAGES = {
  // Common fields
  emailRequired: 'Email is required',
  emailInvalid: 'Enter a valid email address',
  passwordRequired: 'Password is required',
  passwordTooShort: 'Password must be at least 8 characters',
  passwordTooLong: 'Password is too long',
  passwordConfirm: 'Please confirm your password',
  passwordsMismatch: 'Passwords do not match',
  phoneRequired: 'Phone is required',
  phoneInvalid: 'Enter a valid phone number',
  postcodeRequired: 'Postcode is required',
  postcodeInvalid: 'Enter a valid postcode',
  firstNameRequired: 'First name is required',
  fullNameRequired: 'Full name is required',
  // Login
  loginInputRequired: 'Email or phone is required',
  loginInputInvalid: 'Enter a valid email, phone number, or account identifier',
  // Register
  acceptTerms: 'You must accept the terms',
  // Address
  address1Required: 'Address line 1 is required',
  cityRequired: 'City is required',
  // Payment
  cardNumberRequired: 'Card number is required',
  cardNumberInvalid: 'Enter a valid card number',
  cardNumberBad: 'Card number is invalid',
  expiryRequired: 'Expiry date is required',
  expiryFormat: 'Use MM/YY format',
  expiryExpired: 'Card has expired',
  cvvRequired: 'CVV is required',
  cvvFormat: 'CVV must be 3 or 4 digits',
  nameOnCardRequired: 'Name on card is required',
  // Promo
  promoRequired: 'Enter a promo code',
  // Not a zod message: shown when a form submits cleanly but the server
  // refuses the write and returns no reason of its own.
  saveFailed: 'Save failed',
} as const;

/**
 * Shape of {@link VALIDATION_MESSAGES}, widened to plain strings so a CMS
 *  overlay (which cannot be a literal type) still satisfies it.
 */
export type ValidationMessages = Record<keyof typeof VALIDATION_MESSAGES, string>;
