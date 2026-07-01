/**
 * Form validation messages — all zod schema error messages live here.
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
} as const;
