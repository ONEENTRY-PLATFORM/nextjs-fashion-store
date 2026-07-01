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
  forgotConfirm: 'Password reset link sent!',
  ctaSubmit: 'Log In',
  ctaLoading: 'Signing in…',
  switchPrompt: "Don't have an account?",
  switchCta: 'Create one',
  errorInvalidCredentials: 'Invalid email or password.',
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
} as const;
