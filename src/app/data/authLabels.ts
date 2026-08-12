/**
 * Auth flow copy: Sign In, Create Account, Guest checkout choice.
 * Consolidated so all three modals can be edited from one file.
 */

export const AUTH_LABELS = {
  signIn: {
    title: 'Sign In',
    subtitle: 'Autofill address, track orders, earn bonuses',
  },
  register: {
    title: 'Create Account',
    subtitle: 'Join and get 10% off your first order',
  },
  guest: {
    title: 'Continue as Guest',
    subtitle: 'You can create an account after checkout',
  },

  // GuestCheckoutModal header
  guestModalEyebrow: 'Checkout',
  guestModalHeading: 'How would you like to continue?',
  divider: 'or',
} as const;

export const LOGIN_MODAL_LABELS = {
  title: 'Sign In',
  socialGoogle: 'Continue with Google',
  socialApple: 'Continue with Apple',
  socialFacebook: 'Continue with Facebook',
  dividerOr: 'or',
  identifierLabel: 'Phone or Email',
  identifierPlaceholder: 'you@example.com or +44...',
  passwordLabel: 'Password',
  passwordPlaceholder: '••••••••',
  forgotPassword: 'Forgot password?',
  ctaSubmit: 'Log In',
  ctaLoading: 'Signing in…',
  switchPrompt: "Don't have an account?",
  switchCta: 'Create one',
  errorInvalidCredentials: 'Invalid email or password.',
  errorGoogleFailed: 'Google sign-in failed',
  closeLabel: 'Close',
  loadingOptions: 'Loading sign-in options',
  dismissError: 'Dismiss error',
} as const;

/**
 * Password-recovery copy.
 *
 * Three steps, because that is what OneEntry's flow actually is: ask for the
 * address, type the code it mails back, choose the new password. Nothing here
 * promises a link — there is none. Keys resolve as `sign_in_reset_<key>` in the
 * CMS `sign_in` set, so an editor rewords the whole flow without a deploy.
 */
export const PASSWORD_RESET_LABELS = {
  title: 'Reset Password',
  stepEmailHeading: 'Enter your email',
  stepEmailHint: "We'll send a one-time code to the email on your account.",
  emailLabel: 'Email Address',
  emailPlaceholder: 'you@example.com',
  sendCode: 'Send code',
  sending: 'Sending…',
  stepCodeHeading: 'Enter the code',
  /**
   * `%email%` is replaced with the address the code went to. The placeholder is
   * `%…%`, not `{…}`: OE casts attribute values to JSON in Postgres, so a value
   * containing a brace makes the public read of the *whole set* fail.
   */
  stepCodeHint: 'We sent a code to %email%.',
  codeLabel: 'Code',
  codePlaceholder: 'Code from the email',
  verifyCode: 'Continue',
  verifying: 'Checking…',
  /** `%seconds%` is replaced with the remaining validity of the code. */
  codeExpiresIn: 'The code expires in %seconds%s',
  codeExpired: 'The code has expired — request a new one.',
  resendCode: 'Send a new code',
  stepPasswordHeading: 'Choose a new password',
  passwordLabel: 'New Password',
  passwordPlaceholder: 'Min. 8 characters',
  confirmLabel: 'Repeat Password',
  confirmPlaceholder: 'Repeat the password',
  submit: 'Save password',
  submitting: 'Saving…',
  success: 'Password changed — signing you in…',
  backToLogin: 'Back to sign in',
  closeLabel: 'Close',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  unavailable: 'Password recovery is unavailable for this store.',
} as const;

/** OAuth failure banner copy, keyed by the `?googleAuthError=` code family. */
export const OAUTH_ERROR_LABELS = {
  accessDenied: 'Google sign-in was cancelled. Please try again.',
  token: "We couldn't verify your Google account. Please try again.",
  state: 'Sign-in session expired. Please try again.',
  generic: "We couldn't complete Google sign-in. Please try again.",
  missingCode: 'Missing code or state from Google',
  signingIn: 'Signing you in…',
} as const;

export const REGISTER_MODAL_LABELS = {
  title: 'Create Account',
  socialGoogle: 'Google',
  socialApple: 'Apple',
  socialFacebook: 'Facebook',
  dividerOr: 'or',
  firstNameLabel: 'First Name',
  firstNamePlaceholder: 'Jane',
  genderLabel: 'Gender',
  genderFemale: 'Female',
  genderMale: 'Male',
  emailLabel: 'Email Address',
  emailPlaceholder: 'you@example.com',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Min. 8 characters',
  emailSubscribe: 'Subscribe to promotional email newsletters about trends, events, and exclusive offers',
  smsSubscribe: 'Subscribe to promotional SMS notifications about offers and customer events',
  agreePrefix: 'I agree to the',
  termsLink: 'Terms of Service',
  agreeAnd: 'and',
  privacyLink: 'Personal Data Processing & Protection Policy',
  required: '*',
  ctaSubmit: 'Register',
  ctaLoading: 'Creating Account…',
  switchPrompt: 'Already have an account?',
  switchCta: 'Sign in',
  errorGeneric: 'Something went wrong. Please try again.',
  errorGoogleFailed: 'Google sign-in failed',
  closeLabel: 'Close',
  loadingOptions: 'Loading sign-up options',
} as const;
